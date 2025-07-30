from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base
from sqlalchemy import ForeignKey, Integer, Numeric, String, Enum
from core.shared import Status , Country


class Organization(Base):
    __tablename__ = "organizations"
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )

    user: Mapped["User"] = relationship("User", back_populates="organization")

    name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)

    status: Mapped[Status] = mapped_column(
        Enum(Status), default=Status.pending, nullable=False
    )

    payment_status: Mapped[Status] = mapped_column(
        Enum(Status), default=Status.pending, nullable=False
    )

    api_endpoint: Mapped[str] = mapped_column(String(200), unique=True, nullable=True)

    country: Mapped[Country] = mapped_column(Enum(Country), nullable=False)

    admins: Mapped["OrganizationAdmin"] = relationship(
        "OrganizationAdmin", back_populates="organization"
    )
