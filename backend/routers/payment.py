# backend/routers/payment.py
import stripe
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.core.settings import settings  # import from settings

stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter()

class PaymentRequest(BaseModel):
    amount: int  # in cents (مثلا 9900 = $99)
    currency: str = "usd"

@router.post("/create-payment-intent/")
def create_payment_intent(data: PaymentRequest):
    try:
        intent = stripe.PaymentIntent.create(
            amount=data.amount,
            currency=data.currency,
            automatic_payment_methods={"enabled": True},
        )
        return {"clientSecret": intent.client_secret}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# backend/models/candidate.py