from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.base import Base
from core.shared import Country, Status

if TYPE_CHECKING:
    from .candidate import Candidate
    from .election import Election
    from .user import User


class Organization(Base):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)

    status: Mapped[Status] = mapped_column(Enum(Status), default=Status.pending, nullable=False)

    api_endpoint: Mapped[str] = mapped_column(String(200), unique=True, nullable=True)

    country: Mapped[Country] = mapped_column(Enum(Country), nullable=False)

    address: Mapped[str] = mapped_column(String(500), nullable=True)

    description: Mapped[str] = mapped_column(String(1000), nullable=True)

    # Foreign Keys
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="organization")

    candidates: Mapped["Candidate"] = relationship("Candidate", back_populates="organization")

    elections: Mapped["Election"] = relationship("Election", back_populates="organization")
