from fastapi import APIRouter
from sqlalchemy import select

from core.dependencies import db_dependency
from models.organization import Organization

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.get("/")
async def get_all_organizations(db: db_dependency):
    result = await db.execute(select(Organization))
    return result.scalars().all()
