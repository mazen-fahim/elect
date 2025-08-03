from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.organization import Organization
from database import get_db
from database import db_dependency

router = APIRouter(prefix="/organizations", tags=["organizations"])

@router.get("/")
async def get_all_organizations(db: db_dependency):
    result = await db.execute(select(Organization))
    return result.scalars().all()
