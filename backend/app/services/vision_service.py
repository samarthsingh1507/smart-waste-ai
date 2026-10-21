import os
import json
import logging
import base64
from pathlib import Path
from typing import Optional, Dict, Any, List
from PIL import Image
import io

from app.config import settings

logger = logging.getLogger(__name__)

class VisionService:
    """
    Dedicated Vision Service interface for food waste image identification.
    Supports live Google Gemini Vision API when configured, and falls back
    to an explicitly labeled demo classifier when GEMINI_API_KEY is absent.
    """

    SUPPORTED_CATEGORIES = [
        "Rice & Grains",
        "Curries & Gravies",
        "Breads & Flatbreads",
        "Salads & Starters",
        "Vegetables & Sides",
        "Desserts & Sweets",
        "Soups & Beverages"
    ]

    # Pre-mapped demo library for deterministic, realistic demo classification
    DEMO_PATTERNS = [
        {"keywords": ["biryani", "pulao", "rice", "grain"], "category": "Rice & Grains", "dish": "Hyderabadi Veg Biryani", "items": ["Basmati Rice", "Spiced vegetables", "Fried onions"]},
        {"keywords": ["paneer", "curry", "butter masala", "tikka"], "category": "Curries & Gravies", "dish": "Paneer Butter Masala", "items": ["Cottage cheese cubes", "Tomato gravy", "Cream drizzle"]},
        {"keywords": ["dal", "makhani", "lentil", "tadka"], "category": "Curries & Gravies", "dish": "Dal Makhani", "items": ["Black lentils", "Kidney beans", "Butter glaze"]},
        {"keywords": ["naan", "roti", "bread", "paratha", "crust"], "category": "Breads & Flatbreads", "dish": "Butter Garlic Naan", "items": ["Charred flatbread", "Garlic butter"]},
        {"keywords": ["salad", "cucumber", "onion", "lettuce", "green"], "category": "Salads & Starters", "dish": "Fresh Garden Green Salad", "items": ["Sliced cucumber", "Tomato wedges", "Onion rings"]},
        {"keywords": ["sabzi", "veggie", "vegetable", "gobi", "aloo"], "category": "Vegetables & Sides", "dish": "Mixed Vegetable Poriyal", "items": ["Diced carrots", "Beans", "Mustard seasoning"]},
        {"keywords": ["jamun", "sweet", "dessert", "halwa", "kheer"], "category": "Desserts & Sweets", "dish": "Gulab Jamun", "items": ["Deep-fried milk solids", "Cardamom syrup"]},
        {"keywords": ["idli", "sambar", "dosa", "breakfast"], "category": "Rice & Grains", "dish": "Steamed Idli with Sambar", "items": ["Fermented rice cake", "Lentil soup"]},
    ]

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model_name or settings.GEMINI_MODEL

    def is_configured(self) -> bool:
        """Check if genuine Gemini API key is configured."""
        return bool(self.api_key and self.api_key.strip() and not self.api_key.startswith("your_"))

    def analyze_image(self, image_path: Path, filename_hint: str = "") -> Dict[str, Any]:
        """
        Analyze a food waste photo.
        Returns AI suggestion for food category, probable dish, and detected items.
        NOTE: Never fabricates calibrated confidence or measures weight from an image.
        """
        if self.is_configured():
            try:
                return self._call_gemini_vision(image_path)
            except Exception as e:
                logger.warning(f"Live Gemini API call failed: {e}. Falling back to Demo Mode.")
                fallback = self._demo_classify(image_path, filename_hint)
                fallback["is_demo_mode"] = True
                fallback["confidence_label"] = "Demo Mode (Gemini API error fallback)"
                fallback["notes"] = f"Live AI encountered an issue ({str(e)[:100]}). Falling back to kitchen demo classifier."
                return fallback
        else:
            return self._demo_classify(image_path, filename_hint)

    def _call_gemini_vision(self, image_path: Path) -> Dict[str, Any]:
        """
        Call official Gemini Vision API.
        Attempts using google-genai or google.generativeai SDK.
        """
        prompt = (
            "You are a commercial kitchen food waste assistant. Analyze this food waste photograph.\n"
            "Identify the food category and probable dish from standard commercial food service.\n"
            "IMPORTANT CONSTRAINTS:\n"
            "1. Do NOT attempt to measure weight or portion size from this image. Weight is entered from physical kitchen scales.\n"
            "2. Respond with ONLY valid JSON (no markdown fences, no explanatory text outside JSON) in this schema:\n"
            "{\n"
            '  "suggested_category": "One of: Rice & Grains, Curries & Gravies, Breads & Flatbreads, Salads & Starters, Vegetables & Sides, Desserts & Sweets, Soups & Beverages",\n'
            '  "suggested_dish": "Probable dish name",\n'
            '  "detected_items": ["item 1", "item 2", "item 3"],\n'
            '  "visual_observations": "Short factual visual description of what is visible on the tray/plate/container"\n'
            "}"
        )

        try:
            # First try google-genai SDK
            from google import genai
            client = genai.Client(api_key=self.api_key)
            with open(image_path, "rb") as f:
                img_bytes = f.read()

            response = client.models.generate_content(
                model=self.model_name,
                contents=[
                    genai.types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg"),
                    prompt
                ]
            )
            raw_text = response.text.strip()
        except Exception:
            # Secondary try: google.generativeai SDK
            import google.generativeai as gai
            gai.configure(api_key=self.api_key)
            gai_model = gai.GenerativeModel(self.model_name)
            pil_image = Image.open(image_path)
            response = gai_model.generate_content([prompt, pil_image])
            raw_text = response.text.strip()

        # Clean JSON markdown fences if present
        if raw_text.startswith("```"):
            lines = raw_text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            raw_text = "\n".join(lines).strip()

        parsed = json.loads(raw_text)

        category = parsed.get("suggested_category", "Rice & Grains")
        if category not in self.SUPPORTED_CATEGORIES:
            # Map closest or default
            category = "Rice & Grains"

        return {
            "suggested_category": category,
            "suggested_dish": parsed.get("suggested_dish", "Prepared Food Item"),
            "confidence_label": f"Gemini Live Analysis ({self.model_name})",
            "is_demo_mode": False,
            "detected_items": parsed.get("detected_items", ["Identified food components"]),
            "notes": parsed.get("visual_observations", "Visual analysis completed via Gemini Vision API.")
        }

    def _demo_classify(self, image_path: Path, filename_hint: str = "") -> Dict[str, Any]:
        """
        Transparent, clearly-labeled kitchen demo classifier.
        Provides realistic categories for prototype testing without pretending to be live AI.
        """
        search_target = f"{filename_hint} {image_path.name}".lower()

        matched_pattern = None
        for pattern in self.DEMO_PATTERNS:
            for kw in pattern["keywords"]:
                if kw in search_target:
                    matched_pattern = pattern
                    break
            if matched_pattern:
                break

        if not matched_pattern:
            # Deterministic hash-based selection from image file size or name
            try:
                stat = image_path.stat()
                idx = (stat.st_size + len(image_path.name)) % len(self.DEMO_PATTERNS)
                matched_pattern = self.DEMO_PATTERNS[idx]
            except Exception:
                matched_pattern = self.DEMO_PATTERNS[0]

        return {
            "suggested_category": matched_pattern["category"],
            "suggested_dish": matched_pattern["dish"],
            "confidence_label": "Demo Mode (Simulated Kitchen Vision)",
            "is_demo_mode": True,
            "detected_items": matched_pattern["items"],
            "notes": (
                "DEMO MODE: GEMINI_API_KEY is not configured in backend environment. "
                "Simulated classification provided for prototype workflow testing. "
                "Human staff verification is required before logging."
            )
        }

vision_service = VisionService()
