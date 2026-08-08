"""
routers/payment.py — Payment verification endpoint.

POST /payment/verify
  Body: { tx_id, session_id, seller_id, task }
  Returns: { verified, tx_hash, round_number, confirmation_time_ms, block_explorer_url }

This is where the real Algorand SDK call happens.
"""

from fastapi import APIRouter, HTTPException
from backend.models.schemas import PaymentVerifyRequest, PaymentVerifyResponse
from backend.services.algorand import verify_payment

router = APIRouter(prefix="/payment", tags=["payment"])


@router.post("/verify", response_model=PaymentVerifyResponse)
async def verify_payment_endpoint(body: PaymentVerifyRequest):
    """
    Verify that a transaction was confirmed on the Algorand network.

    Phase 1: mock verification (fast, always succeeds for demo)
    Phase 2: real algosdk.waitForConfirmation call

    The algorand.verify_payment() function handles both cases
    transparently — real if SDK configured, mock if not.
    """
    try:
        result = verify_payment(body.tx_id)
        if not result.get("verified"):
            raise HTTPException(status_code=402, detail="Payment not confirmed on-chain")
        return PaymentVerifyResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment verification error: {str(e)}")


@router.get("/status/{tx_id}")
async def get_payment_status(tx_id: str):
    """Check status of a specific transaction by ID."""
    result = verify_payment(tx_id)
    return result
