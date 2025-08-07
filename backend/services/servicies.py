# Business Logic
import os
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session

from .models import User, Organization, Document, Payment
from .schemas import OrganizationCreate, PaymentInfo
from .security import get_password_hash, verify_password
from .database import SessionLocal

DOCUMENT_UPLOAD_DIR = "uploads/documents"
os.makedirs(DOCUMENT_UPLOAD_DIR, exist_ok=True)

class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def register_organization(self, org_data: OrganizationCreate) -> Organization:
        # Check if email already exists
        if self.db.query(User).filter(User.email == org_data.email).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Create user
        user = User(
            email=org_data.email,
            password=get_password_hash(org_data.password),
            role="organization",
            is_active=True,
            created_at=datetime.now(),
            last_access_at=datetime.now()
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        # Create organization
        org = Organization(
            name=org_data.name,
            email=org_data.email,
            phone=org_data.phone,
            address=org_data.address,
            org_type=org_data.org_type.value,
            description=org_data.description,
            website=org_data.website,
            contact_person=org_data.contact_person,
            status="pending",
            user_id=user.id,
            created_at=datetime.now()
        )
        self.db.add(org)
        self.db.commit()
        self.db.refresh(org)

        return org

    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        user = self.db.query(User).filter(User.email == email).first()
        if not user:
            return None
        if not verify_password(password, user.password):
            return None
        return user

class RegistrationService:
    def __init__(self, db: Session):
        self.db = db

    def upload_documents(self, org_id: int, files: List[UploadFile]) -> List[Document]:
        org = self.db.query(Organization).filter(Organization.id == org_id).first()
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )

        saved_docs = []
        for file in files:
            doc = self._save_document(file, org_id)
            saved_docs.append(doc)
        return saved_docs

    def process_payment(self, org_id: int, payment_data: PaymentInfo) -> Payment:
        org = self.db.query(Organization).filter(Organization.id == org_id).first()
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )

        # In a real app, integrate with payment processor
        payment = Payment(
            organization_id=org_id,
            amount=99.00,
            currency="USD",
            status="completed",
            payment_date=datetime.now(),
            last_four=payment_data.card_number[-4:]
        )
        self.db.add(payment)
        
        # Update org status
        org.status = "payment_completed"
        self.db.commit()

        return payment

    def _save_document(self, file: UploadFile, org_id: int) -> Document:
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
            upload_date=datetime.now()
        )
        self.db.add(doc)
        self.db.commit()
        return doc

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()