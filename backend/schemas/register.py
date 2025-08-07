from datetime import datetime
from enum import Enum

from fastapi import UploadFile
from pydantic import BaseModel, EmailStr, Field, HttpUrl, constr, validator

from ..config import settings


class OrganizationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    PAYMENT_COMPLETED = "payment_completed"
    UNVERIFIED = "unverified"


class OrganizationCreate(BaseModel):
    name: str = Field(..., example="Green Earth Initiative")
    email: EmailStr = Field(..., example="contact@greenearth.org")
    phone: constr(min_length=10, max_length=15) = Field(..., example="+1234567890")
    address: str = Field(..., example="123 Eco Street, Green City")
    org_type: str = Field(..., example="Non-Profit", description="Organization type as free text")
    description: str | None = Field(None, example="Environmental conservation organization")
    website: HttpUrl | None = Field(None, example="https://greenearth.org")
    contact_person: str = Field(..., example="John Doe")
    password: constr(min_length=8) = Field(..., example="SecurePass123")


class OrganizationVerifiedResponse(BaseModel):
    id: int = Field(..., example=1)
    name: str = Field(..., example="Green Earth Initiative")
    email: str = Field(..., example="contact@greenearth.org")
    status: OrganizationStatus = Field(..., example=OrganizationStatus.PENDING)
    created_at: datetime = Field(..., example="2023-01-01T00:00:00")
    approved_at: datetime | None = Field(None, example="2023-01-02T00:00:00")
    website: HttpUrl | None = Field(None, example="https://greenearth.org")
    email_verified: bool = Field(..., description="Whether email has been verified")
    is_active: bool = Field(..., description="Whether account is active")


class FileType(str, Enum):
    CSV = "text/csv"
    EXCEL = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


class DocumentUpload(BaseModel):
    file: UploadFile = Field(..., description="Verification document file (max 5MB)")

    @validator("file")
    def validate_file_type_and_size(cls, v):
        # File type validation
        allowed_types = [
            "text/csv",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ]
        if v.content_type not in allowed_types:
            raise ValueError("Only CSV or Excel files are allowed")

        # File size validation
        max_size = settings.MAX_DOCUMENT_SIZE
        if v.size > max_size:
            raise ValueError(f"File too large. Max size is {max_size / 1024 / 1024}MB")

        return v


class BulkUploadResponse(BaseModel):
    filename: str = Field(..., example="organizations.csv")
    total_rows: int = Field(..., example=100)
    success_count: int = Field(..., example=95)
    failure_count: int = Field(..., example=5)
    results: dict = Field(
        ...,
        example={"successful": [{"row": 1, "id": 1, "name": "Org1"}], "failed": [{"row": 2, "error": "Invalid email"}]},
    )


class RegistrationError(BaseModel):
    row: int = Field(..., example=1, description="Row number in spreadsheet")
    error: str = Field(..., example="Invalid email format")
    data: dict = Field(..., example={"name": "Test Org", "email": "bad-email"})
