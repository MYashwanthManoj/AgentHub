"""
routers/ledger.py — Transaction ledger endpoints.

GET  /ledger         → all transactions (newest first)
POST /ledger         → save a new transaction
DELETE /ledger       → clear all (demo reset)
"""

from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import List
from backend.db import get_session
from backend.models.schemas import LedgerEntry, LedgerEntryCreate
from datetime import datetime

router = APIRouter(prefix="/ledger", tags=["ledger"])


@router.get("/", response_model=List[dict])
async def get_ledger(session: Session = Depends(get_session)):
    """Return all ledger entries, newest first."""
    entries = session.exec(select(LedgerEntry).order_by(LedgerEntry.timestamp.desc())).all()
    return [
        {
            "id": e.id,
            "timestamp": e.timestamp.isoformat(),
            "buyerId": e.buyer_id,
            "buyerName": e.buyer_name,
            "sellerId": e.seller_id,
            "sellerName": e.seller_name,
            "priceAlgo": e.price_algo,
            "status": e.status,
            "txHash": e.tx_hash,
            "confirmationTimeMs": e.confirmation_time_ms,
            "roundNumber": e.round_number,
            "task": e.task,
            "result": e.result,
        }
        for e in entries
    ]


@router.post("/", response_model=dict)
async def create_ledger_entry(
    body: LedgerEntryCreate,
    session: Session = Depends(get_session),
):
    """Save a new transaction to the ledger."""
    entry = LedgerEntry(
        buyer_id=body.buyer_id,
        buyer_name=body.buyer_name,
        seller_id=body.seller_id,
        seller_name=body.seller_name,
        price_algo=body.price_algo,
        status="confirmed",
        tx_hash=body.tx_hash,
        confirmation_time_ms=body.confirmation_time_ms,
        round_number=body.round_number,
        task=body.task,
        result=body.result,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return {"id": entry.id, "status": "saved"}


@router.delete("/")
async def clear_ledger(session: Session = Depends(get_session)):
    """Clear all ledger entries — for demo reset."""
    entries = session.exec(select(LedgerEntry)).all()
    for e in entries:
        session.delete(e)
    session.commit()
    return {"cleared": True}


@router.get("/stats")
async def get_stats(session: Session = Depends(get_session)):
    """Return aggregate stats for ExplorerStatsBar."""
    entries = session.exec(select(LedgerEntry)).all()
    total_txs = len(entries)
    total_spent = sum(e.price_algo for e in entries)
    last = entries[-1] if entries else None
    return {
        "totalTransactions": total_txs,
        "totalSpent": round(total_spent, 4),
        "lastTxHash": last.tx_hash if last else None,
        "lastRound": last.round_number if last else None,
    }
