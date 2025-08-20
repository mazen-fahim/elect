from datetime import datetime
from pydantic import BaseModel, field_validator


class CreateCheckoutRequest(BaseModel):
    amount: int  # in piasters (e.g., 100 = 1 EGP)

    @field_validator("amount")
    def validate_amount(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Amount must be a positive integer of piasters")
        return v


class TransactionSchema(BaseModel):
    id: int
    amount: float
    description: str | None = None
    transaction_type: str
    created_at: datetime | None = None

    class Config:
        from_attributes = True
