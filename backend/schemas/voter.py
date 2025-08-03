from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional

class VoterBase(BaseModel):
    voter_hashed_national_id: str = Field(
        ...,
        min_length=64,
        max_length=200,
        example="a1b2c3...",
        description="SHA-256 hashed national ID"
    )
    phone_number: str = Field(
        ...,
        min_length=10,
        max_length=20,
        example="+1234567890",
        description="International format phone number"
    )
    election_id: int = Field(..., gt=0, example=1)

class VoterCreate(VoterBase):
    pass

class VoterUpdate(BaseModel):
    phone_number: Optional[str] = Field(None, min_length=10, max_length=20)

class VoterOut(VoterBase):
    created_at: datetime
    election_title: str

    class Config:
        orm_mode = True