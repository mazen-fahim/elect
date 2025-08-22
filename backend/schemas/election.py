from datetime import datetime
from typing import List, Optional
from enum import Enum

from pydantic import BaseModel, field_validator
from .candidate import CandidateCreate
from .voter import VoterCreate


class ElectionMethod(str, Enum):
    API = "api"
    CSV = "csv"


class ElectionType(str, Enum):
    SIMPLE = "simple"
    DISTRICT_BASED = "district_based"
    GOVERNORATE_BASED = "governorate_based"
    API_MANAGED = "api_managed"


class ElectionBase(BaseModel):
    title: str
    types: str
    starts_at: datetime
    ends_at: datetime
    num_of_votes_per_voter: int
    potential_number_of_voters: int

    @field_validator("starts_at")
    def validate_start_date(cls, starts_at):
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        
        # Ensure starts_at is timezone-aware
        if starts_at.tzinfo is None:
            starts_at = starts_at.replace(tzinfo=timezone.utc)
        
        if starts_at < now:
            raise ValueError("Start date and time cannot be in the past")
        return starts_at

    @field_validator("ends_at")
    def validate_end_date(cls, ends_at, info):
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        
        # Ensure ends_at is timezone-aware
        if ends_at.tzinfo is None:
            ends_at = ends_at.replace(tzinfo=timezone.utc)
        
        # Check if end date is in the past
        if ends_at < now:
            raise ValueError("End date and time cannot be in the past")
        
        # Get starts_at and ensure it's timezone-aware
        starts_at = info.data.get("starts_at")
        if starts_at:
            if starts_at.tzinfo is None:
                starts_at = starts_at.replace(tzinfo=timezone.utc)
            
            if ends_at < starts_at:
                raise ValueError("End date and time must be after or equal to start date and time")
            
        return ends_at


class CandidateCreateForElection(BaseModel):
    """Schema for creating candidates during election creation"""
    hashed_national_id: str
    name: str
    district: Optional[str] = None
    governorate: Optional[str] = None
    country: str
    party: Optional[str] = None
    symbol_icon_url: Optional[str] = None
    symbol_name: Optional[str] = None
    photo_url: Optional[str] = None
    birth_date: Optional[datetime] = None  # Now optional
    description: Optional[str] = None


class VoterCreateForElection(BaseModel):
    """Schema for creating voters during election creation"""
    voter_hashed_national_id: str
    phone_number: str
    governorate: Optional[str] = None


class ElectionCreate(ElectionBase):
    # Election creation method
    method: ElectionMethod
    
    # For API method
    api_endpoint: Optional[str] = None
    
    # For CSV method - file content will be handled separately in the endpoint
    # Optional lists for manual candidate/voter addition (for backwards compatibility)
    candidates: Optional[List[CandidateCreateForElection]] = None
    voters: Optional[List[VoterCreateForElection]] = None


class ElectionUpdate(BaseModel):
    title: str | None = None
    types: str | None = None
    status: str | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    num_of_votes_per_voter: int | None = None
    potential_number_of_voters: int | None = None

    @field_validator("ends_at")
    def validate_dates_update(cls, ends_at, info):
        starts_at = info.data.get("starts_at")
        if starts_at and ends_at and ends_at <= starts_at:
            raise ValueError("End date must be after start date")
        return ends_at


class ElectionOut(ElectionBase):
    id: int
    organization_id: int
    status: str
    created_at: datetime
    total_vote_count: int | None = None
    number_of_candidates: int
    method: str
    api_endpoint: str | None = None

    class Config:
        from_attributes = True


class ElectionStatus(str, Enum):
    UPCOMING = "upcoming"
    RUNNING = "running"
    FINISHED = "finished"


class ElectionListResponse(BaseModel):
    """Response schema for election listing with computed status"""
    id: int
    title: str
    types: str
    status: str
    computed_status: ElectionStatus
    starts_at: datetime
    ends_at: datetime
    created_at: datetime
    total_vote_count: int
    number_of_candidates: int
    potential_number_of_voters: int
    num_of_votes_per_voter: int
    method: str
    
    class Config:
        from_attributes = True
