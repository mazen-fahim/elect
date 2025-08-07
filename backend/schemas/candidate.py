from datetime import datetime
from typing import TYPE_CHECKING, Optional

from pydantic import BaseModel, HttpUrl

from core.shared import Country, Status
from models.candidate_participation import CandidateParticipation

if TYPE_CHECKING:
    from models.organization import Organization
    from models.organization_admin import OrganizationAdmin


class CandidateBase(BaseModel):
    hashed_national_id: str
    name: str
    district: str | None = None
    governorate: str | None = None
    country: Country
    party: str
    organization_id: int
    symbol_icon_url: HttpUrl | None = None
    symbol_name: str | None = None
    photo_url: HttpUrl | None = None
    birth_date: datetime
    description: str | None = None
    organization_admin_id: int | None = None


class CandidateCreate(CandidateBase):
    pass


class CandidateRead(CandidateBase):
    id: str
    create_req_status: Status
    create_at: datetime

    participations: list[CandidateParticipation] = []
    organization: "Organization"
    organization_admin: Optional["OrganizationAdmin"] = None

    class Config:
        from_attributes = True
        use_enum_values = True
