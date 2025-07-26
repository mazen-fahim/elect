from database import engine
from fastapi import FastAPI
from database import Base

# This needs to be imported before we call create on Base.metadata
# because it registers the models with SQLAlchemy
import models

app = FastAPI()

Base.metadata.create_all(bind=engine)
