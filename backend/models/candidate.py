from . import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, String, Date, ForeignKey, Enum, DateTime, func
from core.shared import Status, Country
from datetime import datetime


class Candidate(Base):
    __tablename__ = "candidates"

    hashed_national_id: Mapped[str] = mapped_column(String(200), primary_key=True)

    create_req_status: Mapped[Status] = mapped_column(
        Enum(Status), default=Status.pending, nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    district: Mapped[str] = mapped_column(String(100), nullable=True)
    governerate: Mapped[str] = mapped_column(String(100), nullable=True)
    country: Mapped[Country] = mapped_column(Enum(Country), nullable=False)
    party: Mapped[str] = mapped_column(String(100), nullable=True)
    symbol_icon_url: Mapped[str] = mapped_column(String(500), nullable=True)
    symbol_name: Mapped[str] = mapped_column(String(100), nullable=True)
    photo_url: Mapped[str] = mapped_column(String(500), nullable=True)
    birth_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    description: Mapped[str] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Foereign Keys
    organization_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("organizations.user_id", ondelete="CASCADE"),
        nullable=False,
    )

    organization_admin_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("organization_admins.user_id", ondelete="CASCADE"),
        nullable=True,
    )

    # Relationships
    organization: Mapped["Organization"] = relationship(
        "Organization", back_populates="candidates"
    )

    organization_admin: Mapped["OrganizationAdmin"] = relationship(
        "OrganizationAdmin", back_populates="candidates"
    )

    participations: Mapped["CandidateParticipation"] = relationship(
        "CandidateParticipation", back_populates="candidate"
    )
