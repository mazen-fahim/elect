from sqlalchemy import Table, Column, ForeignKey, String, Integer, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from . import Base

candidate_participation = Table(
    "candidate_participation",
    Base.metadata,
    Column("candidate_id", String(200), ForeignKey("candidates.hashed_national_id", ondelete="CASCADE"), primary_key=True),
    Column("election_id", String(200), ForeignKey("elections.id", ondelete="CASCADE"), primary_key=True),
    Column("vote_count", Integer, nullable=True, index=True),
    Column("has_won", Boolean, nullable=False),
    Column("rank", Integer, nullable=False, index=True),
)