import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.seed_data import seed_database
from app.routers import (
    health,
    dishes,
    meal_services,
    waste_events,
    vision,
    analytics,
    recommendations,
    settings as settings_router
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure database tables exist and seed initial demo data if empty
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Auto-migrate image_url column on dishes if missing
    with engine.connect() as conn:
        from sqlalchemy import inspect, text
        insp = inspect(engine)
        cols = [c["name"] for c in insp.get_columns("dishes")]
        if "image_url" not in cols:
            logger.info("Migrating dishes table: adding image_url column...")
            conn.execute(text("ALTER TABLE dishes ADD COLUMN image_url VARCHAR(255);"))
            conn.commit()

    db = SessionLocal()
    try:
        logger.info("Checking database demo seed status...")
        seed_database(db, force_reset=False)
    finally:
        db.close()
        
    yield
    # Shutdown logic if any
    logger.info("Shutting down Smart Waste AI API...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for Smart Waste AI — Food waste detection, cost estimation, and portion prep prediction.",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploaded media directory
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers
app.include_router(health.router, prefix=settings.API_V1_PREFIX)
app.include_router(dishes.router, prefix=settings.API_V1_PREFIX)
app.include_router(meal_services.router, prefix=settings.API_V1_PREFIX)
app.include_router(waste_events.router, prefix=settings.API_V1_PREFIX)
app.include_router(vision.router, prefix=settings.API_V1_PREFIX)
app.include_router(analytics.router, prefix=settings.API_V1_PREFIX)
app.include_router(recommendations.router, prefix=settings.API_V1_PREFIX)
app.include_router(settings_router.router, prefix=settings.API_V1_PREFIX)

@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "api_v1_prefix": settings.API_V1_PREFIX
    }
