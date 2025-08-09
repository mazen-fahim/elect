import uuid
from datetime import UTC, datetime, timedelta
from typing import final

from fastapi import BackgroundTasks, HTTPException, status
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType  # type: ignore
from pydantic import SecretStr
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from core.settings import settings
from models import User, VerificationToken
from models.verification_token import TokenType


@final
class EmailService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.conf = ConnectionConfig(
            MAIL_USERNAME=settings.MAIL_USERNAME,
            MAIL_PASSWORD=SecretStr(settings.MAIL_PASSWORD),
            MAIL_FROM=settings.MAIL_FROM,
            MAIL_PORT=settings.MAIL_PORT,
            MAIL_SERVER=settings.MAIL_SERVER,
            MAIL_STARTTLS=settings.MAIL_STARTTLS,
            MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
            USE_CREDENTIALS=settings.USE_CREDENTIALS,
        )

    async def send_verification_email(self, user: User, background_tasks: BackgroundTasks):
        """Send email verification with token"""
        token_value, expires_at = await self._generate_verification_token(user.id)
        verification_link = f"{settings.FRONTEND_VERIFICATION_URL}?token={token_value}"
        # refresh the user object to ensure it has the latest email
        await self.db.refresh(user)
        await self._send_email(user.email, verification_link, expires_at, background_tasks)

    async def send_password_reset_email(
        self, email: str, reset_url: str, expires_at: datetime, background_tasks: BackgroundTasks
    ):
        await self._send_email(email, reset_url, expires_at, background_tasks)

    async def _generate_verification_token(self, user_id: int) -> tuple[str, datetime]:
        """Generate and store a new verification token, returning (token_value, expires_at).

        Returning scalars avoids accessing expired ORM attributes after commit,
        which would otherwise trigger an async lazy-load and raise MissingGreenlet.
        """

        await self.db.execute(
            delete(VerificationToken).where(
                (VerificationToken.user_id == user_id) & (VerificationToken.type == TokenType.EMAIL_VERIFICATION)
            )
        )

        token = VerificationToken(
            token=str(uuid.uuid4()),
            user_id=user_id,
            expires_at=datetime.now(UTC) + timedelta(hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS),
            type=TokenType.EMAIL_VERIFICATION,
        )

        self.db.add(token)
        token_value = token.token
        expires_at = token.expires_at
        await self.db.commit()
        return token_value, expires_at

    async def verify_email_token(self, token: str) -> User:
        """Verify the email token and activate the user"""
        result = await self.db.execute(
            select(VerificationToken)
            .options(selectinload(VerificationToken.user))  # eager load related user
            .where((VerificationToken.token == token) & (VerificationToken.type == TokenType.EMAIL_VERIFICATION))
        )
        verification = result.scalars().first()

        if not verification:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification token")

        if verification.expires_at < datetime.now(UTC):
            await self.db.delete(verification)
            await self.db.commit()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification token has expired")

        user = verification.user  # already loaded due to selectinload

        user.is_active = True

        await self.db.delete(verification)
        await self.db.commit()

        return user

    async def _send_email(
        self, email: str, verification_link: str, expires_at: datetime, background_tasks: BackgroundTasks
    ):
        try:
            html = f"""<html>
<body>
    <p>Hello,</p>
    <p>Please verify your email by clicking the link below:</p>
    <p><a href="{verification_link}">Verify Email</a></p>
    <p>This link expires at {expires_at}.</p>
    <br>
    <p>Best regards,<br>Elect Team</p>
</body>
</html>
"""

            message = MessageSchema(
                subject="Verify Your Account",
                recipients=[email],
                body=html,
                subtype=MessageType.html,
            )
            fm = FastMail(self.conf)
            background_tasks.add_task(fm.send_message, message)
            print(f"Added task to send email to {email}")

        except Exception as e:
            print(f"Failed to send email to {email}: {str(e)}")
