from . import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, ForeignKey


class OrganizationAdmin(Base):
    __tablename__ = "organization_admins"

    # Foreign Keys
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )

    organization_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("organizations.user_id", ondelete="CASCADE"), nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="organization_admin")

    organization: Mapped["Organization"] = relationship(
        "Organization", back_populates="admins"
    )

    candidates: Mapped["Candidate"] = relationship(
        "Candidate", back_populates="organization_admin"
    )

    elections: Mapped["Election"] = relationship(
        "Election", back_populates="organization_admin"
    )
