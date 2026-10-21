import random
from datetime import date, datetime, timedelta
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from sqlalchemy.orm import Session

from app.database import engine, Base, SessionLocal
from app.models import Dish, MealService, WasteEvent, AppSetting
from app.config import settings

SAMPLE_DISHES = [
    {
        "name": "Hyderabadi Veg Biryani",
        "category": "Rice & Grains",
        "default_cost_per_kg": 160.0,
        "description": "Fragrant basmati rice layered with vegetables, saffron and whole spices.",
        "periods": ["lunch", "dinner"],
        "base_served": 48,
        "prep_overage_pct": 0.16
    },
    {
        "name": "Paneer Butter Masala",
        "category": "Curries & Gravies",
        "default_cost_per_kg": 240.0,
        "description": "Rich tomato and cashew gravy with soft cottage cheese cubes.",
        "periods": ["lunch", "dinner"],
        "base_served": 42,
        "prep_overage_pct": 0.12
    },
    {
        "name": "Dal Makhani",
        "category": "Curries & Gravies",
        "default_cost_per_kg": 130.0,
        "description": "Slow-cooked black lentils with cream and butter.",
        "periods": ["lunch", "dinner"],
        "base_served": 50,
        "prep_overage_pct": 0.14
    },
    {
        "name": "Butter Garlic Naan",
        "category": "Breads & Flatbreads",
        "default_cost_per_kg": 110.0,
        "description": "Clay-oven baked leavened flatbread brushed with garlic butter.",
        "periods": ["dinner"],
        "base_served": 65,
        "prep_overage_pct": 0.10
    },
    {
        "name": "Fresh Garden Green Salad",
        "category": "Salads & Starters",
        "default_cost_per_kg": 90.0,
        "description": "Crisp cucumbers, tomatoes, carrots and fresh greens.",
        "periods": ["lunch", "dinner"],
        "base_served": 35,
        "prep_overage_pct": 0.15
    },
    {
        "name": "Mixed Vegetable Poriyal",
        "category": "Vegetables & Sides",
        "default_cost_per_kg": 120.0,
        "description": "Dry sautéed seasonal vegetables with grated coconut and mustard seeds.",
        "periods": ["lunch"],
        "base_served": 38,
        "prep_overage_pct": 0.13
    },
    {
        "name": "Steamed Basmati Rice",
        "category": "Rice & Grains",
        "default_cost_per_kg": 80.0,
        "description": "Fluffy long-grain aromatic white basmati rice.",
        "periods": ["lunch", "dinner"],
        "base_served": 55,
        "prep_overage_pct": 0.18
    },
    {
        "name": "Gulab Jamun",
        "category": "Desserts & Sweets",
        "default_cost_per_kg": 210.0,
        "description": "Deep-fried milk dumplings soaked in rose and cardamom sugar syrup.",
        "periods": ["dinner"],
        "base_served": 40,
        "prep_overage_pct": 0.08
    },
    {
        "name": "Steamed Idli with Sambar",
        "category": "Rice & Grains",
        "default_cost_per_kg": 95.0,
        "description": "Fluffy steamed fermented rice cakes served with spiced lentil stew.",
        "periods": ["breakfast"],
        "base_served": 45,
        "prep_overage_pct": 0.10
    },
    {
        "name": "Masala Omelette & Toast",
        "category": "Salads & Starters",
        "default_cost_per_kg": 140.0,
        "description": "Farm-fresh spiced egg omelette served with buttered toasted bread.",
        "periods": ["breakfast"],
        "base_served": 32,
        "prep_overage_pct": 0.08
    }
]

