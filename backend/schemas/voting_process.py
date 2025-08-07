from datetime import datetime

from pydantic import BaseModel, Field


class VotingProcessBase(BaseModel):
    voter_hashed_national_id: str = Field(
        ..., min_length=64, max_length=200, examples=["a1b2c3..."], description="SHA-256 hashed national ID"
    )
    election_id: int = Field(..., gt=0, examples=[1])


class VotingProcessCreate(VotingProcessBase):
    pass


class VotingProcessOut(VotingProcessBase):
    created_at: datetime
    election_status: str

    class Config:
        from_attributes = True
