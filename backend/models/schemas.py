"""
schemas.py — Pydantic / SQLModel models.

These mirror the TypeScript types in src/types/index.ts exactly.
When adding a field here, add it there too.
"""

from sqlmodel import SQLModel, Field
from sqlalchemy import Column, JSON
from typing import Optional, List
from datetime import datetime
import uuid


# ─── Seller Agent (read-only, seeded from registry.py) ──────────────────────
# Not stored in DB — served from in-memory list in registry.py

class AgentCallRequest(SQLModel):
    task: str
    buyer_address: str


class PaymentRequiredResponse(SQLModel):
    status: int = 402
    amount_algo: float
    receiver: str
    note: str
    session_id: str


class PaymentVerifyRequest(SQLModel):
    tx_id: str
    session_id: str
    seller_id: str
    task: str


class PaymentVerifyResponse(SQLModel):
    verified: bool
    tx_hash: str
    round_number: int
    confirmation_time_ms: int
    block_explorer_url: str


class TaskExecuteRequest(SQLModel):
    seller_id: str
    task: str
    tx_hash: str


class TaskResult(SQLModel):
    result_type: str  # "text" | "chart" | "json"
    content: str
    chart_data: Optional[list] = None


# ─── Ledger Entry (SQLite table) ─────────────────────────────────────────────

class LedgerEntry(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    buyer_id: str
    buyer_name: str
    seller_id: str
    seller_name: str
    price_algo: float
    status: str = "confirmed"   # "pending" | "confirmed" | "failed"
    tx_hash: str
    confirmation_time_ms: int
    round_number: int
    task: str
    result: Optional[str] = None


class LedgerEntryCreate(SQLModel):
    buyer_id: str
    buyer_name: str
    seller_id: str
    seller_name: str
    price_algo: float
    tx_hash: str
    confirmation_time_ms: int
    round_number: int
    task: str
    result: Optional[str] = None


# ─── API Keys (SQLite table) ─────────────────────────────────────────────────
# Only metadata is stored — the raw secret is generated client-side and shown
# once; the backend never sees it.

class ApiKey(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    key_prefix: str
    created: str
    last_used: str = "Never"
    environment: str = "live"       # "live" | "test"
    status: str = "active"          # "active" | "revoked"


class ApiKeyCreate(SQLModel):
    id: Optional[str] = None
    name: str
    key_prefix: str
    created: str
    last_used: str = "Never"
    environment: str = "live"
    status: str = "active"


# ─── Webhooks (SQLite tables) ────────────────────────────────────────────────

class WebhookEndpoint(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    url: str
    description: str
    events: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    status: str = "active"          # "active" | "disabled"
    created_at: str


class WebhookEndpointCreate(SQLModel):
    id: Optional[str] = None
    url: str
    description: str = "New endpoint"
    events: List[str] = Field(default_factory=list)
    status: str = "active"
    created_at: str


class WebhookEndpointPatch(SQLModel):
    status: Optional[str] = None


class WebhookDelivery(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    event: str
    timestamp: str
    status: str = "success"          # "success" | "failed"
    response_code: int = 200
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class WebhookDeliveryCreate(SQLModel):
    id: Optional[str] = None
    event: str
    timestamp: str
    status: str = "success"
    response_code: int = 200
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class WebhookDeliveryPatch(SQLModel):
    status: Optional[str] = None
    response_code: Optional[int] = None


# ─── Automations (SQLite table) ──────────────────────────────────────────────

class Automation(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    description: str
    trigger: str
    trigger_icon: str
    agents: List[dict] = Field(default_factory=list, sa_column=Column(JSON))
    estimated_cost: float
    last_run: str
    next_run: str
    status: str = "active"          # "active" | "paused"
    runs: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AutomationCreate(SQLModel):
    id: Optional[str] = None
    name: str
    description: str
    trigger: str
    trigger_icon: str
    agents: List[dict] = Field(default_factory=list)
    estimated_cost: float
    last_run: str
    next_run: str
    status: str = "active"
    runs: int = 0


class AutomationPatch(SQLModel):
    status: Optional[str] = None
    last_run: Optional[str] = None
    next_run: Optional[str] = None
    runs: Optional[int] = None


class AutomationRun(SQLModel, table=True):
    """A single execution of an automation workflow — the trigger history."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    automation_id: str
    workflow_name: str
    trigger: str = "manual"         # "manual" | "schedule" | "event"
    status: str = "running"         # "running" | "success" | "failed"
    cost_algo: float = 0.0
    started_at: datetime = Field(default_factory=datetime.utcnow)
    duration_ms: Optional[int] = None


class AutomationRunCreate(SQLModel):
    id: Optional[str] = None
    automation_id: str
    workflow_name: str
    trigger: str = "manual"
    status: str = "running"
    cost_algo: float = 0.0
    started_at: datetime = Field(default_factory=datetime.utcnow)
    duration_ms: Optional[int] = None


class AutomationRunPatch(SQLModel):
    status: Optional[str] = None
    duration_ms: Optional[int] = None


# ─── Wallet funding (SQLite table) ───────────────────────────────────────────
# Top-up entries that refill the funded wallet balance. Only metadata is
# stored — the funds are Testnet ALGO with no real-world value.

class WalletFunding(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    amount: float
    method: str = "faucet"      # "genesis" | "faucet" | "transfer" | "card"
    status: str = "pending"     # "pending" | "confirmed"
    note: Optional[str] = None
    tx_hash: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class WalletFundingCreate(SQLModel):
    id: Optional[str] = None
    amount: float
    method: str = "faucet"
    status: str = "pending"
    note: Optional[str] = None
    tx_hash: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class WalletFundingPatch(SQLModel):
    status: Optional[str] = None
    tx_hash: Optional[str] = None
    amount: Optional[float] = None


# ─── Wallet settings (SQLite table) ──────────────────────────────────────────
# The wallet's funded amount is a persisted setting — NOT a hardcoded
# constant — so it can be edited in Settings and survives reloads. The
# single "default" row is the source of truth that seeds the genesis funding
# entry.

class WalletSettings(SQLModel, table=True):
    id: str = Field(default="default", primary_key=True)
    funded_amount: float = 12.5
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class WalletSettingsUpdate(SQLModel):
    funded_amount: float
