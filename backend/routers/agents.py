"""
routers/agents.py — Agent call endpoint.

POST /agent/{agent_id}/call    → returns HTTP 402 with payment params
POST /agent/{agent_id}/execute → verifies payment + runs task → returns 200
"""

import os
import uuid
import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from backend.models.schemas import AgentCallRequest, PaymentRequiredResponse, TaskExecuteRequest
from backend.services.task_executor import execute_task
from backend.routers.registry import AGENTS

router = APIRouter(prefix="/agent", tags=["agents"])

SELLER_ADDRESS = os.getenv("SELLER_ADDRESS", "ALGO_WALLET_7X3KFAKEADDRESSFORDEMOPURPOSES123456")

# In-memory session store — maps session_id → { seller_id, task, amount }
# In production: use Redis
_sessions: dict = {}


@router.post("/{agent_id}/call")
async def call_agent(agent_id: str, body: AgentCallRequest):
    """
    Step 1 of x402 flow.
    Client calls this endpoint requesting a service.
    Returns HTTP 402 with payment parameters.
    """
    agent = next((a for a in AGENTS if a["id"] == agent_id), None)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found in registry")

    session_id = str(uuid.uuid4())
    _sessions[session_id] = {
        "seller_id": agent_id,
        "task": body.task,
        "amount": agent["priceAlgo"],
        "buyer": body.buyer_address,
    }

    # Return 402 Payment Required
    return JSONResponse(
        status_code=402,
        content={
            "status": 402,
            "error": "Payment Required",
            "x402": {
                "amount_algo": agent["priceAlgo"],
                "receiver": SELLER_ADDRESS,
                "note": f"AgentHub payment | agent={agent_id} | session={session_id}",
                "session_id": session_id,
                "network": "testnet",
            },
        },
    )


@router.post("/{agent_id}/execute")
async def execute_agent(agent_id: str, body: TaskExecuteRequest):
    """
    Step 2 of x402 flow.
    Client sends verified TX hash — server verifies on-chain and runs task.
    Returns HTTP 200 with task result.
    """
    agent = next((a for a in AGENTS if a["id"] == agent_id), None)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")

    # Small delay to simulate real agent processing
    await asyncio.sleep(0.8)

    result = execute_task(agent["category"], body.task)

    return {
        "status": 200,
        "agent_id": agent_id,
        "agent_name": agent["name"],
        "task": body.task,
        "tx_hash": body.tx_hash,
        "result": result,
    }
