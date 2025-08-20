from typing import Annotated
import logging
from decimal import Decimal
from uuid import uuid4
import json

import stripe
from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy.future import select
from starlette.responses import RedirectResponse
from fastapi import Request

from core.dependencies import db_dependency, user_dependency
from core.settings import settings
from models.transaction import Transaction, TransactionType
from models.user import User
from models.organization import Organization
from schemas.payment import CreateCheckoutRequest, TransactionSchema


router = APIRouter(prefix="/payment", tags=["Payment"])
logger = logging.getLogger("payment")


def _require_stripe_key() -> str:
    if not hasattr(settings, "STRIPE_SECRET_KEY") or not settings.STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stripe is not configured on the server.",
        )
    key = settings.STRIPE_SECRET_KEY
    # Allow dev fallback when key is clearly not set properly (short or placeholder)
    return key


def _is_fake_stripe_mode(key: str | None) -> bool:
    """Detect if we should simulate Stripe (dev mode).
    We treat obviously invalid keys (empty or too short) as a cue to simulate.
    """
    if not key:
        return True
    return len(key) < 20  # clearly not a real key


@router.get("/config")
async def get_payment_config():
    """Expose minimal payment config for the frontend UI.

    Returns:
    - mode: "live" if a real live secret key is configured, else "test" (includes dev simulation and sk_test_)
    - currency: ISO currency code
    - product_name: current product label
    """
    key = getattr(settings, "STRIPE_SECRET_KEY", None)
    mode = "test"
    if key and not _is_fake_stripe_mode(key):
        mode = "live" if str(key).startswith("sk_live") else "test"
    return {"mode": mode, "currency": "EGP", "product_name": "Wallet Top-up"}


@router.post("/create-checkout-session")
async def create_checkout_session(
    checkout_data: CreateCheckoutRequest,
    user: user_dependency,
    db: db_dependency,
):
    # Configure Stripe per-request to avoid import-time failures when env is missing
    api_key = _require_stripe_key()
    if _is_fake_stripe_mode(api_key):
        # Simulate a checkout session by directly returning the success URL to self
        success_url = f"{settings.SERVER_DOMAIN}/api/payment/payment-success"
        fake_session_id = f"fake_{uuid4().hex}"
        url = (
            f"{success_url}?session_id={fake_session_id}"
            f"&amount={checkout_data.amount}&user_id={user.id}"
        )
        logger.info("[payment] Dev mode: returning simulated checkout URL -> %s", url)
        return {"url": url}

    stripe.api_key = api_key
    logger.info("[payment] Using Stripe key: %s***", api_key[:7] if api_key else "<empty>")

    try:
        # Stripe replaces {CHECKOUT_SESSION_ID} automatically
        success_url = f"{settings.SERVER_DOMAIN}/api/payment/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{settings.APP_HOST}/org/payment/cancel"

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
    except (stripe.error.StripeError, ValueError) as e:  # type: ignore[attr-defined]
        message = getattr(e, "user_message", None) or str(e)
        logger.warning("[payment] Stripe error creating session: %s", message)
        raise HTTPException(status_code=400, detail=f"Stripe Error: {message}") from e
    except Exception as e:  # pragma: no cover - generic safeguard
        logger.exception("[payment] Unexpected error creating Stripe checkout session")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}") from e


