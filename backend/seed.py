"""
seed.py — Demo data seeder for a fresh AgentHub clone.

A fresh clone ships with an empty SQLite database, so the persistent
collections (API keys, webhook endpoints/deliveries, automations + their run
history) and the transaction ledger stay empty until a browser first visits
each page and back-fills its seeds. This module pre-populates the backend
with the exact same seed data the frontend pages would otherwise back-fill,
so a fresh clone demos immediately — no first browser visit required.

Usage:
    python -m backend.seed           # seed only tables that are empty
    python -m backend.seed --force   # wipe the demo tables, then re-seed

main.py calls seed_demo_data() on startup (seed-if-empty only), so a fresh
clone needs zero manual steps. Existing databases are never modified —
seeding is skipped for any table that already has rows (unless --force).

Notes:
  - Empty tables are re-seeded on startup by design (same as the frontend
    re-seeding empty localStorage), so deleting ALL rows of a table via the
    UI and restarting the backend brings the demo rows back.
  - Stop the running server before `python -m backend.seed --force` —
    concurrent SQLite writers can hit "database is locked".

The rows below mirror src/pages/*Page.tsx seed constants exactly (same ids),
so the frontend's id-based reconcile de-dupes cleanly against them.
"""

import argparse
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List

from sqlmodel import Session, SQLModel, select

from backend.db import engine
from backend.models.schemas import (
    Agent,
    ApiKey,
    Automation,
    AutomationRun,
    LedgerEntry,
    WalletFunding,
    WalletSettings,
    WebhookDelivery,
    WebhookEndpoint,
)

# ─── Deterministic fake tx hash ──────────────────────────────────────────────

def _fake_tx_hash(seed: str) -> str:
    """Deterministic id matching the app's established ALGO_TX_<hex> format
    (20 chars — the transactions UI is styled around this length)."""
    return "ALGO_TX_" + hashlib.sha256(seed.encode()).hexdigest()[:12].upper()


# ─── Agent registry ──────────────────────────────────────────────────────────
# All 13 registered seller agents (mirrors the in-memory AGENTS list in
# backend/routers/registry.py and the frontend's src/data/agents.ts).

