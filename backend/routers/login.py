from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..dependencies import get_db,get_current_user
from ..services import AuthService
from ..schemas.login import LoginResponse, TokenData, UserResponse
from ..security import create_access_token
from ..models import Organization
from models.user import User
from ..services.password_reset import PasswordResetService
from ..schemas.login import PasswordResetRequest, PasswordResetConfirm
from ..utils.auth import get_client_ip
from fastapi_limiter.depends import RateLimiter

router = APIRouter(tags=["authentication"])

@router.post("/login", response_model=LoginResponse)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Authenticate user and return JWT token"""
    service = AuthService(db)
    user = service.authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Determine organization_id if user is an organization
    organization_id = None
    if user.role == "organization":
        org = db.query(Organization).filter(Organization.user_id == user.id).first()
        if org:
            organization_id = org.id

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "org_id": organization_id
        }
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def read_current_user(current_user: User = Depends(get_current_user)):
    """Get current authenticated user details"""
    return current_user
@router.post("/forgot-password", dependencies=[Depends(RateLimiter(times=3, minutes=15))])
async def forgot_password(
    request: PasswordResetRequest,
    db: Session = Depends(get_db),
    client_ip: str = Depends(get_client_ip)
):
    
    """يسمح ب 3 محاولات كل 15 دقيقة لكل IP"""
    service = PasswordResetService(db)
    service.request_password_reset(request.email)
    return {"message": "If an account exists with this email, a reset link has been sent"}

@router.post("/reset-password")
async def reset_password(
    form_data: PasswordResetConfirm,
    db: Session = Depends(get_db),
    
):

    """Complete password reset with token"""
    service = PasswordResetService(db)
    service.reset_password(form_data.token, form_data.new_password)
    return {"message": "Password updated successfully"}