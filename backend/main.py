# main.py
from fastapi import APIRouter, FastAPI

# This needs to be imported before we call create on Base.metadata
# because it registers the models with SQLAlchemy
from routers import election, organization, voter, voting_process

from fastapi.middleware.cors import CORSMiddleware

from routers.login import router as login_router
from routers.register import router as register_router
from routers.login import router as login_router
from config import settings 
from fastapi.responses import JSONResponse
from fastapi import FastAPI, Request, HTTPException  
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter
import redis 
app = FastAPI()



app = FastAPI()

# Inject settings into app state (optional but useful)
app.state.settings = settings

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(login_router, prefix="/auth")
app.include_router(register_router, prefix="/auth")


@app.get("/")
def read_root():
    return {"message": "Organization Authentication Service"}

@app.get("/api/healthy")
def health_check():
    return {"status": "Healthy"}


api_router = APIRouter(prefix="/api")

api_router.include_router(organization.router)
api_router.include_router(election.router)
api_router.include_router(voter.router)
api_router.include_router(voting_process.router)


app.include_router(api_router)

# Database initialization (if using SQLAlchemy)
@app.on_event("startup")
async def startup():
    if settings.ENVIRONMENT == "test":
        # Special test database setup
        pass


@app.exception_handler(HTTPException)
async def global_http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code == 413:
        return JSONResponse(
            status_code=413,
            content={
                "error": "request_too_large",
                "message": "Payload exceeds size limit",
                "max_allowed_mb": settings.MAX_DOCUMENT_SIZE / (1024 * 1024)
            },
            headers=exc.headers
        )
    # Pass through other HTTP errors
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail},
        headers=exc.headers
    )


@app.on_event("startup")
async def startup():
    redis_connection = redis.Redis(
        host="localhost", port=6379, db=0, decode_responses=True
    )
    await FastAPILimiter.init(redis_connection)

