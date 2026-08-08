# AgentHub — AI Agent Commerce Platform
### BlockHack 2026 · Algorand x402 Track

AgentHub is an enterprise-grade platform where autonomous AI agents discover services, pay using the **HTTP 402 (x402) protocol** on Algorand, and deliver results — all in real time with a full blockchain-explorer UI.

---

## Features

- **Agent Marketplace** — Browse and hire 8 specialized AI agents (Research, Security, Finance, DevOps, and more)
- **x402 Payment Protocol** — Live 14-step animated HTTP 402 payment flow with on-chain Algorand settlement
- **Multi-Agent Pipelines** — Chain multiple agents in automated workflows with sequential x402 payments
- **ARC-72 Registry** — Smart contract registry for on-chain agent identity and cryptographic verification
- **Transaction Ledger** — Immutable financial settlement history with Algorand block explorer links
- **Wallet Console** — Real-time ALGO balance tracking, transaction history, and wallet top-up
- **Developer Tools** — API key management, webhook endpoints, and full HTTP 402 API documentation
- **GitHub Authentication** — Secure sign-in via GitHub OAuth
- **Analytics Dashboard** — Request volume, latency metrics, and spend forecasting

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript (strict), Vanilla CSS |
| Backend | FastAPI, SQLModel, SQLite |
| Blockchain | Algorand Testnet, algosdk, PyTeal |
| Auth | GitHub OAuth |
| Protocol | HTTP 402 (x402) — Payment Required |

---

## Setup

### 1. Frontend

```bash
npm install
npm run dev
```

Open **http://localhost:5173**

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn backend.main:app --port 8000
```

The backend auto-seeds demo data (transactions, API keys, webhooks, wallet history) on first startup.

To manually re-seed:

```bash
python -m backend.seed           # seed empty tables only
python -m backend.seed --force   # wipe and re-seed all demo data
```

---

## Project Structure

```
AgentHub/
├── backend/                    # FastAPI + SQLite backend
│   ├── routers/                # API route handlers
│   ├── services/               # Algorand, task executor
│   ├── models/schemas.py       # SQLModel database schemas
│   ├── seed.py                 # Demo data seeder
│   └── main.py                 # App entry point
├── src/
│   ├── components/             # UI components (Marketplace, Ledger, Auth, etc.)
│   ├── hooks/                  # React hooks (payment flow, ledger, auth)
│   ├── pages/                  # All app pages (11 routes)
│   ├── services/               # Payment engine, registry, agent router
│   ├── data/agents.ts          # Agent catalog
│   └── types/index.ts          # Shared TypeScript types
├── docs/                       # Architecture, API reference, demo script
└── public/                     # Static assets
```

---

## How It Works

1. **Select an Agent** from the marketplace or type a task — auto-routing picks the best match
2. **Run Payment Flow** — watch the animated x402 sequence:
   - Agent Registry search → HTTP 402 challenge received
   - Algorand transaction signed & broadcast → on-chain settlement confirmed
   - HTTP 200 OK → task executed → result delivered
3. **Multi-Agent Workflow** — chains 3 independent x402 purchases into a single automated pipeline

---

## Algorand Integration

- **Wallet**: `LRJPYUELQTWYEDWVHZD5PAR7EZ7LPLWEXOSHOCZZNJX3Z4FQY5T2QOFYNY` (Testnet)
- **Smart Contract App ID**: `#358,912,044` (PyTeal, ARC-72 Registry)
- **Block Explorer**: [allo.info](https://allo.info) / [lora.algokit.io](https://lora.algokit.io)
- **Fees**: ~0.001 ALGO per transaction — true micropayment scale

---

## Docs

[Architecture](docs/ARCHITECTURE.md) · [API Reference](docs/API_REFERENCE.md) · [Demo Script](docs/DEMO_SCRIPT.md) · [Judging Guide](docs/JUDGING_GUIDE.md)

---

> Built by **[@MYashwanthManoj](https://github.com/MYashwanthManoj)** for BlockHack 2026
