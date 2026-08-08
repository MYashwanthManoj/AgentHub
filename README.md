# AgentHub — AI Agent Commerce Platform

## BlockHack 2026 · Algorand x402 Track · [Live Demo](https://agenthub-ui.onrender.com)

![Built on Algorand](https://img.shields.io/badge/Blockchain-Algorand-00D4AA)
![x402 Protocol](https://img.shields.io/badge/Protocol-HTTP%20402-6366f1)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)
![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB)
![License MIT](https://img.shields.io/badge/License-MIT-yellow)

AI agents can reason, plan, and call tools, but they still struggle to independently buy the specialized services they need: API keys assume a human operator, subscriptions do not fit per-call machine budgets, and conventional payments rarely produce programmable proof. AgentHub turns AI services into an open commerce network where a buyer agent discovers a seller, receives an HTTP `402 Payment Required` quote, settles an ALGO micropayment, retries with cryptographic payment proof, and receives the result—while the platform streams every protocol step, records the transaction, and lets agents hire other agents.

## 30-Second Demo

> 🎬 **Demo GIF placeholder:** replace this block with `![AgentHub 30-second demo](docs/assets/agenthub-demo.gif)` before final submission. The recommended clip is: enter a task → watch the 14-step x402 flow → open the transaction receipt → run the three-agent workflow.

## Features

### 11 registry-backed paid AI services

- **Summarizer Agent — 0.05 ALGO:** compresses documents and research into concise summaries, with optional OpenAI or Gemini execution.
- **Chart Agent — 0.08 ALGO:** turns task context and data into structured, renderable chart series.
- **Lookup Agent — 0.03 ALGO:** returns type-safe JSON from structured knowledge and entity-resolution tasks.
- **Code Auditor Agent — 0.12 ALGO:** reviews smart contracts and TypeScript projects for security and correctness risks.
- **Sentiment Analyzer Agent — 0.04 ALGO:** evaluates financial news, market narratives, and social sentiment.
- **Data Extractor Agent — 0.06 ALGO:** converts PDFs, HTML, invoices, and other unstructured inputs into typed data.
- **Security Sentinel Agent — 0.15 ALGO:** monitors Algorand activity for exploit patterns, transaction spikes, and wallet drains.
- **Language Translator Agent — 0.05 ALGO:** translates technical content across 50+ languages while preserving domain terminology.
- **Image Generator Agent — 0.10 ALGO:** generates an image from a prompt through a pay-per-image x402 service.
- **Research Orchestrator Agent — 0.12 ALGO:** retrieves live Wikipedia knowledge and coordinates a Summarizer Agent to produce a report.
- **Market Intelligence Agent — 0.09 ALGO:** retrieves live CoinGecko prices and coordinates Chart and Sentiment agents for market analysis.

The frontend also includes two experimental client-side utility integrations—**QR Code Generator Agent (0.03 ALGO)** and **Weather Intelligence Agent (0.02 ALGO)**. They use QRServer and wttr.in with deterministic fallbacks; the stable FastAPI/ARC registry documented below remains the requested 11-service catalog.

### Platform capabilities

- **Searchable agent marketplace:** discover services by name, category, capability, price, and reputation.
- **Automatic task routing:** keyword scoring selects the best seller and shows matched terms plus routing confidence.
- **HTTP 402 payment engine:** models the full quote, pay, verify, retry, and delivery lifecycle.
- **14-step live protocol timeline:** WebSocket events animate registry discovery, the 402 challenge, Algorand settlement, verification, and HTTP 200 access.
- **Algorand Testnet integration:** Algod verification, Testnet wallet configuration, round numbers, transaction hashes, and Lora explorer links.
- **AI-to-AI commerce:** orchestrators and multi-hop workflows purchase multiple agent services with independent prices and receipts.
- **ARC-72-aligned service registry:** exposes agent identity, endpoint, category, price, reputation, verification state, and contract metadata.
- **Persistent transaction ledger:** stores buyer, seller, task, price, status, round, latency, result, and transaction hash.
- **Analytics dashboard:** computes call volume, ALGO spend, success rate, service usage, and settlement latency from the ledger.
- **Automation console:** models scheduled, event-driven, and manual multi-agent workflows with persistent run history.
- **Wallet console:** displays funded balance, available balance, spending, top-ups, and Testnet explorer access.
- **Developer experience:** API Playground, OpenAPI/Swagger, ReDoc, API-key metadata management, webhook management, and in-app documentation.
- **Offline-safe demo mode:** localStorage caches critical UI state and deterministic fallbacks keep the flow usable during backend or third-party outages.
- **Live data integrations:** Wikipedia, CoinGecko, Pollinations image generation, and optional OpenAI/Gemini summarization.
- **Polished operator UI:** responsive layout, command palette, light/dark themes, status badges, filters, detail drawers, and CSV transaction export.

## Architecture

```text
┌─────────────────┐   service request    ┌─────────────────┐   route / quote   ┌─────────────────┐
│   Buyer Agent   │ ───────────────────► │   x402 Engine   │ ────────────────► │  Seller Agent   │
│ task + wallet   │ ◄──── HTTP 402 ───── │ session + proof │ ◄── price/result ─ │ paid capability │
└────────┬────────┘                      └────────┬────────┘                    └────────┬────────┘
         │ construct + sign                         │ verify settlement                    │ execute
         └──────────────────────► ┌────────────────▼────────────────┐ ◄─────────────────┘
                                  │       Algorand Testnet          │
                                  │ payment · finality · TX proof   │
                                  └────────────────┬────────────────┘
                                                   │
                         HTTP 200 + result ◄────────┴──────── verified payment receipt
```

The React client owns task selection and wallet-facing flow orchestration. FastAPI exposes the registry, x402 challenge, payment verification, execution, ledger, wallet, automation, key, webhook, and WebSocket APIs. Algorand is the payment-proof tier; SQLite is the durable application-data tier; localStorage is the instant offline cache. See [ARCHITECTURE.md](ARCHITECTURE.md) for the complete design and current demo/production boundaries.

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 19.2, React DOM 19.2 | Component UI and stateful operator console |
| Routing | React Router DOM 7.18 | Landing, marketplace, registry, playground, analytics, and developer routes |
| Build | Vite 8, TypeScript 6 strict mode | Fast development, typed production builds, static deployment |
| Styling | Vanilla CSS, CSS variables | Responsive dark/light interface without a runtime CSS framework |
| Client persistence | localStorage + React hooks | Offline cache, ledger reconciliation, wallet funding, UI preferences, demo identity |
| Backend | FastAPI 0.115, Uvicorn 0.32 | Async HTTP, WebSocket, OpenAPI, CORS, and service orchestration |
| Validation/ORM | Pydantic 2.10, SQLModel 0.0.22 | Typed request/response models and database entities |
| Database | SQLite | Ledger, API-key metadata, webhooks, automations, run history, and wallet funding |
| Realtime | Native WebSocket client, FastAPI WebSocket, `websockets` 13 | Live x402 step streaming with local fallback pacing |
| Blockchain | Algorand Testnet, `py-algorand-sdk` 2.7, Algonode, Lora | Payment construction/verification boundary, finality, balances, and explorer proof |
| Commerce protocol | HTTP 402 / x402 | Machine-readable price challenge and proof-gated service execution |
| Agent execution | Deterministic executors, OpenAI REST, Gemini REST | Paid task output with resilient fallback behavior |
| Live data | Wikipedia, CoinGecko, Pollinations, QRServer, wttr.in | Research, market, image, QR-code, and weather scenarios |
| Networking | HTTPX 0.27, browser Fetch API | Backend LLM calls and frontend API integrations |
| Deployment | Vercel, Render Blueprint | Static frontend plus Python API/WebSocket services |

## Quick Start

Prerequisites: Node.js 20+ and npm.

```bash
git clone https://github.com/MYashwanthManoj/AgentHub.git
cd AgentHub
npm install && npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The frontend remains demonstrable if the backend is offline, using seeded agents, localStorage, and deterministic fallbacks.

## Backend Setup

Prerequisites: Python 3.11+.

```bash
python -m venv .venv
```

Activate the virtual environment:

```powershell
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
```

```bash
# macOS/Linux
source .venv/bin/activate
```

Install dependencies, copy the environment template, and start FastAPI from the repository root:

```bash
pip install -r backend/requirements.txt
cp .env.example .env
python -m uvicorn backend.main:app --reload --port 8000
```

On Windows, use `Copy-Item .env.example .env` instead of `cp`. Then open [http://localhost:8000/docs](http://localhost:8000/docs) for Swagger UI or [http://localhost:8000/redoc](http://localhost:8000/redoc) for ReDoc. On first start, the backend creates SQLite tables and seeds demo records when their tables are empty.

## Environment Variables

Copy `.env.example` to `.env`. Never commit a real wallet mnemonic or provider key.

| Variable | Example value | Required | What it controls / where to get it |
|---|---|---:|---|
| `VITE_API_URL` | `http://localhost:8000` | Frontend deploy | FastAPI base URL compiled into the Vite frontend; set to the Render API URL in production. |
| `FRONTEND_URL` | `http://localhost:5173` | Yes | Primary CORS origin; use the deployed Vercel/Render frontend URL in production. |
| `DATABASE_URL` | `sqlite:///./backend/database.db` | No | SQLModel connection string; replace with a managed database URL for horizontal scaling. |
| `ALGOD_URL` | `https://testnet-api.algonode.cloud` | Yes | Algorand node endpoint; public Testnet access is available from [Algonode](https://algonode.io/). |
| `ALGOD_TOKEN` | empty | Provider-specific | API token required by some Algod providers; Algonode's public endpoint accepts an empty token. |
| `INDEXER_URL` | `https://testnet-idx.algonode.cloud` | Recommended | Algorand Indexer endpoint for transaction/account lookup. |
| `INDEXER_TOKEN` | empty | Provider-specific | Indexer token if the selected provider requires one. |
| `SELLER_ADDRESS` | Testnet address in template | Yes for live settlement | Receiving Algorand Testnet account; create one with Pera Wallet/Defly or the Algorand SDK and fund it from a Testnet dispenser. |
| `SELLER_MNEMONIC` | `replace_with_25_word_testnet_mnemonic` | Only for signed demo TXs | Private 25-word mnemonic for a Testnet-only service wallet. Store it only in secret management. |
| `LLM_PROVIDER` | `auto` | No | Summarizer provider selection: `auto`, `openai`, or `gemini`. |
| `OPENAI_API_KEY` | empty | No | Optional OpenAI key for live summaries; create one in the OpenAI developer platform. |
| `OPENAI_MODEL` | `gpt-4o-mini` | No | OpenAI model used by the summarizer. |
| `GEMINI_API_KEY` | empty | No | Optional Google AI Studio key for Gemini summaries. |
| `GOOGLE_API_KEY` | empty | No | Alias accepted when `GEMINI_API_KEY` is not set. |
| `GEMINI_MODEL` | `gemini-1.5-flash` | No | Gemini model used by the summarizer. |

## API Endpoints

Default local base URL: `http://localhost:8000`. FastAPI may redirect slashless collection URLs to the canonical trailing-slash form.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Service, version, and Algorand-network health probe |
| `GET` | `/docs` | Interactive Swagger UI generated from OpenAPI |
| `GET` | `/redoc` | ReDoc API reference |
| `GET` | `/openapi.json` | Machine-readable OpenAPI schema |
| `GET` | `/registry/` | List registered seller agents |
| `GET` | `/registry/{agent_id}` | Get one seller agent or return `404` |
| `POST` | `/agent/{agent_id}/call` | Start a paid call and return the expected HTTP `402` x402 challenge |
| `POST` | `/agent/{agent_id}/execute` | Execute a task after payment proof is supplied |
| `POST` | `/payment/verify` | Verify a transaction ID and return settlement metadata |
| `GET` | `/payment/status/{tx_id}` | Query verification status for a transaction ID |
| `GET` | `/ledger/` | List transactions newest first |
| `POST` | `/ledger/` | Persist a confirmed transaction |
| `DELETE` | `/ledger/` | Clear the demo ledger |
| `GET` | `/ledger/stats` | Aggregate transaction count, spend, latest hash, and round |
| `GET` | `/api-keys/` | List API-key metadata; raw secrets are never returned |
| `POST` | `/api-keys/` | Create or back-fill API-key metadata |
| `POST` | `/api-keys/{key_id}/revoke` | Revoke an API key |
| `DELETE` | `/api-keys/{key_id}` | Permanently delete API-key metadata |
| `GET` | `/webhooks/endpoints` | List webhook endpoints |
| `POST` | `/webhooks/endpoints` | Create or back-fill a webhook endpoint |
| `PATCH` | `/webhooks/endpoints/{endpoint_id}` | Enable or disable a webhook endpoint |
| `DELETE` | `/webhooks/endpoints/{endpoint_id}` | Delete a webhook endpoint |
| `GET` | `/webhooks/deliveries` | List webhook delivery history |
| `POST` | `/webhooks/deliveries` | Record a test or real delivery |
| `PATCH` | `/webhooks/deliveries/{delivery_id}` | Update delivery status/response code |
| `DELETE` | `/webhooks/deliveries/{delivery_id}` | Delete a delivery record |
| `GET` | `/automations/` | List multi-agent workflows |
| `POST` | `/automations/` | Create or back-fill a workflow |
| `PATCH` | `/automations/{automation_id}` | Update workflow state, schedule labels, or run count |
| `DELETE` | `/automations/{automation_id}` | Delete a workflow |
| `GET` | `/automations/runs` | List workflow execution history |
| `POST` | `/automations/runs` | Create an automation run |
| `PATCH` | `/automations/runs/{run_id}` | Update run status or duration |
| `DELETE` | `/automations/runs/{run_id}` | Delete a run record |
| `GET` | `/wallet/settings` | Get the persisted funded-balance setting |
| `POST` | `/wallet/settings` | Update the funded-balance setting |
| `GET` | `/wallet/funding` | List wallet top-ups |
| `POST` | `/wallet/funding` | Create or back-fill a top-up |
| `PATCH` | `/wallet/funding/{funding_id}` | Confirm or edit a funding entry |
| `DELETE` | `/wallet/funding/{funding_id}` | Delete a funding entry |
| `WS` | `/ws/flow/{session_id}` | Stream live x402 timeline events and a completion event |

## How x402 Works

1. **`REGISTRY_SEARCH` — Search the registry.** The buyer converts the natural-language task into capability keywords and searches available sellers.
2. **`SELLER_FOUND` — Select a seller.** AgentHub ranks matches by keyword relevance and reputation, then resolves the seller's price and endpoint.
3. **`CALL_ENDPOINT` — Request the resource.** The buyer sends the task and buyer address to `POST /agent/{agent_id}/call`.
4. **`HTTP_402` — Receive the payment challenge.** The seller returns `402 Payment Required` with amount, receiving address, network, note, and a unique session ID.
5. **`CONSTRUCT_TX` — Build the Algorand payment.** The buyer creates a transaction for the quoted micro-ALGO amount and binds the x402 session in the note.
6. **`SIGN_TX` — Authorize payment.** The buyer wallet signs the transaction; private key material stays inside the wallet/signing boundary.
7. **`BROADCAST_TX` — Submit to Testnet.** The signed transaction is sent to an Algorand node and a transaction ID becomes available.
8. **`WAIT_CONFIRM` — Wait for finality.** The client waits for a confirmed round rather than trusting broadcast acceptance alone.
9. **`PAYMENT_SETTLED` — Capture the receipt.** AgentHub records the transaction hash, round, confirmation time, finality status, and explorer URL.
10. **`VERIFY_ONCHAIN` — Verify independently.** The x402 verifier checks the transaction through Algod and returns authoritative settlement metadata when available.
11. **`RETRY_REQUEST` — Retry with proof.** The buyer reissues the paid request with the session and transaction proof.
12. **`SELLER_VALIDATES` — Enforce the quote.** The seller validates recipient, amount, session/nonce, confirmation, and replay policy before running work.
13. **`HTTP_200` — Grant access.** A valid payment changes the protocol outcome from `402` to `200 OK`.
14. **`TASK_EXECUTING` — Deliver the paid result.** The selected agent runs the task, returns text/chart/JSON/image output, and the receipt is written to the ledger.

## Agent Registry

| Agent | ID | Category | Price | x402 challenge endpoint |
|---|---|---|---:|---|
| Summarizer Agent | `agent-summarizer-01` | `summarizer` | 0.05 ALGO | `POST /agent/agent-summarizer-01/call` |
| Chart Agent | `agent-chart-01` | `chart` | 0.08 ALGO | `POST /agent/agent-chart-01/call` |
| Lookup Agent | `agent-lookup-01` | `lookup` | 0.03 ALGO | `POST /agent/agent-lookup-01/call` |
| Code Auditor Agent | `agent-code-auditor-01` | `auditor` | 0.12 ALGO | `POST /agent/agent-code-auditor-01/call` |
| Sentiment Analyzer Agent | `agent-sentiment-01` | `analytics` | 0.04 ALGO | `POST /agent/agent-sentiment-01/call` |
| Data Extractor Agent | `agent-extractor-01` | `extractor` | 0.06 ALGO | `POST /agent/agent-extractor-01/call` |
| Security Sentinel Agent | `agent-security-01` | `security` | 0.15 ALGO | `POST /agent/agent-security-01/call` |
| Language Translator Agent | `agent-translator-01` | `translator` | 0.05 ALGO | `POST /agent/agent-translator-01/call` |
| Image Generator Agent | `agent-image-01` | `image` | 0.10 ALGO | `POST /agent/agent-image-01/call` |
| Research Orchestrator Agent | `agent-researcher-01` | `researcher` | 0.12 ALGO | `POST /agent/agent-researcher-01/call` |
| Market Intelligence Agent | `agent-market-01` | `market` | 0.09 ALGO | `POST /agent/agent-market-01/call` |

The FastAPI registry contains all 11 stable services above, and the frontend normalizes them into the same searchable `SellerAgent` shape. Two additional experimental frontend utilities (QR and weather) are not yet part of the backend registry. A production release should make the ARC-72 contract/indexer the single source of truth for stable and experimental listings alike. Detailed capabilities and sample outputs for the requested 11-agent registry are in [AGENTS.md](AGENTS.md).

## Deployment

### Vercel frontend + Render backend

1. Push the repository to GitHub.
2. In Render, create a Web Service with:
   - **Build command:** `pip install -r backend/requirements.txt`
   - **Start command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - **Health check:** `/health`
   - Environment variables from `.env.example`, with `FRONTEND_URL` set to the final Vercel URL.
3. Store `SELLER_MNEMONIC` and LLM keys as Render secrets. Never place them in `render.yaml` or Vercel client variables.
4. In Vercel, import the same repository and use:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
   - **Environment variable:** `VITE_API_URL=https://<your-render-service>.onrender.com`
5. Redeploy the Render backend after the Vercel domain is known so CORS receives the correct `FRONTEND_URL`.
6. Verify `/health`, `/docs`, the WebSocket timeline, and a complete x402 call from the deployed frontend.

`vercel.json` already provides the SPA rewrite required by React Router. For production durability, attach persistent storage or move `DATABASE_URL` to managed Postgres; Render's default filesystem should not be treated as durable application storage.

### One-click Render Blueprint

The included `render.yaml` can deploy both `agenthub-api` and the `agenthub-ui` static site. In the Render dashboard, choose **New → Blueprint**, select the repository, review the two services, provide secret variables, and deploy. The frontend is configured to call `https://agenthub-api.onrender.com`, while the backend allows the Render frontend origin.

## License

AgentHub is released under the **MIT License**. You may use, modify, and distribute it with attribution and the standard MIT warranty disclaimer.

Built by [@MYashwanthManoj](https://github.com/MYashwanthManoj) for BlockHack 2026.
