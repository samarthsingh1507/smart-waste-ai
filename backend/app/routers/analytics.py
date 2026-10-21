from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.analytics_service import AnalyticsService
from app.schemas import DashboardSummaryResponse

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/dashboard", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    meal_period: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Retrieve full dashboard KPI summary, trends, breakdowns and recent records."""
    return AnalyticsService.get_dashboard_summary(
        db=db,
        date_from=date_from,
        date_to=date_to,
        meal_period=meal_period
    )

@router.get("/insights")
def get_deep_dive_insights(
    days: int = Query(14, ge=7, le=90),
    db: Session = Depends(get_db)
):
    """Retrieve period-over-period comparison, category splits, and recurring kitchen patterns."""
    return AnalyticsService.get_insights(db=db, days=days)
