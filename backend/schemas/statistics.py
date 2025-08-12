#schemas/prediction.py
from pydantic import BaseModel
from typing import List
from datetime import datetime

# ✅ Schema for total voters
class TotalVotersResponse(BaseModel):
    total_voters: int  # Total number of registered voters

# ✅ Schema for total voter participated 
class TotalParticipatedVotersResponse(BaseModel):
    total_participated_voters: int

# ✅ Schema for participation percentage
class ParticipationPercentageResponse(BaseModel):
    participation_percentage: float


# ✅ Schema for top 3 candidates vote count
class CandidateVoteCount(BaseModel):
    candidate_id: int
    candidate_name: str
    vote_count: int

class TopCandidatesResponse(BaseModel):
    top_candidates: List[CandidateVoteCount]


# ✅ Schema for real-time voting chart data
class VotingChartDataPoint(BaseModel):
    hour: datetime   # begaining of hour
    voters_count: int

class VotingChartResponse(BaseModel):
    data: List[VotingChartDataPoint]

