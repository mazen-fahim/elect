from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel, HttpUrl

from core.shared import Country
try:
    # Avoid importing SQLAlchemy models in Pydantic schemas; define read schema below
    from models.candidate_participation import CandidateParticipation  # type: ignore
except Exception:  # pragma: no cover
    CandidateParticipation = None  # placeholder

if TYPE_CHECKING:
    from models.organization import Organization


class CandidateBase(BaseModel):
    hashed_national_id: str
    name: str
    district: str | None = None
    governorate: str | None = None
    country: Country
    party: str | None = None
    organization_id: int
    symbol_icon_url: HttpUrl | None = None
    symbol_name: str | None = None
    photo_url: HttpUrl | None = None
    birth_date: datetime
    description: str | None = None


class CandidateCreate(CandidateBase):
    pass


class CandidateParticipationRead(BaseModel):
    election_id: int
    vote_count: int
    has_won: bool | None = None
    rank: int | None = None

    class Config:
        from_attributes = True


class CandidateUpdate(BaseModel):
    """Partial update schema for candidates"""
    name: str | None = None
    district: str | None = None
    governorate: str | None = None
    country: Country | None = None
    party: str | None = None
    symbol_icon_url: str | None = None
    symbol_name: str | None = None
    photo_url: str | None = None
    birth_date: datetime | None = None
    description: str | None = None


class CandidateRead(CandidateBase):
    hashed_national_id: str
    created_at: datetime

    participations: list[CandidateParticipationRead] | None = None

    class Config:
        from_attributes = True
        use_enum_values = True


class CandidateCreateResponse(CandidateBase):
    """Response schema for candidate creation - without relationships to avoid async issues"""
    hashed_national_id: str
    created_at: datetime

    class Config:
        from_attributes = True
        use_enum_values = True