def create_sample_images():
    """Generate realistic illustrative food waste sample images with labels."""
    samples = [
        ("sample_biryani.jpg", "Hyderabadi Veg Biryani - Rice Surplus", (210, 160, 80), (120, 80, 20)),
        ("sample_paneer.jpg", "Paneer Butter Masala - Plate Returns", (230, 120, 70), (160, 50, 20)),
        ("sample_dal.jpg", "Dal Makhani - Preparation Surplus", (100, 70, 50), (60, 40, 30)),
        ("sample_naan.jpg", "Butter Garlic Naan - Crust Waste", (220, 190, 140), (140, 110, 70)),
        ("sample_salad.jpg", "Garden Salad - Preparation Trimmings", (90, 160, 90), (40, 100, 40)),
        ("sample_rice.jpg", "Steamed Basmati Rice - Hot Well Surplus", (240, 240, 230), (180, 180, 170)),
        ("sample_jamun.jpg", "Gulab Jamun - Buffet Display Remainder", (120, 70, 40), (70, 30, 10)),
        ("sample_idli.jpg", "Steamed Idli - Breakfast Surplus", (235, 235, 225), (160, 150, 130)),
    ]

    for filename, title, bg_color, accent_color in samples:
        target_path = settings.UPLOAD_DIR / filename
        sample_path = settings.SAMPLE_IMAGES_DIR / filename

        img = Image.new("RGB", (640, 480), color=bg_color)
        draw = ImageDraw.Draw(img)

        # Draw decorative plate / kitchen container shape
        draw.ellipse([80, 50, 560, 430], fill=accent_color, outline=(255, 255, 255), width=4)
        draw.ellipse([120, 90, 520, 390], fill=bg_color)

        # Text banner
        draw.rectangle([0, 400, 640, 480], fill=(20, 20, 20))
        draw.text((20, 415), f"SMART WASTE AI — {title}", fill=(255, 255, 255))
        draw.text((20, 445), "Sample Kitchen Visual Record (Illustrative Demo Image)", fill=(180, 180, 180))

        img.save(target_path, "JPEG", quality=85)
        img.save(sample_path, "JPEG", quality=85)

