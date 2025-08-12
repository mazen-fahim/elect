from typing import TYPE_CHECKING
from sqlalchemy import ForeignKey, String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base

if TYPE_CHECKING:
    from .voter import Voter
    from .candidate import Candidate
    from .election import Election

class CandidateVoterMapping(Base):
    __tablename__ = "candidate_voter_mappings"

    voter_hashed_national_id: Mapped[str] = mapped_column(
        String(200), 
        ForeignKey("voters.voter_hashed_national_id", ondelete="CASCADE"), 
        primary_key=True
    )

    candidate_hashed_national_id: Mapped[str] = mapped_column(
        String(200),
        ForeignKey("candidates.hashed_national_id", ondelete="CASCADE"),
        primary_key=True,
    )

    election_id: Mapped[int] = mapped_column(
        Integer, 
        ForeignKey("elections.id", ondelete="CASCADE"),
        primary_key=True,
    )

    # Relationships
    voter: Mapped["Voter"] = relationship("Voter", back_populates="candidate_mappings")
    candidate: Mapped["Candidate"] = relationship("Candidate", back_populates="voter_mappings")
    election: Mapped["Election"] = relationship("Election", back_populates="candidate_voter_mappings")
