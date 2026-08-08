# API Reference — Services

Every exported function in the service layer, with signature, description,
and Phase 2 notes. Types are defined in `src/types/index.ts`.

## `src/services/paymentEngine.ts` — x402 payment lifecycle (mock)

### `requestPayment(seller: SellerAgent): Promise<PaymentRequired>`
Simulates the first call to the seller endpoint; returns the HTTP `402
Payment Required` challenge body (`maxAmountRequired` in µALGO, `payToAddress`,
`nonce`, ...). — **Phase 2:** real `fetch` to `seller.endpoint`, expecting 402
and parsing the x402 JSON body (MIGRATION §3.1).

### `constructPayment(payReq: PaymentRequired, fromAddress: string): Promise<SignedPayment>`
Builds the unsigned payment (generated `txId`, `x402:{nonce}` note, amount from
`maxAmountRequired`). — **Phase 2:**
`algosdk.makePaymentTxnWithSuggestedParams(from, payToAddress, maxAmountRequired, noteBytes, suggestedParams)`
(MIGRATION §3.2).

### `signPayment(unsignedPayment: SignedPayment): Promise<SignedPayment>`
Fills `signedTxn` with a base64 signature blob (mock: fake base64). — **Phase
2:** `txn.signTxn(sk)` for a custodial key, or ARC-0300 wallet
`session.signTxns([...])` (MIGRATION §3.3).

### `broadcastTx(signedPayment: SignedPayment): Promise<string>`
Simulates mempool submission; returns the `txId`. — **Phase 2:**
`algod.sendRawTransaction(signedBlob).do()` (MIGRATION §3.4).

### `settlePayment(txId: string): Promise<SettlementReceipt>`
Simulates waiting for block confirmation; returns round number, confirmation
time, `finalityStatus`, AlgoExplorer URL. — **Phase 2:**
`algod.waitForConfirmation(txId, 4).do()` + `pendingTransactionInformation`
(MIGRATION §3.5).

### `verifyPayment(receipt: SettlementReceipt, seller: SellerAgent): Promise<PaymentVerification>`
Simulates the seller verifying payment on-chain (always `verified: true`). —
**Phase 2:** re-call seller with `X-Payment-Receipt: txHash` header; seller
checks via indexer (MIGRATION §3.6).

### `retryRequest(seller: SellerAgent, task: string): Promise<void>`
Simulates re-issuing the original request with payment proof so the seller
grants access. — **Phase 2:** `fetch(seller.endpoint, { headers: {
'X-Payment-Receipt': txId } })`; gains a `receiptTxId` parameter — the only
planned signature change in the migration (MIGRATION §3.6).

### `executeTask(seller: SellerAgent, task: string): Promise<AgentResult>`
Runs the task and returns a realistic mock result — `text` (summarizer),
`chart` (chart data), or `json` (lookup). — **Phase 2:** parse the real `200
OK` response from `retryRequest` into `AgentResult` via a thin adapter
(MIGRATION §3.7).

## `src/services/registryService.ts` — registry search/ranking

### `loadRegistry(): SellerAgent[]`
Returns the full static registry (fresh copy of `SELLER_AGENTS`). — **Phase
2:** becomes an async query to an on-chain registry contract; signatures of
callers adapt.

### `searchRegistry(query: string): SellerAgent[]`
Tokenizes the query and scores agents (keyword ×3, body ×1, reputation/1000
tie-break); returns positive-score sellers sorted best-first; empty query
returns the full registry. — **Phase 2:** unchanged — operates on whatever
`loadRegistry` returns.

### `findBestSeller(task: string): SellerAgent`
Returns the top `searchRegistry` hit, falling back to the highest-reputation
agent on no match. — **Phase 2:** unchanged; fallback makes it safe against a
sparse on-chain registry.

## `src/services/agentRouter.ts` — task routing

