from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String, Integer, Text, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from core.base import Base

if TYPE_CHECKING:
    pass


class DummyVoter(Base):
    __tablename__ = "dummy_voters"

    voter_hashed_national_id: Mapped[str] = mapped_column(String(200), primary_key=True)
    phone_number: Mapped[str] = mapped_column(String(20), nullable=False)
    governerate: Mapped[str | None] = mapped_column(String(100), nullable=True)
    district: Mapped[str | None] = mapped_column(String(100), nullable=True)
    eligible_candidates: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string of eligible candidate IDs
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    election_id: Mapped[int] = mapped_column(Integer, ForeignKey("elections.id", ondelete="CASCADE"), nullable=False)
