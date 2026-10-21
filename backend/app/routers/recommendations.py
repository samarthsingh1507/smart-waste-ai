from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.recommendation_service import RecommendationService
from app.schemas import PrepPlannerResponse

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

@router.get("/prep-planner", response_model=PrepPlannerResponse)
def get_prep_planner_recommendations(
    target_date: Optional[date] = Query(None),
    meal_period: Optional[str] = Query(None),
    dish_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Generate portion preparation quantity recommendations for target date.
    Forecasts demand using served portions for the same weekday and meal period
    over preceding 4 weeks, applying configurable safety buffer and transparent explanations.
    """
    if not target_date:
        target_date = date.today() + timedelta(days=1)

    return RecommendationService.generate_recommendations(
        db=db,
        target_date=target_date,
        meal_period=meal_period,
        dish_id=dish_id
    )
