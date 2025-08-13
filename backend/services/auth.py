from datetime import UTC, datetime, timedelta
from typing import Any, final

from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from core.settings import settings
from models import User
from models.organization import Organization
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
            "role": user.role.value,
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

    async def authenticate_user(self, login_request: LoginRequest) -> User:
        email = str(login_request.email)
        password = login_request.password

        result = await self.db.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        if not user or not AuthService.verify_password(password, user.password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="err.login.credentials")
        return user

    async def register_organization(self, org_data: RegisterOrganizationRequest) -> Organization:
        try:
            # Check for existing email
            result = await self.db.execute(select(User).where(User.email == str(org_data.email)))
            if result.scalars().first():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="err.register.email")

            # Check for existing organization name
            result = await self.db.execute(select(Organization).where(Organization.name == org_data.name))
            if result.scalars().first():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="err.register.name")

            # Only check API endpoint uniqueness if one is provided
            if org_data.api_endpoint:
                result = await self.db.execute(
                    select(Organization).where(Organization.api_endpoint == str(org_data.api_endpoint))
                )
                if result.scalars().first():
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="err.register.api_endpoint")

            # Create user
            user = User(
                email=str(org_data.email),
                password=AuthService.get_password_hash(org_data.password),
                first_name=org_data.first_name,
                last_name=org_data.last_name,
                role=UserRole.organization,
                # Fix: In production make it false and only activate it after email verification.
                is_active=True,
                created_at=datetime.now(UTC),
                last_access_at=datetime.now(UTC),
            )
            self.db.add(user)
            await self.db.flush()

            # Create organization
            org = Organization(
                name=org_data.name,
                status="pending",
                api_endpoint=str(org_data.api_endpoint) if org_data.api_endpoint else None,
                country=org_data.country,
                address=org_data.address,
                description=org_data.description,
                user_id=user.id,
            )

            self.db.add(org)
            await self.db.flush()

            # Commit the transaction
            await self.db.commit()
            
            # Refresh the organization object
            await self.db.refresh(org, attribute_names=["user"])
            return org

        except IntegrityError as e:
            await self.db.rollback()
            print(f"Database integrity error: {str(e)}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Error with database transaction")
        except Exception as e:
            await self.db.rollback()
            print(f"Unexpected error during registration: {str(e)}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Error with database transaction")

    def is_admin(self, user: User) -> bool:
        return user.role == UserRole.admin

    def is_org(self, user: User) -> bool:
        return user.role == UserRole.organization
