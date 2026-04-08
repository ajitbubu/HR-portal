from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    APP_NAME: str = "DataSafeguard HR"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    DATABASE_URL: str = "postgresql://hruser:hrpass@localhost:5432/datasafeguard_hr"

    SECRET_KEY: str = "datasafeguard-hr-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001", "http://localhost:8000"]

    # Email settings
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = "hr@datasafeguard.ai"
    MAIL_FROM_NAME: str = "DataSafeguard HR"
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_PORT: int = 587
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False
    MAIL_ENABLED: bool = False  # Disabled by default, enable in .env

    # App URL for deep links
    APP_BASE_URL: str = "http://localhost:3000"

    # Microsoft 365 SSO (Azure AD)
    AZURE_CLIENT_ID: str = ""
    AZURE_CLIENT_SECRET: str = ""
    AZURE_TENANT_ID: str = ""
    AZURE_REDIRECT_URI: str = "http://localhost:8000/api/auth/microsoft/callback"

    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    WORK_START_HOUR: int = 9
    WORK_START_MINUTE: int = 0


settings = Settings()
