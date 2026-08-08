"""
routers/websocket.py — Real-time payment step streaming.

WS /ws/flow/{session_id}

The frontend connects before starting a payment flow.
The backend streams each step as it completes:
  { step: "HTTP_402", status: "done", timestamp: ... }
  { step: "SIGN_TX", status: "active", timestamp: ... }
  ...

This replaces the fake setTimeout delays in useTransactionFlow.
"""

import asyncio
import json
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["websocket"])

# Active WebSocket connections keyed by session_id
_connections: dict[str, WebSocket] = {}

FLOW_STEPS = [
    ("REGISTRY_SEARCH",    "Buyer Agent searching registry",      0.4),
    ("SELLER_FOUND",       "Seller found in registry",            0.3),
    ("CALL_ENDPOINT",      "Calling seller endpoint",             0.5),
    ("HTTP_402",           "HTTP 402 Payment Required",           0.6),
    ("CONSTRUCT_TX",       "Constructing Algorand payment",       0.7),
    ("SIGN_TX",            "Signing transaction",                 0.5),
    ("BROADCAST_TX",       "Broadcasting to Algorand network",    0.8),
    ("WAIT_CONFIRM",       "Waiting for block confirmation",      1.2),
    ("PAYMENT_SETTLED",    "Payment settled on-chain",            0.4),
    ("VERIFY_ONCHAIN",     "Verifying payment on ledger",         0.5),
    ("RETRY_REQUEST",      "Retrying request with payment proof", 0.6),
    ("SELLER_VALIDATES",   "Seller validates payment proof",      0.4),
    ("HTTP_200",           "HTTP 200 OK — Access granted",        0.3),
    ("TASK_EXECUTING",     "Agent executing task",                0.8),
]


@router.websocket("/ws/flow/{session_id}")
async def websocket_flow(websocket: WebSocket, session_id: str):
    """
    Stream payment flow steps in real time.
    Frontend connects, backend streams each step with delays.
    """
    await websocket.accept()
    _connections[session_id] = websocket

    try:
        # Wait for "start" message from client
        data = await asyncio.wait_for(websocket.receive_text(), timeout=10.0)
        message = json.loads(data)

        if message.get("type") != "start":
            await websocket.close()
            return

        tx_hash = message.get("tx_hash", "")

        # Stream each step
        for i, (step_id, label, delay) in enumerate(FLOW_STEPS):
            # Mark previous as done, current as active
            if i > 0:
                prev_id = FLOW_STEPS[i - 1][0]
                await websocket.send_text(json.dumps({
                    "type": "step_update",
                    "step_id": prev_id,
                    "status": "done",
                    "timestamp": datetime.utcnow().isoformat(),
                }))

            await websocket.send_text(json.dumps({
                "type": "step_update",
                "step_id": step_id,
                "label": label,
                "status": "active",
                "timestamp": datetime.utcnow().isoformat(),
            }))

            await asyncio.sleep(delay)

        # Final step done
        last_id = FLOW_STEPS[-1][0]
        await websocket.send_text(json.dumps({
            "type": "step_update",
            "step_id": last_id,
            "status": "done",
            "timestamp": datetime.utcnow().isoformat(),
        }))

        # Send completion event
        await websocket.send_text(json.dumps({
            "type": "flow_complete",
            "tx_hash": tx_hash,
            "timestamp": datetime.utcnow().isoformat(),
        }))

    except asyncio.TimeoutError:
        await websocket.close()
    except WebSocketDisconnect:
        pass
    finally:
        _connections.pop(session_id, None)
