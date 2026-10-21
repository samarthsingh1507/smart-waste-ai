from typing import List, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.database import get_db
from app.models import WasteEvent, Dish, MealService
from app.schemas import WasteEventCreate, WasteEventUpdate, WasteEventResponse

router = APIRouter(prefix="/waste-events", tags=["Waste Events"])

def format_event_response(e: WasteEvent) -> WasteEventResponse:
    ms = e.meal_service
    return WasteEventResponse(
        id=e.id,
        timestamp=e.timestamp,
        dish_id=e.dish_id,
        dish_name=e.dish.name if e.dish else e.staff_confirmed_dish,
        meal_service_id=e.meal_service_id,
        meal_period=ms.meal_period if ms else None,
        portions_prepared=ms.portions_prepared if ms else None,
        portions_served=ms.portions_served if ms else None,
        category=e.category,
        waste_type=e.waste_type,
        weight_grams=e.weight_grams,
        weight_kg=round(e.weight_grams / 1000.0, 3),
        ingredient_cost_per_kg=e.ingredient_cost_per_kg,
        estimated_cost=round(e.estimated_cost, 2),
        image_url=e.image_url,
        ai_suggested_category=e.ai_suggested_category,
        ai_suggested_dish=e.ai_suggested_dish,
        staff_confirmed_category=e.staff_confirmed_category,
        staff_confirmed_dish=e.staff_confirmed_dish,
        is_verified=e.is_verified,
        notes=e.notes,
        created_at=e.created_at
    )

@router.get("", response_model=List[WasteEventResponse])
def list_waste_events(
    search: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    meal_period: Optional[str] = None,
    waste_type: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(WasteEvent).join(Dish, WasteEvent.dish_id == Dish.id)

    if search:
        query = query.filter(
            (Dish.name.ilike(f"%{search}%")) |
            (WasteEvent.staff_confirmed_dish.ilike(f"%{search}%")) |
            (WasteEvent.notes.ilike(f"%{search}%"))
        )
    if date_from:
        query = query.filter(func.date(WasteEvent.timestamp) >= date_from)
    if date_to:
        query = query.filter(func.date(WasteEvent.timestamp) <= date_to)
    if waste_type:
        query = query.filter(WasteEvent.waste_type == waste_type)
    if category:
        query = query.filter(WasteEvent.category == category)
    if meal_period:
        query = query.outerjoin(MealService, WasteEvent.meal_service_id == MealService.id).filter(
            MealService.meal_period == meal_period
        )

    events = query.order_by(desc(WasteEvent.timestamp)).offset(offset).limit(limit).all()
    return [format_event_response(e) for e in events]

@router.post("", response_model=WasteEventResponse, status_code=status.HTTP_201_CREATED)
def create_waste_event(event_in: WasteEventCreate, db: Session = Depends(get_db)):
    dish = db.query(Dish).filter(Dish.id == event_in.dish_id).first()
    if not dish:
        raise HTTPException(status_code=404, detail="Dish not found.")

    ts = event_in.timestamp or datetime.utcnow()
    event_date = event_in.date or ts.date()

    # Cost calculation: measured weight (kg) * cost per kg
    cost_per_kg = event_in.ingredient_cost_per_kg if event_in.ingredient_cost_per_kg is not None else dish.default_cost_per_kg
    measured_weight_kg = event_in.weight_grams / 1000.0
    estimated_cost = round(measured_weight_kg * cost_per_kg, 2)

    # Link or upsert MealService if meal portions or period are specified
    meal_service_id = None
    if event_in.meal_period:
        ms = db.query(MealService).filter(
            MealService.date == event_date,
            MealService.dish_id == dish.id,
            MealService.meal_period == event_in.meal_period
        ).first()

        if not ms:
            ms = MealService(
                date=event_date,
                dish_id=dish.id,
                meal_period=event_in.meal_period,
                portions_prepared=event_in.portions_prepared or 0,
                portions_served=event_in.portions_served or 0
            )
            db.add(ms)
            db.flush()
        else:
            if event_in.portions_prepared is not None:
                ms.portions_prepared = event_in.portions_prepared
            if event_in.portions_served is not None:
                ms.portions_served = event_in.portions_served
            db.flush()
        meal_service_id = ms.id

    waste_event = WasteEvent(
        timestamp=ts,
        dish_id=dish.id,
        meal_service_id=meal_service_id,
        category=event_in.category or dish.category,
        waste_type=event_in.waste_type,
        weight_grams=event_in.weight_grams,
        ingredient_cost_per_kg=cost_per_kg,
        estimated_cost=estimated_cost,
        image_url=event_in.image_url,
        ai_suggested_category=event_in.ai_suggested_category,
        ai_suggested_dish=event_in.ai_suggested_dish,
        staff_confirmed_category=event_in.staff_confirmed_category,
        staff_confirmed_dish=event_in.staff_confirmed_dish,
        is_verified=event_in.is_verified,
        notes=event_in.notes,
        created_at=datetime.utcnow()
    )
    db.add(waste_event)
    db.commit()
    db.refresh(waste_event)

    return format_event_response(waste_event)

@router.get("/{event_id}", response_model=WasteEventResponse)
def get_waste_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(WasteEvent).filter(WasteEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Waste event record not found.")
    return format_event_response(event)

@router.put("/{event_id}", response_model=WasteEventResponse)
def update_waste_event(event_id: int, update_in: WasteEventUpdate, db: Session = Depends(get_db)):
    event = db.query(WasteEvent).filter(WasteEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Waste event record not found.")

    if update_in.dish_id is not None:
        dish = db.query(Dish).filter(Dish.id == update_in.dish_id).first()
        if not dish:
            raise HTTPException(status_code=404, detail="Target dish not found.")
        event.dish_id = update_in.dish_id

    if update_in.category is not None:
        event.category = update_in.category
    if update_in.waste_type is not None:
        event.waste_type = update_in.waste_type
    if update_in.weight_grams is not None:
        event.weight_grams = update_in.weight_grams
    if update_in.ingredient_cost_per_kg is not None:
        event.ingredient_cost_per_kg = update_in.ingredient_cost_per_kg
    if update_in.staff_confirmed_category is not None:
        event.staff_confirmed_category = update_in.staff_confirmed_category
    if update_in.staff_confirmed_dish is not None:
        event.staff_confirmed_dish = update_in.staff_confirmed_dish
    if update_in.is_verified is not None:
        event.is_verified = update_in.is_verified
    if update_in.notes is not None:
        event.notes = update_in.notes

    # Re-calculate estimated cost
    event.estimated_cost = round((event.weight_grams / 1000.0) * event.ingredient_cost_per_kg, 2)

    db.commit()
    db.refresh(event)
    return format_event_response(event)

@router.delete("/{event_id}", status_code=status.HTTP_200_OK)
def delete_waste_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(WasteEvent).filter(WasteEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Waste event record not found.")
    db.delete(event)
    db.commit()
    return {"status": "success", "message": f"Waste event #{event_id} deleted successfully."}
