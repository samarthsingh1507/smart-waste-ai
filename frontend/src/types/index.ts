export interface Dish {
  id: number;
  name: string;
  category: string;
  default_cost_per_kg: number;
  description?: string;
  image_url?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface MealService {
  id: number;
  date: string;
  dish_id: number;
  dish_name?: string;
  meal_period: 'breakfast' | 'lunch' | 'dinner';
  portions_prepared: number;
  portions_served: number;
  created_at: string;
}

export interface WasteEvent {
  id: number;
  timestamp: string;
  dish_id: number;
  dish_name: string;
  meal_service_id?: number | null;
  meal_period?: 'breakfast' | 'lunch' | 'dinner' | null;
  portions_prepared?: number | null;
  portions_served?: number | null;
  category: string;
  waste_type: 'preparation_surplus' | 'plate_returns' | 'spoilage';
  weight_grams: number;
  weight_kg: number;
  ingredient_cost_per_kg: number;
  estimated_cost: number;
  image_url?: string | null;
  ai_suggested_category?: string | null;
  ai_suggested_dish?: string | null;
  staff_confirmed_category: string;
  staff_confirmed_dish: string;
  is_verified: boolean;
  notes?: string | null;
  created_at: string;
}

export interface WasteEventCreate {
  timestamp?: string;
  dish_id: number;
  date?: string;
  meal_period?: 'breakfast' | 'lunch' | 'dinner';
  portions_prepared?: number;
  portions_served?: number;
  category: string;
  waste_type: 'preparation_surplus' | 'plate_returns' | 'spoilage';
  weight_grams: number;
  ingredient_cost_per_kg?: number;
  image_url?: string | null;
  ai_suggested_category?: string | null;
  ai_suggested_dish?: string | null;
  staff_confirmed_category: string;
  staff_confirmed_dish: string;
  is_verified: boolean;
  notes?: string;
}

export interface VisionAnalysis {
  suggested_category: string;
  suggested_dish: string;
  confidence_label: string;
  is_demo_mode: boolean;
  image_url: string;
  detected_items: string[];
  notes: string;
  dish_id?: number;
  default_cost_per_kg?: number;
}

export interface Settings {
  outlet_name: string;
  currency: string;
  weight_unit: string;
  safety_buffer_percent: number;
  gemini_model: string;
  gemini_configured: boolean;
  is_demo_mode: boolean;
}

export interface WasteTrendItem {
  date: string;
  weight_kg: number;
  estimated_cost: number;
  events_count: number;
}

export interface TopDishItem {
  dish_name: string;
  category: string;
  weight_kg: number;
  estimated_cost: number;
  percentage: number;
}

export interface BreakdownItem {
  name: string;
  key: string;
  weight_kg: number;
  estimated_cost: number;
  percentage: number;
}

export interface DashboardSummary {
  total_waste_kg: number;
  total_cost: number;
  records_count: number;
  waste_trend: WasteTrendItem[];
  top_dishes: TopDishItem[];
  by_meal_period: BreakdownItem[];
  by_waste_source: BreakdownItem[];
  recent_records: WasteEvent[];
  key_insights: string[];
  filter_period_days: number;
  outlet_name: string;
  currency: string;
  weight_unit: string;
}

export interface PrepRecommendationItem {
  dish_id: number;
  dish_name: string;
  category: string;
  meal_period: string;
  target_date: string;
  target_day_name: string;
  forecast_served_portions: number;
  recommended_prep_portions: number;
  safety_buffer_percent: number;
  buffer_portions: number;
  historical_avg_prepared: number;
  historical_avg_served: number;
  historical_avg_waste_kg: number;
  historical_surplus_portions: number;
  historical_records_count: number;
  method: string;
  is_insufficient_history: boolean;
  explanation: string;
}

export interface PrepPlannerResponse {
  target_date: string;
  target_day_name: string;
  safety_buffer_percent: number;
  total_recommended_dishes: number;
  recommendations: PrepRecommendationItem[];
  summary_notes: string[];
}

export interface CategoryBreakdownItem {
  category: string;
  weight_kg: number;
  cost: number;
  percentage: number;
  count: number;
}

export interface RecurringPattern {
  title: string;
  severity: 'low' | 'medium' | 'high';
  finding: string;
  action: string;
}

export interface InsightsResponse {
  period_days: number;
  period_a_start: string;
  period_a_end: string;
  period_b_start: string;
  period_b_end: string;
  current_period: {
    weight_kg: number;
    cost: number;
    prep_surplus_kg: number;
    plate_returns_kg: number;
  };
  previous_period: {
    weight_kg: number;
    cost: number;
    prep_surplus_kg: number;
    plate_returns_kg: number;
  };
  changes: {
    weight_change_pct: number;
    cost_change_pct: number;
  };
  category_breakdown: CategoryBreakdownItem[];
  recurring_patterns: RecurringPattern[];
  currency: string;
}

export interface SampleImage {
  filename: string;
  url: string;
  label: string;
}
