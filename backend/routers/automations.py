"""
routers/automations.py — multi-agent workflow persistence.  GET    /automations        → all workflows (seed order, oldest first)
  POST   /automations        → create / idempotent back-fill
  PATCH  /automations/{id}   → update status / last_run / next_run / runs
  DELETE /automations/{id}   → permanently remove a workflow

  GET    /automations/runs        → execution history (newest first)
  POST   /automations/runs        → record an execution ("Run Now" trigger)
  PATCH  /automations/runs/{id}   → update an execution (running → success)
  DELETE /automations/runs/{id}   → remove an execution from history
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from backend.db import get_session
from backend.models.schemas import (
    Automation,
    AutomationCreate,
    AutomationPatch,
    AutomationRun,
    AutomationRunCreate,
    AutomationRunPatch,
)

router = APIRouter(prefix="/automations", tags=["automations"])


@router.get("/", response_model=List[dict])
async def get_automations(session: Session = Depends(get_session)):
    """Return all workflows, oldest first (preserves seed order)."""
    rows = session.exec(select(Automation).order_by(Automation.created_at.asc())).all()
    return [
        {
            "id": a.id,
            "name": a.name,
            "description": a.description,
            "trigger": a.trigger,
            "triggerIcon": a.trigger_icon,
            "agents": a.agents,
            "estimatedCost": a.estimated_cost,
            "lastRun": a.last_run,
            "nextRun": a.next_run,
            "status": a.status,
            "runs": a.runs,
        }
        for a in rows
    ]


# ─── Execution history (runs) ────────────────────────────────────────────────
# Declared BEFORE the /{automation_id} routes so "runs" never matches a
# dynamic workflow id.

@router.get("/runs", response_model=List[dict])
async def get_runs(session: Session = Depends(get_session)):
    """Return the execution history across all workflows, newest first."""
    rows = session.exec(select(AutomationRun).order_by(AutomationRun.started_at.desc())).all()
    return [
        {
            "id": r.id,
            "automationId": r.automation_id,
            "workflowName": r.workflow_name,
            "trigger": r.trigger,
            "status": r.status,
            "costAlgo": r.cost_algo,
            # Values are UTC — append "Z" so the frontend's Date.parse treats
            # them as UTC (naive ISO is parsed as local time, skewing labels).
            "startedAt": r.started_at.isoformat() + "Z",
            "durationMs": r.duration_ms,
        }
        for r in rows
    ]


@router.post("/runs", response_model=dict)
async def create_run(body: AutomationRunCreate, session: Session = Depends(get_session)):
    """Record an execution (create / idempotent back-fill by client id)."""
    run = session.get(AutomationRun, body.id) if body.id else None
    if run is None:
        run = AutomationRun(
            id=body.id or str(uuid.uuid4()),
            automation_id=body.automation_id,
            workflow_name=body.workflow_name,
            trigger=body.trigger,
            status=body.status,
            cost_algo=body.cost_algo,
            started_at=body.started_at,
            duration_ms=body.duration_ms,
        )
        session.add(run)
    else:
        run.automation_id = body.automation_id
        run.workflow_name = body.workflow_name
        run.trigger = body.trigger
        run.status = body.status
        run.cost_algo = body.cost_algo
        run.started_at = body.started_at
        run.duration_ms = body.duration_ms
    session.commit()
    return {"id": run.id, "status": "created"}


@router.patch("/runs/{run_id}", response_model=dict)
async def update_run(
    run_id: str,
    body: AutomationRunPatch,
    session: Session = Depends(get_session),
):
    """Update an execution — e.g. flip a manual run from running → success."""
    run = session.get(AutomationRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Automation run not found")
    if body.status is not None:
        run.status = body.status
    if body.duration_ms is not None:
        run.duration_ms = body.duration_ms
    session.add(run)
    session.commit()
    return {"id": run.id, "status": "updated"}


@router.delete("/runs/{run_id}", response_model=dict)
async def delete_run(run_id: str, session: Session = Depends(get_session)):
    """Remove an execution from the history."""
    run = session.get(AutomationRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Automation run not found")
    session.delete(run)
    session.commit()
    return {"id": run_id, "status": "deleted"}


@router.post("/", response_model=dict)
async def create_automation(body: AutomationCreate, session: Session = Depends(get_session)):
    """Create a workflow (or upsert when back-filling a known client id)."""
    a = session.get(Automation, body.id) if body.id else None
    if a is None:
        a = Automation(
            id=body.id or str(uuid.uuid4()),
            name=body.name,
            description=body.description,
            trigger=body.trigger,
            trigger_icon=body.trigger_icon,
            agents=body.agents,
            estimated_cost=body.estimated_cost,
            last_run=body.last_run,
            next_run=body.next_run,
            status=body.status,
            runs=body.runs,
        )
        session.add(a)
    else:
        a.name = body.name
        a.description = body.description
        a.trigger = body.trigger
        a.trigger_icon = body.trigger_icon
        a.agents = body.agents
        a.estimated_cost = body.estimated_cost
        a.last_run = body.last_run
        a.next_run = body.next_run
        a.status = body.status
        a.runs = body.runs
    session.commit()
    return {"id": a.id, "status": "created"}


@router.patch("/{automation_id}", response_model=dict)
async def update_automation(
    automation_id: str,
    body: AutomationPatch,
    session: Session = Depends(get_session),
):
    """Update status / last_run / next_run / runs (any subset)."""
    a = session.get(Automation, automation_id)
    if not a:
        raise HTTPException(status_code=404, detail="Automation not found")
    data = body.model_dump(exclude_none=True)
    for key, value in data.items():
        setattr(a, key, value)
    session.add(a)
    session.commit()
    return {"id": a.id, "status": "updated"}


@router.delete("/{automation_id}", response_model=dict)
async def delete_automation(automation_id: str, session: Session = Depends(get_session)):
    """Permanently remove a workflow."""
    a = session.get(Automation, automation_id)
    if not a:
        raise HTTPException(status_code=404, detail="Automation not found")
    session.delete(a)
    session.commit()
    return {"id": automation_id, "status": "deleted"}
