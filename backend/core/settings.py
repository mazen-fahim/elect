from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB_NAME: str
    SQLALCHEMY_DATABASE_URL: str
    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 30

    FRONTEND_VERIFICATION_URL: str = "http://localhost/verify-email"
    FRONTEND_RESET_PASS_URL: str = "http://localhost/reset-password"

    # Email configuration
    MAIL_USERNAME: str
    MAIL_PASSWORD: str
    MAIL_FROM: str
    MAIL_PORT: int
    MAIL_SERVER: str
    MAIL_STARTTLS: bool
    MAIL_SSL_TLS: bool
    USE_CREDENTIALS: bool
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24

    # Password Reset
    PASSWORD_RESET_TOKEN_EXPIRE_HOURS: int = 24
    # File upload limits
    MAX_DOCUMENT_SIZE: int = 5 * 1024 * 1024
    MAX_SPREADSHEET_SIZE: int = 2 * 1024 * 1024

    # Cloudinary Configuration
    CLOUDINARY_CLOUD_NAME: str
    CLOUDINARY_API_KEY: str
    CLOUDINARY_API_SECRET: str

    # Twilio Configuration
    TWILIO_ACCOUNT_SID: str
    TWILIO_AUTH_TOKEN: str
    TWILIO_PHONE_NUMBER: str

    class Config:
        extra = "ignore"  # Ignore extra env vars


settings = Settings()
