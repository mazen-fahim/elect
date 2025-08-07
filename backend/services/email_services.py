import uuid
from datetime import datetime, timedelta
from fastapi import HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from ..models import EmailVerificationToken, User, Organization
from ..security import create_access_token
from ..schemas.register import OrganizationResponse
from ..config import settings


class EmailService:
    def __init__(self, db: Session):
        self.db = db

    def send_verification_email(self, user: User, background_tasks: BackgroundTasks = None):
        """Send email verification with token"""
        token = self._generate_verification_token(user.id)

        verification_link = f"{settings.FRONTEND_URL}/verify-email?token={token.token}"

        # In production, you would send an actual email here
        # For now, we'll print it for testing
        print(
            f"\n=== Verification Email ===\n"
            f"To: {user.email}\n"
            f"Subject: Verify Your Account\n\n"
            f"Please click the following link to verify your email:\n"
            f"{verification_link}\n"
            f"This link expires at {token.expires_at}\n"
            f"========================\n"
        )

        # If background tasks are provided, use them to send email
        if background_tasks:
            background_tasks.add_task(self._send_real_email, user.email, verification_link, token.expires_at)

    def _generate_verification_token(self, user_id: int) -> EmailVerificationToken:
        """Generate and store a new verification token"""
        # Delete any existing tokens for this user
        self.db.query(EmailVerificationToken).filter(EmailVerificationToken.user_id == user_id).delete()

        token = EmailVerificationToken(
            token=str(uuid.uuid4()), user_id=user_id, expires_at=datetime.now() + timedelta(hours=24)
        )
        self.db.add(token)
        self.db.commit()
        return token

    def verify_email_token(self, token: str) -> User:
        """Verify the email token and activate the user"""
        verification = self.db.query(EmailVerificationToken).filter(EmailVerificationToken.token == token).first()

        if not verification:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification token")

        if verification.expires_at < datetime.now():
            self.db.delete(verification)
            self.db.commit()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification token has expired")

        user = self.db.query(User).get(verification.user_id)
        if not user:
            self.db.delete(verification)
            self.db.commit()
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        user.is_active = True
        user.email_verified = True
        self.db.delete(verification)
        self.db.commit()

        return user

    def _send_real_email(self, email: str, verification_link: str, expires_at: datetime):
        """Actual email sending implementation (replace with your email service)"""
        # This is where you would integrate with SendGrid, Mailgun, etc.
        # Example with smtplib:
        try:
            import smtplib
            from email.mime.text import MIMEText

            msg = MIMEText(
                f"Please verify your email by clicking this link: {verification_link}\n"
                f"This link expires at {expires_at}"
            )
            msg["Subject"] = "Verify Your Account"
            msg["From"] = settings.EMAIL_FROM
            msg["To"] = email

            with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.send_message(msg)
        except Exception as e:
            print(f"Failed to send email to {email}: {str(e)}")


    
    def send_password_reset_email(self, email: str, reset_url: str):
        subject = "Password Reset Request"
        body = f"""
            <html>
                <body>
                    <h2>Password Reset</h2>
                    <p>We received a request to reset your password.</p>
                    <a href="{reset_url}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                        Reset Password</a>
                    <p>This link expires in 24 hours. If you didn't request this, please ignore this email.</p>
                </body>
            </html>
        """
        self._send_email(email, subject, body)
