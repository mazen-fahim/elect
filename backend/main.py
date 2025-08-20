# main.py
from contextlib import asynccontextmanager
from sqlalchemy import text

import redis.asyncio as redis
from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi_limiter import FastAPILimiter

from core.error_handler import handle_error
from core.dependencies import engine

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
    payment,
    organization,
    organization_admin,
    system_admin,
    voter,
    voting_process,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure critical schema pieces exist (dev-safety if Alembic didn't run)
    try:
        async with engine.begin() as conn:
            # users.wallet and users.stripe_session_id
            await conn.execute(text(
                """
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS wallet NUMERIC(12,2) NOT NULL DEFAULT 0;
                """
            ))
            await conn.execute(text(
                """
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255);
                """
            ))
            # enum type and transactions table
            await conn.execute(text(
                """
                DO $$
                BEGIN
                    CREATE TYPE transactiontype AS ENUM ('ADDING', 'SPENDING');
                EXCEPTION
                    WHEN duplicate_object THEN NULL;
                END$$;
                """
            ))
            await conn.execute(text(
                """
                CREATE TABLE IF NOT EXISTS transactions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    amount NUMERIC(12,2) NOT NULL,
                    transaction_type transactiontype NOT NULL,
                    description VARCHAR(255),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                """
            ))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_transactions_id ON transactions (id);"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_transactions_user_id ON transactions (user_id);"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_transactions_created_at ON transactions (created_at);"))
            # organizations.is_paid
            await conn.execute(text(
                """
                ALTER TABLE organizations
                ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT false;
                """
            ))
    except Exception as _e:
        # Don't block app startup in case of permissions issues; logs will show details
        print(f"[startup] Schema ensure skipped/failed: {_e}")

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
api_router.include_router(payment)
api_router.include_router(system_admin)
api_router.include_router(auth)
api_router.include_router(organization_admin)
api_router.include_router(approval)
api_router.include_router(home)

app.include_router(api_router)
