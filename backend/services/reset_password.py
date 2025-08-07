import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import delete, select

from core.settings import settings
from models import User
from models.verification_token import TokenType, VerificationToken
from services.auth import AuthService
from services.email import EmailService


class PasswordResetService:
    def __init__(self, db):
        self.db = db

    async def request_password_reset(self, email: str):
        user = await self.db.execute(select(User).where(User.email == email)).scalar_one_or_none()
        if not user:
            return

        token = await self._generate_verification_token(user.id)

        # Send email
        reset_url = f"{settings.FRONTEND_VERIFICATION_URL}/reset-password?token={token}"
        email_service = EmailService(self.db)
        await email_service.send_password_reset_email(user.email, reset_url, token.expires_at)

    async def _generate_verification_token(self, user_id: int) -> VerificationToken:
        """Generate and store a new verification token"""

        _ = await self.db.execute(
            delete(VerificationToken).where(
                VerificationToken.user_id == user_id and VerificationToken.type == TokenType.PASSWORD_RESET
            )
        )

        token = VerificationToken(
            token=str(uuid.uuid4()),
            user_id=user_id,
            expires_at=datetime.now(UTC) + timedelta(hours=settings.PASSWORD_VERIFICATION_TOKEN_EXPIRE_HOURS),
            type=TokenType.PASSWORD_RESET,
        )

        self.db.add(token)
        await self.db.commit()
        return token

    async def reset_password(self, token: str, new_password: str):
        result = await self.db.execute(
            select(VerificationToken).where(
                VerificationToken.token == token, VerificationToken.type == TokenType.PASSWORD_RESET
            )
        )
        reset_token = result.scalar_one_or_none()

        if not reset_token or reset_token.expires_at < datetime.now(UTC):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")

        user = reset_token.user

        user.password = AuthService.get_password_hash(new_password)

        self.db.add(user)

        await self.db.execute(delete(VerificationToken).where(VerificationToken.id == reset_token.id))

        await self.db.commit()
