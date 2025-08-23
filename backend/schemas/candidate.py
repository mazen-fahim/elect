from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel, HttpUrl, field_validator

from core.shared import Country

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
    symbol_icon_url: str | None = None
    symbol_name: str | None = None
    photo_url: str | None = None
    birth_date: datetime | None = None
    description: str | None = None

    @field_validator('symbol_icon_url', 'photo_url', mode='before')
    @classmethod
    def validate_url_fields(cls, v):
        """Convert empty strings to None for URL fields"""
        if v == "":
            return None
        return v

    @field_validator('birth_date', mode='before')
    @classmethod
    def validate_birth_date(cls, v):
        """Handle None birth_date values"""
        if v == "" or v is None:
            return None
        return v


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

    @field_validator('symbol_icon_url', 'photo_url', mode='before')
    @classmethod
    def validate_url_fields(cls, v):
        """Convert empty strings to None for URL fields"""
        if v == "":
            return None
        return v

    @field_validator('birth_date', mode='before')
    @classmethod
    def validate_birth_date(cls, v):
        """Handle None birth_date values"""
        if v == "" or v is None:
            return None
        return v


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
