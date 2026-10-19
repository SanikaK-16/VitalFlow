import os

class Settings:
    PROJECT_NAME: str = "VitalFlow Emergency Operations Platform"
    VERSION: str = "3.0.0"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "vitalflow-super-secret-production-jwt-key-3.0")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    
    # Auto-fallback to SQLite if Postgres connection isn't configured, or use SQLite directly
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./vitalflow.db")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # AI Engine Constants
    NEWS2_P1_THRESHOLD: int = 7
    P1_SCORE_MIN: float = 85.0
    P2_SCORE_MIN: float = 70.0
    P3_SCORE_MIN: float = 40.0
    
    # Aging parameters
    AGING_INTERVAL_SECONDS: int = 30
    AGING_RATE_PER_MIN: float = 0.5
    AGING_MAX_BOOST: float = 20.0

settings = Settings()
