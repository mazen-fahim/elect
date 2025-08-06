from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, EmailStr, constr, HttpUrl, validator, Field
from fastapi import UploadFile
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
    description: Optional[str] = Field(None, example="Environmental conservation organization")
    website: Optional[HttpUrl] = Field(None, example="https://greenearth.org")
    contact_person: str = Field(..., example="John Doe")
    password: constr(min_length=8) = Field(..., example="SecurePass123")

    @validator("website", pre=True)
    def validate_website(cls, v):
        if v == "":
            return None
        return v


class OrganizationVerifiedResponse(BaseModel):
    id: int = Field(..., example=1)
    name: str = Field(..., example="Green Earth Initiative")
    email: str = Field(..., example="contact@greenearth.org")
    status: OrganizationStatus = Field(..., example=OrganizationStatus.PENDING)
    created_at: datetime = Field(..., example="2023-01-01T00:00:00")
    approved_at: Optional[datetime] = Field(None, example="2023-01-02T00:00:00")
    website: Optional[HttpUrl] = Field(None, example="https://greenearth.org")
    email_verified: bool = Field(..., description="Whether email has been verified")
    is_active: bool = Field(..., description="Whether account is active")


class VerificationRequest(BaseModel):
    email: EmailStr = Field(..., description="Email to resend verification to")


class VerificationResponse(BaseModel):
    message: str = Field(..., example="Verification email sent")
    expires_at: datetime = Field(..., description="When the verification token expires")


class TokenVerificationResponse(BaseModel):
    success: bool = Field(..., description="Verification status")
    message: str = Field(..., example="Email verified successfully")
    access_token: Optional[str] = Field(None, description="JWT token if verification succeeds")


class PaymentInfo(BaseModel):
    card_number: constr(min_length=12, max_length=19) = Field(..., example="4111111111111111")
    expiry_date: constr(min_length=4, max_length=5) = Field(..., example="12/25", description="MM/YY format")
    cvv: constr(min_length=3, max_length=4) = Field(..., example="123")
    card_name: str = Field(..., example="John Doe")


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
