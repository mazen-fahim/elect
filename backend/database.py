from typing import Annotated
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeMeta
from sqlalchemy.ext.declarative import declarative_base
import os

# I get these values from the environment variables
# set in the docker-compose file
db_user = os.environ.get("POSTGRES_USER")
db_password = os.environ.get("POSTGRES_PASSWORD")
db_name = os.environ.get("POSTGRES_DB")

SQLALCHEMY_DATABASE_URL = (
    f"postgresql+asyncpg://{db_user}:{db_password}@postgres:5432/{db_name}"
)

engine = create_async_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base: DeclarativeMeta = declarative_base()


async def get_db():
    async with SessionLocal() as session:
        yield session


db_dependency = Annotated[AsyncSession, Depends(get_db)]
