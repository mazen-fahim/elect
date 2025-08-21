# main.py
from contextlib import asynccontextmanager

import redis.asyncio as redis
from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi_limiter import FastAPILimiter

from core.error_handler import handle_error

# Import all models to ensure they are registered
# This needs to be imported before we call create on Base.metadata
# because it registers the models with SQLAlchemy
from routers import (
    approval,
    auth,
    candidate,
    election,
    home,
    notification,
    organization,
    organization_admin,
    system_admin,
    voter,
    voting_process,
)
from routers.dummy_service import router as dummy_service_router
from routers.voting import router as voting_router
from routers.results import router as results_router
from core.scheduler import start_election_status_scheduler, stop_election_status_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    redis_connection = redis.from_url("redis://redis", encoding="utf-8", decode_responses=True)
    await FastAPILimiter.init(redis_connection)
    print("Application startup...")
    
    # Start the election status scheduler
    start_election_status_scheduler()
    print("Election status scheduler started...")
    
    try:
        yield
    finally:
        # Stop the election status scheduler
        stop_election_status_scheduler()
        print("Election status scheduler stopped...")
        
        await redis_connection.close()
        print("Application shutdown.")


app = FastAPI(lifespan=lifespan)


@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    return handle_error(request, exc)


@app.get("/healthy")
async def health_check():
    return {"status": "Healthy"}


api_router = APIRouter(prefix="/api")

api_router.include_router(organization)
api_router.include_router(election)
api_router.include_router(candidate)
api_router.include_router(voter)
api_router.include_router(voting_router)
api_router.include_router(results_router)
api_router.include_router(voting_process)
api_router.include_router(notification)
api_router.include_router(system_admin)
api_router.include_router(auth)
api_router.include_router(organization_admin)
api_router.include_router(approval)
api_router.include_router(home)
api_router.include_router(dummy_service_router)

app.include_router(api_router)
