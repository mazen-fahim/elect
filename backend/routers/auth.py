from datetime import timedelta

from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import RedirectResponse
from starlette import status

from core.dependencies import db_dependency
from core.settings import settings
from schemas.auth import LoginRequest, LoginResponse, RegisterOrganizationRequest, RegisterOrganizationResponse
from services.auth import AuthService
from services.email import EmailService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/login",
    status_code=status.HTTP_200_OK,
    response_model=LoginResponse,
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
