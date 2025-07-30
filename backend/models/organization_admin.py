from . import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, ForeignKey


class OrganizationAdmin(Base):
    __tablename__ = "organization_admins"
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    user: Mapped["User"] = relationship("User", back_populates="organization_admin")

    organization_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("organizations.user_id", ondelete="CASCADE"), nullable=False
    )

    organization: Mapped["Organization"] = relationship(
        "Organization", back_populates="admins"
    )
