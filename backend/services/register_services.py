import os
import uuid
import pandas as pd
from io import BytesIO
from datetime import datetime
from typing import List, Dict, Optional
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session

from ..models import User, Organization, Document, Payment
from ..schemas.register import OrganizationCreate, PaymentInfo
from ..security import get_password_hash
from ..config import settings

DOCUMENT_UPLOAD_DIR = "uploads/documents"
os.makedirs(DOCUMENT_UPLOAD_DIR, exist_ok=True)


class RegistrationService:
    def __init__(self, db: Session):
        self.db = db
        self.max_document_size = settings.MAX_DOCUMENT_SIZE
        self.max_spreadsheet_size = settings.MAX_SPREADSHEET_SIZE

    # Document handling methods
    def upload_documents(self, org_id: int, files: List[UploadFile]) -> List[Document]:
        """Handle document uploads for an organization"""
        self._verify_organization_exists(org_id)
        return [self._save_document(file, org_id) for file in files]

    def _save_document(self, file: UploadFile, org_id: int) -> Document:
        """Save uploaded document to filesystem and database"""
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{org_id}_{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(DOCUMENT_UPLOAD_DIR, unique_filename)

        with open(file_path, "wb") as buffer:
            buffer.write(file.file.read())

        doc = Document(
            filename=unique_filename,
            filepath=file_path,
            content_type=file.content_type,
            organization_id=org_id,
            upload_date=datetime.now(),
        )
        self.db.add(doc)
        self.db.commit()
        return doc

    # Payment processing
    def process_payment(self, org_id: int, payment_data: PaymentInfo) -> Payment:
        """Process organization payment"""
        org = self._verify_organization_exists(org_id)

        payment = Payment(
            organization_id=org_id,
            amount=99.00,
            currency="USD",
            status="completed",
            payment_date=datetime.now(),
            last_four=payment_data.card_number[-4:],
        )
        self.db.add(payment)

        org.status = "payment_completed"
        self.db.commit()
        return payment

    # Bulk registration methods
    async def process_spreadsheet(self, file: UploadFile) -> Dict:
        """Process and validate uploaded spreadsheet file"""
        try:
            if file.size > self.max_spreadsheet_size:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Spreadsheet too large. Max size is {self.max_spreadsheet_size / 1024 / 1024}MB",
                )
            contents = await file.read()
            df = self._read_spreadsheet(file.content_type, contents)
            self._validate_spreadsheet(df)

            return {
                "filename": file.filename,
                "data": df.replace({pd.NA: None}).to_dict("records"),
                "row_count": len(df),
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"File processing error: {str(e)}")

    def _save_document(self, file: UploadFile, org_id: int) -> Document:
        """Save uploaded document with size check"""
        if file.size > self.max_document_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Document too large. Max size is {self.max_document_size / 1024 / 1024}MB",
            )

    async def bulk_register_organizations(self, file: UploadFile) -> Dict:
        """Bulk register organizations from spreadsheet"""
        processed = await self.process_spreadsheet(file)
        results = {"successful": [], "failed": []}

        for idx, row in enumerate(processed["data"], start=1):
            try:
                org_data = self._prepare_org_data(row)
                org = self._create_organization(org_data)

                results["successful"].append({"row": idx, "id": org.id, "name": org.name})
            except Exception as e:
                results["failed"].append({
                    "row": idx,
                    "error": str(e),
                    "data": {k: v for k, v in row.items() if k in ["name", "email"]},
                })

        return {
            "filename": processed["filename"],
            "total_rows": processed["row_count"],
            "success_count": len(results["successful"]),
            "failure_count": len(results["failed"]),
            "results": results,
        }

    # Helper methods
    def _verify_organization_exists(self, org_id: int) -> Organization:
        """Verify organization exists or raise 404"""
        org = self.db.query(Organization).get(org_id)
        if not org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
        return org

    def _read_spreadsheet(self, content_type: str, contents: bytes) -> pd.DataFrame:
        """Read spreadsheet based on file type"""
        if content_type == "text/csv":
            return pd.read_csv(BytesIO(contents))
        return pd.read_excel(BytesIO(contents))  # Excel

    def _validate_spreadsheet(self, df: pd.DataFrame):
        """Validate spreadsheet content"""
        if df.empty:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

        required_columns = {"name", "email", "phone", "address", "org_type"}
        if missing := required_columns - set(df.columns):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=f"Missing required columns: {', '.join(missing)}"
            )

    def _prepare_org_data(self, row: Dict) -> OrganizationCreate:
        """Prepare organization data from spreadsheet row"""
        return OrganizationCreate(
            name=row["name"],
            email=row["email"],
            phone=row["phone"],
            address=row["address"],
            org_type=row["org_type"],
            description=row.get("description"),
            website=row.get("website"),
            contact_person=row.get("contact_person", row["name"]),
            password=self._generate_temp_password(),
        )

    def _create_organization(self, org_data: OrganizationCreate) -> Organization:
        """Create organization and associated user"""
        if self.db.query(User).filter(User.email == org_data.email).first():
            raise ValueError("Organization with this email already exists")

        user = User(
            email=org_data.email,
            password=get_password_hash(org_data.password),
            role="organization",
            is_active=True,
            created_at=datetime.now(),
        )
        self.db.add(user)
        self.db.commit()

        org = Organization(
            name=org_data.name,
            email=org_data.email,
            phone=org_data.phone,
            address=org_data.address,
            org_type=org_data.org_type,
            description=org_data.description,
            website=str(org_data.website) if org_data.website else None,
            contact_person=org_data.contact_person,
            status="pending",
            user_id=user.id,
            created_at=datetime.now(),
        )
        self.db.add(org)
        self.db.commit()
        return org

    def _generate_temp_password(self) -> str:
        """Generate temporary password for new organizations"""
        return f"TempPass_{uuid.uuid4().hex[:8]}"
