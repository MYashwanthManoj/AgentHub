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

from pydantic import BaseModel, ConfigDict, field_validator, Field as PField


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
    name: str = Field(..., min_length=1)
    key_prefix: str = Field(..., min_length=1)
    created: str
    last_used: str = "Never"
    environment: str = "live"
    status: str = "active"

    @field_validator("name", "key_prefix")
    @classmethod
    def _not_blank(cls, v, info):
        return _require_non_blank(v, info.field_name)

    @field_validator("environment")
    @classmethod
    def _valid_env(cls, v):
        if v not in ("live", "test"):
            raise ValueError("'environment' must be 'live' or 'test'")
        return v


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
    event: str = Field(..., min_length=1)
    timestamp: str
    status: str = "success"
    response_code: int = 200
    endpoint_id: Optional[str] = None
    endpoint_url: Optional[str] = None
    payload: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    @field_validator("event")
    @classmethod
    def _not_blank(cls, v, info):
        return _require_non_blank(v, info.field_name)


class WebhookDeliveryPatch(SQLModel):
    status: Optional[str] = None
    response_code: Optional[int] = None


class WebhookTriggerRequest(BaseModel):
    """Body for POST /webhooks/trigger — fan an event out to live endpoints."""
    event: str = Field("agent.executed", min_length=1)
    payload: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("event")
    @classmethod
    def _not_blank(cls, v, info):
        return _require_non_blank(v, info.field_name)


class WebhookDeliveryRead(BaseModel):
    """A single delivery attempt as returned to the frontend (camelCase wire)."""
    model_config = ConfigDict(populate_by_name=True)

    id: str
    event: str
    timestamp: str
    status: str
    response_code: int = PField(serialization_alias="responseCode")
    endpoint_id: Optional[str] = PField(default=None, serialization_alias="endpointId")
    endpoint_url: Optional[str] = PField(default=None, serialization_alias="endpointUrl")


class WebhookTriggerResponse(BaseModel):
    """Summary of a fan-out: how many endpoints matched and per-endpoint results."""
    event: str
    triggered: int
    delivered: int
    failed: int
    deliveries: List[WebhookDeliveryRead]


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
    name: str = Field(..., min_length=1)
    description: str
    trigger: str
    trigger_icon: str
    agents: List[dict] = Field(default_factory=list)
    estimated_cost: float = Field(0.0, ge=0)
    last_run: str
    next_run: str
    status: str = "active"
    runs: int = Field(0, ge=0)

    @field_validator("name")
    @classmethod
    def _not_blank(cls, v, info):
        return _require_non_blank(v, info.field_name)


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
    automation_id: str = Field(..., min_length=1)
    workflow_name: str = Field(..., min_length=1)
    trigger: str = "manual"
    status: str = "running"
    cost_algo: float = Field(0.0, ge=0)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    duration_ms: Optional[int] = None

    @field_validator("automation_id", "workflow_name")
    @classmethod
    def _not_blank(cls, v, info):
        return _require_non_blank(v, info.field_name)


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
    amount: float = Field(..., gt=0)
    method: str = "faucet"
    status: str = "pending"
    note: Optional[str] = None
    tx_hash: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("method")
    @classmethod
    def _valid_method(cls, v):
        if v not in ("genesis", "faucet", "transfer", "card"):
            raise ValueError("'method' must be one of genesis|faucet|transfer|card")
        return v

    @field_validator("status")
    @classmethod
    def _valid_status(cls, v):
        if v not in ("pending", "confirmed"):
            raise ValueError("'status' must be 'pending' or 'confirmed'")
        return v


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
    funded_amount: float = Field(..., ge=0)


# ═══════════════════════════════════════════════════════════════════════════
# Response models (Task 7)
#
# These give every router a typed `response_model` instead of a bare dict, so
# the schema shows up in Swagger. Field python-names stay snake_case while
# `serialization_alias` emits the exact camelCase keys the frontend already
# consumes — the JSON on the wire is unchanged. `populate_by_name=True` lets
# the routers construct them with plain snake_case kwargs.
# ═══════════════════════════════════════════════════════════════════════════

_CAMEL = ConfigDict(populate_by_name=True)


class MutationResponse(BaseModel):
    """Generic ack returned by create / update / delete mutations."""
    model_config = _CAMEL
    id: str
    status: str


