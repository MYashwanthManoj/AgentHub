"""
schemas.py — Pydantic / SQLModel models.

These mirror the TypeScript types in src/types/index.ts exactly.
When adding a field here, add it there too.
"""

from sqlmodel import SQLModel, Field
from sqlalchemy import Column, JSON
from typing import Optional, List, Any, Dict
from datetime import datetime
import uuid

from pydantic import BaseModel, ConfigDict, field_validator


# ─── Shared validation helpers ───────────────────────────────────────────────

_MAX_TASK_LEN = 4000        # generous ceiling — rejects abusive multi-MB payloads
_MAX_TEXT_LEN = 2000


def _require_non_blank(value: str, field: str) -> str:
    """Reject None / empty / whitespace-only strings with a clear message."""
    if value is None or not str(value).strip():
        raise ValueError(f"'{field}' must be a non-empty string")
    return str(value).strip()


# ─── Seller Agent (read-only, seeded from registry.py) ──────────────────────
# Not stored in DB — served from in-memory list in registry.py

class AgentCallRequest(SQLModel):
    """Body for POST /agent/{id}/call — the buyer describing the task it wants."""
    task: str = Field(..., min_length=1, max_length=_MAX_TASK_LEN)
    buyer_address: str = Field(..., min_length=1)

    @field_validator("task", "buyer_address")
    @classmethod
    def _not_blank(cls, v, info):
        return _require_non_blank(v, info.field_name)


class PaymentRequiredResponse(SQLModel):
    status: int = 402
    amount_algo: float
    receiver: str
    note: str
    session_id: str


class PaymentVerifyRequest(SQLModel):
    """Body for POST /payment/verify — proof that a TX was broadcast."""
    tx_id: str = Field(..., min_length=1)
    session_id: str = Field(..., min_length=1)
    seller_id: str = Field(..., min_length=1)
    task: str = Field(..., min_length=1, max_length=_MAX_TASK_LEN)

    @field_validator("tx_id", "session_id", "seller_id", "task")
    @classmethod
    def _not_blank(cls, v, info):
        return _require_non_blank(v, info.field_name)


class PaymentVerifyResponse(SQLModel):
    verified: bool
    tx_hash: str
    round_number: int
    confirmation_time_ms: int
    block_explorer_url: str


class TaskExecuteRequest(SQLModel):
    """Body for POST /agent/{id}/execute — the paid task to run."""
    seller_id: str = Field(..., min_length=1)
    task: str = Field(..., min_length=1, max_length=_MAX_TASK_LEN)
    tx_hash: str = ""

    @field_validator("seller_id", "task")
    @classmethod
    def _not_blank(cls, v, info):
        return _require_non_blank(v, info.field_name)


class TaskResult(SQLModel):
    result_type: str  # "text" | "chart" | "json" | "image"
    content: str
    chart_data: Optional[list] = None


class ExecuteAgentResponse(BaseModel):
    """Full envelope returned by POST /agent/{id}/execute."""
    status: int = 200
    agent_id: str
    agent_name: str
    task: str
    tx_hash: str
    result: TaskResult
    execution_time_ms: Optional[int] = None


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
    buyer_id: str = Field(..., min_length=1)
    buyer_name: str = Field(..., min_length=1)
    seller_id: str = Field(..., min_length=1)
    seller_name: str = Field(..., min_length=1)
    price_algo: float = Field(..., ge=0)
    tx_hash: str = Field(..., min_length=1)
    confirmation_time_ms: int = Field(..., ge=0)
    round_number: int = Field(..., ge=0)
    task: str = Field(..., min_length=1, max_length=_MAX_TASK_LEN)
    result: Optional[str] = None

    @field_validator("buyer_id", "buyer_name", "seller_id", "seller_name", "tx_hash", "task")
    @classmethod
    def _not_blank(cls, v, info):
        return _require_non_blank(v, info.field_name)


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
    url: str = Field(..., min_length=1)
    description: str = "New endpoint"
    events: List[str] = Field(default_factory=list)
    status: str = "active"
    created_at: str

    @field_validator("url")
    @classmethod
    def _valid_url(cls, v):
        v = _require_non_blank(v, "url")
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("'url' must start with http:// or https://")
        return v

    @field_validator("status")
    @classmethod
    def _valid_status(cls, v):
        if v not in ("active", "disabled"):
            raise ValueError("'status' must be 'active' or 'disabled'")
        return v


class WebhookEndpointPatch(SQLModel):
    status: Optional[str] = None

    @field_validator("status")
    @classmethod
    def _valid_status(cls, v):
        if v is not None and v not in ("active", "disabled"):
            raise ValueError("'status' must be 'active' or 'disabled'")
        return v


class WebhookDelivery(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    event: str
    timestamp: str
    status: str = "success"          # "success" | "failed"
    response_code: int = 200
    # Added for real delivery simulation (POST /webhooks/trigger). Nullable so
    # pre-existing databases migrate cleanly via ADD COLUMN.
    endpoint_id: Optional[str] = None
    endpoint_url: Optional[str] = None
    payload: Optional[str] = None
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
