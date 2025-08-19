from types import SimpleNamespace
from typing import Annotated
from twilio.rest import Client
import os
from twilio.http.async_http_client import AsyncTwilioHttpClient
from twilio.http import TwilioHttpClient
from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.future import select

from core.settings import settings
from models import User
from models.organization_admin import OrganizationAdmin
from models.user import UserRole
from services.auth import AuthService

engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URL)

SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine)


async def get_db():
    session = SessionLocal()
    try:
        yield session
    finally:
        await session.close()


db_dependency = Annotated[AsyncSession, Depends(get_db)]


def get_auth_service(db: db_dependency) -> AuthService:
    return AuthService(db)


auth_service_dependency = Annotated[AuthService, Depends(get_auth_service)]


async def get_current_user(auth_service: auth_service_dependency, authorization: str = Header(...)) -> User:  # pyright: ignore[reportCallInDefaultInitializer]
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication scheme")
    user = await auth_service.verify_jwt_token(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return user


# Protect API endpoints with any authenticated user
user_dependency = Annotated[User, Depends(get_current_user)]


def get_admin(user: user_dependency):
    if user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return user


# Protect API endpoints with admin privileges
admin_dependency = Annotated[User, Depends(get_admin)]


async def get_organization(user: user_dependency):
    # Allow both the organization boss and organization admins to access org-protected endpoints.
    # Return an organization context object where `.id` is always the owning organization user ID.
    if user.role not in [UserRole.organization, UserRole.organization_admin]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization privileges required")

    if user.role == UserRole.organization:
        return user

    # For organization_admin, we need to handle this differently since we can't access DB here
    # We'll return the user object and let the individual endpoints handle the mapping
    # This avoids circular dependency issues
    return user


# Protect API endpoints with organization privileges
organization_dependency = Annotated[User, Depends(get_organization)]


def get_client_ip(request: Request):
    """3 tries every 15 minutes"""
    forwarded = request.headers.get("X-Forwarded-For")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else None)
    return ip


client_ip_dependency = Annotated[str | None, Depends(get_client_ip)]


async def get_twilio_client():
    """
    Dependency that provides a configured Twilio async client
    """
    # No need for os.getenv() since pydantic already loaded from .env
    if not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.TWILIO_PHONE_NUMBER]):
        raise RuntimeError("Twilio credentials not properly configured")

    client = Client(
        settings.TWILIO_ACCOUNT_SID,
        settings.TWILIO_AUTH_TOKEN,
        http_client=AsyncTwilioHttpClient()
    )
    
    try:
        yield client
    finally:
        await client.http_client.session.close()     
