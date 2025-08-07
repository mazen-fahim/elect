from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB_NAME: str
    SQLALCHEMY_DATABASE_URL: str
    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 30

    # Email Verification
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str
    SMTP_PASSWORD: str
    EMAIL_FROM: str = "mazenfahim.g@gmail.com"
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24
    FRONTEND_VERIFICATION_URL: str = "https://localhost/api/verify-email"

    # Password Reset
    PASSWORD_VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24

    # File upload limits
    MAX_DOCUMENT_SIZE: int = 5 * 1024 * 1024
    MAX_SPREADSHEET_SIZE: int = 2 * 1024 * 1024

    class Config:
        env_file = "../../.env.example"
        env_file_encoding = "utf-8"


settings = Settings()