def _seed_agents(session: Session) -> int:
    if session.exec(select(Agent)).first() is not None:
        return 0
    session.add_all(
        [
            Agent(
                id="agent-summarizer-01",
                name="Summarizer Agent",
                description="Compresses long documents into concise, accurate summaries. Ideal for research digestion and content pipelines.",
                price_algo=0.05,
                category="summarizer",
                endpoint="https://agents.example.com/summarizer/v1",
                reputation=97,
                is_verified=True,
            ),
            Agent(
                id="agent-chart-01",
                name="Chart Agent",
                description="Transforms raw data arrays into publication-ready charts. Returns structured chart-data for rendering.",
                price_algo=0.08,
                category="chart",
                endpoint="https://agents.example.com/chart/v1",
                reputation=94,
                is_verified=True,
            ),
            Agent(
                id="agent-lookup-01",
                name="Lookup Agent",
                description="Queries structured knowledge stores and returns type-safe JSON payloads. Supports entity resolution.",
                price_algo=0.03,
                category="lookup",
                endpoint="https://agents.example.com/lookup/v1",
                reputation=92,
                is_verified=True,
            ),
            Agent(
                id="agent-code-auditor-01",
                name="Code Auditor Agent",
                description="Scans smart contracts and TypeScript repos for security vulnerabilities, race conditions, and gas leaks.",
                price_algo=0.12,
                category="auditor",
                endpoint="https://agents.example.com/auditor/v1",
                reputation=98,
                is_verified=True,
            ),
            Agent(
                id="agent-sentiment-01",
                name="Sentiment Analyzer Agent",
                description="Performs real-time financial market sentiment analysis across news feeds and social data streams.",
                price_algo=0.04,
                category="analytics",
                endpoint="https://agents.example.com/sentiment/v1",
                reputation=91,
                is_verified=True,
            ),
            Agent(
                id="agent-extractor-01",
                name="Data Extractor Agent",
                description="Parses unstructured PDFs, HTML, and invoices into strictly typed JSON schemas with 99.9% accuracy.",
                price_algo=0.06,
                category="extractor",
                endpoint="https://agents.example.com/extractor/v1",
                reputation=95,
                is_verified=True,
            ),
            Agent(
                id="agent-security-01",
                name="Security Sentinel Agent",
                description="Monitors contracts for abnormal transaction spikes, exploit patterns, and wallet drains.",
                price_algo=0.15,
                category="security",
                endpoint="https://agents.example.com/security/v1",
                reputation=99,
                is_verified=True,
            ),
            Agent(
                id="agent-translator-01",
                name="Language Translator Agent",
                description="Provides high-speed neural translation across 50+ languages with technical domain term preservation.",
                price_algo=0.05,
                category="translator",
                endpoint="https://agents.example.com/translator/v1",
                reputation=93,
                is_verified=True,
            ),
            Agent(
                id="agent-image-01",
                name="Image Generator Agent",
                description="Generates high-quality AI images from text prompts using diffusion models. Instant visual output, pay-per-image via x402.",
                price_algo=0.10,
                category="image",
                endpoint="https://image.pollinations.ai/prompt",
                reputation=96,
                is_verified=True,
            ),
            Agent(
                id="agent-researcher-01",
                name="Research Orchestrator Agent",
                description="Fetches real Wikipedia knowledge on any topic, then autonomously hires a Summarizer Agent via x402 to distill and structure the findings.",
                price_algo=0.12,
                category="researcher",
                endpoint="https://en.wikipedia.org/api/rest_v1/page/summary",
                reputation=97,
                is_verified=True,
            ),
            Agent(
                id="agent-market-01",
                name="Market Intelligence Agent",
                description="Fetches live crypto prices (ALGO, BTC, ETH, SOL) from CoinGecko, then hires agents via x402 to visualize market trends.",
                price_algo=0.09,
                category="market",
                endpoint="https://api.coingecko.com/api/v3/simple/price",
                reputation=95,
                is_verified=True,
            ),
            Agent(
                id="agent-qr-01",
                name="QR Code Generator Agent",
                description="Converts any URL, wallet address, or text into a scannable QR code image instantly. Free, instant, pay-per-use via x402.",
                price_algo=0.03,
                category="qr",
                endpoint="https://api.qrserver.com/v1/create-qr-code",
                reputation=99,
                is_verified=True,
            ),
            Agent(
                id="agent-weather-01",
                name="Weather Intelligence Agent",
                description="Fetches live weather conditions for any city worldwide. Temperature, humidity, wind speed, and forecast.",
                price_algo=0.02,
                category="weather",
                endpoint="https://wttr.in",
                reputation=94,
                is_verified=True,
            ),
        ]
    )
    session.commit()
    return 13


# ─── API keys ────────────────────────────────────────────────────────────────

def _seed_api_keys(session: Session) -> int:
    if session.exec(select(ApiKey)).first() is not None:
        return 0
    session.add_all(
        [
            ApiKey(
                id="key-1",
                name="Production Server Key",
                key_prefix="ah_live_9f8a...3b21",
                created="2026-08-01",
                last_used="2 min ago",
                environment="live",
                status="active",
            ),
            ApiKey(
                id="key-2",
                name="Staging Agent Bot",
                key_prefix="ah_live_4c1d...8e90",
                created="2026-08-05",
                last_used="2 hours ago",
                environment="test",
                status="active",
            ),
        ]
    )
    session.commit()
    return 2


# ─── Webhook endpoints ───────────────────────────────────────────────────────

def _seed_webhook_endpoints(session: Session) -> int:
    if session.exec(select(WebhookEndpoint)).first() is not None:
        return 0
    session.add_all(
        [
            WebhookEndpoint(
                id="wh-1",
                url="https://example.com/webhooks/agenthub",
                description="Production pipeline notifier",
                events=[
                    "payment.created",
                    "payment.confirmed",
                    "agent.executed",
                    "agent.failed",
                    "transaction.confirmed",
                ],
                status="active",
                created_at="2026-08-01",
            )
        ]
    )
    session.commit()
    return 1


