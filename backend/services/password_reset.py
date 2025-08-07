import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from ..models import PasswordResetToken, User
from ..security import get_password_hash
from ..config import settings
from ..services.email_service import EmailService
from fastapi import HTTPException, status

class PasswordResetService:
    def __init__(self, db: Session):
        self.db = db

    def request_password_reset(self, email: str):
        user = self.db.query(User).filter(User.email == email).first()
        if not user:
            # لا تظهر خطأ للحماية الأمنية
            return# Don't reveal if user exists

        # Delete any existing tokens
        self.db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id
        ).delete()

        # Create new token
        token = str(uuid.uuid4())
        expires_at = datetime.now() + timedelta(hours=24)
        
        reset_token = PasswordResetToken(
            token=token,
            user_id=user.id,
            expires_at=expires_at
        )
        self.db.add(reset_token)
        self.db.commit()

        # Send email
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        EmailService(self.db).send_password_reset_email(email, reset_url)

    def reset_password(self, token: str, new_password: str):
        reset_token = self.db.query(PasswordResetToken).filter(
            PasswordResetToken.token == token
        ).first()

        if not reset_token or reset_token.expires_at < datetime.now():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired token"
            )

        user = reset_token.user
        user.password = get_password_hash(new_password)
        
        # Delete the used token
        self.db.delete(reset_token)
        self.db.commit()




    

