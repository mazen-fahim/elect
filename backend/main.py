# main.py
from fastapi import FastAPI
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


