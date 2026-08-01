import razorpay
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.models.database import get_db
from app.models.schemas import User, CreditTransaction
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/payments", tags=["payments"])

# pack_id -> (credits, price in paise)
CREDIT_PACKS = {
    "1000": (1000, 29900),
    "3000": (3000, 79900),
    "10000": (10000, 199900),
}


def _client() -> razorpay.Client:
    return razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))


class CreateOrderRequest(BaseModel):
    pack_id: str


class VerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


def _credit_order(db: Session, order_id: str, payment_id: str) -> User | None:
    """Idempotently credit the user tied to a Razorpay order.

    Returns the updated User, or None if this order was already credited
    (either by the frontend's /verify call or the webhook — whichever fires
    first wins, thanks to the unique constraint on razorpay_order_id).
    """
    if db.query(CreditTransaction).filter(CreditTransaction.razorpay_order_id == order_id).first():
        return None

    try:
        order = _client().order.fetch(order_id)
    except razorpay.errors.BadRequestError:
        # Order doesn't exist at Razorpay, or a transient API issue — either
        # way there's nothing to credit. Don't crash the webhook handler.
        raise HTTPException(status_code=400, detail="Order not found")

    notes = order.get("notes", {})
    user_id = notes.get("user_id")
    pack_id = notes.get("pack_id")
    if not user_id or pack_id not in CREDIT_PACKS:
        raise HTTPException(status_code=400, detail="Order not recognized")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    credits, amount_paise = CREDIT_PACKS[pack_id]
    user.credits += credits
    db.add(CreditTransaction(
        user_id=user.id, type="purchase", amount=credits, balance_after=user.credits,
        razorpay_order_id=order_id, razorpay_payment_id=payment_id, amount_paise=amount_paise,
    ))
    db.commit()
    db.refresh(user)
    return user


@router.post("/create-order")
def create_order(req: CreateOrderRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if req.pack_id not in CREDIT_PACKS:
        raise HTTPException(status_code=400, detail="Unknown credit pack")
    credits, amount_paise = CREDIT_PACKS[req.pack_id]

    try:
        order = _client().order.create({
            "amount": amount_paise,
            "currency": "INR",
            "notes": {"user_id": user.id, "pack_id": req.pack_id},
        })
    except razorpay.errors.BadRequestError:
        raise HTTPException(status_code=503, detail="Payments are temporarily unavailable. Please try again shortly.")
    return {
        "order_id": order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "key_id": settings.razorpay_key_id,
        "credits": credits,
    }


@router.post("/verify")
def verify_payment(req: VerifyRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        _client().utility.verify_payment_signature({
            "razorpay_order_id": req.razorpay_order_id,
            "razorpay_payment_id": req.razorpay_payment_id,
            "razorpay_signature": req.razorpay_signature,
        })
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Payment verification failed")

    updated = _credit_order(db, req.razorpay_order_id, req.razorpay_payment_id)
    current = updated or user
    return {"credits": current.credits}


@router.post("/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    """Server-to-server backstop: credits the account even if the user closes
    the tab right after paying, before the frontend's /verify call fires."""
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    try:
        _client().utility.verify_webhook_signature(
            body.decode("utf-8"), signature, settings.razorpay_webhook_secret
        )
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    payload = await request.json()
    if payload.get("event") == "payment.captured":
        payment = payload["payload"]["payment"]["entity"]
        _credit_order(db, payment["order_id"], payment["id"])

    return {"status": "ok"}
