from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.base import Base

if TYPE_CHECKING:
    from .candidate_participation import CandidateParticipation
    from .organization import Organization
    from .voter import Voter
    from .voting_process import VotingProcess
    from .notification import Notification


class Election(Base):
    __tablename__ = "elections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    types: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(String(200))
    title: Mapped[str] = mapped_column(String(200))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()")
    total_vote_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    number_of_candidates: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    num_of_votes_per_voter: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    potential_number_of_voters: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    # New fields for election creation method
    method: Mapped[str] = mapped_column(String(50), nullable=False, default="api")  # 'api' or 'csv'
    api_endpoint: Mapped[str] = mapped_column(String(500), nullable=True)  # For API method

    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.user_id", ondelete="CASCADE"))

    organization: Mapped["Organization"] = relationship("Organization", back_populates="elections")
    voting_processes: Mapped["VotingProcess"] = relationship("VotingProcess", back_populates="election")
    voters: Mapped["Voter"] = relationship("Voter", back_populates="election")
    participations: Mapped["CandidateParticipation"] = relationship("CandidateParticipation", back_populates="election")
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="election", foreign_keys="Notification.election_id")
