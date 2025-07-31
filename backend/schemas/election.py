from pydantic import BaseModel, validator
from datetime import datetime
from typing import Optional

class ElectionBase(BaseModel):
    title: str
    types: str
    organization_id: str
    orgnization_admin_id: str
    starts_at: datetime
    ends_at: datetime
    num_of_votes_per_voter: int
    potential_number_of_voters: int

    # Add the validator here in the base class so it applies to all schemas that include these fields
    @validator('ends_at')
    def validate_dates(cls, ends_at, values):
        if 'starts_at' in values and ends_at <= values['starts_at']:
            raise ValueError('End date must be after start date')
        return ends_at

class ElectionCreate(ElectionBase):
    pass

class ElectionUpdate(BaseModel):
    title: Optional[str] = None
    types: Optional[str] = None
    status: Optional[str] = None
    create_req_status: Optional[str] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    num_of_votes_per_voter: Optional[int] = None
    potential_number_of_voters: Optional[int] = None

    # Also add it here for partial updates that might include dates
    @validator('ends_at')
    def validate_dates_update(cls, ends_at, values):
        if 'starts_at' in values and ends_at is not None and values['starts_at'] is not None:
            if ends_at <= values['starts_at']:
                raise ValueError('End date must be after start date')
        return ends_at

class ElectionOut(ElectionBase):
    id: int
    status: str
    create_req_status: str
    created_at: datetime
    total_vote_count: Optional[int] = None
    number_of_candidates: int

    class Config:
        orm_mode = True