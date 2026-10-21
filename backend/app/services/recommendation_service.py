import math
from datetime import date, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import Dish, MealService, WasteEvent, AppSetting
from app.config import settings

class RecommendationService:
    """
    Deterministic preparation planning recommendation engine.
    Uses actual historical meal-service records to forecast served portions
    for the same weekday and meal period over preceding 4 weeks.
    Applies configurable safety buffer and provides transparent explanations.
    """

    @staticmethod
    def get_safety_buffer(db: Session) -> float:
        setting = db.query(AppSetting).filter(AppSetting.key == "safety_buffer_percent").first()
        if setting:
            try:
                return float(setting.value)
            except ValueError:
                pass
        return settings.SAFETY_BUFFER_DEFAULT_PCT

    @classmethod
    def generate_recommendations(
        cls,
        db: Session,
        target_date: date,
        meal_period: Optional[str] = None,
        dish_id: Optional[int] = None
    ) -> Dict[str, Any]:
        safety_buffer_pct = cls.get_safety_buffer(db)
        buffer_multiplier = 1.0 + (safety_buffer_pct / 100.0)

        target_weekday = target_date.weekday()
        target_day_name = target_date.strftime("%A")

        # Range for preceding 4 weeks
        four_weeks_ago = target_date - timedelta(days=28)
        yesterday = target_date - timedelta(days=1)

        # Active dishes query
        dishes_query = db.query(Dish).filter(Dish.is_active == True)
        if dish_id:
            dishes_query = dishes_query.filter(Dish.id == dish_id)
        dishes = dishes_query.order_by(Dish.category, Dish.name).all()

        target_periods = [meal_period] if meal_period else ["breakfast", "lunch", "dinner"]

        recommendations: List[Dict[str, Any]] = []

        for dish in dishes:
            # Check which periods this dish is actually served in
            dish_total_services = db.query(MealService).filter(MealService.dish_id == dish.id).count()

            for period in target_periods:
                period_service_count = db.query(MealService).filter(
                    MealService.dish_id == dish.id,
                    MealService.meal_period == period
                ).count()

                # If this dish has known services but never in this period, skip irrelevant period
                if dish_total_services > 0 and period_service_count == 0:
                    continue
                # 1. Primary Method: Same weekday and meal period over preceding 4 weeks
                historical_services = db.query(MealService).filter(
                    MealService.dish_id == dish.id,
                    MealService.meal_period == period,
                    MealService.date >= four_weeks_ago,
                    MealService.date <= yesterday
                ).all()

                # Filter services strictly on the same weekday
                same_weekday_services = [
                    s for s in historical_services if s.date.weekday() == target_weekday
                ]

                method = "same_weekday_4w"
                is_insufficient = False
                relevant_services = same_weekday_services

                if len(same_weekday_services) >= 2:
                    # Sufficient history for same weekday
                    served_list = [s.portions_served for s in same_weekday_services]
                    prepared_list = [s.portions_prepared for s in same_weekday_services]
                    forecast_served = int(round(sum(served_list) / len(served_list)))
                    avg_prepared = round(sum(prepared_list) / len(prepared_list), 1)
                    avg_served = round(sum(served_list) / len(served_list), 1)
                elif len(historical_services) >= 3:
                    # Fallback: Recent days across the preceding 4 weeks
                    method = "recent_days_fallback"
                    is_insufficient = True
                    relevant_services = historical_services[-14:]  # last 14 services
                    served_list = [s.portions_served for s in relevant_services]
                    prepared_list = [s.portions_prepared for s in relevant_services]
                    forecast_served = int(round(sum(served_list) / len(served_list)))
                    avg_prepared = round(sum(prepared_list) / len(prepared_list), 1)
                    avg_served = round(sum(served_list) / len(served_list), 1)
                else:
                    # Baseline fallback when almost no data exists
                    method = "insufficient_data_baseline"
                    is_insufficient = True
                    relevant_services = []
                    forecast_served = 30  # Standard conservative kitchen portion default
                    avg_prepared = 0.0
                    avg_served = 0.0

                # Ensure minimum forecast
                forecast_served = max(1, forecast_served)

                # Recommended prep portions = ceil(forecast_served * (1 + buffer_pct / 100))
                recommended_prep = math.ceil(forecast_served * buffer_multiplier)
                buffer_portions = recommended_prep - forecast_served

                # Historical waste evidence for these services
                service_ids = [s.id for s in relevant_services]
                waste_records = []
                if service_ids:
                    waste_records = db.query(WasteEvent).filter(
                        WasteEvent.meal_service_id.in_(service_ids)
                    ).all()

                total_waste_kg = sum(w.weight_grams for w in waste_records) / 1000.0
                avg_waste_kg = round(total_waste_kg / len(relevant_services), 2) if relevant_services else 0.0
                surplus_portions = round(max(0.0, avg_prepared - avg_served), 1)

                # Plain-English explanation
                if method == "same_weekday_4w":
                    explanation = (
                        f"Based on historical average of {avg_served:.0f} portions served across {len(same_weekday_services)} "
                        f"preceding {target_day_name} {period}s. With a {safety_buffer_pct}% safety buffer (+{buffer_portions} portions), "
                        f"recommended preparation is {recommended_prep} portions. Past services had an average surplus of "
                        f"{surplus_portions:.0f} portions ({avg_waste_kg:.1f} kg waste)."
                    )
                elif method == "recent_days_fallback":
                    explanation = (
                        f"Notice: Insufficient same-weekday history ({len(same_weekday_services)} recorded {target_day_name}s). "
                        f"Fallback calculation used {len(relevant_services)} recent {period} services (avg {avg_served:.0f} served). "
                        f"Preparing {recommended_prep} portions (+{safety_buffer_pct}% safety buffer)."
                    )
                else:
                    explanation = (
                        f"Notice: Less than 3 historical service records found for {dish.name} during {period}. "
                        f"Provided a default baseline of {recommended_prep} portions (+{safety_buffer_pct}% buffer). "
                        f"Log more daily services to enable weekday trend forecasting."
                    )

                recommendations.append({
                    "dish_id": dish.id,
                    "dish_name": dish.name,
                    "category": dish.category,
                    "meal_period": period,
                    "target_date": target_date.isoformat(),
                    "target_day_name": target_day_name,
                    "forecast_served_portions": forecast_served,
                    "recommended_prep_portions": recommended_prep,
                    "safety_buffer_percent": safety_buffer_pct,
                    "buffer_portions": buffer_portions,
                    "historical_avg_prepared": avg_prepared,
                    "historical_avg_served": avg_served,
                    "historical_avg_waste_kg": avg_waste_kg,
                    "historical_surplus_portions": surplus_portions,
                    "historical_records_count": len(relevant_services),
                    "method": method,
                    "is_insufficient_history": is_insufficient,
                    "explanation": explanation
                })

        summary_notes = [
            f"Calculations reflect a {safety_buffer_pct}% configured safety buffer above served demand forecast.",
            f"Target date: {target_day_name}, {target_date.strftime('%b %d, %Y')}.",
            "All recommendations derive deterministically from persisted meal-service history."
        ]

        return {
            "target_date": target_date.isoformat(),
            "target_day_name": target_day_name,
            "safety_buffer_percent": safety_buffer_pct,
            "total_recommended_dishes": len(recommendations),
            "recommendations": recommendations,
            "summary_notes": summary_notes
        }
