from datetime import timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import RedirectResponse
from fastapi_limiter.depends import RateLimiter
from starlette import status

from core.dependencies import client_ip_dependency, db_dependency, user_dependency
from core.settings import settings
from schemas.auth import (
    CurrentUserResponse,
    LoginErrorResponse,
    LoginRequest,
    LoginResponse,
    PasswordResetConfirm,
    PasswordResetRequest,
    RegisterOrganizationErrorResponse,
    RegisterOrganizationRequest,
    SuccessMessage,
)
from services.auth import AuthService
from services.email import EmailService
from services.reset_password import PasswordResetService
from services.notification import NotificationService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/login",
    status_code=status.HTTP_200_OK,
    response_model=LoginResponse,
    responses={
        403: {
            "description": "User is inactive",
            "model": LoginErrorResponse,
        }
    },
)
async def login(login_request: LoginRequest, db: db_dependency):
    auth_service = AuthService(db)
    authenticated_user = await auth_service.authenticate_user(login_request)

    # For organizations, check both status and is_active to provide the most relevant message
    if authenticated_user.role.value == "organization":
        from sqlalchemy.future import select
        from models.organization import Organization
        
        org_result = await db.execute(select(Organization).where(Organization.user_id == authenticated_user.id))
        organization = org_result.scalar_one_or_none()
        
        if organization:
            # If organization is rejected, that takes priority
            if organization.status.value == "rejected":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, 
                    detail="Your organization registration has been rejected. Please contact support for assistance or reapply."
                )
            # If organization is pending approval AND user is not active (unverified), prioritize email verification
            elif organization.status.value == "pending" and not authenticated_user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, 
                    detail="Please verify your email address before logging in. Check your email for the verification link."
                )
            # If organization is pending approval but user is active (email verified), show pending approval message
            elif organization.status.value == "pending" and authenticated_user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, 
                    detail="Your organization registration is currently pending approval. Please wait for admin acceptance before logging in."
                )
            # If organization is approved, continue with normal flow
        else:
            # If no organization found, this shouldn't happen for valid organization users
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Organization not found. Please contact support."
            )

    # Then check if user is active (email verification) for non-organization users or approved organizations
    if not authenticated_user.is_active:
        if authenticated_user.role.value == "organization":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Please verify your email address before logging in. Check your email for the verification link."
            )
        else:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="err.login.inactive")

    token = auth_service.create_jwt_token(authenticated_user, timedelta(minutes=settings.JWT_EXPIRE_MINUTES))

    return LoginResponse(access_token=token, token_type="bearer")


@router.get(
    "/me",
    status_code=status.HTTP_200_OK,
    response_model=CurrentUserResponse,
)
async def get_current_user_info(user: user_dependency, db: db_dependency):
    """Get current user information (supports organization and organization_admin roles)."""
    from sqlalchemy.future import select
    from models.organization import Organization
    from models.organization_admin import OrganizationAdmin

    # Default values
    organization_id = None
    organization_name = None

    # If the user is an organization (owns the organization record)
    if user.role.value == "organization":
        result = await db.execute(select(Organization).where(Organization.user_id == user.id))
        organization = result.scalars().first()
        if organization:
            organization_id = organization.user_id
            organization_name = organization.name

    # If the user is an organization_admin, find the organization via organization_admins table
    elif user.role.value == "organization_admin":
        # Join Organization with OrganizationAdmin to find the organization for this admin user
        stmt = (
            select(Organization)
            .join(OrganizationAdmin, Organization.user_id == OrganizationAdmin.organization_user_id)
            .where(OrganizationAdmin.user_id == user.id)
        )
        result = await db.execute(stmt)
        organization = result.scalars().first()
        if organization:
            organization_id = organization.user_id
            organization_name = organization.name

    # For admins or others, organization fields remain None

    return CurrentUserResponse(
        id=user.id,
        email=user.email,
        role=user.role.value,
        is_active=user.is_active,
        organization_id=organization_id,
        organization_name=organization_name,
    )



@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    response_model=SuccessMessage,
    responses={
        400: {
            "description": "Invalid Field",
            "model": RegisterOrganizationErrorResponse,
        }
    },
)
async def register_organization(
    org_data: RegisterOrganizationRequest,
    db: db_dependency,
    background_tasks: BackgroundTasks,
):
    auth_service = AuthService(db)
    org = await auth_service.register_organization(org_data)

    # Send verification email
    email_service = EmailService(db)
    await email_service.send_verification_email(org.user, background_tasks)

    return SuccessMessage(
        success=True, status_code=status.HTTP_201_CREATED, message="Organization registered successfully"
    )


@router.get(
    "/verify-email",
    status_code=status.HTTP_200_OK,
    responses={
        400: {
            "description": "Invalid Token or Verification Token Expired",
            "content": {
                "application/json": {
                    "examples": {
                        "invalid_token": {"summary": "Invalid Token", "value": {"detail": "Invalid Token"}},
                        "token_expired": {
                            "summary": "Verification Token Expired",
                            "value": {"detail": "Verification Token Expired"},
                        },
                    }
                }
            },
        },
    },
)
async def verify_email(token: str, db: db_dependency):
    email_service = EmailService(db)
    _ = await email_service.verify_email_token(token)
    return SuccessMessage(success=True, status_code=status.HTTP_200_OK, message="Email verified successfully")


@router.post(
    "/forgot-password",
    status_code=status.HTTP_200_OK,
    response_model=SuccessMessage,
    dependencies=[Depends(RateLimiter(times=3, minutes=15))],
)
async def forgot_password(
    request: PasswordResetRequest,
    db: db_dependency,
    background_tasks: BackgroundTasks,
    client_ip: client_ip_dependency,
):
    password_reset_service = PasswordResetService(db)
    await password_reset_service.request_password_reset(request.email, background_tasks)
    return SuccessMessage(
        success=True, status_code=status.HTTP_200_OK, message="Password reset email sent successfully"
    )


@router.post(
    "/reset-password",
    status_code=status.HTTP_200_OK,
    response_model=SuccessMessage,
)
async def reset_password(
    token: str,
    form_data: PasswordResetConfirm,
    db: db_dependency,
):
    """Complete password reset with token"""
    service = PasswordResetService(db)
    await service.reset_password(token, form_data.new_password)
    return SuccessMessage(success=True, status_code=status.HTTP_200_OK, message="Password reset successfully")
