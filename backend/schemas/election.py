from datetime import datetime

from pydantic import BaseModel, field_validator


class ElectionBase(BaseModel):
    title: str
    types: str
    organization_id: str
    organization_admin_id: str
    starts_at: datetime
    ends_at: datetime
    num_of_votes_per_voter: int
    potential_number_of_voters: int

    @field_validator("ends_at")
    def validate_dates(cls, ends_at, values):
        if "starts_at" in values and ends_at <= values["starts_at"]:
            raise ValueError("End date must be after start date")
        return ends_at


class ElectionCreate(ElectionBase):
    pass


class ElectionUpdate(BaseModel):
    title: str | None = None
    types: str | None = None
    status: str | None = None
    create_req_status: str | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    num_of_votes_per_voter: int | None = None
    potential_number_of_voters: int | None = None

    @field_validator("ends_at")
    def validate_dates_update(cls, ends_at, values):
        if "starts_at" in values and ends_at and values["starts_at"] and ends_at <= values["starts_at"]:
            raise ValueError("End date must be after start date")
        return ends_at


class ElectionOut(ElectionBase):
    id: int
    status: str
    create_req_status: str
    created_at: datetime
    total_vote_count: int | None = None
    number_of_candidates: int

    class Config:
        from_attributes = True
