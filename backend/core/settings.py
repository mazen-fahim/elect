from pydantic import BaseSettings, Field

class Settings(BaseSettings):
    STRIPE_SECRET_KEY: str = str

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        
settings = Settings()