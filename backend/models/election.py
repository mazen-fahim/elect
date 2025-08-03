from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base


class Election(Base):
    __tablename__ = "elections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    types: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(String(200))
    create_req_status: Mapped[str] = mapped_column(String(200))
    title: Mapped[str] = mapped_column(String(200))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()")
    total_vote_count: Mapped[int] = mapped_column(Integer, nullable=True)
    number_of_candidates: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    num_of_votes_per_voter: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    potential_number_of_voters: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.user_id", ondelete="CASCADE"))
    organization_admin_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("organization_admins.user_id", ondelete="CASCADE")
    )

    organization = relationship("Organization", back_populates="elections")
    organization_admin = relationship("OrganizationAdmin", back_populates="elections")
    voting_processes = relationship("VotingProcess", back_populates="election")
    voters = relationship("Voter", back_populates="election")
    participations = relationship("CandidateParticipation", back_populates="election")
