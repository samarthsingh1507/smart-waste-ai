from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AppSetting
from app.schemas import SettingsResponse, SettingsUpdate
from app.services.vision_service import vision_service
from app.seed_data import seed_database
from app.config import settings

router = APIRouter(prefix="/settings", tags=["Settings"])

def get_current_settings(db: Session) -> SettingsResponse:
    settings_dict = {
        "outlet_name": settings.OUTLET_NAME_DEFAULT,
        "currency": settings.CURRENCY_DEFAULT,
        "weight_unit": settings.WEIGHT_UNIT_DEFAULT,
        "safety_buffer_percent": settings.SAFETY_BUFFER_DEFAULT_PCT,
        "gemini_model": settings.GEMINI_MODEL,
    }

    db_settings = db.query(AppSetting).all()
    for s in db_settings:
        if s.key == "safety_buffer_percent":
            try:
                settings_dict[s.key] = float(s.value)
            except ValueError:
                pass
        else:
            settings_dict[s.key] = s.value

    is_configured = vision_service.is_configured()

    return SettingsResponse(
        outlet_name=settings_dict["outlet_name"],
        currency=settings_dict["currency"],
        weight_unit=settings_dict["weight_unit"],
        safety_buffer_percent=settings_dict["safety_buffer_percent"],
        gemini_model=settings_dict["gemini_model"],
        gemini_configured=is_configured,
        is_demo_mode=not is_configured
    )

@router.get("", response_model=SettingsResponse)
def fetch_settings(db: Session = Depends(get_db)):
    return get_current_settings(db)

@router.put("", response_model=SettingsResponse)
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        if value is None:
            continue
        setting = db.query(AppSetting).filter(AppSetting.key == key).first()
        str_val = str(value)
        if setting:
            setting.value = str_val
        else:
            db.add(AppSetting(key=key, value=str_val))
    
    db.commit()

    if "gemini_model" in updates and updates["gemini_model"]:
        vision_service.model_name = updates["gemini_model"]

    return get_current_settings(db)

@router.post("/reset-demo", status_code=status.HTTP_200_OK)
def restore_demo_dataset(db: Session = Depends(get_db)):
    """Reset the database and restore the clean 30-day realistic demo dataset."""
    seed_database(db, force_reset=True)
    return {
        "status": "success",
        "message": "Demo dataset restored successfully with 30 days of representative meal-service and waste records."
    }
