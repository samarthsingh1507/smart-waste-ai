import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Dish, WasteEvent, MealService
from app.schemas import DishResponse, DishCreate, DishUpdate
from app.config import settings

router = APIRouter(prefix="/dishes", tags=["Dishes"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}

@router.get("", response_model=List[DishResponse])
def list_dishes(db: Session = Depends(get_db)):
    """List all active dishes in the restaurant menu."""
    return db.query(Dish).filter(Dish.is_active == True).order_by(Dish.category, Dish.name).all()

@router.post("", response_model=DishResponse, status_code=status.HTTP_201_CREATED)
def create_dish(dish_in: DishCreate, db: Session = Depends(get_db)):
    """Create a new custom restaurant dish with optional image."""
    existing = db.query(Dish).filter(Dish.name.ilike(dish_in.name.strip())).first()
    if existing:
        if not existing.is_active:
            # Reactivate previously deactivated dish
            existing.is_active = True
            existing.category = dish_in.category
            existing.default_cost_per_kg = dish_in.default_cost_per_kg
            existing.description = dish_in.description
            if dish_in.image_url:
                existing.image_url = dish_in.image_url
            db.commit()
            db.refresh(existing)
            return existing
        raise HTTPException(status_code=400, detail="A dish with this name already exists in your menu.")

    dish = Dish(
        name=dish_in.name.strip(),
        category=dish_in.category,
        default_cost_per_kg=dish_in.default_cost_per_kg,
        description=dish_in.description,
        image_url=dish_in.image_url,
        is_active=dish_in.is_active
    )
    db.add(dish)
    db.commit()
    db.refresh(dish)
    return dish

@router.post("/upload-photo")
async def upload_dish_photo(file: UploadFile = File(...)):
    """Upload a custom photo for a restaurant dish."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image type '{file.content_type}'. Supported: JPEG, PNG, WEBP."
        )

    ext = Path(file.filename or "dish.jpg").suffix.lower() or ".jpg"
    unique_name = f"dish_{uuid.uuid4().hex[:12]}{ext}"
    target_path = settings.UPLOAD_DIR / unique_name

    total_size = 0
    with open(target_path, "wb") as buffer:
        while chunk := await file.read(1024 * 64):
            total_size += len(chunk)
            if total_size > settings.MAX_UPLOAD_SIZE_BYTES:
                buffer.close()
                if target_path.exists():
                    target_path.unlink()
                raise HTTPException(
                    status_code=413,
                    detail=f"Image exceeds maximum limit of {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)}MB."
                )
            buffer.write(chunk)

    return {
        "image_url": f"/uploads/{unique_name}",
        "filename": unique_name
    }

@router.put("/{dish_id}", response_model=DishResponse)
def update_dish(dish_id: int, dish_in: DishUpdate, db: Session = Depends(get_db)):
    """Update custom terms, price, category, or photo for an existing dish."""
    dish = db.query(Dish).filter(Dish.id == dish_id).first()
    if not dish:
        raise HTTPException(status_code=404, detail="Dish not found.")

    if dish_in.name is not None and dish_in.name.strip() != dish.name:
        existing = db.query(Dish).filter(
            Dish.name.ilike(dish_in.name.strip()),
            Dish.id != dish_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Another dish with this name already exists.")
        dish.name = dish_in.name.strip()

    if dish_in.category is not None:
        dish.category = dish_in.category
    if dish_in.default_cost_per_kg is not None:
        dish.default_cost_per_kg = dish_in.default_cost_per_kg
    if dish_in.description is not None:
        dish.description = dish_in.description
    if dish_in.image_url is not None:
        dish.image_url = dish_in.image_url
    if dish_in.is_active is not None:
        dish.is_active = dish_in.is_active

    db.commit()
    db.refresh(dish)
    return dish

@router.delete("/{dish_id}")
def delete_dish(dish_id: int, db: Session = Depends(get_db)):
    """Soft delete a dish from menu (keeps historical waste audit data safe)."""
    dish = db.query(Dish).filter(Dish.id == dish_id).first()
    if not dish:
        raise HTTPException(status_code=404, detail="Dish not found.")

    # Check if there are linked waste events
    linked_events = db.query(WasteEvent).filter(WasteEvent.dish_id == dish_id).count()
    if linked_events > 0:
        dish.is_active = False
        db.commit()
        return {
            "status": "success",
            "message": f"Dish '{dish.name}' has historical waste records. It has been deactivated from active menu."
        }
    else:
        db.delete(dish)
        db.commit()
        return {
            "status": "success",
            "message": f"Dish '{dish.name}' removed completely from menu."
        }
