"""
routers/keys.py — API key persistence.

GET    /api-keys            → all keys (newest first)
POST   /api-keys            → create / idempotent back-fill (metadata only)
POST   /api-keys/{id}/revoke → mark a key revoked
DELETE /api-keys/{id}       → permanently remove a key

Security: the raw secret is generated client-side and shown exactly once;
the backend only ever stores the masked prefix + metadata.
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from backend.db import get_session
from backend.models.schemas import ApiKey, ApiKeyCreate

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


@router.get("/", response_model=List[dict])
async def get_keys(session: Session = Depends(get_session)):
    """Return all API keys, newest first."""
    rows = session.exec(select(ApiKey).order_by(ApiKey.created.desc())).all()
    return [
        {
            "id": k.id,
            "name": k.name,
            "keyPrefix": k.key_prefix,
            "created": k.created,
            "lastUsed": k.last_used,
            "status": k.status,
            "environment": k.environment,
        }
        for k in rows
    ]


@router.post("/", response_model=dict)
async def create_key(body: ApiKeyCreate, session: Session = Depends(get_session)):
    """Create a key (or upsert when back-filling a known client id)."""
    key = session.get(ApiKey, body.id) if body.id else None
    if key is None:
        key = ApiKey(
            id=body.id or str(uuid.uuid4()),
            name=body.name,
            key_prefix=body.key_prefix,
            created=body.created,
            last_used=body.last_used,
            environment=body.environment,
            status=body.status,
        )
        session.add(key)
    else:
        key.name = body.name
        key.key_prefix = body.key_prefix
        key.created = body.created
        key.last_used = body.last_used
        key.environment = body.environment
        key.status = body.status
    session.commit()
    return {"id": key.id, "status": "created"}


@router.post("/{key_id}/revoke", response_model=dict)
async def revoke_key(key_id: str, session: Session = Depends(get_session)):
    """Mark a key as revoked — it stops working immediately."""
    key = session.get(ApiKey, key_id)
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    key.status = "revoked"
    session.add(key)
    session.commit()
    return {"id": key.id, "status": "revoked"}


@router.delete("/{key_id}", response_model=dict)
async def delete_key(key_id: str, session: Session = Depends(get_session)):
    """Permanently remove a key."""
    key = session.get(ApiKey, key_id)
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    session.delete(key)
    session.commit()
    return {"id": key_id, "status": "deleted"}
