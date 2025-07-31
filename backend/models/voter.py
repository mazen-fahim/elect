from . import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, ForeignKey, String


class Voter(Base):
    __tablename__ = "voters"

    voter_hashed_id: Mapped[int] = mapped_column(String(200), primary_key=True)

    phone_number: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)

    # Foreign Keys
    election_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("elections.id", ondelete="CASCADE")
    )

    # Relationships
    election: Mapped["Election"] = relationship("Election", back_populates="voters")
