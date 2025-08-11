from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy.future import select

from core.dependencies import db_dependency
from models.election import Election


router = APIRouter(prefix="/home", tags=["Home"])


class HomeElection(BaseModel):
    id: int
    title: str
    types: str
    starts_at: datetime
    ends_at: datetime


class HomeStats(BaseModel):
    total_elections: int
    total_candidates: int
    total_votes: int


class HomeData(BaseModel):
    stats: HomeStats
    recent_elections: List[HomeElection]


@router.get("/", response_model=HomeData)
async def get_home_data(db: db_dependency):
    from sqlalchemy import func
    from models.candidate import Candidate

    # Recent elections (public summary)
    recent_res = await db.execute(select(Election).order_by(Election.created_at.desc()).limit(5))
    recent = recent_res.scalars().all()

    # Stats
    total_elections = (await db.execute(select(func.count(Election.id)))).scalar() or 0
    total_candidates = (await db.execute(select(func.count(Candidate.hashed_national_id)))).scalar() or 0
    total_votes = (await db.execute(select(func.coalesce(func.sum(Election.total_vote_count), 0)))).scalar() or 0

    return HomeData(
        stats=HomeStats(
            total_elections=total_elections,
            total_candidates=total_candidates,
            total_votes=total_votes,
        ),
        recent_elections=[
            HomeElection(
                id=e.id,
                title=e.title,
                types=e.types,
                starts_at=e.starts_at,
                ends_at=e.ends_at,
            )
            for e in recent
        ],
    )
