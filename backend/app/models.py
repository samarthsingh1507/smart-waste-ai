from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, Date, ForeignKey, UniqueConstraint, Text
from sqlalchemy.orm import relationship
from app.database import Base

class Dish(Base):
    __tablename__ = "dishes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), unique=True, index=True, nullable=False)
    category = Column(String(80), nullable=False, index=True)
    default_cost_per_kg = Column(Float, nullable=False, default=150.0)
    description = Column(String(255), nullable=True)
    image_url = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    meal_services = relationship("MealService", back_populates="dish", cascade="all, delete-orphan")
    waste_events = relationship("WasteEvent", back_populates="dish", cascade="all, delete-orphan")


class MealService(Base):
    __tablename__ = "meal_services"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, index=True, nullable=False)
    dish_id = Column(Integer, ForeignKey("dishes.id", ondelete="CASCADE"), nullable=False, index=True)
    meal_period = Column(String(30), nullable=False, index=True)  # 'breakfast', 'lunch', 'dinner'
    portions_prepared = Column(Integer, nullable=False, default=0)
    portions_served = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("date", "dish_id", "meal_period", name="uq_meal_service_date_dish_period"),
    )

    dish = relationship("Dish", back_populates="meal_services")
    waste_events = relationship("WasteEvent", back_populates="meal_service")


class WasteEvent(Base):
    __tablename__ = "waste_events"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, index=True, nullable=False, default=datetime.utcnow)
    dish_id = Column(Integer, ForeignKey("dishes.id", ondelete="CASCADE"), nullable=False, index=True)
    meal_service_id = Column(Integer, ForeignKey("meal_services.id", ondelete="SET NULL"), nullable=True, index=True)
    
    category = Column(String(80), nullable=False, index=True)
    waste_type = Column(String(40), nullable=False, index=True)  # 'preparation_surplus', 'plate_returns', 'spoilage'
    weight_grams = Column(Float, nullable=False)
    ingredient_cost_per_kg = Column(Float, nullable=False, default=0.0)
    estimated_cost = Column(Float, nullable=False, default=0.0)
    
    image_url = Column(String(255), nullable=True)
    ai_suggested_category = Column(String(80), nullable=True)
    ai_suggested_dish = Column(String(120), nullable=True)
    staff_confirmed_category = Column(String(80), nullable=False)
    staff_confirmed_dish = Column(String(120), nullable=False)
    is_verified = Column(Boolean, default=True, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    dish = relationship("Dish", back_populates="waste_events")
    meal_service = relationship("MealService", back_populates="waste_events")


class AppSetting(Base):
    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(60), unique=True, index=True, nullable=False)
    value = Column(String(255), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
