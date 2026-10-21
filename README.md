# Smart Waste AI — AI-Powered Food Waste Detection & Prediction System

A complete food-service operations web application designed for commercial kitchens, hotels, cafeterias, and banquet halls to systematically reduce avoidable food waste and optimize daily portion batching.

---

## 🍽️ Central Operational Workflow

```
[Capture Waste Photo] 
        ↓
[AI Vision Categorization] (Gemini Vision API / Transparent Demo Mode)
        ↓
[Staff Verification] (Human confirms/edits dish & category)
        ↓
[Record Scale Weight & Meal Data] (Physical scale reading in grams/kg)
        ↓
[Calculate Estimated Waste Cost] (Weight kg × Ingredient Cost/kg)
        ↓
[Historical Pattern Analysis] (Prep surplus vs Plate waste vs Spoilage)
        ↓
[Tomorrow's Prep Planner] (4-week weekday demand forecasting + safety buffer)
```

> **Core Architectural Principle:** AI image analysis never claims to measure physical weight or portion volume from a 2D photograph. Weight is recorded strictly from calibrated physical kitchen scales, and AI categorization requires human staff verification before records are marked verified.

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** React 18 with TypeScript and Vite
- **Styling:** Tailwind CSS with a curated warm off-white (`#faf9f5`) and forest green (`#15803d`) food-tech aesthetic
- **Icons:** Lucide React
- **Analytics & Visualizations:** Recharts (Area charts, Bar charts, Donut distributions)
- **Navigation:** React Router v6 with desktop sidebar and responsive mobile drawer

### Backend
- **Framework:** Python FastAPI with async route handlers
- **Validation:** Pydantic v2 schemas and models
- **Persistence:** SQLAlchemy 2.0 ORM with connection pooling
- **Database:** SQLite for default zero-config local development, with full PostgreSQL support via `DATABASE_URL`
- **Analytics:** Deterministic statistical grouping and trend calculations

### AI Vision Integration
- **Dedicated Service Interface:** `app.services.vision_service.VisionService`
- **Live Model:** Google Gemini Vision (`gemini-2.0-flash` or configurable via `GEMINI_MODEL`)
- **Demo Mode Fallback:** Automatically activated when `GEMINI_API_KEY` is not set, providing transparent, explicitly labeled kitchen demo classification
- **Security:** Private API keys are strictly confined to the backend environment and never exposed to the frontend

---

## 📱 Application Screens & Features

| Route | Screen | Description |
|---|---|---|
| `/dashboard` | **Kitchen Waste Dashboard** | Executive KPI summary (Total waste kg, estimated financial loss ₹, daily averages), Recharts waste trend area chart, meal period donut breakdown, top wasted dishes ranking, waste source breakdown (prep surplus vs plate returns vs spoilage), recent events table, and operational filter presets. |
| `/log-waste` | **Log Food Waste** | Complete logging workflow featuring drag-and-drop file upload, webcam scale capture, sample image selector, AI Vision categorization, staff verification toggle, scale weight input (kg/grams), ingredient cost per kg, meal service portion tracking, and instant cost calculation. |
| `/records` | **Waste Audit Records** | Full audit log with live keyword search, multi-faceted filtering (date range, meal period, waste source, category), sortable headers, image thumbnails, record details modal, in-line edit modal, and delete confirmation dialogs. |
| `/insights` | **Waste Analytics & Patterns** | Period-over-period comparison (e.g. Current 14d vs Prior 14d baseline) with percentage deltas, category cost contribution analysis, and recurring kitchen pattern explanations. |
| `/prep-planner` | **Tomorrow's Prep Planner** | **Key differentiator:** Calculates recommended portion preparation quantities for tomorrow based on 4-week same-weekday served demand, applying a configurable safety buffer (default 5%) rounded up to whole portions. |
| `/settings` | **Kitchen & AI Settings** | Configure outlet/kitchen name, currency symbol, weight display units, prep safety buffer percentage, Gemini Vision model selection, live test vision connection button, and safe demo dataset restore. |

---

## 🗄️ Relational Data Model

- **`dishes`**: Kitchen menu items, category, default ingredient cost per kg, description, active status.
- **`meal_services`**: Tracks daily meal period records (`date`, `dish_id`, `meal_period`, `portions_prepared`, `portions_served`). Unique constraint on `(date, dish_id, meal_period)`.
- **`waste_events`**: Detailed scale weigh-in events (`timestamp`, `dish_id`, `meal_service_id`, `category`, `waste_type`, `weight_grams`, `ingredient_cost_per_kg`, `estimated_cost`, `image_url`, `ai_suggested_category`, `staff_confirmed_category`, `is_verified`, `notes`).
- **`app_settings`**: Key-value table persisting outlet name, currency, weight units, safety buffer percentage, and AI model settings.

