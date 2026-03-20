from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "DataSafeguard HR"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    DATABASE_URL: str = "postgresql://hruser:hrpass@localhost:5432/datasafeguard_hr"

    SECRET_KEY: str = "datasafeguard-hr-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:8000"]

    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB

    class Config:
        env_file = ".env"


settings = Settings()
