from sqlalchemy import Table, Column, ForeignKey, String, Integer, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from . import Base


class CandidateParticipation(Base):
    __tablename__ = "candidate_participations"

    vote_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    has_won: Mapped[bool] = mapped_column(Boolean, nullable=True)

    rank: Mapped[int] = mapped_column(Integer, nullable=True)

    # Foreign Keys
    candidate_hashed_national_id: Mapped[str] = mapped_column(
        String(200),
        ForeignKey("candidates.hashed_national_id", ondelete="CASCADE"),
        primary_key=True,
    )

    election_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("elections.id", ondelete="CASCADE"), primary_key=True
    )

    # Relationships
    candidate: Mapped["Candidate"] = mapped_column(
        "Candidate", back_populates="participations"
    )

    election: Mapped["Election"] = mapped_column(
        "Election", back_populates="participations"
    )
