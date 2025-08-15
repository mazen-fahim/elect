#routers/prediction.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db  
from schemas.statistics import TotalVotersResponse
from schemas.statistics import TotalParticipatedVotersResponse
from schemas.statistics import ParticipationPercentageResponse
from schemas.statistics import TopCandidatesResponse, CandidateVoteCount
from schemas.statistics import VotingChartResponse, VotingChartDataPoint


import services.statistics as statistics

router = APIRouter(prefix="/statistics", tags=["Statistics"])

# ✅ Get total voters
@router.get("/total_voters", response_model=TotalVotersResponse)
async def get_total_voters_endpoint(db: AsyncSession = Depends(get_db)):
    total = await statistics.get_total_voters(db)
    return TotalVotersResponse(total_voters=total)

# ✅ Get total participated voters
@router.get("/total_participated_voters", response_model=TotalParticipatedVotersResponse)
async def get_total_participated_voters_endpoint(db: AsyncSession = Depends(get_db)):
    total = await statistics.get_total_participated_voters(db)
    return TotalParticipatedVotersResponse(total_participated_voters=total)


# ✅ Get participation percentage
@router.get("/participation_percentage", response_model=ParticipationPercentageResponse)
async def get_participation_percentage_endpoint(db: AsyncSession = Depends(get_db)):
    percentage = await statistics.get_participation_percentage(db)
    return ParticipationPercentageResponse(participation_percentage=percentage)

# ✅  Get top 3 candidates by vote count
@router.get("/top_3_candidates", response_model=TopCandidatesResponse)
async def get_top_3_candidates_endpoint(db: AsyncSession = Depends(get_db)):
    candidates = await statistics.get_top_3_candidates(db)
    return TopCandidatesResponse(top_candidates=candidates)

# ✅  Get real-time voting chart data (voters per hour)
@router.get("/voting_chart", response_model=VotingChartResponse)
async def get_voting_chart_endpoint(db: AsyncSession = Depends(get_db)):
    data = await statistics.get_voting_chart_data(db)
    return VotingChartResponse(data=data)

