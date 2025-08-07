from fastapi import APIRouter
from sqlalchemy import select

from core.dependencies import db_dependency, organization_dependency
from models.organization import Organization
from services.document import DocumentSerivce

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("/")
async def get_all_organizations(db: db_dependency):
    result = await db.execute(select(Organization))
    return result.scalars().all()


# @router.post("/register/{org_id}/payment", response_model=OrganizationResponse)
# async def process_payment(
#     payment_data: PaymentInfo,
#     org: organization_dependency,
# ):
#     service = RegistrationService(db)
#     service.process_payment(org_id, payment_data)
#     return db.query(Organization).filter(Organization.id == org_id).first()


@router.post("/{election_id}/documents")
async def upload_documents(
    org_id: int,
    organization: organization_dependency,
    db: db_dependency,
    documents: list[UploadFile] = File(..., description="Max 5MB per file"),
):
    """Upload verification documents (max 5MB each)"""
    # The size validation will now happen automatically via the DocumentUpload schema
    service = DocumentSerivce(db)
    return service.upload_documents(org_id, documents)
