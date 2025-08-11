from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.base import Base


class ApprovalTargetType(str, Enum):
    election = "election"
    candidate = "candidate"


class ApprovalAction(str, Enum):
    create = "create"
    update = "update"
    delete = "delete"


class ApprovalStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class ApprovalRequest(Base):
    __tablename__ = "approval_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # The owning organization user id
    organization_user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("organizations.user_id", ondelete="CASCADE"), index=True
    )

    # The admin who requested (must be organization_admin role user)
    requested_by_user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # What entity and which action
    target_type: Mapped[ApprovalTargetType] = mapped_column(SAEnum(ApprovalTargetType), nullable=False)
    action: Mapped[ApprovalAction] = mapped_column(SAEnum(ApprovalAction), nullable=False)

    # Reference to target entity
    target_id: Mapped[str] = mapped_column(String(255), nullable=False)

    # Arbitrary JSON payload as text (diff/fields/data)
    payload: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Status tracking
    status: Mapped[ApprovalStatus] = mapped_column(
        SAEnum(ApprovalStatus), default=ApprovalStatus.pending, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    decided_by_user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    organization = relationship("Organization", foreign_keys=[organization_user_id])
    requested_by = relationship("User", foreign_keys=[requested_by_user_id])
    decided_by = relationship("User", foreign_keys=[decided_by_user_id])