class RegistryAgentRead(BaseModel):
    """A seller agent as advertised on the registry."""
    model_config = _CAMEL
    id: str
    name: str
    description: str
    category: str
    price_algo: float = PField(serialization_alias="priceAlgo")
    reputation_score: int = PField(serialization_alias="reputationScore")
    endpoint: str
    wallet_address: str = PField(serialization_alias="walletAddress")
    tags: List[str]


class LedgerEntryRead(BaseModel):
    """A settled x402 transaction row."""
    model_config = _CAMEL
    id: str
    timestamp: str
    buyer_id: str = PField(serialization_alias="buyerId")
    buyer_name: str = PField(serialization_alias="buyerName")
    seller_id: str = PField(serialization_alias="sellerId")
    seller_name: str = PField(serialization_alias="sellerName")
    price_algo: float = PField(serialization_alias="priceAlgo")
    status: str
    tx_hash: str = PField(serialization_alias="txHash")
    confirmation_time_ms: int = PField(serialization_alias="confirmationTimeMs")
    round_number: int = PField(serialization_alias="roundNumber")
    task: str
    result: Optional[str] = None


class LedgerStatsResponse(BaseModel):
    """Aggregate ledger stats for the explorer stat bar."""
    model_config = _CAMEL
    total_transactions: int = PField(serialization_alias="totalTransactions")
    total_spent: float = PField(serialization_alias="totalSpent")
    last_tx_hash: Optional[str] = PField(default=None, serialization_alias="lastTxHash")
    last_round: Optional[int] = PField(default=None, serialization_alias="lastRound")


class ClearedResponse(BaseModel):
    """Ack for a demo-reset clear."""
    cleared: bool


class ApiKeyRead(BaseModel):
    """API key metadata (never the raw secret)."""
    model_config = _CAMEL
    id: str
    name: str
    key_prefix: str = PField(serialization_alias="keyPrefix")
    created: str
    last_used: str = PField(serialization_alias="lastUsed")
    status: str
    environment: str


class WebhookEndpointRead(BaseModel):
    """A registered webhook endpoint."""
    model_config = _CAMEL
    id: str
    url: str
    description: str
    events: List[str]
    status: str
    created_at: str = PField(serialization_alias="createdAt")


class AutomationRead(BaseModel):
    """A multi-agent automation workflow."""
    model_config = _CAMEL
    id: str
    name: str
    description: str
    trigger: str
    trigger_icon: str = PField(serialization_alias="triggerIcon")
    agents: List[dict]
    estimated_cost: float = PField(serialization_alias="estimatedCost")
    last_run: str = PField(serialization_alias="lastRun")
    next_run: str = PField(serialization_alias="nextRun")
    status: str
    runs: int


class AutomationRunRead(BaseModel):
    """A single automation execution."""
    model_config = _CAMEL
    id: str
    automation_id: str = PField(serialization_alias="automationId")
    workflow_name: str = PField(serialization_alias="workflowName")
    trigger: str
    status: str
    cost_algo: float = PField(serialization_alias="costAlgo")
    started_at: str = PField(serialization_alias="startedAt")
    duration_ms: Optional[int] = PField(default=None, serialization_alias="durationMs")


class WalletFundingRead(BaseModel):
    """A wallet top-up entry."""
    model_config = _CAMEL
    id: str
    amount: float
    method: str
    status: str
    note: Optional[str] = None
    tx_hash: Optional[str] = PField(default=None, serialization_alias="txHash")
    created_at: str = PField(serialization_alias="createdAt")


class WalletSettingsResponse(BaseModel):
    """The persisted wallet funded-amount setting."""
    model_config = _CAMEL
    funded_amount: float = PField(serialization_alias="fundedAmount")
    updated_at: str = PField(serialization_alias="updatedAt")


class WalletSettingsSaveResponse(BaseModel):
    """Ack for a wallet-settings save."""
    model_config = _CAMEL
    funded_amount: float = PField(serialization_alias="fundedAmount")
    status: str


class HealthResponse(BaseModel):
    """Deep health snapshot returned by GET /health."""
    model_config = _CAMEL
    status: str
    service: str
    version: str
    network: str
    uptime_seconds: float = PField(serialization_alias="uptimeSeconds")
    database: dict
    registry: dict
    ledger: dict
    algorand: dict
    runtime: dict
