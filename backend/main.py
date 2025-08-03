# main.py
from fastapi import FastAPI

# This needs to be imported before we call create on Base.metadata
# because it registers the models with SQLAlchemy
from routers import election, organization, voter, voting_process

app = FastAPI()


@app.get("/healthy")
def health_check():
    return {"status": "Healthy"}


app.include_router(organization.router)
app.include_router(election.router)
app.include_router(voter.router)
app.include_router(voting_process.router)
