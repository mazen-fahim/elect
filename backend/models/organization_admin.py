from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base

if TYPE_CHECKING:
    from .candidate import Candidate
    from .election import Election
    from .organization import Organization
    from .user import User


class OrganizationAdmin(Base):
    __tablename__ = "organization_admins"

    first_name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)

    last_name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)

    # Foreign Keys
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    organization_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("organizations.user_id", ondelete="CASCADE"), nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="organization_admin")

    organization: Mapped["Organization"] = relationship("Organization", back_populates="admins")

    candidates: Mapped["Candidate"] = relationship("Candidate", back_populates="organization_admin")

    elections: Mapped["Election"] = relationship("Election", back_populates="organization_admin")
