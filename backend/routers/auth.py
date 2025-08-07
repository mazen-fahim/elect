from datetime import timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import RedirectResponse
from fastapi_limiter.depends import RateLimiter
from starlette import status

from core.dependencies import client_ip_dependency, db_dependency
from core.settings import settings
from schemas.auth import (
    LoginRequest,
    LoginResponse,
    PasswordResetConfirm,
    PasswordResetRequest,
    RegisterOrganizationRequest,
    RegisterOrganizationResponse,
    SuccessMessage,
)
from services.auth import AuthService
from services.email import EmailService
from services.reset_password import PasswordResetService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/login",
    status_code=status.HTTP_200_OK,
    response_model=LoginResponse,
    responses={
        403: {
            "description": "User is inactive",
            "content": {"application/json": {"example": {"detail": "User is inactive"}}},
        }
    },
)
async def login(login_request: LoginRequest, db: db_dependency):
    auth_service = AuthService(db)
    authenticated_user = await auth_service.authenticate_user(login_request)

    if not authenticated_user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")

    token = auth_service.create_jwt_token(authenticated_user, timedelta(minutes=settings.JWT_EXPIRE_MINUTES))

    return {"access_token": token, "token_type": "bearer"}


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    response_model=RegisterOrganizationResponse,
)
async def register_organization(
    background_tasks: BackgroundTasks,
    org_data: RegisterOrganizationRequest,
    db: db_dependency,
):
    auth_service = AuthService(db)
    org = await auth_service.register_organization(org_data)

    # Send verification email
    email_service = EmailService(db)
    await email_service.send_verification_email(org.user, background_tasks)

    return org


@router.get(
    "/verify-email",
)
async def verify_email(token: str, db: db_dependency):
    email_service = EmailService(db)
    _ = await email_service.verify_email_token(token)
    return RedirectResponse(url="/email-verified-successfully")


@router.post(
    "/forgot-password",
    status_code=status.HTTP_200_OK,
    response_model=SuccessMessage,
    dependencies=[Depends(RateLimiter(times=3, minutes=15))],
)
async def forgot_password(
    request: PasswordResetRequest,
    db: db_dependency,
    client_ip: client_ip_dependency,
):
    password_reset_service = PasswordResetService(db)
    await password_reset_service.request_password_reset(request.email)
    return SuccessMessage(
        success=True, status_code=status.HTTP_200_OK, message="Password reset email sent successfully"
    )


@router.post(
    "/reset-password",
    status_code=status.HTTP_200_OK,
    response_model=SuccessMessage,
)
async def reset_password(
    form_data: PasswordResetConfirm,
    db: db_dependency,
):
    """Complete password reset with token"""
    service = PasswordResetService(db)
    await service.reset_password(form_data.token, form_data.new_password)
    return SuccessMessage(success=True, status_code=status.HTTP_200_OK, message="Password reset successfully")