# ─── Webhook deliveries ──────────────────────────────────────────────────────

def _seed_webhook_deliveries(session: Session) -> int:
    if session.exec(select(WebhookDelivery)).first() is not None:
        return 0
    now = datetime.utcnow()
    session.add_all(
        [
            WebhookDelivery(
                id="d1",
                event="payment.confirmed",
                timestamp="2 min ago",
                status="success",
                response_code=200,
                created_at=(now - timedelta(minutes=2)).isoformat(),
            ),
            WebhookDelivery(
                id="d2",
                event="agent.executed",
                timestamp="2 min ago",
                status="success",
                response_code=200,
                created_at=(now - timedelta(minutes=2)).isoformat(),
            ),
            WebhookDelivery(
                id="d3",
                event="payment.created",
                timestamp="12 min ago",
                status="success",
                response_code=200,
                created_at=(now - timedelta(minutes=12)).isoformat(),
            ),
            WebhookDelivery(
                id="d4",
                event="agent.failed",
                timestamp="1 hour ago",
                status="failed",
                response_code=500,
                created_at=(now - timedelta(hours=1)).isoformat(),
            ),
        ]
    )
    session.commit()
    return 4


# ─── Automations ─────────────────────────────────────────────────────────────

def _seed_automations(session: Session) -> int:
    if session.exec(select(Automation)).first() is not None:
        return 0
    session.add_all(
        [
            Automation(
                id="wf-1",
                name="Research Pipeline",
                description="Compiles a weekly research digest from lookup, summarization, and charting agents.",
                trigger="Every 6 hours",
                trigger_icon="clock",
                agents=[
                    {"id": "agent-lookup-01", "name": "Lookup Agent", "cost": 0.03},
                    {"id": "agent-summarizer-01", "name": "Summarizer Agent", "cost": 0.05},
                    {"id": "agent-chart-01", "name": "Chart Agent", "cost": 0.08},
                ],
                estimated_cost=0.16,
                last_run="2 hours ago",
                next_run="In 4 hours",
                status="active",
                runs=128,
            ),
            Automation(
                id="wf-2",
                name="Security Watch",
                description="Monitors contracts for exploit patterns and alerts the team on anomalies.",
                trigger="Continuous",
                trigger_icon="activity",
                agents=[
                    {"id": "agent-security-01", "name": "Security Sentinel Agent", "cost": 0.15}
                ],
                estimated_cost=3.6,
                last_run="12 min ago",
                next_run="Continuous",
                status="active",
                runs=512,
            ),
            Automation(
                id="wf-3",
                name="Invoice Extraction",
                description="Parses incoming invoices into structured JSON and archives summaries.",
                trigger="On event",
                trigger_icon="zap",
                agents=[
                    {"id": "agent-extractor-01", "name": "Data Extractor Agent", "cost": 0.06},
                    {"id": "agent-summarizer-01", "name": "Summarizer Agent", "cost": 0.05},
                ],
                estimated_cost=0.11,
                last_run="Yesterday",
                next_run="On next event",
                status="paused",
                runs=43,
            ),
        ]
    )
    session.commit()
    return 3


# ─── Automation run history ─────────────────────────────────────────────────
# Recent executions per workflow, timed to match each card's "last run" meta
# (Research Pipeline 2h ago, Security Watch 12 min ago, Invoice Extraction
# Yesterday) so the Run History log feels coherent on a fresh clone.

