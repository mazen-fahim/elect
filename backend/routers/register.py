from datetime import datetime
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status, BackgroundTasks
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from ..dependencies import get_current_user, get_db, get_registration_service
from ..models import User, Organization
from ..schemas.register import OrganizationCreate, OrganizationResponse, PaymentInfo
from ..services import RegistrationService, AuthService, EmailService

router = APIRouter(tags=["registration"])


@router.post("/register", response_model=OrganizationResponse)
async def register_organization(
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    address: str = Form(...),
    org_type: str = Form(...),
    description: Optional[str] = Form(None),
    website: Optional[str] = Form(None),
    contact_person: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    """Register a new organization with form data and send verification email"""
    org_data = OrganizationCreate(
        name=name,
        email=email,
        phone=phone,
        address=address,
        org_type=org_type,
        description=description,
        website=website,
        contact_person=contact_person,
        password=password,
    )

    service = AuthService(db)
    org = service.register_organization(org_data)

    # Send verification email
    user = db.query(User).filter(User.email == email).first()
    if user:
        email_service = EmailService(db)
        email_service.send_verification_email(user, background_tasks)

    return org


@router.get("/verify-email")
async def verify_email(token: str, db: Session = Depends(get_db)):
    """Verify email address using token"""
    email_service = EmailService(db)
    try:
        user = email_service.verify_email_token(token)
        return RedirectResponse(url="/email-verified-successfully")
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"detail": e.detail})


@router.post("/register/{org_id}/documents")
async def upload_documents(
    org_id: int,
    documents: List[UploadFile] = File(..., description="Max 5MB per file"),
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


@router.post("/register/{org_id}/payment", response_model=OrganizationResponse)
async def process_payment(
    org_id: int,
    card_number: str = Form(...),
    expiry_date: str = Form(...),
    cvv: str = Form(...),
    card_name: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Process payment for organization registration"""
    org = db.query(Organization).filter(Organization.id == org_id, Organization.user_id == current_user.id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="No permission to process payment for this organization"
        )

    payment_data = PaymentInfo(card_number=card_number, expiry_date=expiry_date, cvv=cvv, card_name=card_name)

    service = RegistrationService(db)
    service.process_payment(org_id, payment_data)
    return db.query(Organization).filter(Organization.id == org_id).first()


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
    from fastapi.responses import FileResponse
    import os

    template_path = os.path.join(os.path.dirname(__file__), "../templates/org_template.csv")
    return FileResponse(template_path, filename="organization_template.csv", media_type="text/csv")


@router.get("/verify-email")
async def verify_email(token: str, db: Session = Depends(get_db)):
    """Verify email using the provided token"""
    email_service = EmailService(db)
    user = email_service.verify_email_token(token)

    return {"message": "Email verified successfully", "user_id": user.id, "email": user.email}
