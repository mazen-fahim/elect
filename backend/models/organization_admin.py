from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.base import Base


class OrganizationAdmin(Base):
    __tablename__ = "organization_admins"

    # The admin user ID
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    # The owning organization user ID (points to organizations.user_id)
    organization_user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("organizations.user_id", ondelete="CASCADE"), nullable=False, index=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Email verification status for the organization admin account
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    organization = relationship("Organization", foreign_keys=[organization_user_id])
