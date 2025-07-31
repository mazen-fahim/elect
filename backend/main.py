from database import engine
from fastapi import FastAPI
from models import Base
from routers import organization


# This needs to be imported before we call create on Base.metadata
# because it registers the models with SQLAlchemy
import models

app = FastAPI()

Base.metadata.create_all(bind=engine)
app.include_router(organization.router)
