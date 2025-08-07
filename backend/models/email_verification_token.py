from datetime import datetime
from tokenize import String
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base

if TYPE_CHECKING:
    from .user import User


class EmailVerificationToken(Base):
    __tablename__: str = "email_verification_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    token: Mapped[str] = mapped_column(String, unique=True, nullable=False)

    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Foreign Keys
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="email_verification_token")
