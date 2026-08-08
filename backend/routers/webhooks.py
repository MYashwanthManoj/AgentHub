"""
routers/webhooks.py — webhook endpoint + delivery persistence.

Endpoints:
  GET    /webhooks/endpoints         → all endpoints (newest first)
  POST   /webhooks/endpoints         → create / idempotent back-fill
  PATCH  /webhooks/endpoints/{id}    → toggle status
  DELETE /webhooks/endpoints/{id}    → remove endpoint

Deliveries:
  GET    /webhooks/deliveries        → delivery history (newest first)
  POST   /webhooks/deliveries        → record a delivery (e.g. from "Test Webhook")
  PATCH  /webhooks/deliveries/{id}   → update (e.g. mark retried as success)
  DELETE /webhooks/deliveries/{id}   → remove a delivery
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from backend.db import get_session
from backend.models.schemas import (
    WebhookEndpoint,
    WebhookEndpointCreate,
    WebhookEndpointPatch,
    WebhookDelivery,
    WebhookDeliveryCreate,
    WebhookDeliveryPatch,
)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/endpoints", response_model=List[dict])
async def get_endpoints(session: Session = Depends(get_session)):
    """Return all webhook endpoints, newest first."""
    rows = session.exec(select(WebhookEndpoint).order_by(WebhookEndpoint.created_at.desc())).all()
    return [
        {
            "id": e.id,
            "url": e.url,
            "description": e.description,
            "events": e.events,
            "status": e.status,
            "createdAt": e.created_at,
        }
        for e in rows
    ]


@router.post("/endpoints", response_model=dict)
async def create_endpoint(body: WebhookEndpointCreate, session: Session = Depends(get_session)):
    """Create an endpoint (or upsert when back-filling a known client id)."""
    ep = session.get(WebhookEndpoint, body.id) if body.id else None
    if ep is None:
        ep = WebhookEndpoint(
            id=body.id or str(uuid.uuid4()),
            url=body.url,
            description=body.description,
            events=body.events,
            status=body.status,
            created_at=body.created_at,
        )
        session.add(ep)
    else:
        ep.url = body.url
        ep.description = body.description
        ep.events = body.events
        ep.status = body.status
        ep.created_at = body.created_at
    session.commit()
    return {"id": ep.id, "status": "created"}


@router.patch("/endpoints/{endpoint_id}", response_model=dict)
async def update_endpoint(
    endpoint_id: str,
    body: WebhookEndpointPatch,
    session: Session = Depends(get_session),
):
    """Toggle an endpoint active/disabled."""
    ep = session.get(WebhookEndpoint, endpoint_id)
    if not ep:
        raise HTTPException(status_code=404, detail="Webhook endpoint not found")
    if body.status is not None:
        ep.status = body.status
    session.add(ep)
    session.commit()
    return {"id": ep.id, "status": "updated"}


@router.delete("/endpoints/{endpoint_id}", response_model=dict)
async def delete_endpoint(endpoint_id: str, session: Session = Depends(get_session)):
    """Remove an endpoint permanently."""
    ep = session.get(WebhookEndpoint, endpoint_id)
    if not ep:
        raise HTTPException(status_code=404, detail="Webhook endpoint not found")
    session.delete(ep)
    session.commit()
    return {"id": endpoint_id, "status": "deleted"}


# ─── Deliveries ──────────────────────────────────────────────────────────────

@router.get("/deliveries", response_model=List[dict])
async def get_deliveries(session: Session = Depends(get_session)):
    """Return delivery history, newest first."""
    rows = session.exec(select(WebhookDelivery).order_by(WebhookDelivery.created_at.desc())).all()
    return [
        {
            "id": d.id,
            "event": d.event,
            "timestamp": d.timestamp,
            "status": d.status,
            "responseCode": d.response_code,
        }
        for d in rows
    ]


@router.post("/deliveries", response_model=dict)
async def create_delivery(body: WebhookDeliveryCreate, session: Session = Depends(get_session)):
    """Record a delivery (test webhook / back-fill)."""
    d = session.get(WebhookDelivery, body.id) if body.id else None
    if d is None:
        d = WebhookDelivery(
            id=body.id or str(uuid.uuid4()),
            event=body.event,
            timestamp=body.timestamp,
            status=body.status,
            response_code=body.response_code,
            created_at=body.created_at,
        )
        session.add(d)
    else:
        d.event = body.event
        d.timestamp = body.timestamp
        d.status = body.status
        d.response_code = body.response_code
    session.commit()
    return {"id": d.id, "status": "created"}


@router.patch("/deliveries/{delivery_id}", response_model=dict)
async def update_delivery(
    delivery_id: str,
    body: WebhookDeliveryPatch,
    session: Session = Depends(get_session),
):
    """Update a delivery (e.g. mark a retried failure as success)."""
    d = session.get(WebhookDelivery, delivery_id)
    if not d:
        raise HTTPException(status_code=404, detail="Delivery not found")
    if body.status is not None:
        d.status = body.status
    if body.response_code is not None:
        d.response_code = body.response_code
    session.add(d)
    session.commit()
    return {"id": d.id, "status": "updated"}


@router.delete("/deliveries/{delivery_id}", response_model=dict)
async def delete_delivery(delivery_id: str, session: Session = Depends(get_session)):
    """Remove a delivery from history."""
    d = session.get(WebhookDelivery, delivery_id)
    if not d:
        raise HTTPException(status_code=404, detail="Delivery not found")
    session.delete(d)
    session.commit()
    return {"id": delivery_id, "status": "deleted"}
