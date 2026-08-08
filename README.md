# AgentHub — x402 Service Registry
## BlockHack 2026 · Algorand x402 Track

AgentHub is a production-quality evaluation demo showing autonomous AI agents
discovering services, paying with the x402 protocol on Algorand, and consuming
services — all visualized in real time with a blockchain-explorer UI.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

```bash
npm run build      # type-check (tsc) + production bundle
npm run preview    # serve the built bundle locally
```

## Backend & Demo Data

The app also ships with a FastAPI backend (`backend/`, SQLModel + SQLite) that
persists the transaction ledger, wallet funding, API keys, webhooks, and
automations.

```bash
cd backend && pip install -r requirements.txt
python -m uvicorn backend.main:app --port 8000
```

A fresh clone auto-seeds on first startup — the registry-backed demo data
(API keys, webhook endpoints + deliveries, automations, the wallet's genesis
funding + funded-amount setting, and a 12-transaction ledger) is written when
the tables are empty, so every page demos immediately without a first browser
visit. Existing databases are never touched.

```bash
python -m backend.seed           # seed only empty tables
python -m backend.seed --force   # wipe demo tables + re-seed (stop the server first)
```

Empty tables are re-seeded on startup by design (mirrors the frontend
re-seeding empty localStorage), so clearing a table in the UI and restarting
the backend brings the demo rows back.

## Why Algorand?

- **Sub-second finality** — a 3.3-second block time means an x402 payment settles before the buyer's retry request times out; no waiting on confirmations.
- **Penny-scale fees** (~0.001 ALGO) — micropayments per agent call actually make economic sense, unlike congested chains.
- **Carbon-negative & built for agents** — native support for payment-state applications like x402, so agent commerce can scale without the environmental or latency tax.

## How the Demo Works

1. Select a seller agent or type a task — auto-routing picks the best match
2. Press **Run Payment Flow** to watch the animated 14-step x402 sequence:
   - Registry search → seller found → HTTP 402 received
   - Algorand transaction constructed → signed → broadcast
   - Settlement confirmed on-chain → retry with payment proof
   - HTTP 200 OK → task executed → result returned
3. Every transaction is recorded in the persistent ledger (survives refresh)
4. Press **Multi-Agent Workflow** for a 3-hop autonomous pipeline

## Multi-Agent Workflow

Beyond a single sale, AgentHub demonstrates **chains of agent commerce**. The
**⇢ Multi-Agent Workflow** button runs three independent x402 purchases back to
back, each with its own 402 challenge, transaction, and on-chain settlement:

| Hop | Seller | Task | Price |
|-----|--------|------|-------|
| 1 | Summarizer Agent | Digest the x402 protocol spec | 0.05 ALGO |
| 2 | Chart Agent | Visualize transaction-volume data | 0.08 ALGO |
| 3 | Lookup Agent | Resolve Algorand Foundation details | 0.03 ALGO |

Hops are decoupled from the single-hop flow so a failure in one hop does not
corrupt the pipeline state. Each hop's settlement lands in the ledger and the
panel finishes with a **total settled** readout (0.16 ALGO for the default run).

## Project Structure

```
src/
  components/     Header, Marketplace, TransactionFlow, Ledger, Badges, Timeline
  hooks/          useTransactionFlow, useLedger, useMultiHopFlow
  services/       paymentEngine.ts, registryService.ts, agentRouter.ts
  data/           agents.ts (seller registry)
  types/          index.ts (all shared types)
  utils/          format.ts, crypto.ts
  pages/          MarketplacePage.tsx
  styles/         global.css
```

## Module Map

| Module | File | Responsibility |
|---|---|---|
| Payment Engine | services/paymentEngine.ts | All x402 payment logic — Phase 2 migration point |
| Registry | services/registryService.ts | Seller discovery + keyword search |
| Router | services/agentRouter.ts | Task → best seller routing |
| Flow Hook | hooks/useTransactionFlow.ts | Single-hop step animation state |
| Pipeline Hook | hooks/useMultiHopFlow.ts | Multi-hop isolated pipeline |
| Ledger Hook | hooks/useLedger.ts | localStorage persistence |

## Phase 2: Real Algorand Integration

See [docs/MIGRATION.md](docs/MIGRATION.md) for the complete guide to replacing
mocked payments with the real algosdk + x402 implementation.

## Tech Stack

React 19 · Vite 8 · TypeScript (strict) · Vanilla CSS · localStorage · FastAPI + SQLite backend (optional)

## FAQ

**Is this real money?**
No — Phase 1 runs entirely in the browser (SIMULATED MODE, localStorage ledger).
Phase 2 swaps the mocks for the real algosdk against Algorand testnet, backed by
the FastAPI service in `backend/`.

**How does auto-routing pick a seller?**
Typing a task scores each registered agent: keywords ×3, task body ×1, reputation
as a tie-break. Two or more keyword hits → `high` confidence; the best-scoring
seller is auto-selected, and you can always pick another card manually.

**What is x402?**
It is the HTTP 402 "Payment Required" protocol: a seller answers a request with a
payment challenge, the buyer pays on-chain, then retries with the receipt and
gets the answer. AgentHub shows that whole lifecycle in a 14-step animation.

**Where do money figures like 0.16 ALGO come from?**
Multi-agent Workflow chains three settlements — Summarizer 0.05 + Chart 0.08 +
Lookup 0.03 = **0.16 ALGO** — each hop an independent on-chain purchase with its
own tx hash and round number.

**Does the ledger survive refresh?**
Yes. Entries are persisted to `localStorage` and are re-loaded on startup; the
clear button resets the demo state.

**Does the wallet balance update after a purchase?**
Yes. The wallet balance is derived live from the ledger (funded 12.5 ALGO minus
confirmed spends) — the header pill drops the instant a settlement lands, no
reload needed, and the Wallet page shows the same figure.

**Can I add funds to the wallet?**
Yes — the Wallet page has a **Top Up** button. Each top-up is logged in the
Funding History (method, amount, status, tx hash) and persisted to the backend
like the ledger, so balances and history survive reloads. Total Balance is the
sum of confirmed top-ups; Available Balance subtracts confirmed spends.

**Where does the funded amount come from?**
It's a persisted setting — **Settings → Wallet Funding** lets you change the
initial funded amount (default 12.5 ALGO) and it survives reloads. The genesis
funding entry and every balance readout (header pill, wallet, dashboard)
follow that setting, so nothing is tied to a hardcoded constant.

---

More docs: [Architecture](docs/ARCHITECTURE.md) · [Parallel Dev](docs/PARALLEL_DEV.md) · [Demo Script](docs/DEMO_SCRIPT.md) · [Judging Guide](docs/JUDGING_GUIDE.md) · [API Reference](docs/API_REFERENCE.md) · [Changelog](docs/CHANGELOG.md)
