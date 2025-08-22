from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String, Integer, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from core.base import Base
from core.shared import Country

if TYPE_CHECKING:
    pass


class DummyCandidate(Base):
    __tablename__ = "dummy_candidates"

    hashed_national_id: Mapped[str] = mapped_column(String(200), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    district: Mapped[str | None] = mapped_column(String(100), nullable=True)
    governorate: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[Country] = mapped_column(String(100), nullable=False)
    party: Mapped[str | None] = mapped_column(String(100), nullable=True)
    symbol_icon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    symbol_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    birth_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    description: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    election_id: Mapped[int] = mapped_column(Integer, ForeignKey("elections.id", ondelete="CASCADE"), nullable=False)