def _seed_automation_runs(session: Session) -> int:
    if session.exec(select(AutomationRun)).first() is not None:
        return 0
    now = datetime.utcnow()
    # (id, automation_id, workflow_name, trigger, status, cost, started_at, duration_ms)
    rows = [
        # Research Pipeline — 0.16 ALGO / run
        ("run-1", "wf-1", "Research Pipeline", "schedule", "success", 0.16, now - timedelta(hours=2), 4200),
        ("run-2", "wf-1", "Research Pipeline", "schedule", "success", 0.16, now - timedelta(hours=8), 5100),
        ("run-3", "wf-1", "Research Pipeline", "manual", "success", 0.16, now - timedelta(hours=26), 3800),
        ("run-4", "wf-1", "Research Pipeline", "schedule", "success", 0.16, now - timedelta(hours=32), 4600),
        # Security Watch — 3.60 ALGO / run, continuous
        ("run-5", "wf-2", "Security Watch", "schedule", "success", 3.6, now - timedelta(minutes=12), 2400),
        ("run-6", "wf-2", "Security Watch", "schedule", "success", 3.6, now - timedelta(hours=1), 2100),
        ("run-7", "wf-2", "Security Watch", "schedule", "success", 3.6, now - timedelta(hours=3), 2600),
        ("run-8", "wf-2", "Security Watch", "schedule", "success", 3.6, now - timedelta(hours=6), 2300),
        # Invoice Extraction — 0.11 ALGO / run, event-triggered, one failure
        ("run-9", "wf-3", "Invoice Extraction", "event", "success", 0.11, now - timedelta(hours=30), 3100),
        ("run-10", "wf-3", "Invoice Extraction", "event", "failed", 0.11, now - timedelta(hours=31), None),
        ("run-11", "wf-3", "Invoice Extraction", "event", "success", 0.11, now - timedelta(hours=54), 2900),
    ]
    for run_id, automation_id, name, trigger, status, cost, started_at, duration_ms in rows:
        session.add(
            AutomationRun(
                id=run_id,
                automation_id=automation_id,
                workflow_name=name,
                trigger=trigger,
                status=status,
                cost_algo=cost,
                started_at=started_at,
                duration_ms=duration_ms,
            )
        )
    session.commit()
    return len(rows)


# ─── Wallet settings ───────────────────────────────────────────────────────
# The funded amount is a persisted setting (default 12.5 ALGO, matching the
# frontend's factory default) — the wallet derives its balance from this row
# instead of a hardcoded constant.

def _seed_wallet_settings(session: Session) -> int:
    if session.get(WalletSettings, "default") is not None:
        return 0
    session.add(WalletSettings(id="default", funded_amount=12.5))
    session.commit()
    return 1


# ─── Wallet funding ────────────────────────────────────────────────────────
# The demo wallet ships funded with 12.5 ALGO (matches the seeded wallet
# settings row) — a single confirmed genesis top-up, two weeks back, so Total
# Balance renders correctly and the Funding History isn't empty.

def _seed_wallet_funding(session: Session) -> int:
    if session.exec(select(WalletFunding)).first() is not None:
        return 0
    session.add(
        WalletFunding(
            id="genesis",
            amount=12.5,
            method="genesis",
            status="confirmed",
            note="Initial wallet funding",
            tx_hash=_fake_tx_hash("genesis-funding"),
            created_at=datetime.utcnow() - timedelta(days=14),
        )
    )
    session.commit()
    return 1


# ─── Transaction ledger ──────────────────────────────────────────────────────
# Mirrors the shape of real demo executions (Buyer Agent → verified sellers)
# so Overview / Wallet / Transactions / Analytics render immediately.

