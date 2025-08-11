from typing import Annotated
from types import SimpleNamespace

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
    async with SessionLocal() as session:
        yield session


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


async def get_organiztion(user: user_dependency, db: db_dependency):
    # Allow both the organization boss and organization admins to access org-protected endpoints.
    # Return an organization context object where `.id` is always the owning organization user ID.
    if user.role not in [UserRole.organization, UserRole.organization_admin]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization privileges required")

    if user.role == UserRole.organization:
        return user

    # For organization_admin, map to the owning organization user id
    # We cannot access DB here, so we rely on a lazy fetch pattern via separate dependency if needed.
    # However, since we only need the mapped org id repeatedly, require an additional header would be clunky.
    # Instead, do a best-effort lookup using a new DB session.
    # Note: This uses a new session as dependencies are resolved before endpoint params.
    res = await db.execute(select(OrganizationAdmin).where(OrganizationAdmin.user_id == user.id))
    mapping = res.scalars().first()
    if not mapping:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not linked to any organization")

    # Return a lightweight context object
    return SimpleNamespace(id=mapping.organization_user_id, role=user.role, email=user.email)


# Protect API endpoints with organization privileges
organization_dependency = Annotated[User, Depends(get_organiztion)]


def get_client_ip(request: Request):
    """3 tries every 15 minutes"""
    forwarded = request.headers.get("X-Forwarded-For")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else None)
    return ip


client_ip_dependency = Annotated[str | None, Depends(get_client_ip)]
