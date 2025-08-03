# main.py
from fastapi import FastAPI
from routers import organization,election,voter,voting_process

# This needs to be imported before we call create on Base.metadata
# because it registers the models with SQLAlchemy
from database import engine
import models
from routers import organization, election

app = FastAPI()

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)

app.include_router(organization.router)
app.include_router(election.router)
app.include_router(voter.router)
app.include_router(voting_process.router)


