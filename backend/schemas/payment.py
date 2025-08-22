from datetime import datetime
from pydantic import BaseModel, field_validator


class CreateCheckoutRequest(BaseModel):
    amount: int  # in piasters (e.g., 100 = 1 EGP)
    name: str | None = None  # Optional product name to show in Stripe Checkout
    description: str | None = None  # Optional description
    voters: int | None = None  # Optional voters count for election capacity
    purpose: str | None = None  # Optional purpose tag (e.g., 'election-voters')

    @field_validator("amount")
    def validate_amount(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Amount must be a positive integer of piasters")
        return v

    @field_validator("voters")
    def validate_voters(cls, v: int | None) -> int | None:
        if v is not None and v <= 0:
            raise ValueError("Voters must be a positive integer if provided")
        return v


class TransactionSchema(BaseModel):
    id: int
    amount: float
    description: str | None = None
    transaction_type: str
    created_at: datetime | None = None

    class Config:
        from_attributes = True
