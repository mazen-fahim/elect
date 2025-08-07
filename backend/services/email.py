import asyncio
import smtplib
import uuid
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from typing import final

from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from core.settings import settings
from models import User, VerificationToken
from models.verification_token import TokenType


@final
class EmailService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def send_verification_email(self, user: User, background_tasks: BackgroundTasks):
        """Send email verification with token"""
        token = await self._generate_verification_token(user.id)

        verification_link = f"{settings.FRONTEND_VERIFICATION_URL}/verify-email?token={token.token}"

        if background_tasks:
            background_tasks.add_task(self._send_email, user.email, verification_link, token.expires_at)

    async def send_password_reset_email(self, email: str, reset_url: str, expires_at: datetime):
        await self._send_email(email, reset_url, expires_at)

    async def _generate_verification_token(self, user_id: int) -> VerificationToken:
        """Generate and store a new verification token"""

        _ = await self.db.execute(
            delete(VerificationToken).where(
                VerificationToken.user_id == user_id and VerificationToken.type == TokenType.EMAIL_VERIFICATION
            )
        )

        token = VerificationToken(
            token=str(uuid.uuid4()),
            user_id=user_id,
            expires_at=datetime.now() + timedelta(hours=24),
            type=TokenType.EMAIL_VERIFICATION,
        )

        self.db.add(token)
        await self.db.commit()
        return token

    async def verify_email_token(self, token: str) -> User:
        """Verify the email token and activate the user"""
        result = await self.db.execute(
            select(VerificationToken).where(
                VerificationToken.token == token and VerificationToken.type == TokenType.EMAIL_VERIFICATION
            )
        )
        verification = result.scalars().first()

        if not verification:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification token")

        if verification.expires_at < datetime.now():
            await self.db.delete(verification)
            await self.db.commit()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification token has expired")

        user = verification.user

        user.is_active = True

        await self.db.delete(verification)
        await self.db.commit()

        return user

    async def _send_email(self, email: str, verification_link: str, expires_at: datetime):
        try:
            html = f"""
            <html>
            <body>
                <p>Hello,</p>
                <p>Please verify your email by clicking the link below:</p>
                <p><a href="{verification_link}">Verify Email</a></p>
                <p>This link expires at {expires_at}.</p>
                <br>
                <p>Best regards,<br>Your Company Team</p>
            </body>
            </html>
            """
            msg = MIMEText(html, "html")
            msg["Subject"] = "Verify Your Account"
            msg["From"] = settings.EMAIL_FROM
            msg["To"] = email

            # Run blocking SMTP in a thread to avoid blocking the event loop
            await asyncio.to_thread(self._send_smtp_email, msg)

        except Exception as e:
            print(f"Failed to send email to {email}: {str(e)}")

    def _send_smtp_email(self, msg: MIMEText):
        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
            _ = server.starttls()
            _ = server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            _ = server.send_message(msg)
