from typing import TYPE_CHECKING , List

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .candidate_voter_mapping import CandidateVoterMapping
from core.shared import Country, Status


from . import Base

if TYPE_CHECKING:
    from .election import Election


class Voter(Base):
    __tablename__ = "voters"

    voter_hashed_national_id: Mapped[int] = mapped_column(String(200), primary_key=True)

    phone_number: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)

    governerate: Mapped[str] = mapped_column(String(100), nullable=True)


    # Foreign Keys
    election_id: Mapped[int] = mapped_column(Integer, ForeignKey("elections.id", ondelete="CASCADE"))

    # Relationships
    election: Mapped["Election"] = relationship("Election", back_populates="voters")
    candidate_mappings: Mapped[List["CandidateVoterMapping"]] = relationship(
    "CandidateVoterMapping", back_populates="voter", cascade="all, delete-orphan"
)
