"""
main.py — AgentHub FastAPI Application

Start with: uvicorn backend.main:app --reload --port 8000

Endpoints:
  GET  /registry              → list seller agents
  GET  /registry/{id}         → single agent
  POST /agent/{id}/call       → HTTP 402 payment required
  POST /agent/{id}/execute    → HTTP 200 task result
  POST /payment/verify        → on-chain payment verification
  GET  /ledger                → all transactions
  POST /ledger                → save transaction
  DELETE /ledger              → clear ledger
  GET  /ledger/stats          → aggregate stats
  WS   /ws/flow/{session_id}  → live step streaming
  GET  /api-keys              → API keys (persistent)
  GET  /webhooks/endpoints    → webhook endpoints (persistent)
  GET  /webhooks/deliveries   → webhook delivery history (persistent)
  GET  /automations           → automation workflows (persistent)
  GET  /wallet/funding        → wallet top-ups (persistent)
  GET  /health                → health check
"""

import os
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlmodel import Session, select

from backend.db import create_db_and_tables, engine
from backend.seed import seed_demo_data
from backend.models.schemas import LedgerEntry
from backend.routers.registry import AGENTS
from backend.routers import registry, agents, payment, ledger, websocket, keys, webhooks, automations, wallet

load_dotenv()

STARTUP_TIME = time.time()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app = FastAPI(
    title="AgentHub API",
    description="x402 Service Registry for Autonomous AI Agent Commerce — BlockHack 2026",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow localhost + any onrender.com / vercel.app subdomain, and * for demo
ALLOWED_ORIGINS = [
    FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "https://*.vercel.app",
    "https://*.onrender.com",
    "*",  # last resort for the demo
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(registry.router)
app.include_router(agents.router)
app.include_router(payment.router)
app.include_router(ledger.router)
app.include_router(websocket.router)
app.include_router(keys.router)
app.include_router(webhooks.router)
app.include_router(automations.router)
app.include_router(wallet.router)


@app.on_event("startup")
async def on_startup():
    """Create DB tables + seed demo data (seed-if-empty) on startup."""
    create_db_and_tables()
    try:
        with Session(engine) as session:
            counts = seed_demo_data(session)
        if any(counts.values()):
            print(f"[SEED] demo data written: {counts}")
    except Exception as exc:  # never block startup on a seeding problem
        print(f"[SEED] skipped ({exc})")
    print("[OK] AgentHub API started")
    print("[OK] Docs: http://localhost:8000/docs")
    print(f"[OK] Frontend: {FRONTEND_URL}")


@app.get("/health")
async def health():
    """Health check — used by frontend to detect if backend is available."""
    agents_count = len(AGENTS)
    transactions_count = 0
    database_status = "connected"
    try:
        with Session(engine) as session:
            transactions_count = len(session.exec(select(LedgerEntry)).all())
    except Exception as exc:  # noqa: BLE001 — never crash the health check
        print(f"[health] ledger count failed ({exc})")
        database_status = "error"

    return {
        "status": "healthy",
        "version": "1.0.0",
        "agents_count": agents_count,
        "transactions_count": transactions_count,
        "database": database_status,
        "uptime_seconds": int(time.time() - STARTUP_TIME),
        "algorand_network": "testnet",
    }
