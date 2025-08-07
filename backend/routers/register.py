Grom fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from models import Organization, User
from schemas.register import OrganizationResponse, PaymentInfo
from services import RegistrationService

router = APIRouter(tags=["registration"])


@router.post("/register/{org_id}/documents")
async def upload_documents(
    org_id: int,
    documents: list[UploadFile] = File(..., description="Max 5MB per file"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload verification documents (max 5MB each)"""
    # The size validation will now happen automatically via the DocumentUpload schema

    org = db.query(Organization).filter(Organization.id == org_id, Organization.user_id == current_user.id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="No permission to upload documents for this organization"
        )

    service = RegistrationService(db)
    return service.upload_documents(org_id, documents)




@router.post("/upload-spreadsheet")
async def upload_spreadsheet(
    file: UploadFile = File(..., description="CSV/Excel file (max 2MB)"),
    service: RegistrationService = Depends(get_registration_service),
):
    """Bulk register organizations (max 2MB file size)"""
    """
    Bulk register organizations from spreadsheet.
      
    Required columns:
    - name, email, phone, address, org_type
    
    Optional columns:
    - description, website, contact_person
    """
    try:
        result = await service.process_spreadsheet(file)
        return JSONResponse(content=result)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Spreadsheet processing failed: {str(e)}")


@router.post("/validate-spreadsheet")
async def validate_spreadsheet(
    file: UploadFile = File(..., description="CSV/Excel file to validate"),
    service: RegistrationService = Depends(get_registration_service),
):
    """Validate spreadsheet structure before processing"""
    try:
        data = await service.process_spreadsheet(file)
        required_columns = ["name", "email", "phone"]
        sample_row = data["sample_data"][0] if data["sample_data"] else {}

        missing_columns = [col for col in required_columns if col not in sample_row]
        if missing_columns:
            raise HTTPException(status_code=400, detail=f"Missing columns: {', '.join(missing_columns)}")

        return {"valid": True, "row_count": data["row_count"], "sample_data": data["sample_data"]}
    except HTTPException as he:
        return JSONResponse(status_code=he.status_code, content={"valid": False, "error": he.detail})


@router.get("/download-template")
async def download_template():
    """Download CSV template for bulk registration"""
    import os

    from fastapi.responses import FileResponse

    template_path = os.path.join(os.path.dirname(__file__), "../templates/org_template.csv")
    return FileResponse(template_path, filename="organization_template.csv", media_type="text/csv")
