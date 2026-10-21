import datetime as dt
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator, ConfigDict

# ----------------- Dish Schemas -----------------
class DishBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    category: str = Field(..., min_length=2, max_length=80)
    default_cost_per_kg: float = Field(..., ge=0)
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True

class DishCreate(DishBase):
    pass

class DishUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=120)
    category: Optional[str] = Field(None, min_length=2, max_length=80)
    default_cost_per_kg: Optional[float] = Field(None, ge=0)
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None

class DishResponse(DishBase):
    id: int
    created_at: dt.datetime
    model_config = ConfigDict(from_attributes=True)


# ----------------- Meal Service Schemas -----------------
class MealServiceBase(BaseModel):
    date: dt.date
    dish_id: int
    meal_period: str = Field(..., pattern="^(breakfast|lunch|dinner)$")
    portions_prepared: int = Field(0, ge=0)
    portions_served: int = Field(0, ge=0)

class MealServiceCreate(MealServiceBase):
    pass

class MealServiceResponse(MealServiceBase):
    id: int
    dish_name: Optional[str] = None
    created_at: dt.datetime
    model_config = ConfigDict(from_attributes=True)


# ----------------- Waste Event Schemas -----------------
class WasteEventCreate(BaseModel):
    timestamp: Optional[dt.datetime] = None
    dish_id: int
    date: Optional[dt.date] = None
    meal_period: Optional[str] = Field("lunch", pattern="^(breakfast|lunch|dinner)$")
    portions_prepared: Optional[int] = Field(None, ge=0)
    portions_served: Optional[int] = Field(None, ge=0)
    
    category: str
    waste_type: str = Field(..., pattern="^(preparation_surplus|plate_returns|spoilage)$")
    weight_grams: float = Field(..., gt=0)
    ingredient_cost_per_kg: Optional[float] = Field(None, ge=0)
    
    image_url: Optional[str] = None
    ai_suggested_category: Optional[str] = None
    ai_suggested_dish: Optional[str] = None
    staff_confirmed_category: str
    staff_confirmed_dish: str
    is_verified: bool = True
    notes: Optional[str] = None

class WasteEventUpdate(BaseModel):
    dish_id: Optional[int] = None
    category: Optional[str] = None
    waste_type: Optional[str] = Field(None, pattern="^(preparation_surplus|plate_returns|spoilage)$")
    weight_grams: Optional[float] = Field(None, gt=0)
    ingredient_cost_per_kg: Optional[float] = Field(None, ge=0)
    staff_confirmed_category: Optional[str] = None
    staff_confirmed_dish: Optional[str] = None
    is_verified: Optional[bool] = None
    notes: Optional[str] = None

class WasteEventResponse(BaseModel):
    id: int
    timestamp: dt.datetime
    dish_id: int
    dish_name: str
    meal_service_id: Optional[int] = None
    meal_period: Optional[str] = None
    portions_prepared: Optional[int] = None
    portions_served: Optional[int] = None
    
    category: str
    waste_type: str
    weight_grams: float
    weight_kg: float
    ingredient_cost_per_kg: float
    estimated_cost: float
    
    image_url: Optional[str] = None
    ai_suggested_category: Optional[str] = None
    ai_suggested_dish: Optional[str] = None
    staff_confirmed_category: str
    staff_confirmed_dish: str
    is_verified: bool
    notes: Optional[str] = None
    created_at: dt.datetime
    model_config = ConfigDict(from_attributes=True)


# ----------------- Vision Schemas -----------------
class VisionAnalysisResponse(BaseModel):
    suggested_category: str
    suggested_dish: str
    confidence_label: str
    is_demo_mode: bool
    image_url: str
    detected_items: List[str]
    notes: str
    dish_id: Optional[int] = None
    default_cost_per_kg: Optional[float] = None


# ----------------- Settings Schemas -----------------
class SettingsUpdate(BaseModel):
    outlet_name: Optional[str] = None
    currency: Optional[str] = None
    weight_unit: Optional[str] = None
    safety_buffer_percent: Optional[float] = Field(None, ge=0, le=50)
    gemini_model: Optional[str] = None

class SettingsResponse(BaseModel):
    outlet_name: str
    currency: str
    weight_unit: str
    safety_buffer_percent: float
    gemini_model: str
    gemini_configured: bool
    is_demo_mode: bool


# ----------------- Analytics Schemas -----------------
class WasteTrendItem(BaseModel):
    date: str
    weight_kg: float
    estimated_cost: float
    events_count: int

class TopDishItem(BaseModel):
    dish_name: str
    category: str
    weight_kg: float
    estimated_cost: float
    percentage: float

class BreakdownItem(BaseModel):
    name: str
    key: str
    weight_kg: float
    estimated_cost: float
    percentage: float

class DashboardSummaryResponse(BaseModel):
    total_waste_kg: float
    total_cost: float
    records_count: int
    waste_trend: List[WasteTrendItem]
    top_dishes: List[TopDishItem]
    by_meal_period: List[BreakdownItem]
    by_waste_source: List[BreakdownItem]
    recent_records: List[WasteEventResponse]
    key_insights: List[str]
    filter_period_days: int
    outlet_name: str
    currency: str
    weight_unit: str


# ----------------- Prep Planner Schemas -----------------
class PrepRecommendationItem(BaseModel):
    dish_id: int
    dish_name: str
    category: str
    meal_period: str
    target_date: str
    target_day_name: str
    forecast_served_portions: int
    recommended_prep_portions: int
    safety_buffer_percent: float
    buffer_portions: int
    
    historical_avg_prepared: float
    historical_avg_served: float
    historical_avg_waste_kg: float
    historical_surplus_portions: float
    historical_records_count: int
    
    method: str  # 'same_weekday_4w' or 'recent_days_fallback'
    is_insufficient_history: bool
    explanation: str

class PrepPlannerResponse(BaseModel):
    target_date: str
    target_day_name: str
    safety_buffer_percent: float
    total_recommended_dishes: int
    recommendations: List[PrepRecommendationItem]
    summary_notes: List[str]
