from datetime import timedelta

from fastapi import APIRouter, HTTPException
from starlette import status

from core import settings
from database import db_dependency
from schemas.auth import LoginRequest, LoginResponse
from utils.auth import authenticate_user, create_jwt_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse, status_code=status.HTTP_200_OK)
async def login(login_request: LoginRequest, db: db_dependency):
    authenticated_user = await authenticate_user(login_request, db)

    if not authenticated_user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")

    token = create_jwt_token(authenticated_user, timedelta(minutes=settings.JWT_EXPIRATION_MINUTES))

    return {"access_token": token, "token_type": "bearer"}
