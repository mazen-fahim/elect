from fastapi import APIRouter , Depends , HTTPException , status
from sqlalchemy.ext.asyncio import AsyncSession 
from sqlalchemy. future import select 
from typing import List
from ..database import get_db  
from sqlalchemy.orm import selectinload
from ..models import Candidate
from ..schemas.candidate import CandidateCreate , CandidateRead 


router = APIRouter( perfix = "/candidates",tags=["Candidate"])

@router.post("/", response_model = CandidateRead , status_code = status.HTTP_201_CREATED )
async def create_candidate(candidate_in : CandidateCreate , db: AsyncSession = Depends(get_db)):
    
    existing_candidate = ( await db.execute(select(Candidate).where(Candidate.hashed_national_id == candidate_in.hashed_national_id))).first()

    if existing_candidate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A candidate with this national ID already exists")

    new_candidate = Candidate(
    name=candidate_in.name,
    hashed_national_id=candidate_in.hashed_national_id,
    email=candidate_in.email
)
    
    db.add(new_candidate)
    await db.commit()
    await db.refresh(new_candidate)
    
@router.get("/" , response_model = List[CandidateRead])
async def get_all_candidates(skip : int = 0 ,limit : int = 100 , db : AsyncSession = Depends(get_db)):
    
    query = (select(Candidate)
             .offset(skip).limit(limit)
             .options( selectinload(Candidate.participations),
                      selectinload(Candidate.organization)))
    
    result = await db.exexute(query)
    candidates = result.scalars().all()
    return candidates

@router.get("/{hashed_national_id}", response_model = CandidateRead)
async def get_candidate_by_id(hashed_national_id : str , db : AsyncSession = Depends(get_db)):

    query = (select(Candidate).where(Candidate.hashed_national_id == hashed_national_id)
             .options(selectinload(Candidate.participations),
                      selectinload(Candidate.organization),
                      selectinload(Candidate.organization_admin)))
    
    result = await db.execute(query)
    candidate = result.scalars().first()

    if not candidate :
        raise HTTPException(status_code = status.HTTP_404_NOT_FOUND,
                            detail = "Candidate not found ")
    
    return candidate



