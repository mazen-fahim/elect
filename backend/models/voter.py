from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from core.base import Base

if TYPE_CHECKING:
    from .election import Election


class Voter(Base):
    __tablename__ = "voters"

    voter_hashed_national_id: Mapped[str] = mapped_column(String(200), primary_key=True)

    phone_number: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)

    governerate: Mapped[str] = mapped_column(String(100), nullable=True)

    # OTP verification fields
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    otp_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    otp_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Foreign Keys
    election_id: Mapped[int] = mapped_column(Integer, ForeignKey("elections.id", ondelete="CASCADE"))

    # Relationships
    election: Mapped["Election"] = relationship("Election", back_populates="voters")
