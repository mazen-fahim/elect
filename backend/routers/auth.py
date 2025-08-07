from datetime import timedelta

from fastapi import APIRouter, HTTPException
from starlette import status

from core.dependencies import db_dependency
from core.settings import settings
from schemas.auth import LoginRequest, LoginResponse
from services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse, status_code=status.HTTP_200_OK)
async def login(login_request: LoginRequest, db: db_dependency):
    auth_service = AuthService(db)
    authenticated_user = await auth_service.authenticate_user(login_request)

    if not authenticated_user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")

    token = auth_service.create_jwt_token(authenticated_user, timedelta(minutes=settings.JWT_EXPIRE_MINUTES))

    return {"access_token": token, "token_type": "bearer"}
