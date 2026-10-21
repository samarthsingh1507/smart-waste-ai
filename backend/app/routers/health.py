from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.services.vision_service import vision_service
from app.config import settings

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("")
def check_health(db: Session = Depends(get_db)):
    db_healthy = True
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_healthy = False

    gemini_configured = vision_service.is_configured()

    return {
        "status": "healthy" if db_healthy else "degraded",
        "database": "connected" if db_healthy else "disconnected",
        "ai_vision": {
            "gemini_configured": gemini_configured,
            "model": settings.GEMINI_MODEL,
            "demo_fallback_active": not gemini_configured,
            "status_label": "Live Gemini AI Active" if gemini_configured else "Demo Mode (Simulated Classifier Active)"
        },
        "version": settings.VERSION
    }
