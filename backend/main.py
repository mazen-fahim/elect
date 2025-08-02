from database import engine
from fastapi import FastAPI
from routers import organization,election

# This needs to be imported before we call create on Base.metadata
# because it registers the models with SQLAlchemy
import models

app = FastAPI()

models.Base.metadata.create_all(bind=engine)

app.include_router(organization.router)
app.include_router(election.router)


