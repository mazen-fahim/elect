from typing import Annotated
from decimal import Decimal

import stripe
from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy.future import select
from starlette.responses import RedirectResponse

from core.dependencies import db_dependency, user_dependency
from core.settings import settings
from models.transaction import Transaction, TransactionType
from models.user import User
from schemas.payment import CreateCheckoutRequest, TransactionSchema


router = APIRouter(prefix="/payment", tags=["Payment"])


def _require_stripe_key() -> str:
    if not hasattr(settings, "STRIPE_SECRET_KEY") or not settings.STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stripe is not configured on the server.",
        )
    return settings.STRIPE_SECRET_KEY


@router.post("/create-checkout-session")
async def create_checkout_session(
    checkout_data: CreateCheckoutRequest,
    user: user_dependency,
    db: db_dependency,
):
    # Configure Stripe per-request to avoid import-time failures when env is missing
    api_key = _require_stripe_key()
    stripe.api_key = api_key

    try:
        # Stripe replaces {CHECKOUT_SESSION_ID} automatically
        success_url = f"{settings.SERVER_DOMAIN}/api/payment/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{settings.APP_HOST}/checkout/cancel"

        checkout_session = stripe.checkout.Session.create(
            line_items=[
                {
                    "price_data": {
                        "currency": "egp",
                        "unit_amount": checkout_data.amount,  # amount in piasters (100 = 1 EGP)
                        "product_data": {
                            "name": "Wallet Top-up",
                            "description": f"Add EGP {checkout_data.amount / 100:.2f} to your e-wallet",
                        },
                    },
                    "quantity": 1,
                },
            ],
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"user_id": str(user.id)},
        )
        # Persist the session id for later verification (if desired)
        user.stripe_session_id = checkout_session.id
        await db.commit()
        return {"url": checkout_session.url}
    except stripe.error.StripeError as e:  # type: ignore[attr-defined]
        message = getattr(e, "user_message", None) or str(e)
        raise HTTPException(status_code=400, detail=f"Stripe Error: {message}") from e
    except Exception as e:  # pragma: no cover - generic safeguard
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}") from e


@router.get("/payment-success")
async def payment_success(session_id: Annotated[str, Query(...)], db: db_dependency):
    api_key = _require_stripe_key()
    stripe.api_key = api_key

    try:
        session = stripe.checkout.Session.retrieve(session_id)

        # Stripe Session status can be "complete" when the checkout is finished
        if getattr(session, "status", None) == "complete":
            metadata = getattr(session, "metadata", None) or {}
            user_id_str = metadata.get("user_id")
            amount_total = getattr(session, "amount_total", None)

            if not user_id_str or amount_total is None:
                return RedirectResponse(url=f"{settings.APP_HOST}/cancel", status_code=302)

            # Validate and update wallet inside DB transaction
            try:
                user_id = int(user_id_str)
            except ValueError:
                return RedirectResponse(url=f"{settings.APP_HOST}/cancel", status_code=302)

            # Fetch user
            result = await db.execute(select(User).where(User.id == user_id))
            user: User | None = result.scalar_one_or_none()
            if not user:
                return RedirectResponse(url=f"{settings.APP_HOST}/cancel", status_code=302)

            # Optional: if you decide to compare session IDs later
            # if user.stripe_session_id and user.stripe_session_id != session_id:
            #     return RedirectResponse(url=f"{settings.APP_HOST}/cancel", status_code=302)

            # Convert piasters to EGP
            amount_egp = Decimal(int(amount_total)) / Decimal(100)

            # Clear session id and add to wallet
            user.stripe_session_id = None
            user.wallet = (Decimal(user.wallet) if user.wallet is not None else Decimal(0)) + amount_egp

            # Record transaction
            new_tx = Transaction(
                user_id=user.id,
                amount=float(amount_egp),
                transaction_type=TransactionType.ADDING,
                description="Wallet top-up via Stripe",
            )
            db.add(new_tx)
            await db.commit()

            return RedirectResponse(url=f"{settings.APP_HOST}/transaction-success", status_code=302)
        else:
            return RedirectResponse(url=f"{settings.APP_HOST}/cancel", status_code=302)
    except stripe.error.StripeError as e:  # type: ignore[attr-defined]
        message = getattr(e, "user_message", None) or str(e)
        raise HTTPException(status_code=400, detail=f"Stripe Error: {message}") from e
    except Exception as e:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}") from e


@router.get("/transactions", response_model=list[TransactionSchema])
async def get_transactions(user: user_dependency, db: db_dependency):
    stmt = (
        select(Transaction)
        .where(Transaction.user_id == user.id)
        .order_by(Transaction.created_at.desc())
    )
    result = await db.execute(stmt)
    rows = result.scalars().all()
    return rows