def seed_database(db: Session, force_reset: bool = False):
    """Seed ~30 days of realistic commercial kitchen data."""
    # Ensure sample images exist
    create_sample_images()

    if force_reset:
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
    else:
        Base.metadata.create_all(bind=engine)
        if db.query(Dish).count() > 0:
            return  # Already seeded

    # 1. Initialize Settings
    db.add_all([
        AppSetting(key="outlet_name", value=settings.OUTLET_NAME_DEFAULT),
        AppSetting(key="currency", value=settings.CURRENCY_DEFAULT),
        AppSetting(key="weight_unit", value=settings.WEIGHT_UNIT_DEFAULT),
        AppSetting(key="safety_buffer_percent", value=str(settings.SAFETY_BUFFER_DEFAULT_PCT)),
        AppSetting(key="gemini_model", value=settings.GEMINI_MODEL),
    ])
    db.commit()

    # 2. Insert Dishes
    dish_entities = {}
    dish_img_map = {
        "Hyderabadi Veg Biryani": "/uploads/sample_biryani.jpg",
        "Paneer Butter Masala": "/uploads/sample_paneer.jpg",
        "Dal Makhani": "/uploads/sample_dal.jpg",
        "Butter Garlic Naan": "/uploads/sample_naan.jpg",
        "Fresh Garden Green Salad": "/uploads/sample_salad.jpg",
        "Steamed Basmati Rice": "/uploads/sample_rice.jpg",
        "Gulab Jamun": "/uploads/sample_jamun.jpg",
        "Steamed Idli with Sambar": "/uploads/sample_idli.jpg",
    }
    for item in SAMPLE_DISHES:
        dish = Dish(
            name=item["name"],
            category=item["category"],
            default_cost_per_kg=item["default_cost_per_kg"],
            description=item["description"],
            image_url=dish_img_map.get(item["name"]),
            is_active=True
        )
        db.add(dish)
        db.flush()
        dish_entities[item["name"]] = (dish, item)

    db.commit()

    # 3. Generate 30 days of Meal Services and Waste Events
    # Current date anchor: today
    today = date.today()
    random.seed(42)  # Deterministic seed for reproducible patterns

    sample_image_keys = [
        "sample_biryani.jpg", "sample_paneer.jpg", "sample_dal.jpg",
        "sample_naan.jpg", "sample_salad.jpg", "sample_rice.jpg",
        "sample_jamun.jpg", "sample_idli.jpg"
    ]

    for day_offset in range(30, 0, -1):
        service_date = today - timedelta(days=day_offset)
        weekday = service_date.weekday()  # 0=Mon, 4=Fri, 5=Sat, 6=Sun
        is_weekend = weekday in [4, 5, 6]  # Fri, Sat, Sun has ~20-30% higher demand

        for dish_name, (dish, config) in dish_entities.items():
            for period in config["periods"]:
                # Base served demand with weekend bump and weekday noise
                multiplier = 1.25 if is_weekend else 1.0
                noise = random.uniform(-0.10, 0.12)
                served = int(round(config["base_served"] * multiplier * (1 + noise)))
                served = max(15, served)

                # Over-preparation factor (simulate typical kitchen overage of 10-22%)
                overage = config["prep_overage_pct"] + random.uniform(-0.04, 0.05)
                # On Fridays/Saturdays lunch/dinner, chefs tend to overbatch rice & biryani extra
                if "Biryani" in dish.name or "Rice" in dish.name:
                    if weekday in [4, 5]:
                        overage += 0.08

                prepared = int(math_ceil_portions(served * (1 + overage)))
                surplus_portions = max(0, prepared - served)

                # Create MealService record
                ms = MealService(
                    date=service_date,
                    dish_id=dish.id,
                    meal_period=period,
                    portions_prepared=prepared,
                    portions_served=served
                )
                db.add(ms)
                db.flush()

                # Generate waste events
                # A: Preparation surplus (if surplus portions > 0)
                if surplus_portions > 0:
                    # ~220g to 320g per surplus portion
                    grams_per_portion = random.uniform(220, 310)
                    weight_grams = round(surplus_portions * grams_per_portion, 1)
                    cost_per_kg = dish.default_cost_per_kg
                    est_cost = round((weight_grams / 1000.0) * cost_per_kg, 2)

                    # Timestamp within service period hours
                    h = 10 if period == "breakfast" else (14 if period == "lunch" else 22)
                    m = random.randint(10, 50)
                    ts = datetime(service_date.year, service_date.month, service_date.day, h, m)

                    # Assign sample image occasionally
                    img_name = random.choice(sample_image_keys) if random.random() > 0.4 else None
                    img_url = f"/uploads/{img_name}" if img_name else None

                    waste_event = WasteEvent(
                        timestamp=ts,
                        dish_id=dish.id,
                        meal_service_id=ms.id,
                        category=dish.category,
                        waste_type="preparation_surplus",
                        weight_grams=weight_grams,
                        ingredient_cost_per_kg=cost_per_kg,
                        estimated_cost=est_cost,
                        image_url=img_url,
                        ai_suggested_category=dish.category,
                        ai_suggested_dish=dish.name,
                        staff_confirmed_category=dish.category,
                        staff_confirmed_dish=dish.name,
                        is_verified=True,
                        notes=f"DEMO DATA: End-of-service surplus ({surplus_portions} portions unserved from hot well holding).",
                        created_at=ts
                    )
                    db.add(waste_event)

                # B: Plate returns (simulate customer plate scrapings on ~40% of services)
                if random.random() < 0.45:
                    plate_weight = round(random.uniform(350, 1400), 1)
                    cost_per_kg = dish.default_cost_per_kg
                    est_cost = round((plate_weight / 1000.0) * cost_per_kg, 2)
                    h = 10 if period == "breakfast" else (15 if period == "lunch" else 23)
                    ts = datetime(service_date.year, service_date.month, service_date.day, h, random.randint(5, 55))

                    db.add(WasteEvent(
                        timestamp=ts,
                        dish_id=dish.id,
                        meal_service_id=ms.id,
                        category=dish.category,
                        waste_type="plate_returns",
                        weight_grams=plate_weight,
                        ingredient_cost_per_kg=cost_per_kg,
                        estimated_cost=est_cost,
                        image_url=None,
                        ai_suggested_category=dish.category,
                        ai_suggested_dish=dish.name,
                        staff_confirmed_category=dish.category,
                        staff_confirmed_dish=dish.name,
                        is_verified=True,
                        notes="DEMO DATA: Customer dining table plate return scrapings.",
                        created_at=ts
                    ))

                # C: Rare Spoilage (e.g., once every 6 days on perishable items)
                if random.random() < 0.05 and ("Salad" in dish.name or "Paneer" in dish.name):
                    spoilage_weight = round(random.uniform(400, 1100), 1)
                    cost_per_kg = dish.default_cost_per_kg
                    est_cost = round((spoilage_weight / 1000.0) * cost_per_kg, 2)
                    ts = datetime(service_date.year, service_date.month, service_date.day, 8, 30)

                    db.add(WasteEvent(
                        timestamp=ts,
                        dish_id=dish.id,
                        meal_service_id=None,
                        category=dish.category,
                        waste_type="spoilage",
                        weight_grams=spoilage_weight,
                        ingredient_cost_per_kg=cost_per_kg,
                        estimated_cost=est_cost,
                        image_url=None,
                        ai_suggested_category=dish.category,
                        ai_suggested_dish=dish.name,
                        staff_confirmed_category=dish.category,
                        staff_confirmed_dish=dish.name,
                        is_verified=True,
                        notes="DEMO DATA: Cold storage inspection trimmings / shelf-life expiry.",
                        created_at=ts
                    ))

    db.commit()

def math_ceil_portions(num: float) -> int:
    import math
    return math.ceil(num)

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_database(db, force_reset=True)
        print("Demo database seeded successfully with 30 days of data.")
    finally:
        db.close()
