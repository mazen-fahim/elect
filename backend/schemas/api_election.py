from typing import List, Optional
from pydantic import BaseModel, HttpUrl


class VoterVerificationRequest(BaseModel):
    """Request sent to organization's API endpoint to verify voter eligibility"""
    voter_national_id: str
    election_id: int
    election_title: str


class CandidateInfo(BaseModel):
    """Candidate information returned by organization's API"""
    hashed_national_id: str
    name: str
    district: Optional[str] = None
    governorate: Optional[str] = None
    country: str
    party: Optional[str] = None
    symbol_icon_url: Optional[str] = None
    symbol_name: Optional[str] = None
    photo_url: Optional[str] = None
    birth_date: Optional[str] = None  # ISO format string, now optional
    description: Optional[str] = None


class VoterVerificationResponse(BaseModel):
    """Response from organization's API endpoint"""
    is_eligible: bool
    phone_number: Optional[str] = None
    eligible_candidates: Optional[List[CandidateInfo]] = None
    error_message: Optional[str] = None


class DummyCandidateCreate(BaseModel):
    """Schema for creating dummy candidates"""
    hashed_national_id: str
    name: str
    district: Optional[str] = None
    governorate: Optional[str] = None
    country: str
    party: Optional[str] = None
    symbol_icon_url: Optional[str] = None
    symbol_name: Optional[str] = None
    photo_url: Optional[str] = None
    birth_date: Optional[str] = None  # ISO format string, now optional
    description: Optional[str] = None
    election_id: int  # Required: which election this candidate belongs to


class DummyVoterCreate(BaseModel):
    """Schema for creating dummy voters"""
    voter_hashed_national_id: str
    phone_number: str
    governerate: Optional[str] = None
    district: Optional[str] = None
    eligible_candidates: Optional[List[str]] = None  # List of candidate hashed IDs
    election_id: int  # Required: which election this voter is eligible for


class DummyCandidateOut(BaseModel):
    """Schema for dummy candidate output"""
    hashed_national_id: str
    name: str
    district: Optional[str] = None
    governorate: Optional[str] = None
    country: str
    party: Optional[str] = None
    symbol_icon_url: Optional[str] = None
    symbol_name: Optional[str] = None
    photo_url: Optional[str] = None
    birth_date: Optional[str] = None
    description: Optional[str] = None
    created_at: str
    election_id: int

    class Config:
        from_attributes = True


class DummyVoterOut(BaseModel):
    """Schema for dummy voter output"""
    voter_hashed_national_id: str
    phone_number: str
    governerate: Optional[str] = None
    district: Optional[str] = None
    eligible_candidates: Optional[List[str]] = None
    created_at: str
    election_id: int

    class Config:
        from_attributes = True
