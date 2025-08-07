# class PaymentInfo(BaseModel):
#     card_number: constr(min_length=12, max_length=19) = Field(..., example="4111111111111111")
#     expiry_date: constr(min_length=4, max_length=5) = Field(..., example="12/25", description="MM/YY format")
#     cvv: constr(min_length=3, max_length=4) = Field(..., example="123")
#     card_name: str = Field(..., example="John Doe")
#

from pydantic import BaseModel, field_validator


class DocumentUpload(BaseModel):
    file: UploadFile = Field(..., description="Verification document file (max 5MB)")

    @field_validator("file")
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
