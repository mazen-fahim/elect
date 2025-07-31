from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeMeta, sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os

# I get these values from the environment variables
# set in the docker-compose file
db_user = os.environ.get("POSTGRES_USER")
db_password = os.environ.get("POSTGRES_PASSWORD")
db_name = os.environ.get("POSTGRES_DB")

SQLALCHEMY_DATABASE_URL = (
    f"postgresql://{db_user}:{db_password}@postgres:5432/{db_name}"
)

engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base: DeclarativeMeta = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