def _seed_ledger(session: Session) -> int:
    if session.exec(select(LedgerEntry)).first() is not None:
        return 0
    now = datetime.utcnow()

    # (hours_ago, seller_id, seller_name, price, status, task, result, ms, round)
    rows: List[tuple] = [
        (0.2, "agent-security-01", "Security Sentinel Agent", 0.15, "confirmed",
         "monitor contract for drain patterns", "0 anomalies detected across 1,240 operations", 2600, 42003190),
        (0.8, "agent-summarizer-01", "Summarizer Agent", 0.05, "confirmed",
         "summarize the Algorand x402 payment protocol spec", "x402 enables autonomous agent commerce: discover, request, pay, verify, execute", 1800, 42003120),
        (1.5, "agent-chart-01", "Chart Agent", 0.08, "confirmed",
         "chart quarterly revenue by agent category", "chart-data rendered for 4 categories", 3200, 42003010),
        (2.2, "agent-lookup-01", "Lookup Agent", 0.03, "confirmed",
         "resolve entity metadata for Algorand Foundation", "entity resolved with 3 linked assets", 1400, 42002900),
        (3.1, "agent-summarizer-01", "Summarizer Agent", 0.05, "confirmed",
         "summarize the technical debt review", "7 action items extracted from the review", 1800, 42002760),
        (4.3, "agent-code-auditor-01", "Code Auditor Agent", 0.12, "confirmed",
         "audit contract for reentrancy vulnerabilities", "2 low-severity findings, 0 critical", 4200, 42002580),
        (5.6, "agent-sentiment-01", "Sentiment Analyzer Agent", 0.04, "confirmed",
         "score market sentiment from ALGO news feed", "sentiment 62/100 — mildly bullish", 2100, 42002340),
        (6.8, "agent-extractor-01", "Data Extractor Agent", 0.06, "confirmed",
         "extract invoice fields from Q2 PDF batch", "24 invoices parsed at 99.9% accuracy", 3800, 42002090),
        (8.4, "agent-translator-01", "Language Translator Agent", 0.05, "confirmed",
         "translate API docs to Japanese", "12 pages translated, terms preserved", 2700, 42001770),
        (10.2, "agent-chart-01", "Chart Agent", 0.08, "failed",
         "chart gas usage across contracts", "orchestrator timeout after 30s", 900, 42001400),
        (12.5, "agent-summarizer-01", "Summarizer Agent", 0.05, "confirmed",
         "summarize the x402 demo script", "demo walkthrough summarized in 3 bullet points", 1800, 42000980),
        (14.0, "agent-lookup-01", "Lookup Agent", 0.03, "confirmed",
         "fetch ASA 123456 metadata", "asset metadata returned with 2 managers", 1500, 42000520),
    ]

    for i, (hours_ago, seller_id, seller_name, price, status, task, result, ms, round_no) in enumerate(rows):
        session.add(
            LedgerEntry(
                buyer_id="buyer-agent-01",
                buyer_name="Buyer Agent",
                seller_id=seller_id,
                seller_name=seller_name,
                price_algo=price,
                status=status,
                tx_hash=_fake_tx_hash(f"{task}:{seller_id}:{round_no}"),
                confirmation_time_ms=ms,
                round_number=round_no,
                task=task,
                result=f"Orchestrator received task: {result}",
                timestamp=now - timedelta(hours=hours_ago),
            )
        )
    session.commit()
    return len(rows)


# ─── Orchestrator ────────────────────────────────────────────────────────────

def seed_demo_data(session: Session, force: bool = False) -> Dict[str, int]:
    """Seed demo tables. Only empty tables are seeded unless force=True
    (which wipes the demo tables first — a clean-slate demo reset)."""
    if force:
        for model in (Agent, ApiKey, WebhookEndpoint, WebhookDelivery, Automation, AutomationRun, LedgerEntry, WalletFunding, WalletSettings):
            for row in session.exec(select(model)).all():
                session.delete(row)
        session.commit()

    counts: Dict[str, int] = {
        "agents": _seed_agents(session),
        "api_keys": _seed_api_keys(session),
        "webhook_endpoints": _seed_webhook_endpoints(session),
        "webhook_deliveries": _seed_webhook_deliveries(session),
        "automations": _seed_automations(session),
        "automation_runs": _seed_automation_runs(session),
        "ledger_entries": _seed_ledger(session),
        "wallet_funding": _seed_wallet_funding(session),
        "wallet_settings": _seed_wallet_settings(session),
    }
    return counts


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed AgentHub's SQLite database with demo data.",
        epilog="Seeds only empty tables unless --force is given.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Wipe the demo tables (agents, api keys, webhooks, automations, ledger, wallet funding/settings) and re-seed.",
    )
    args = parser.parse_args()

    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        counts = seed_demo_data(session, force=args.force)
    if any(counts.values()):
        print(f"[SEED] demo data written: {counts}")
    else:
        print("[SEED] all demo tables already populated — nothing to do.")


if __name__ == "__main__":
    main()
