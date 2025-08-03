from datetime import datetime

from pydantic import BaseModel, Field


class VoterBase(BaseModel):
    voter_hashed_national_id: str = Field(
        ..., min_length=64, max_length=200, examples=["a1b2c3..."], description="SHA-256 hashed national ID"
    )
    phone_number: str = Field(
        min_length=10, max_length=20, examples=["+1234567890"], description="International format phone number"
    )
    election_id: int = Field(gt=0, examples=[1])


class VoterCreate(VoterBase):
    pass


class VoterUpdate(BaseModel):
    phone_number: str | None = Field(default=None, min_length=10, max_length=20)


class VoterOut(VoterBase):
    created_at: datetime
    election_title: str

    class Config:
        orm_mode = True
