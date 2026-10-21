import math
from datetime import date, timedelta
from app.services.recommendation_service import RecommendationService

def test_recommendation_math_and_logic(db_session):
    tomorrow = date.today() + timedelta(days=1)
    result = RecommendationService.generate_recommendations(db_session, target_date=tomorrow)

    assert result["target_date"] == tomorrow.isoformat()
    assert result["safety_buffer_percent"] >= 0
    assert len(result["recommendations"]) > 0

    # Inspect first recommendation
    rec = result["recommendations"][0]
    forecast = rec["forecast_served_portions"]
    buffer_pct = rec["safety_buffer_percent"]
    expected_recommended = math.ceil(forecast * (1.0 + buffer_pct / 100.0))

    assert rec["recommended_prep_portions"] == expected_recommended
    assert rec["buffer_portions"] == expected_recommended - forecast
    assert rec["method"] in ["same_weekday_4w", "recent_days_fallback", "insufficient_data_baseline"]
    assert len(rec["explanation"]) > 10
    assert rec["historical_records_count"] >= 0

def test_recommendation_safety_buffer_update(db_session, client):
    # Set safety buffer to 10%
    client.put("/api/settings", json={"safety_buffer_percent": 10.0})

    tomorrow = date.today() + timedelta(days=1)
    response = client.get(f"/api/recommendations/prep-planner?target_date={tomorrow.isoformat()}")
    assert response.status_code == 200
    data = response.json()
    assert data["safety_buffer_percent"] == 10.0

    for rec in data["recommendations"]:
        expected = math.ceil(rec["forecast_served_portions"] * 1.10)
        assert rec["recommended_prep_portions"] == expected

    # Reset back to 5.0%
    client.put("/api/settings", json={"safety_buffer_percent": 5.0})

def test_prep_planner_recalculates_on_new_meal_history(client):
    # Target date: 7 days from today (same weekday as today)
    target_date = date.today() + timedelta(days=7)
    target_str = target_date.isoformat()

    # Query initial recommendation for Dish 1 (Hyderabadi Veg Biryani) Lunch
    res_before = client.get(f"/api/recommendations/prep-planner?target_date={target_str}&meal_period=lunch&dish_id=1")
    assert res_before.status_code == 200
    rec_before = res_before.json()["recommendations"][0]
    initial_forecast = rec_before["forecast_served_portions"]
    initial_recommended = rec_before["recommended_prep_portions"]

    # Log a significant new meal service for today (same weekday)
    # with a very high served count to shift the historical served average upwards
    high_served = initial_forecast + 100
    high_prepared = high_served + 10

    event_payload = {
        "dish_id": 1,
        "date": date.today().isoformat(),
        "meal_period": "lunch",
        "category": "Rice & Grains",
        "waste_type": "preparation_surplus",
        "weight_grams": 2500,
        "ingredient_cost_per_kg": 160,
        "staff_confirmed_category": "Rice & Grains",
        "staff_confirmed_dish": "Hyderabadi Veg Biryani",
        "is_verified": True,
        "portions_prepared": high_prepared,
        "portions_served": high_served,
        "notes": "Surplus log driving prep planner recalculation test"
    }

    create_res = client.post("/api/waste-events", json=event_payload)
    assert create_res.status_code == 201
    created_event_id = create_res.json()["id"]

    # Re-query prep planner for the target date
    res_after = client.get(f"/api/recommendations/prep-planner?target_date={target_str}&meal_period=lunch&dish_id=1")
    assert res_after.status_code == 200
    rec_after = res_after.json()["recommendations"][0]

    # Verify that the forecast served portions and recommended portions recalculated upwards!
    assert rec_after["forecast_served_portions"] > initial_forecast
    assert rec_after["recommended_prep_portions"] > initial_recommended

    # Clean up test event
    client.delete(f"/api/waste-events/{created_event_id}")
