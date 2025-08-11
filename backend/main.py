# main.py
from contextlib import asynccontextmanager

import redis.asyncio as redis
from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi_limiter import FastAPILimiter

from core.error_handler import handle_error

# This needs to be imported before we call create on Base.metadata
# because it registers the models with SQLAlchemy
from routers import (
    auth,
    candidate,
    election,
    notification,
    organization,
    voter,
    voting_process,
    organization_admin,
    approval,
)

# Import all models to ensure they are registered
from models import (
    candidate as candidate_model,
    candidate_participation,
    election as election_model,
    notification as notification_model,
    organization as organization_model,
    user,
    verification_token,
    voter as voter_model,
    voting_process as voting_process_model,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    redis_connection = redis.from_url("redis://redis", encoding="utf-8", decode_responses=True)
    await FastAPILimiter.init(redis_connection)
    print("Application startup...")
    try:
        yield
    finally:
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
api_router.include_router(voting_process)
api_router.include_router(notification)
api_router.include_router(auth)
api_router.include_router(organization_admin)
api_router.include_router(approval)

app.include_router(api_router)
