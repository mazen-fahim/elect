from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database configuration for PostgreSQL
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB_NAME: str

    SQLALCHEMY_DATABASE_URL: str = "postgresql+asyncpg://{user}:{password}@postgres:5432/{db}".format(
        user="{POSTGRES_USER}",
        password="{POSTGRES_PASSWORD}",
        db="{POSTGRES_DB_NAME}",
    )

    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 30

    # Email Verification
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str
    SMTP_PASSWORD: str
    EMAIL_FROM: str = "elect@gmail.com"
    VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24
    FRONTEND_VERIFICATION_URL: str = "https://localhost/verify-email"

    # File upload limits
    MAX_DOCUMENT_SIZE: int = 5 * 1024 * 1024
    MAX_SPREADSHEET_SIZE: int = 2 * 1024 * 1024

    class Config:
        env_file: str = "../../.env.example"
        env_file_encoding: str = "utf-8"


settings = Settings()
