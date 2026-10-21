from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import MealService, Dish
from app.schemas import MealServiceResponse, MealServiceCreate

router = APIRouter(prefix="/meal-services", tags=["Meal Services"])

@router.get("", response_model=List[MealServiceResponse])
def list_meal_services(
    service_date: Optional[date] = Query(None, alias="date"),
    dish_id: Optional[int] = None,
    meal_period: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(MealService).join(Dish, MealService.dish_id == Dish.id)
    if service_date:
        query = query.filter(MealService.date == service_date)
    if dish_id:
        query = query.filter(MealService.dish_id == dish_id)
    if meal_period:
        query = query.filter(MealService.meal_period == meal_period)

    records = query.order_by(MealService.date.desc(), MealService.meal_period).limit(limit).all()
    
    results = []
    for r in records:
        resp = MealServiceResponse.model_validate(r)
        resp.dish_name = r.dish.name if r.dish else None
        results.append(resp)
    return results

@router.post("", response_model=MealServiceResponse, status_code=status.HTTP_201_CREATED)
def create_or_update_meal_service(record_in: MealServiceCreate, db: Session = Depends(get_db)):
    dish = db.query(Dish).filter(Dish.id == record_in.dish_id).first()
    if not dish:
        raise HTTPException(status_code=404, detail="Dish not found")

    existing = db.query(MealService).filter(
        MealService.date == record_in.date,
        MealService.dish_id == record_in.dish_id,
        MealService.meal_period == record_in.meal_period
    ).first()

    if existing:
        existing.portions_prepared = record_in.portions_prepared
        existing.portions_served = record_in.portions_served
        db.commit()
        db.refresh(existing)
        resp = MealServiceResponse.model_validate(existing)
        resp.dish_name = dish.name
        return resp

    ms = MealService(**record_in.model_dump())
    db.add(ms)
    db.commit()
    db.refresh(ms)
    resp = MealServiceResponse.model_validate(ms)
    resp.dish_name = dish.name
    return resp
