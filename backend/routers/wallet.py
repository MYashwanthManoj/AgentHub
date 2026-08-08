"""
routers/wallet.py — wallet funding persistence.

  GET    /wallet/settings       → persisted funded amount (single row)
  POST   /wallet/settings       → update the funded amount
  GET    /wallet/funding       → all top-ups (newest first)
  POST   /wallet/funding       → create / idempotent back-fill by client id
  PATCH  /wallet/funding/{id}  → update an entry (pending → confirmed / amount)
  DELETE /wallet/funding/{id}  → remove an entry from the funding history
"""

import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from backend.db import get_session
from backend.models.schemas import (
    WalletFunding,
    WalletFundingCreate,
    WalletFundingPatch,
    WalletSettings,
    WalletSettingsUpdate,
)

router = APIRouter(prefix="/wallet", tags=["wallet"])


# ─── Settings ────────────────────────────────────────────────────────────────
# The funded amount is a persisted setting (edited in Settings) that seeds the
# wallet's genesis funding — not a hardcoded constant.

@router.get("/settings", response_model=dict)
async def get_wallet_settings(session: Session = Depends(get_session)):
    """Return the persisted wallet settings (creates the default row if
    missing, so a fresh clone always has one)."""
    row = session.get(WalletSettings, "default")
    if row is None:
        row = WalletSettings(id="default")
        session.add(row)
        session.commit()
    return {
        "fundedAmount": row.funded_amount,
        "updatedAt": row.updated_at.isoformat() + "Z",
    }


@router.post("/settings", response_model=dict)
async def update_wallet_settings(body: WalletSettingsUpdate, session: Session = Depends(get_session)):
    """Persist the funded amount (upsert on the single "default" row)."""
    row = session.get(WalletSettings, "default")
    if row is None:
        row = WalletSettings(id="default")
        session.add(row)
    row.funded_amount = body.funded_amount
    row.updated_at = datetime.utcnow()
    session.add(row)
    session.commit()
    return {"fundedAmount": row.funded_amount, "status": "saved"}


# ─── Funding history ────────────────────────────────────────────────────────

@router.get("/funding", response_model=List[dict])
async def get_funding(session: Session = Depends(get_session)):
    """Return all wallet top-ups, newest first."""
    rows = session.exec(select(WalletFunding).order_by(WalletFunding.created_at.desc())).all()
    return [
        {
            "id": f.id,
            "amount": f.amount,
            "method": f.method,
            "status": f.status,
            "note": f.note,
            "txHash": f.tx_hash,
            # Values are UTC — append "Z" so the frontend's Date.parse treats
            # them as UTC (naive ISO is parsed as local time, skewing labels).
            "createdAt": f.created_at.isoformat() + "Z",
        }
        for f in rows
    ]


@router.post("/funding", response_model=dict)
async def create_funding(body: WalletFundingCreate, session: Session = Depends(get_session)):
    """Create a top-up (or upsert when back-filling a known client id)."""
    f = session.get(WalletFunding, body.id) if body.id else None
    if f is None:
        f = WalletFunding(
            id=body.id or str(uuid.uuid4()),
            amount=body.amount,
            method=body.method,
            status=body.status,
            note=body.note,
            tx_hash=body.tx_hash,
            created_at=body.created_at,
        )
        session.add(f)
    else:
        f.amount = body.amount
        f.method = body.method
        f.status = body.status
        f.note = body.note
        f.tx_hash = body.tx_hash
        f.created_at = body.created_at
    session.commit()
    return {"id": f.id, "status": "created"}


@router.patch("/funding/{funding_id}", response_model=dict)
async def update_funding(
    funding_id: str,
    body: WalletFundingPatch,
    session: Session = Depends(get_session),
):
    """Update a top-up — e.g. flip pending → confirmed with a tx hash, or
    re-amount the genesis entry when the funded-amount setting changes."""
    f = session.get(WalletFunding, funding_id)
    if not f:
        raise HTTPException(status_code=404, detail="Funding entry not found")
    if body.status is not None:
        f.status = body.status
    if body.tx_hash is not None:
        f.tx_hash = body.tx_hash
    if body.amount is not None:
        f.amount = body.amount
    session.add(f)
    session.commit()
    return {"id": f.id, "status": "updated"}


@router.delete("/funding/{funding_id}", response_model=dict)
async def delete_funding(funding_id: str, session: Session = Depends(get_session)):
    """Remove a top-up entry from the funding history."""
    f = session.get(WalletFunding, funding_id)
    if not f:
        raise HTTPException(status_code=404, detail="Funding entry not found")
    session.delete(f)
    session.commit()
    return {"id": funding_id, "status": "deleted"}
