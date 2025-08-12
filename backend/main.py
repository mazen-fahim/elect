# main.py
from fastapi import APIRouter, FastAPI

# This needs to be imported before we call create on Base.metadata
# because it registers the models with SQLAlchemy
from routers import election, organization, voter, voting_process , statistics , prediction

app = FastAPI()


@app.get("/api/healthy")
def health_check():
    return {"status": "Healthy"}



api_router = APIRouter(prefix="/api")

api_router.include_router(organization.router)
api_router.include_router(election.router)
api_router.include_router(voter.router)
api_router.include_router(voting_process.router)
api_router.include_router(statistics.router)
api_router.include_router(prediction.router)


app.include_router(api_router)