### `routeTask(task: string): RoutingResult`
Routes a task to `findBestSeller` and returns
`{ seller, confidence: 'high' | 'medium' | 'low', matchedKeywords: string[] }`
(≥2 keyword matches → high, 1 → medium, 0 → low). Drives the auto-highlight and
routing hint in the UI. — **Phase 2:** unchanged; swap the registry source
beneath it.

### `selectSeller(task: string): SellerAgent`
Convenience wrapper for `routeTask(task).seller`. — **Phase 2:** unchanged.

---

Cross-reference: migration code snippets for every payment-engine function are
in [docs/MIGRATION.md](MIGRATION.md); flow orchestration lives in
`src/hooks/useTransactionFlow.ts`.

---

# FastAPI Backend — HTTP API Reference

The Phase 2 backend (`backend/`, FastAPI + SQLModel + SQLite) mirrors the frontend
service layer 1:1. Frontend wiring is in progress (see COORD.md CRITICAL queue).

**Start:**

```bash
uvicorn backend.main:app --reload --port 8000
```

Interactive docs: http://localhost:8000/docs · ReDoc: http://localhost:8000/redoc
CORS allows `http://localhost:5173` (env `FRONTEND_URL`).

### Demo seed

On startup the app auto-seeds demo data (API keys, webhook endpoints + deliveries,
automations, their run history, the wallet's genesis funding, and a 12-entry
ledger) into any **empty** table, so a fresh clone demos immediately. Run it
manually:

```bash
python -m backend.seed           # seed only empty tables
python -m backend.seed --force   # wipe demo tables + re-seed (clean demo reset)
```

Existing rows are never overwritten unless `--force` is used. The seed rows
mirror the frontend seed constants (same ids) so the id-based reconcile
back-fills and de-dupes cleanly.

### `GET /health` — health check
Frontend uses this to detect backend availability (drives the offline banner).

```bash
curl http://localhost:8000/health
```

```json
{ "status": "ok", "service": "AgentHub API", "version": "1.0.0", "network": "algorand-testnet" }
```

## Registry

### `GET /registry` — list seller agents

```bash
curl http://localhost:8000/registry
```

```json
[
  {
    "id": "agent-summarizer-01",
    "name": "Summarizer Agent",
    "description": "Compresses long documents into concise, accurate summaries. ...",
    "category": "summarizer",
    "priceAlgo": 0.05,
    "reputationScore": 97,
    "endpoint": "https://agents.example.com/summarizer",
    "walletAddress": "SUMM7X3KFAKEADDRESSALGORAND1234567890ABCDEF",
    "tags": ["summarize", "compress", "digest", "tldr", "document", "text", "brief"]
  }
]
```

### `GET /registry/{agent_id}` — single agent

```bash
curl http://localhost:8000/registry/agent-chart-01
# 404 → { "detail": "Agent agent-chart-01 not found" }
```

## Agent call — the x402 flow

### `POST /agent/{agent_id}/call` — request service → **HTTP 402**

Body: `{ "task": string, "buyer_address": string }`. Creates a server-side
session and returns the x402 payment challenge.

```bash
curl -X POST http://localhost:8000/agent/agent-summarizer-01/call \
  -H "Content-Type: application/json" \
  -d '{"task":"summarize the Algorand x402 spec","buyer_address":"ALGO_WALLET_7X3K9P2M4N8Q1R5T6W0Y"}'
```

```json
{
  "status": 402,
  "error": "Payment Required",
  "x402": {
    "amount_algo": 0.05,
    "receiver": "ALGO_WALLET_7X3KFAKEADDRESSFORDEMOPURPOSES123456",
    "note": "AgentHub payment | agent=agent-summarizer-01 | session=<uuid>",
    "session_id": "<uuid>",
    "network": "testnet"
  }
}
```

### `POST /payment/verify` — verify on-chain settlement

Body: `{ "tx_id", "session_id", "seller_id", "task" }`. Mock in Phase 1 (always
`verified: true`); real `algosdk.waitForConfirmation` in Phase 2. Returns 402 if
unconfirmed.

