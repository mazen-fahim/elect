# main.py
from contextlib import asynccontextmanager

import redis.asyncio as redis
from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi_limiter import FastAPILimiter

from core.error_handler import handle_error

# This needs to be imported before we call create on Base.metadata
# because it registers the models with SQLAlchemy
from routers import auth, candidate, election, organization, voter, voting_process


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

api_router.include_router(organization.router)
api_router.include_router(election.router)
api_router.include_router(candidate.router)
api_router.include_router(voter.router)
api_router.include_router(voting_process.router)
api_router.include_router(auth.router)

app.include_router(api_router)
