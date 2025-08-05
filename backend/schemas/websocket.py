# schemas/websocket.py
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field

class NewVoteData(BaseModel):
    total_votes: int = Field(..., description="Current total votes in election")
    voter_id: str = Field(..., min_length=4, max_length=4, description="Last 4 chars of hashed national ID")
    candidate_id: str = Field(..., description="ID of candidate being voted for")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="When vote was cast")

class CandidateUpdateData(BaseModel):
    candidate_id: str = Field(..., description="ID of candidate receiving votes")
    vote_count: int = Field(..., description="Current total votes for this candidate")
    vote_change: int = Field(1, description="Number of votes added in this update")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ElectionStatusData(BaseModel):
    status: Literal["pending", "active", "completed", "cancelled"]
    previous_status: Optional[str] = Field(None, description="Previous status before change")
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class VoteValidationData(BaseModel):
    voter_id: str = Field(..., description="Full hashed national ID")
    is_valid: bool
    reason: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class WSMessage(BaseModel):
    type: Literal[
        "NEW_VOTE", 
        "CANDIDATE_UPDATE",
        "ELECTION_STATUS_CHANGE",
        "VOTE_VALIDATION",
        "SYSTEM_ALERT"
    ]
    election_id: int = Field(..., description="Related election ID")
    organization_id: Optional[str] = Field(None, description="Owning organization ID")
    data: dict = Field(..., description="Message payload")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class SystemAlertData(BaseModel):
    severity: Literal["info", "warning", "critical"]
    message: str
    component: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class AuditLogData(BaseModel):
    action: str
    voter_id: str
    ip_address: Optional[str]
    user_agent: Optional[str]
    timestamp: datetime = Field(default_factory=datetime.utcnow)