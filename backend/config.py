# config.py
from pydantic import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite:///./test.db"

    # Email Verification
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str
    SMTP_PASSWORD: str
    EMAIL_FROM: str = "noreply@example.com"
    VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24
    FRONTEND_VERIFICATION_URL: str = "https://yourfrontend.com/verify-email"

    # JWT (if needed)
    JWT_SECRET: str = "your-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"  # Loads overrides from .env file
        env_file_encoding = "utf-8"

    # File Upload Limits (in bytes)
    MAX_DOCUMENT_SIZE: int = 5 * 1024 * 1024  # 5MB
    MAX_SPREADSHEET_SIZE: int = 2 * 1024 * 1024  # 2MB
    
    PASSWORD_RESET_TIMEOUT_MINUTES: int = 1440  # 24 hours
    MAX_ATTEMPTS: int = 3 
    FRONTEND_RESET_URL: str = "https://yourfrontend.com/reset-password"
settings = Settings()
