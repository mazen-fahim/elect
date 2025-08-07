from datetime import UTC, datetime, timedelta
from typing import Any, final

from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from core.settings import settings
from models import Organization, User
from models.user import UserRole
from schemas.auth import LoginRequest, RegisterOrganizationRequest


@final
class AuthService:
    _password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return AuthService._password_context.verify(plain_password, hashed_password)

    @staticmethod
    def get_password_hash(password: str) -> str:
        return AuthService._password_context.hash(password)

    @staticmethod
    def create_jwt_token(user: User, expires_delta: timedelta) -> str:
        encode: dict[str, Any] = {
            "id": user.id,
            "role": user.role,
            "exp": datetime.now(UTC) + expires_delta,
        }
        return jwt.encode(encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

    async def verify_jwt_token(self, token: str) -> User:
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
            user_id: int | None = payload.get("id")
            if user_id is None:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing user ID")
            result = await self.db.execute(select(User).where(User.id == user_id))
            user = result.scalars().first()
            if not user:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
            return user
        except JWTError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from JWTError

    async def register_organization(self, org_data: RegisterOrganizationRequest) -> Organization:
        # Check if email already exists
        result = await self.db.execute(select(User).where(User.email == org_data.email))
        if result.scalars().first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

        # Create user
        user = User(
            email=org_data.email,
            password=AuthService.get_password_hash(org_data.password),
            role="organization",
            is_active=False,  # Initially inactive, needs verification
            created_at=datetime.now(UTC),
            last_access_at=datetime.now(UTC),
        )

        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)

        # Create organization
        org = Organization(
            name=org_data.name,
            status="pending",
            api_endpoint=org_data.api_endpoint,
            country=org_data.country,
            address=org_data.address,
            description=org_data.description,
            user_id=user.id,
        )

        self.db.add(org)
        await self.db.commit()
        await self.db.refresh(org)

        return org

    async def authenticate_user(self, login_request: LoginRequest) -> User:
        email = login_request.email
        password = login_request.password

        result = await self.db.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        if not user or not AuthService.verify_password(password, user.password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Credentials")
        return user

    def is_admin(self, user: User) -> bool:
        return user.role == UserRole.admin

    def is_org(self, user: User) -> bool:
        return user.role == UserRole.organization

    def is_org_admin(self, user: User) -> bool:
        return user.role == UserRole.organization_admin
