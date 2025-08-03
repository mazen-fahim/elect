from pydantic import BaseModel
from typing import Optional

class CandidateParticipationBase(BaseModel):

    candidate_hashed_national_id : str
    election_id : int 
    vote_count : int = 0 
    has_won : Optional[bool] = None
    rank : Optional[str] = None


class CandidateParticipationCreate(CandidateParticipationBase):
    pass 

class CandidateParticipationRead(CandidateParticipationBase):
    class Config : 
        orm_mode = True 

       