from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.base import Base
from core.shared import Country

if TYPE_CHECKING:
    from .candidate_participation import CandidateParticipation
    from .organization import Organization


class Candidate(Base):
    __tablename__ = "candidates"

    hashed_national_id: Mapped[str] = mapped_column(String(200), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    district: Mapped[str | None] = mapped_column(String(100), nullable=True)
    governorate: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[Country] = mapped_column(Enum(Country), nullable=False)
    party: Mapped[str | None] = mapped_column(String(100), nullable=True)
    symbol_icon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    symbol_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    birth_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Foereign Keys
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.user_id", ondelete="CASCADE"), nullable=False)

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="candidates")

    participations: Mapped[list["CandidateParticipation"]] = relationship("CandidateParticipation", back_populates="candidate")
