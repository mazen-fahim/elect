from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base

if TYPE_CHECKING:
    from .election import Election


class VotingProcess(Base):
    __tablename__ = "voting_processes"

    voter_hashed_national_id: Mapped[int] = mapped_column(String(200), primary_key=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Foreign Keys
    election_id: Mapped[int] = mapped_column(Integer, ForeignKey("elections.id", ondelete="CASCADE"), primary_key=True)

    # Relationships
    election: Mapped["Election"] = relationship("Election", back_populates="voting_processes")
