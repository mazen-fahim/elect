import os
import uuid
from datetime import datetime
from typing import List

from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session

from ..models import Document, Payment, Organization
from ..schemas.register import PaymentInfo

DOCUMENT_UPLOAD_DIR = "uploads/documents"
os.makedirs(DOCUMENT_UPLOAD_DIR, exist_ok=True)


class RegistrationService:
    def __init__(self, db: Session):
        self.db = db

    def upload_documents(self, org_id: int, files: List[UploadFile]) -> List[Document]:
        org = self.db.query(Organization).filter(Organization.id == org_id).first()
        if not org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

        saved_docs = []
        for file in files:
            doc = self._save_document(file, org_id)
            saved_docs.append(doc)
        return saved_docs

    def process_payment(self, org_id: int, payment_data: PaymentInfo) -> Payment:
        org = self.db.query(Organization).filter(Organization.id == org_id).first()
        if not org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

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
            upload_date=datetime.now(),
        )
        self.db.add(doc)
        self.db.commit()
        return doc