---

## 📊 Tomorrow's Prep Planner Algorithm

For any selected target production date (e.g. Thursday) and dish:
1. **Target Window:** Analyzes the preceding 4 weeks (`target_date - 28d` to `target_date - 1d`).
2. **Weekday Matching:** Isolates meal-service records falling on the exact same weekday (e.g. past 4 Thursdays) for that meal period.
3. **Primary Method (`same_weekday_4w`):** If $\ge 2$ same-weekday records exist:
   $$\text{Forecast Served} = \text{round}\left(\frac{\sum \text{Portions Served}}{N}\right)$$
4. **Recent-Data Fallback (`recent_days_fallback`):** If $< 2$ matching weekday records exist, calculates average from recent daily services and flags an explicit warning banner: `⚠️ Insufficient same-weekday history`.
5. **Safety Buffer Application:**
   $$\text{Recommended Prep} = \left\lceil \text{Forecast Served} \times \left(1 + \frac{\text{Buffer}\%}{100}\right) \right\rceil$$
6. **Kitchen Rationale:** Automatically generates a plain-English explanation displaying historical served averages, over-preparation surplus, and resulting waste weight in kg.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js:** v18+ (tested on v26)
- **Python:** 3.9+ (tested on 3.9.6)
- **npm:** v9+

### 1. Backend Setup

```bash
# Navigate to project root
cd /Users/samarthsingh/Downloads/smart_waste_ai_prototype

# Activate virtualenv (already provisioned in backend/venv)
source backend/venv/bin/activate

# (Optional) Install dependencies if setting up on a new machine
pip install -r backend/requirements.txt

# Copy environment configuration
cp backend/.env.example backend/.env

# (Optional) Add your Google Gemini API key to backend/.env:
# GEMINI_API_KEY=AIzaSy...
# If left empty, the application runs seamlessly in labelled Demo Mode!

# Run backend tests to verify database and recommendation engine
PYTHONPATH=backend pytest backend/tests

# Start FastAPI development server
PYTHONPATH=backend uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend API will be available at:
- **API Base:** `http://127.0.0.1:8000/api`
- **Interactive Swagger Docs:** `http://127.0.0.1:8000/docs`
- **Health Check:** `http://127.0.0.1:8000/api/health`

### 2. Frontend Setup

In a new terminal window:

```bash
# Navigate to frontend directory
cd /Users/samarthsingh/Downloads/smart_waste_ai_prototype/frontend

# (Optional) Install dependencies if setting up on a new machine
npm install

# Run type check and production build
npm run build

# Start Vite development server
npm run dev -- --host 127.0.0.1 --port 5173
```

Open your browser at **`http://127.0.0.1:5173`**.

---

## 🤖 Configuring Live AI vs Demo Mode

| Mode | Trigger | Behavior |
|---|---|---|
| **Demo Fallback Mode** *(Default)* | `GEMINI_API_KEY` is empty or unset in `backend/.env` | The application operates with a transparent kitchen demo classifier. Every suggestion is explicitly labeled as `Demo Mode (Simulated Kitchen Vision)`. Human verification is always required. |
| **Live Gemini Vision Mode** | Valid `GEMINI_API_KEY` set in `backend/.env` | Calls Google Gemini Vision API (`gemini-2.0-flash`) with structured output parsing for food category and dish classification. Marked with a `Live Gemini Vision` badge. |

---

## 🧪 Automated Test Suite

Run the comprehensive pytest suite:

```bash
PYTHONPATH=backend backend/venv/bin/pytest backend/tests -v
```

Verified test coverage includes:
- `test_health_check`: Validates system status and AI engine reporting.
- `test_list_dishes`: Verifies active menu database records.
- `test_create_waste_event_and_cost_calculation`: Asserts cost formula $\text{weight kg} \times \text{cost/kg}$.
- `test_dashboard_summary`: Asserts KPI calculations and Recharts series derivation from DB.
- `test_settings_and_update`: Asserts persistence of safety buffer and kitchen preferences.
- `test_vision_sample_analysis`: Tests image classification and demo fallback labeling.
- `test_recommendation_math_and_logic`: Asserts 4-week weekday demand forecast and `math.ceil` buffer addition.
- `test_recommendation_safety_buffer_update`: Verifies dynamic updates to safety buffer percentage.
