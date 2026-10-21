from datetime import datetime, date

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert data["database"] == "connected"
    assert "ai_vision" in data
    assert "demo_fallback_active" in data["ai_vision"]

def test_list_dishes(client):
    response = client.get("/api/dishes")
    assert response.status_code == 200
    dishes = response.json()
    assert len(dishes) >= 8
    assert any("Biryani" in d["name"] for d in dishes)

def test_create_waste_event_and_cost_calculation(client):
    dishes = client.get("/api/dishes").json()
    dish = dishes[0]
    dish_id = dish["id"]
    cost_per_kg = dish["default_cost_per_kg"]

    weight_grams = 2500.0  # 2.5 kg
    expected_cost = round((weight_grams / 1000.0) * cost_per_kg, 2)

    payload = {
        "dish_id": dish_id,
        "meal_period": "lunch",
        "category": dish["category"],
        "waste_type": "preparation_surplus",
        "weight_grams": weight_grams,
        "ingredient_cost_per_kg": cost_per_kg,
        "staff_confirmed_category": dish["category"],
        "staff_confirmed_dish": dish["name"],
        "is_verified": True,
        "portions_prepared": 50,
        "portions_served": 40,
        "notes": "Test surplus recording"
    }

    response = client.post("/api/waste-events", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["dish_name"] == dish["name"]
    assert data["weight_grams"] == weight_grams
    assert data["weight_kg"] == 2.5
    assert data["estimated_cost"] == expected_cost
    assert data["is_verified"] is True

def test_waste_event_validation_errors(client):
    dishes = client.get("/api/dishes").json()
    dish_id = dishes[0]["id"]

    # 1. Zero or negative weight
    payload_zero_weight = {
        "dish_id": dish_id,
        "meal_period": "lunch",
        "category": "Rice & Grains",
        "waste_type": "preparation_surplus",
        "weight_grams": 0,
        "staff_confirmed_category": "Rice & Grains",
        "staff_confirmed_dish": "Test Dish",
        "is_verified": True
    }
    res = client.post("/api/waste-events", json=payload_zero_weight)
    assert res.status_code == 422

    # 2. Invalid waste_type
    payload_bad_type = {
        "dish_id": dish_id,
        "meal_period": "lunch",
        "category": "Rice & Grains",
        "waste_type": "invalid_type",
        "weight_grams": 500,
        "staff_confirmed_category": "Rice & Grains",
        "staff_confirmed_dish": "Test Dish",
        "is_verified": True
    }
    res = client.post("/api/waste-events", json=payload_bad_type)
    assert res.status_code == 422

    # 3. Non-existent dish_id
    payload_bad_dish = {
        "dish_id": 999999,
        "meal_period": "lunch",
        "category": "Rice & Grains",
        "waste_type": "preparation_surplus",
        "weight_grams": 500,
        "staff_confirmed_category": "Rice & Grains",
        "staff_confirmed_dish": "Nonexistent",
        "is_verified": True
    }
    res = client.post("/api/waste-events", json=payload_bad_dish)
    assert res.status_code == 404

def test_dashboard_analytics_updates_on_new_waste_event(client):
    # Get baseline summary
    baseline = client.get("/api/analytics/dashboard").json()
    init_weight = baseline["total_waste_kg"]
    init_cost = baseline["total_cost"]
    init_count = baseline["records_count"]

    dishes = client.get("/api/dishes").json()
    dish = dishes[0]
    weight_grams = 4000.0  # 4 kg
    cost_per_kg = 200.0
    added_cost = 800.0

    payload = {
        "dish_id": dish["id"],
        "meal_period": "dinner",
        "category": dish["category"],
        "waste_type": "preparation_surplus",
        "weight_grams": weight_grams,
        "ingredient_cost_per_kg": cost_per_kg,
        "staff_confirmed_category": dish["category"],
        "staff_confirmed_dish": dish["name"],
        "is_verified": True,
        "portions_prepared": 60,
        "portions_served": 45,
        "notes": "Testing dashboard real-time recalculation"
    }

    create_res = client.post("/api/waste-events", json=payload)
    assert create_res.status_code == 201
    created_id = create_res.json()["id"]

    # Verify updated summary
    updated = client.get("/api/analytics/dashboard").json()
    assert updated["records_count"] == init_count + 1
    assert round(updated["total_waste_kg"], 2) == round(init_weight + 4.0, 2)
    assert round(updated["total_cost"], 2) == round(init_cost + added_cost, 2)

    # Clean up test event
    del_res = client.delete(f"/api/waste-events/{created_id}")
    assert del_res.status_code == 200

def test_waste_event_crud_persistence(client):
    dishes = client.get("/api/dishes").json()
    dish = dishes[0]

    # Create
    create_res = client.post("/api/waste-events", json={
        "dish_id": dish["id"],
        "meal_period": "lunch",
        "category": dish["category"],
        "waste_type": "plate_returns",
        "weight_grams": 1500,
        "ingredient_cost_per_kg": 100,
        "staff_confirmed_category": dish["category"],
        "staff_confirmed_dish": dish["name"],
        "is_verified": True,
        "notes": "Initial log"
    })
    assert create_res.status_code == 201
    event_id = create_res.json()["id"]

    # Read
    get_res = client.get(f"/api/waste-events/{event_id}")
    assert get_res.status_code == 200
    assert get_res.json()["weight_grams"] == 1500
    assert get_res.json()["estimated_cost"] == 150.0

    # Update (modify weight to 3000g and cost to 120/kg -> cost 360)
    update_res = client.put(f"/api/waste-events/{event_id}", json={
        "weight_grams": 3000,
        "ingredient_cost_per_kg": 120,
        "notes": "Updated notes after scale recheck"
    })
    assert update_res.status_code == 200
    assert update_res.json()["weight_grams"] == 3000
    assert update_res.json()["weight_kg"] == 3.0
    assert update_res.json()["estimated_cost"] == 360.0
    assert update_res.json()["notes"] == "Updated notes after scale recheck"

    # Delete
    del_res = client.delete(f"/api/waste-events/{event_id}")
    assert del_res.status_code == 200

    # Verify not found
    get_after_del = client.get(f"/api/waste-events/{event_id}")
    assert get_after_del.status_code == 404

def test_dashboard_summary(client):
    response = client.get("/api/analytics/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert data["total_waste_kg"] > 0
    assert data["total_cost"] > 0
    assert data["records_count"] > 0
    assert len(data["waste_trend"]) > 0
    assert len(data["top_dishes"]) > 0
    assert len(data["by_meal_period"]) == 3
    assert len(data["by_waste_source"]) == 3
    assert len(data["recent_records"]) > 0

def test_settings_and_update(client):
    res = client.get("/api/settings")
    assert res.status_code == 200
    current = res.json()
    assert "outlet_name" in current
    assert "safety_buffer_percent" in current

    # Update buffer to 8%
    update_res = client.put("/api/settings", json={"safety_buffer_percent": 8.0})
    assert update_res.status_code == 200
    assert update_res.json()["safety_buffer_percent"] == 8.0

    # Restore to 5%
    client.put("/api/settings", json={"safety_buffer_percent": 5.0})

def test_vision_sample_analysis(client):
    response = client.post("/api/vision/analyze", data={"sample_filename": "sample_biryani.jpg"})
    assert response.status_code == 200
    data = response.json()
    assert data["suggested_category"] == "Rice & Grains"
    assert "Biryani" in data["suggested_dish"]
    assert data["is_demo_mode"] in [True, False]

def test_create_custom_dish_with_custom_terms_and_photo(client):
    # 1. Test uploading dish photo
    file_content = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00"
    upload_res = client.post(
        "/api/dishes/upload-photo",
        files={"file": ("custom_dish.jpg", file_content, "image/jpeg")}
    )
    assert upload_res.status_code == 200
    photo_data = upload_res.json()
    assert "image_url" in photo_data
    assert photo_data["image_url"].startswith("/uploads/dish_")

    # 2. Create custom dish with restaurant's own naming terms
    custom_dish_payload = {
        "name": "Chef's Signature Mughlai Paneer Tikka",
        "category": "Tandoor Specials",
        "default_cost_per_kg": 275.50,
        "description": "Slow-smoked paneer cubes with saffron & crushed cardamom",
        "image_url": photo_data["image_url"],
        "is_active": True
    }
    create_res = client.post("/api/dishes", json=custom_dish_payload)
    assert create_res.status_code == 201
    dish = create_res.json()
    assert dish["id"] is not None
    assert dish["name"] == "Chef's Signature Mughlai Paneer Tikka"
    assert dish["category"] == "Tandoor Specials"
    assert dish["default_cost_per_kg"] == 275.50
    assert dish["image_url"] == photo_data["image_url"]

    # 3. List dishes and verify custom dish is present
    list_res = client.get("/api/dishes")
    assert list_res.status_code == 200
    dish_names = [d["name"] for d in list_res.json()]
    assert "Chef's Signature Mughlai Paneer Tikka" in dish_names

    # 4. Log a waste event using this new custom dish
    waste_payload = {
        "dish_id": dish["id"],
        "meal_period": "dinner",
        "category": dish["category"],
        "waste_type": "preparation_surplus",
        "weight_grams": 1200,
        "ingredient_cost_per_kg": dish["default_cost_per_kg"],
        "staff_confirmed_category": dish["category"],
        "staff_confirmed_dish": dish["name"],
        "is_verified": True
    }
    waste_res = client.post("/api/waste-events", json=waste_payload)
    assert waste_res.status_code == 201
    waste_event = waste_res.json()
    assert waste_event["dish_name"] == "Chef's Signature Mughlai Paneer Tikka"
    assert waste_event["estimated_cost"] == round((1.2 * 275.50), 2)

    # 5. Update dish custom terms
    update_res = client.put(f"/api/dishes/{dish['id']}", json={
        "name": "Chef's Royal Mughlai Paneer Tikka",
        "default_cost_per_kg": 290.00
    })
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Chef's Royal Mughlai Paneer Tikka"
    assert update_res.json()["default_cost_per_kg"] == 290.00

    # 6. Delete dish (soft delete because it has linked waste records)
    del_res = client.delete(f"/api/dishes/{dish['id']}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "success"

def test_dashboard_pie_chart_analytics_filtered_and_zero_waste(client):
    # 1. Filtered by meal period (e.g. lunch)
    res_lunch = client.get("/api/analytics/dashboard?meal_period=lunch")
    assert res_lunch.status_code == 200
    data_lunch = res_lunch.json()
    assert len(data_lunch["by_meal_period"]) == 3
    # Slices for other meal periods should have 0 kg
    period_dict = {p["key"]: p["weight_kg"] for p in data_lunch["by_meal_period"]}
    assert period_dict["breakfast"] == 0.0
    assert period_dict["dinner"] == 0.0

    # 2. Future date range with zero waste logged
    res_zero = client.get("/api/analytics/dashboard?date_from=2035-01-01&date_to=2035-01-02")
    assert res_zero.status_code == 200
    data_zero = res_zero.json()
    assert data_zero["total_waste_kg"] == 0.0
    assert data_zero["total_cost"] == 0.0
    for p in data_zero["by_meal_period"]:
        assert p["weight_kg"] == 0.0
        assert p["percentage"] == 0.0