```bash
curl -X POST http://localhost:8000/payment/verify \
  -H "Content-Type: application/json" \
  -d '{"tx_id":"ALGO_TX_FAKE123","session_id":"<session-uuid>","seller_id":"agent-summarizer-01","task":"summarize the x402 spec"}'
```

```json
{
  "verified": true,
  "tx_hash": "ALGO_TX_FAKE123",
  "round_number": 4200000,
  "confirmation_time_ms": 1800,
  "block_explorer_url": "https://testnet.algoexplorer.io/tx/ALGO_TX_FAKE123"
}
```

### `GET /payment/status/{tx_id}` — tx status

```bash
curl http://localhost:8000/payment/status/ALGO_TX_FAKE123
```

### `POST /agent/{agent_id}/execute` — run task with receipt → **HTTP 200**

Body: `{ "seller_id", "task", "tx_hash" }`. Verifies the payment, runs the task
(~0.8 s), returns the agent result.

```bash
curl -X POST http://localhost:8000/agent/agent-summarizer-01/execute \
  -H "Content-Type: application/json" \
  -d '{"seller_id":"agent-summarizer-01","task":"summarize the x402 spec","tx_hash":"ALGO_TX_FAKE123"}'
```

```json
{
  "status": 200,
  "agent_id": "agent-summarizer-01",
  "agent_name": "Summarizer Agent",
  "task": "summarize the x402 spec",
  "tx_hash": "ALGO_TX_FAKE123",
  "result": { "result_type": "text", "content": "Summary: ...", "chart_data": null }
}
```

## Ledger

### `GET /ledger` — all transactions (newest first)

```bash
curl http://localhost:8000/ledger
```

```json
[
  {
    "id": "<uuid>",
    "timestamp": "2026-08-08T12:34:56.789Z",
    "buyerId": "ALGO_WALLET_...",
    "buyerName": "Buyer Agent",
    "sellerId": "agent-summarizer-01",
    "sellerName": "Summarizer Agent",
    "priceAlgo": 0.05,
    "status": "confirmed",
    "txHash": "ALGO_TX_FAKE123",
    "confirmationTimeMs": 1800,
    "roundNumber": 4200000,
    "task": "summarize the x402 spec",
    "result": "Summary: ..."
  }
]
```

### `POST /ledger` — save a transaction

```bash
curl -X POST http://localhost:8000/ledger \
  -H "Content-Type: application/json" \
  -d '{"buyer_id":"BUYER_01","buyer_name":"Buyer Agent","seller_id":"agent-summarizer-01","seller_name":"Summarizer Agent","price_algo":0.05,"tx_hash":"ALGO_TX_FAKE123","confirmation_time_ms":1800,"round_number":4200000,"task":"summarize","result":"done"}'
# → { "id": "<uuid>", "status": "saved" }
```

Note: requests use snake_case field names; the JSON responses echo camelCase.

### `DELETE /ledger` — clear all (demo reset)

```bash
curl -X DELETE http://localhost:8000/ledger
# → { "cleared": true }
```

### `GET /ledger/stats` — aggregates for ExplorerStatsBar

```bash
curl http://localhost:8000/ledger/stats
# → { "totalTransactions": 3, "totalSpent": 0.16, "lastTxHash": "ALGO_TX_...", "lastRound": 4200000 }
```

## Automation runs — execution log

### `GET /automations/runs` — execution history (newest first)

Returns every workflow execution across all automations.

```bash
curl http://localhost:8000/automations/runs
```

```json
[
  {
    "id": "run-1",
    "automationId": "wf-1",
    "workflowName": "Research Pipeline",
    "trigger": "schedule",
    "status": "success",
    "costAlgo": 0.16,
    "startedAt": "2026-08-08T02:28:56.123456Z",
    "durationMs": 4200
  }
]
```

### `POST /automations/runs` — record an execution ("Run Now")

Body: `{ "id"?, "automation_id", "workflow_name", "trigger": "manual",
"status": "running", "cost_algo", "started_at"?, "duration_ms"? }` →
`{ "id": "...", "status": "created" }`. The frontend logs a run as
`running` when **Run Now** is clicked, then flips it with the patch below.

