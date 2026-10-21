import os
import uuid
import shutil
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Dish
from app.services.vision_service import vision_service
from app.schemas import VisionAnalysisResponse
from app.config import settings

router = APIRouter(prefix="/vision", tags=["AI Vision"])

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}

@router.get("/samples")
def list_sample_images():
    """List illustrative sample images available for fast demonstration."""
    samples = []
    if settings.SAMPLE_IMAGES_DIR.exists():
        for p in settings.SAMPLE_IMAGES_DIR.glob("*.jpg"):
            samples.append({
                "filename": p.name,
                "url": f"/uploads/{p.name}",
                "label": p.stem.replace("sample_", "").replace("_", " ").title()
            })
    return samples

@router.post("/analyze", response_model=VisionAnalysisResponse)
async def analyze_waste_photo(
    file: Optional[UploadFile] = File(None),
    sample_filename: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Analyze food waste image using Google Gemini Vision or labelled Demo Mode fallback.
    Accepts direct image file upload or selection from demo sample library.
    """
    image_rel_url = None
    target_path = None
    filename_hint = ""

    if file and file.filename:
        # Validate content type
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid image type '{file.content_type}'. Supported: JPEG, PNG, WEBP."
            )

        # Generate safe unique filename
        ext = Path(file.filename).suffix.lower() or ".jpg"
        unique_name = f"upload_{uuid.uuid4().hex[:12]}{ext}"
        target_path = settings.UPLOAD_DIR / unique_name
        filename_hint = file.filename

        # Stream & validate size
        total_size = 0
        with open(target_path, "wb") as buffer:
            while chunk := await file.read(1024 * 64):
                total_size += len(chunk)
                if total_size > settings.MAX_UPLOAD_SIZE_BYTES:
                    buffer.close()
                    if target_path.exists():
                        target_path.unlink()
                    raise HTTPException(
                        status_code=413,
                        detail=f"Image exceeds maximum upload limit of {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)}MB."
                    )
                buffer.write(chunk)

        image_rel_url = f"/uploads/{unique_name}"

    elif sample_filename:
        # User selected an existing sample file
        clean_name = Path(sample_filename).name
        sample_source = settings.SAMPLE_IMAGES_DIR / clean_name
        if not sample_source.exists():
            sample_source = settings.UPLOAD_DIR / clean_name

        if not sample_source.exists():
            raise HTTPException(status_code=404, detail="Selected sample image not found.")

        target_path = sample_source
        filename_hint = clean_name
        image_rel_url = f"/uploads/{clean_name}"
    else:
        raise HTTPException(
            status_code=400,
            detail="Please provide an image file or choose an illustrative sample image."
        )

    # Perform analysis through dedicated VisionService
    result = vision_service.analyze_image(target_path, filename_hint=filename_hint)

    # Correlate with existing dishes in database
    matched_dish = None
    dishes = db.query(Dish).filter(Dish.is_active == True).all()

    # Exact or substring match on dish name
    for d in dishes:
        if d.name.lower() in result["suggested_dish"].lower() or result["suggested_dish"].lower() in d.name.lower():
            matched_dish = d
            break

    # If no dish match, match on category
    if not matched_dish:
        for d in dishes:
            if d.category.lower() == result["suggested_category"].lower():
                matched_dish = d
                break

    return VisionAnalysisResponse(
        suggested_category=result["suggested_category"],
        suggested_dish=matched_dish.name if matched_dish else result["suggested_dish"],
        confidence_label=result["confidence_label"],
        is_demo_mode=result["is_demo_mode"],
        image_url=image_rel_url,
        detected_items=result["detected_items"],
        notes=result["notes"],
        dish_id=matched_dish.id if matched_dish else (dishes[0].id if dishes else None),
        default_cost_per_kg=matched_dish.default_cost_per_kg if matched_dish else 150.0
    )
