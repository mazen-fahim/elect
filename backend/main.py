from database import engine
from fastapi import FastAPI
import models

# This needs to be imported before we call create on Base.metadata
# because it registers the models with SQLAlchemy
import models

app = FastAPI()

models.Base.metadata.create_all(bind=engine)