### `PATCH /automations/runs/{run_id}` — update an execution

Body: `{ "status": "success", "duration_ms": 4100 }` — flips a manual run
from `running` → `success` once the (simulated) agent chain settles.

### `DELETE /automations/runs/{run_id}` — remove from history

## Wallet funding

### `GET /wallet/settings` — the persisted funded amount

The wallet's funded amount is a **persisted setting** (edited on the Settings
page — not a hardcoded constant). This single-row store is what seeds the
genesis funding entry; `GET` creates the default row (12.5 ALGO) if missing.

```bash
curl http://localhost:8000/wallet/settings
```

```json
{ "fundedAmount": 12.5, "updatedAt": "2026-08-08T03:56:35.383133Z" }
```

### `POST /wallet/settings` — persist a new funded amount

Body: `{ "funded_amount": 20 }` → `{ "fundedAmount": 20, "status": "saved" }`.
The frontend then re-amounts the genesis funding entry so Total Balance
follows the setting everywhere. Local edits back-fill here on mount (an
offline edit is never clobbered); a fresh device with only the factory
default adopts the backend value instead.

### `GET /wallet/funding` — all top-ups (newest first)

The wallet's funding log — the **Top Up** button records a `pending` entry,
flips it to `confirmed` after the simulated on-chain confirmation, and the
funded balance (genesis + confirmed top-ups) drives Total Balance everywhere.

```bash
curl http://localhost:8000/wallet/funding
```

```json
[
  {
    "id": "genesis",
    "amount": 12.5,
    "method": "genesis",
    "status": "confirmed",
    "note": "Initial wallet funding",
    "txHash": "ALGO_TX_7F3A9C2E5D81",
    "createdAt": "2026-07-25T03:44:37.976575Z"
  }
]
```

Methods: `genesis` | `faucet` | `transfer` | `card`. Statuses: `pending` |
`confirmed` (pending entries don't add to the funded balance).

### `POST /wallet/funding` — record a top-up

Body: `{ "id"?, "amount", "method": "faucet", "status": "pending",
"note"?, "tx_hash"?, "created_at"? }` → `{ "id": "...", "status":
"created" }`. Upserts by client id, so the frontend's offline reconcile
back-fills cleanly.

### `PATCH /wallet/funding/{id}` — update a top-up

Body: `{ "status": "confirmed", "tx_hash": "..." }` — flips a pending
entry once the (simulated) broadcast confirms. Accepts `amount` too — used to
re-amount the `genesis` entry when the funded-amount setting changes.

### `DELETE /wallet/funding/{id}` — remove from funding history

## WebSocket — live step streaming

### `WS /ws/flow/{session_id}`

Frontend connects, then sends `{"type":"start","tx_hash":"..."}`; the backend
streams the 14-step x402 timeline with per-step delays.

```bash
# Node one-liner (test):
node -e "const WebSocket=require('ws');const w=new WebSocket('ws://localhost:8000/ws/flow/demo');w.on('open',()=>w.send(JSON.stringify({type:'start'})));w.on('message',m=>console.log(m.toString()));"
```

Step IDs: `REGISTRY_SEARCH` → `SELLER_FOUND` → `CALL_ENDPOINT` → `HTTP_402` →
`CONSTRUCT_TX` → `SIGN_TX` → `BROADCAST_TX` → `WAIT_CONFIRM` → `PAYMENT_SETTLED`
→ `VERIFY_ONCHAIN` → `RETRY_REQUEST` → `SELLER_VALIDATES` → `HTTP_200` →
`TASK_EXECUTING`. Final `flow_complete` event carries the tx hash.

```json
{ "type": "step_update", "step_id": "HTTP_402", "label": "HTTP 402 Payment Required", "status": "active", "timestamp": "..." }
{ "type": "flow_complete", "tx_hash": "ALGO_TX_FAKE123", "timestamp": "..." }
```
