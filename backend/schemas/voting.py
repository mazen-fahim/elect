from datetime import datetime
from typing import List
from pydantic import BaseModel, Field


class CandidateVoteInfo(BaseModel):
    """Schema for candidate information displayed during voting"""
    hashed_national_id: str
    name: str
    party: str | None = None
    symbol_name: str | None = None
    symbol_icon_url: str | None = None
    photo_url: str | None = None
    # Note: current_vote_count is intentionally excluded to prevent vote count visibility during voting
    
    class Config:
        from_attributes = True


class VoteRequest(BaseModel):
    """Schema for vote request from voter"""
    voter_hashed_national_id: str
    candidate_hashed_national_ids: List[str] = Field(..., min_items=1, description="List of candidate IDs to vote for")
    
    class Config:
        from_attributes = True


class VoteResponse(BaseModel):
    """Schema for vote response after successful voting"""
    message: str
    election_id: int
    voter_hashed_national_id: str
    candidates_selected: List[str]
    timestamp: datetime
    
    class Config:
        from_attributes = True
