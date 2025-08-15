#services/prediction.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import desc, func, select
from models.voter import Voter
from models.voting_process import VotingProcess
from models.candidate_participation import CandidateParticipation
from models.candidate import Candidate
from models.voting_process import VotingProcess


# ✅ Get total voters 
async def get_total_voters(db: AsyncSession) -> int:
    result = await db.execute(select(func.count()).select_from(Voter))
    total = result.scalar_one()
    return total

# ✅ Get total participated voters
async def get_total_participated_voters(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count()).select_from(VotingProcess)
    )
    total = result.scalar_one()
    return total

# ✅ Get participation percentage
async def get_participation_percentage(db: AsyncSession) -> float:
    total_voters_result = await db.execute(select(func.count()).select_from(Voter))
    total_voters = total_voters_result.scalar_one()

    participated_voters_result = await db.execute(select(func.count()).select_from(VotingProcess))
    participated_voters = participated_voters_result.scalar_one()

    if total_voters == 0:
        return 0.0

    percentage = (participated_voters / total_voters) * 100
    return round(percentage, 2)

# ✅ Get top 3 candidates by vote count
async def get_top_3_candidates(db: AsyncSession):
    stmt = (
        select(
            Candidate.id.label("candidate_id"),
            Candidate.name.label("candidate_name"),
            func.count(CandidateParticipation.id).label("vote_count")
        )
        .join(CandidateParticipation, Candidate.id == CandidateParticipation.candidate_id)
        .group_by(Candidate.id)
        .order_by(desc("vote_count"))
        .limit(3)
    )
    result = await db.execute(stmt)
    rows = result.all()

    top_candidates = [
        {
            "candidate_id": row.candidate_id,
            "candidate_name": row.candidate_name,
            "vote_count": row.vote_count
        }
        for row in rows
    ]
    return top_candidates


# ✅ Get real-time voting chart data (using Election.created_at)
async def get_voting_chart_data(db: AsyncSession):
    
    stmt = (
        select(
            func.date_trunc('hour', VotingProcess.voted_at).label('hour'),
            func.count(VotingProcess.id).label('voters_count')
        )
        .group_by('hour')
        .order_by('hour')
    )
    result = await db.execute(stmt)
    rows = result.all()

    data = [
        {"hour": row.hour, "voters_count": row.voters_count}
        for row in rows
    ]
    return data