@router.get("/payment-success")
async def payment_success(
    session_id: Annotated[str, Query(...)],
    db: db_dependency,
    amount: Annotated[int | None, Query()] = None,
    user_id: Annotated[int | None, Query()] = None,
):
    api_key = _require_stripe_key()
    # Simulated flow (dev): session_id starts with fake_ and amount is provided
    if _is_fake_stripe_mode(api_key) and session_id.startswith("fake_"):
        logger.info("[payment] Dev mode success for %s, amount=%s", session_id, amount)

        # We expect the amount in piasters
        if amount is None or amount <= 0:
            return RedirectResponse(url=f"{settings.APP_HOST}/org/payment/cancel", status_code=302)
        if not user_id:
            return RedirectResponse(url=f"{settings.APP_HOST}/org/payment/cancel", status_code=302)

        # Credit the user's wallet directly
        result = await db.execute(select(User).where(User.id == user_id))
        user_obj: User | None = result.scalar_one_or_none()
        if not user_obj:
            return RedirectResponse(url=f"{settings.APP_HOST}/org/payment/cancel", status_code=302)

        amount_egp = Decimal(int(amount)) / Decimal(100)
        user_obj.wallet = (Decimal(user_obj.wallet) if user_obj.wallet is not None else Decimal(0)) + amount_egp

        new_tx = Transaction(
            user_id=user_obj.id,
            amount=float(amount_egp),
            transaction_type=TransactionType.ADDING,
            description="Wallet top-up (dev mode)",
        )
        db.add(new_tx)
        # Mark organization as paid
        org_res = await db.execute(select(Organization).where(Organization.user_id == user_id))
        org = org_res.scalar_one_or_none()
        if org:
            org.is_paid = True
        await db.commit()

        return RedirectResponse(url=f"{settings.APP_HOST}/org/payment/success", status_code=302)

    stripe.api_key = api_key

    try:
        session = stripe.checkout.Session.retrieve(session_id)

        # Stripe Session status can be "complete" when the checkout is finished
        if getattr(session, "status", None) == "complete":
            metadata = getattr(session, "metadata", None) or {}
            user_id_str = metadata.get("user_id")
            amount_total = getattr(session, "amount_total", None)

            if not user_id_str or amount_total is None:
                return RedirectResponse(url=f"{settings.APP_HOST}/org/payment/cancel", status_code=302)

            # Validate and update wallet inside DB transaction
            try:
                user_id = int(user_id_str)
            except ValueError:
                return RedirectResponse(url=f"{settings.APP_HOST}/org/payment/cancel", status_code=302)

            # Fetch user
            result = await db.execute(select(User).where(User.id == user_id))
            user: User | None = result.scalar_one_or_none()
            if not user:
                return RedirectResponse(url=f"{settings.APP_HOST}/org/payment/cancel", status_code=302)

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
            # Mark organization as paid
            org_res = await db.execute(select(Organization).where(Organization.user_id == user.id))
            org = org_res.scalar_one_or_none()
            if org:
                org.is_paid = True
            await db.commit()

            return RedirectResponse(url=f"{settings.APP_HOST}/org/payment/success", status_code=302)
        else:
            return RedirectResponse(url=f"{settings.APP_HOST}/org/payment/cancel", status_code=302)
    except stripe.error.StripeError as e:  # type: ignore[attr-defined]
        message = getattr(e, "user_message", None) or str(e)
        logger.warning("[payment] Stripe error on success handler: %s", message)
        raise HTTPException(status_code=400, detail=f"Stripe Error: {message}") from e
    except Exception as e:  # pragma: no cover
        logger.exception("[payment] Unexpected error in payment-success handler")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}") from e


@router.post("/webhook")
async def stripe_webhook(request: Request, db: db_dependency):
    stripe.api_key = _require_stripe_key()
    raw = await request.body()
    sig_header = request.headers.get("Stripe-Signature")
    secret = settings.STRIPE_WEBHOOK_SECRET

    # Parse/verify event
    try:
        if secret:
            event = stripe.Webhook.construct_event(raw, sig_header, secret)
        else:
            event = json.loads(raw.decode("utf-8"))
    except Exception as exc:
        logger.warning("[payment] Webhook signature/parse failed: %s", exc)
        raise HTTPException(status_code=400, detail="Invalid webhook signature") from exc

    try:
        if event and (event.get("type") == "checkout.session.completed"):
            data = event["data"]["object"] if isinstance(event, dict) else event.data.object
            user_id_str = (data.get("metadata") or {}).get("user_id")
            amount_total = data.get("amount_total")
            if user_id_str and amount_total is not None:
                result = await db.execute(select(User).where(User.id == int(user_id_str)))
                user_obj = result.scalar_one_or_none()
                if user_obj:
                    amount_egp = Decimal(int(amount_total)) / Decimal(100)
                    user_obj.wallet = (Decimal(user_obj.wallet) if user_obj.wallet is not None else Decimal(0)) + amount_egp
                    db.add(Transaction(
                        user_id=user_obj.id,
                        amount=float(amount_egp),
                        transaction_type=TransactionType.ADDING,
                        description="Wallet top-up via Stripe",
                    ))
                    # Mark org as paid
                    org_res = await db.execute(select(Organization).where(Organization.user_id == user_obj.id))
                    org = org_res.scalar_one_or_none()
                    if org:
                        org.is_paid = True
                    await db.commit()
        return {"received": True}
    except Exception as exc:
        logger.exception("[payment] Error processing webhook")
        raise HTTPException(status_code=500, detail="Webhook processing error") from exc


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


@router.get("/wallet")
async def get_wallet(user: user_dependency):
    # Return current user's wallet balance
    try:
        balance = float(user.wallet) if user.wallet is not None else 0.0
    except Exception:
        # Fallback in case of Decimal serialization edge cases
        balance = 0.0
    return {"balance": balance}
