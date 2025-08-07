import enum
from datetime import datetime
from typing import TYPE_CHECKING,List

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base

if TYPE_CHECKING:
    from .organization import Organization
    from .organization_admin import OrganizationAdmin
    from .password_reset_tocken import PasswordResetToken

class UserRole(enum.Enum):
    admin = "admin"
    organization = "organization"
    organization_admin = "organization_admin"


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String(200), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    last_access_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="user", uselist=False)

    organization_admin: Mapped["OrganizationAdmin"] = relationship(
        "OrganizationAdmin", back_populates="user", uselist=False
    )

    password_reset_tokens: Mapped[List["PasswordResetToken"]] = relationship(  # New relationship
        "PasswordResetToken", 
        back_populates="user",
        cascade="all, delete-orphan"
    )





