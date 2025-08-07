from datetime import UTC, datetime, timedelta
from typing import Annotated, Any

from fastapi import Depends, Header, HTTPException
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from starlette import status

from core import settings
from database import db_dependency
from models.user import User
from schemas.auth import LoginRequest
from fastapi import Request

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def authenticate_user(login_request: LoginRequest, db: db_dependency) -> User:
    email = login_request.email
    password = login_request.password

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()
    if not user or not password_context.verify(password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalide Credentials")
    return user


def create_jwt_token(user: User, expires_delta: timedelta) -> str:
    encode: dict[str, Any] = {  # pyright: ignore[reportExplicitAny]
        "id": user.id,
        "role": user.role,
        "exp": datetime.now(UTC) + expires_delta,
    }
    return jwt.encode(encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


async def verify_jwt_token(token: str, db: db_dependency) -> User:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: int | None = payload.get("id")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing user ID")
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        return user
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from JWTError


async def get_current_user(db: db_dependency, authorization: str = Header(...)) -> User:
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication scheme")
    user = await verify_jwt_token(token, db)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return user


user_dependency = Annotated[dict[Any, Any], Depends(get_current_user)]  # pyright: ignore[reportExplicitAny]

def get_client_ip(request: Request):
    """يحصل على IP العميل مع التعامل مع البروكسي"""
    if "x-forwarded-for" in request.headers:
        return request.headers["x-forwarded-for"].split(",")[0]
    return request.client.host