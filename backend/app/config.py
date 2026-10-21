import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Waste AI"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/smart_waste.db")
    
    # Gemini AI configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    
    # Upload storage
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    SAMPLE_IMAGES_DIR: Path = BASE_DIR / "sample_images"
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    
    # Defaults
    OUTLET_NAME_DEFAULT: str = "Green Olive Bistro & Banquet"
    CURRENCY_DEFAULT: str = "₹"
    WEIGHT_UNIT_DEFAULT: str = "kg"
    SAFETY_BUFFER_DEFAULT_PCT: float = 5.0
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

    model_config = {
        "env_file": ".env",
        "extra": "allow"
    }

settings = Settings()

# Ensure directories exist
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.SAMPLE_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
