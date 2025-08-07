from pydantic import BaseModel


class CandidateParticipationBase(BaseModel):
    candidate_hashed_national_id: str
    election_id: int
    vote_count: int = 0
    has_won: bool | None = None
    rank: str | None = None


class CandidateParticipationCreate(CandidateParticipationBase):
    pass


class CandidateParticipationRead(CandidateParticipationBase):
    class Config:
        from_attributes = True
