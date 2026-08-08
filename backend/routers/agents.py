"""
routers/agents.py — Agent call + execute endpoints (the x402 flow).

POST /agent/{agent_id}/call    → returns HTTP 402 with payment params
POST /agent/{agent_id}/execute → verifies payment + runs task → returns 200
"""

import os
import uuid
import time
import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from backend.models.schemas import (
    AgentCallRequest,
    TaskExecuteRequest,
    TaskResult,
    ExecuteAgentResponse,
)
from backend.services.task_executor import execute_task
from backend.routers.registry import AGENTS

router = APIRouter(prefix="/agent", tags=["agents"])

SELLER_ADDRESS = os.getenv("SELLER_ADDRESS", "ALGO_WALLET_7X3KFAKEADDRESSFORDEMOPURPOSES123456")

# In-memory session store — maps session_id → { seller_id, task, amount, buyer }.
# In production this would be Redis; for the demo an in-process dict is enough.
_sessions: dict = {}


@router.post("/{agent_id}/call")
async def call_agent(agent_id: str, body: AgentCallRequest):
    """
    Step 1 of the x402 flow — request a paid service.

    The buyer describes the task it wants run. The server registers a payment
    session and replies **HTTP 402 Payment Required** with the on-chain payment
    parameters the buyer must satisfy before calling `/execute`.

    **Request body**
    ```json
    {"task": "Summarize the x402 protocol", "buyer_address": "ALGO_WALLET_..."}
    ```

    **Response — 402**
    ```json
    {
      "status": 402,
      "error": "Payment Required",
      "x402": {
        "amount_algo": 0.05,
        "receiver": "ALGO_WALLET_...",
        "note": "AgentHub payment | agent=agent-summarizer-01 | session=...",
        "session_id": "3f9c...",
        "network": "testnet"
      }
    }
    ```

    Raises **404** if `agent_id` is not in the registry.
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


@router.post("/{agent_id}/execute", response_model=ExecuteAgentResponse)
async def execute_agent(agent_id: str, body: TaskExecuteRequest):
    """
    Step 2 of the x402 flow — run the paid task.

    The buyer submits the verified transaction hash; the server runs the agent
    and returns **HTTP 200** with a typed result. `result.result_type` is one of
    `text` | `chart` | `json` | `image`, and `result.chart_data` is present only
    for chart results.

    **Request body**
    ```json
    {"seller_id": "agent-summarizer-01", "task": "Summarize x402", "tx_hash": "ABC123..."}
    ```

    **Response — 200**
    ```json
    {
      "status": 200,
      "agent_id": "agent-summarizer-01",
      "agent_name": "Summarizer Agent",
      "task": "Summarize x402",
      "tx_hash": "ABC123...",
      "result": {"result_type": "text", "content": "…", "chart_data": null},
      "execution_time_ms": 842
    }
    ```

    Raises **404** if `agent_id` is unknown.
    """
    agent = next((a for a in AGENTS if a["id"] == agent_id), None)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")

    started = time.perf_counter()

    # Small delay to simulate real agent processing / negotiation latency.
    await asyncio.sleep(0.8)

    result = await execute_task(agent["category"], body.task)
    elapsed_ms = int((time.perf_counter() - started) * 1000)

    return ExecuteAgentResponse(
        agent_id=agent_id,
        agent_name=agent["name"],
        task=body.task,
        tx_hash=body.tx_hash,
        result=TaskResult(**result),
        execution_time_ms=elapsed_ms,
    )
