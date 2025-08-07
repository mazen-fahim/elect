from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from core.settings import settings
from models import User
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


def get_organiztion(user: user_dependency):
    if user.role not in [UserRole.organization, UserRole.organization_admin]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization privileges required")
    return user


# Protect API endpoints with organization privileges
organization_dependency = Annotated[User, Depends(get_organiztion)]


def get_client_ip(request: Request):
    """3 tries every 15 minutes"""
    forwarded = request.headers.get("X-Forwarded-For")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else None)
    return ip


client_ip_dependency = Annotated[str | None, Depends(get_client_ip)]
