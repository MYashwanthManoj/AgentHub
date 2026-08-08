# AgentHub Architecture

AgentHub is a reference architecture for autonomous AI service commerce. A buyer agent discovers a seller, requests a paid capability, receives an HTTP `402 Payment Required` challenge, settles an Algorand payment, proves settlement, and receives the result. The product wraps that protocol loop in a marketplace, live execution console, persistent ledger, wallet, analytics, automations, and developer tooling.

This document distinguishes the behavior implemented in the hackathon build from the controls required for a production network.

## System Overview

```text
┌──────────────────────────────────── Browser / React 19 ─────────────────────────────────────┐
│                                                                                              │
│  Landing / Dashboard / Registry / Marketplace / Playground / Ledger / Wallet / Analytics     │
│                  │                     │                         │                            │
│                  ▼                     ▼                         ▼                            │
│         ┌────────────────┐    ┌──────────────────┐     ┌────────────────────┐                │
│         │ Registry cache │    │ Task router      │     │ x402 payment flow  │                │
│         │ search + rank  │───►│ seller selection │────►│ session + timeline │                │
│         └───────┬────────┘    └──────────────────┘     └───────┬────────────┘                │
│                 │                                              │ HTTP / WebSocket             │
│                 │              ┌───────────────────────────────┘                            │
│                 ▼              ▼                                                            │
│         ┌────────────────────────────────────────────────────────────┐                       │
│         │ localStorage: instant cache, offline state, reconciliation │                       │
│         └────────────────────────────────────────────────────────────┘                       │
└───────────────────────────────────────┬──────────────────────────────────────────────────────┘
                                        │
                     REST / JSON        │        WS /ws/flow/{session_id}
                                        ▼
┌──────────────────────────────────── FastAPI / Uvicorn ───────────────────────────────────────┐
│                                                                                              │
│  /registry  /agent  /payment  /ledger  /api-keys  /webhooks  /automations  /wallet  /health  │
│       │         │        │        │          │           │           │          │             │
│       │         │        │        └──────────┴───────────┴───────────┴──────────┘             │
│       │         │        │                             │                                      │
│       │         │        │                      ┌──────▼──────┐                               │
│       │         │        │                      │ SQLModel +  │                               │
│       │         │        │                      │ SQLite      │                               │
│       │         │        │                      └─────────────┘                               │
│       │         │        │                                                                   │
│       │         │        └──────────────► Algorand verification service                      │
│       │         └───────────────────────► Task executor / optional LLM provider              │
│       └─────────────────────────────────► Seeded registry adapter                             │
└───────────────────────────────────────────┬───────────────────────┬───────────────────────────┘
                                            │                       │
                              Algod / Indexer│                       │HTTPS
                                            ▼                       ▼
                             ┌────────────────────────┐   ┌─────────────────────────┐
                             │ Algorand Testnet       │   │ Wikipedia / CoinGecko   │
                             │ payment + finality     │   │ Pollinations / LLM APIs │
                             └────────────────────────┘   └─────────────────────────┘
```

### Component responsibilities

| Component | Responsibility |
|---|---|
| React application | Marketplace UX, task entry, routing feedback, payment animation, results, ledger/analytics views, and operator tooling |
| Registry service | Loads the static catalog immediately, optionally hydrates from FastAPI, searches services, and ranks sellers |
| Agent router | Maps natural-language tokens to service keywords and reports high/medium/low confidence |
| Payment engine | Implements the client-facing x402 state machine and coordinates challenge, wallet, settlement, verification, retry, execution, and fallback behavior |
| FastAPI application | Exposes typed APIs, CORS, OpenAPI, WebSocket step streaming, persistence, and task-execution adapters |
| Algorand service | Connects to Algod, checks balances/transactions, waits for confirmation when signing a real demo transaction, and returns explorer receipts |
| SQLModel/SQLite | Persists application records that do not belong on a public ledger |
| localStorage | Provides instant page-load state and offline continuity, then reconciles with the backend when reachable |
| External providers | Supply optional LLM summaries, knowledge, market prices, and image generation |

## x402 Protocol Flow

The WebSocket flow and the client payment state machine share the following 14 semantic steps. The WebSocket is presentation telemetry; the client payment pipeline remains responsible for the task result and ledger entry.

1. **`REGISTRY_SEARCH` — Buyer searches for a capability.** The task is tokenized and compared with agent names, descriptions, categories, and keywords. Registry data is available immediately from the client seed and may later be replaced by API hydration.
2. **`SELLER_FOUND` — Buyer resolves the seller.** The highest-scoring result is selected. Reputation acts as a tie-breaker, while the UI displays matched keywords, confidence, price, and endpoint.
3. **`CALL_ENDPOINT` — Buyer requests the paid resource.** The client sends `{ task, buyer_address }` to `POST /agent/{agent_id}/call`.
4. **`HTTP_402` — Seller issues a quote.** FastAPI creates a UUID session and returns HTTP `402` with `amount_algo`, `receiver`, `note`, `session_id`, and `network`. A 402 is the successful outcome of this phase, not an application error.
5. **`CONSTRUCT_TX` — Wallet builds a payment transaction.** The amount is converted to micro-ALGO, the seller address becomes the receiver, and the x402 session is bound into a transaction note/nonce.
6. **`SIGN_TX` — Buyer authorizes the transaction.** Signing belongs inside a wallet or custodial signer boundary. The hackathon client simulates this wallet step so no buyer private key is placed in the browser bundle.
7. **`BROADCAST_TX` — Signed bytes are submitted.** A production client sends the signed transaction to Algod. The demo produces the transaction identifier expected by downstream state and can use backend verification/fallback behavior.
8. **`WAIT_CONFIRM` — Buyer waits for a confirmed round.** Broadcast acceptance is not settlement. The payment must reach deterministic finality before a seller treats it as paid.
9. **`PAYMENT_SETTLED` — Receipt is assembled.** The receipt carries the transaction hash, round, confirmation latency, finality status, and explorer URL.
10. **`VERIFY_ONCHAIN` — Verifier checks Algorand.** `POST /payment/verify` asks the Algorand service for pending/confirmed transaction data. The demo deliberately falls back to a deterministic successful receipt when a transaction cannot be resolved, keeping judging flows resilient.
11. **`RETRY_REQUEST` — Buyer retries the original operation.** The client replays the paid request with its session and transaction proof. In a production wire format, proof should travel in a standardized x402 header or signed request envelope.
12. **`SELLER_VALIDATES` — Seller enforces payment conditions.** A production seller checks session ownership, recipient, exact/minimum amount, network, confirmation round, expiration, and whether the proof has already been consumed.
13. **`HTTP_200` — Seller grants access.** A valid, unused receipt changes the response from `402 Payment Required` to `200 OK`.
14. **`TASK_EXECUTING` — Service runs and returns output.** The executor returns text, chart data, JSON, or an image URL. The client writes a transaction record and updates wallet, analytics, and agent-usage views.

### State sequence

```text
DISCOVERED
    │ POST /call
    ▼
PAYMENT_REQUIRED (402)
    │ construct → sign → broadcast
    ▼
PAYMENT_PENDING
    │ confirmed round
    ▼
PAYMENT_SETTLED
    │ verify + consume proof
    ▼
AUTHORIZED (200)
    │ execute
    ▼
RESULT_DELIVERED → LEDGER_RECORDED
```

## Three-Tier Data Architecture

AgentHub intentionally separates public payment truth, private application records, and fast client state.

### Tier 1: Algorand — settlement truth

Algorand is the canonical tier for value transfer and payment proof.

| Data | Why it belongs on Algorand |
|---|---|
| Sender and receiver | Establishes who paid whom |
| Amount in micro-ALGO | Proves the quote was satisfied |
| Transaction ID | Stable receipt identifier |
| Confirmed round | Establishes finality and ordering |
| Transaction note/session binding | Associates a payment with an x402 purchase |
| Application/registry state | Provides public identity and service metadata when the registry adapter is on-chain |

The backend uses `py-algorand-sdk` against an Algod endpoint. Public explorer links point to Lora Testnet. A production verifier should also query an Indexer for historical transactions, validate asset/payment type, inspect inner transactions when applicable, and require a configured confirmation depth/finality policy.

### Tier 2: SQLite — application system of record

SQLite stores data that benefits from relational querying or should not be placed on a public blockchain:

- ledger entries and task/result metadata;
- API-key names, masked prefixes, environment, and revocation status;
- webhook endpoint configuration and delivery history;
- automation definitions and execution history;
- wallet top-up history and the funded-balance setting.

SQLModel provides a typed boundary shared conceptually with frontend TypeScript models. Startup creates missing tables and seeds only empty tables. `DATABASE_URL` allows the same model layer to move to Postgres for multi-instance deployment.

### Tier 3: localStorage — instant cache and offline continuity

The React client reads localStorage synchronously so pages render without waiting for a backend cold start. It then fetches server state, merges/deduplicates records, and back-fills locally created records when possible.

| Key | Cached state |
|---|---|
| `blockhack_ledger_v1` | Transaction ledger |
| `blockhack_wallet_funding_v1` | Wallet top-ups |
| `blockhack_wallet_settings_v1` | Funded-balance setting |
| `blockhack_automations_v1` | Workflow definitions |
| `blockhack_automation_runs_v1` | Workflow run history |
| `blockhack_api_keys_v1` | API-key metadata |
| `blockhack_webhook_endpoints_v1` | Webhook endpoints |
| `blockhack_webhook_deliveries_v1` | Delivery history |
| `agenthub_auth_user` | Demo identity session |
| `agenthub-theme` | Light/dark preference |
| `agenthub_banner_dismissed` | Demo banner preference |

localStorage is a cache, not a trust boundary. Production authorization, balances, secret state, payment consumption, and canonical ledger status must be enforced server-side or on-chain.

### Reconciliation model

```text
Page load
   │
   ├─ read localStorage immediately ──► render cached state
   │
   └─ fetch FastAPI collection
          │
          ├─ success: normalize → merge/dedupe → write localStorage
          │                         └─ back-fill local-only records
          │
          └─ failure: keep local cache and continue offline
```

The current merge strategy favors demo continuity. Production should add server versions, `updated_at` timestamps, idempotency keys, tombstones for deletes, and explicit conflict rules.

## AI-to-AI Commerce Model

Traditional SaaS assumes a human buys a subscription and distributes credentials. AgentHub treats every capability as a priced resource that another agent can purchase at runtime.

```text
User goal
   │
   ▼
Buyer / Orchestrator Agent
   │ budget + task
   ├── x402 payment ──► Research Agent ── x402 sub-payment ──► Summarizer Agent
   │
   └── x402 payment ──► Market Agent
                          ├─ x402 sub-payment ──► Chart Agent
                          └─ x402 sub-payment ──► Sentiment Agent
```

### Economic contract

Each purchase contains:

- a seller identity and capability;
- a deterministic price or maximum spend;
- a task payload and response schema;
- an x402 session/nonce;
- an Algorand receipt;
- an execution result and service-level metadata.

The buyer can therefore optimize for capability, reputation, price, latency, remaining budget, and prior success rate without a human approving every call.

### Demonstrated scenarios

- **Explicit multi-hop workflow:** Summarizer (`0.05`) → Chart (`0.08`) → Lookup (`0.03`) creates three independent flow executions and a total of `0.16 ALGO`.
- **Research Orchestrator:** fetches Wikipedia content and returns an orchestration trace that includes a Summarizer purchase (`0.12 + 0.05 = 0.17 ALGO`).
- **Market Intelligence:** fetches CoinGecko prices and returns a trace for Chart and Sentiment purchases (`0.09 + 0.08 + 0.04 = 0.21 ALGO`).

The explicit multi-hop path exercises separate payment flows. The research and market scenarios currently combine live public data with a visible orchestration trace; a production build should execute every reported child hire as a nested x402 purchase with its own on-chain receipt.

### Production controls for autonomous spend

- Per-task, per-agent, daily, and workspace budget ceilings.
- Allow/deny lists for sellers, networks, and capabilities.
- Quote expiration and maximum price slippage.
- Idempotency keys so retries cannot create duplicate payments.
- A custodial signer, smart-account policy, or user wallet session with scoped authority.
- Result-schema validation before a parent agent pays for downstream work.
- Circuit breakers based on failure rate, latency, or reputation changes.

## ARC-72 Registry Design

AgentHub uses **ARC-72 registry** as project shorthand for an Algorand application-backed agent identity and service registry. The UI displays Testnet App ID `358912044`. The service-record schema is application-specific; formal ARC compatibility and naming should be reviewed before a production standards claim.

### Current adapter

- The frontend ships a complete static catalog of 11 services for immediate/offline discovery.
- FastAPI exposes a seeded in-memory registry containing the eight core local service types.
- Frontend hydration replaces its cache only when the API returns a non-empty list.
- Search and routing consume the same normalized `SellerAgent` shape regardless of source.

This adapter preserves the demo, but two seeds can drift. The contract/indexer should become the single source of truth.

### Proposed on-chain record

Store each agent in an Algorand box keyed by `sha256(agent_id)` or a compact numeric registry ID:

| Field | Type | Purpose |
|---|---|---|
| `agent_id` | bytes/string | Stable global identifier |
| `owner` | Algorand address | Account authorized to update the record |
| `name` | string | Human-readable service name |
| `category` | string/enum | Routing category |
| `endpoint_uri` | string | HTTPS service endpoint or metadata URI |
| `metadata_hash` | bytes32 | Integrity hash for extended capability metadata |
| `price_microalgo` | uint64 | Base x402 price |
| `reputation_bps` | uint64 | Aggregated reputation in basis points |
| `enabled` | bool | Discovery/execution eligibility |
| `version` | uint64 | Optimistic concurrency/versioning |
| `updated_round` | uint64 | Audit and cache invalidation marker |

Large descriptions, schemas, tags, and SLA documents should live in content-addressed storage or HTTPS metadata, with only a hash/URI on-chain.

### Registry operations

```text
register(agent_record)   owner signature + minimum balance for box storage
update(agent_id, patch)  current owner only; increment version
set_price(agent_id)      current owner or delegated pricing key
deactivate(agent_id)     current owner or governance emergency role
transfer(agent_id)       current owner → new Algorand address
attest(agent_id, score)  authorized reputation oracle / dispute system
```

### Discovery path

1. Indexer ingests registry application calls and box state.
2. A registry API normalizes records into the frontend `SellerAgent` model.
3. The client filters disabled or unverified services.
4. The router scores capabilities, reputation, price, and latency.
5. The selected seller's current `price_microalgo`, owner, and metadata hash are bound into the x402 quote.
6. At execution time, the seller or verifier rechecks the registry version to prevent stale endpoint/price attacks.

## WebSocket Live Streaming Architecture

The live timeline is intentionally separated from the transaction pipeline.

```text
React useTransactionFlow                  FastAPI websocket router
          │                                         │
          ├─ open ws://.../ws/flow/{session_id} ──►│ accept + register connection
          ├─ { "type": "start", "tx_hash": "" } ─►│
          │                                         ├─ active(REGISTRY_SEARCH)
          │◄────────────────────────────────────────┤
          │◄────────────────────────────────────────┤ done(previous) + active(next)
          │                 ... 14 steps ...         │
          │◄────────────────────────────────────────┤ { type: "flow_complete" }
          │                                         │
          └─ client HTTP payment pipeline runs in parallel and owns result/ledger
```

### Wire messages

```json
{
  "type": "step_update",
  "step_id": "HTTP_402",
  "status": "active",
  "label": "HTTP 402 Payment Required",
  "timestamp": "2026-08-08T07:00:00Z"
}
```

```json
{
  "type": "flow_complete",
  "tx_hash": "...",
  "timestamp": "2026-08-08T07:00:06Z"
}
```

### Failure behavior

- The browser derives `ws://` or `wss://` from `VITE_API_URL`.
- A socket that does not open within 2.5 seconds fails fast.
- The server expects a `start` message within 10 seconds.
- Malformed frames are ignored by the client.
- When the backend is known offline or the socket fails, the transaction hook uses local pacing so the user is not blocked.

### Production evolution

The current server holds connections in one process and generates timed events. Production events should be emitted by the actual payment workflow, persisted with sequence numbers, and distributed through Redis Streams, NATS, Kafka, or a managed pub/sub layer. Clients should resume from `last_event_id`, authenticate the socket, and reject events for sessions they do not own.

## Security Model

### Trust boundaries

```text
Untrusted browser/task input
        │
        ▼
FastAPI validation + authorization boundary
        │
        ├─ database boundary
        ├─ wallet/signer boundary
        ├─ Algorand verification boundary
        └─ third-party provider boundary
```

### Controls and current status

| Risk | Required control | Hackathon implementation |
|---|---|---|
| Mnemonic/private-key exposure | Keep keys server-side or in a wallet; use managed secrets and scoped signers | `SELLER_MNEMONIC` is read only by the backend; the frontend wallet step is simulated |
| Forged payment proof | Verify receiver, amount, transaction type, confirmed round, session note, and network through Algod/Indexer | Algod lookup exists, but unresolved IDs intentionally fall back to a mock receipt |
| Replay/double execution | Atomically mark a session/transaction consumed and reject reuse | UUID sessions exist in process memory; durable proof consumption is not yet enforced |
| Unauthorized execution | Require a verified, unexpired session before `/execute` | Execution accepts a supplied transaction hash; production authorization middleware is still required |
| API-key leakage | Generate raw secret once, store only a salted hash/prefix, support revoke/rotation | Raw demo secret is client-generated and only metadata/prefix is persisted; API routes do not yet enforce it |
| OAuth impersonation | Server-side OAuth code exchange, state/PKCE, signed session cookie | GitHub onboarding is a local demo session, not a live OAuth exchange |
| Cross-origin abuse | Exact CORS allowlist, HTTPS, CSRF protection where cookies are used | Local origins, configured `FRONTEND_URL`, and `*.onrender.com` are allowed |
| Malicious tasks/results | Length limits, schema validation, content sanitization, provider allowlists | Pydantic validates API bodies; stronger task limits and output policy are needed |
| localStorage theft/tampering | Never trust client cache for authorization or balances; deploy CSP/XSS defenses | localStorage is used only as demo/cache state, but UI values can be edited by the user |
| Denial of service | Authenticated quotas, rate limits, queue limits, timeouts, circuit breakers | Frontend fetch timeouts/fallbacks exist; server-side rate limiting is not implemented |
| WebSocket hijacking | Authenticate session ownership, origin-check, expire sessions | Socket session IDs are unguessable UUID-style values but are not authenticated |
| Third-party compromise | Egress allowlist, timeouts, response-size caps, provenance | Known providers and timeouts/fallbacks are used; centralized egress policy is future work |

### Production payment-verification checklist

Before returning HTTP 200, a seller should require all of the following:

1. Transaction exists on the configured Algorand network.
2. Transaction is confirmed and not in a failed pool state.
3. Payment receiver equals the seller/escrow address in the quote.
4. Amount is at least the quoted micro-ALGO amount.
5. Note or lease binds the transaction to the exact session and resource.
6. Quote is not expired and registry version/price has not changed unexpectedly.
7. Transaction ID and session have not already been consumed.
8. Buyer identity satisfies any seller policy.
9. Verification and consumption occur atomically.
10. The audit record is written before execution begins.

## Scalability Considerations

| Area | Current build | Scale path |
|---|---|---|
| API instances | One FastAPI process is sufficient | Run multiple stateless instances behind a load balancer |
| x402 sessions | In-memory dictionary | Redis with TTL, atomic consume, idempotency keys, and encrypted session payloads |
| Database | SQLite file | Managed Postgres with migrations, indexes, pooling, read replicas, and retention policies |
| Registry | Static frontend seed + in-memory API seed | ARC application + Indexer-backed registry service and cache invalidation by round |
| WebSockets | Per-process connection map and timed events | Shared pub/sub, authenticated resumable streams, sticky sessions only if required |
| Task execution | Inline request handling | Durable queue/workers, per-agent concurrency, deadlines, cancellation, and result storage |
| Algorand reads | Direct Algod request | Provider failover, Indexer for history, cache by transaction ID, bounded retry/backoff |
| External APIs | Browser/backend direct calls | Server-side adapters, quotas, caching, egress controls, provider health/circuit breakers |
| Analytics | Computed from client ledger | Server-side aggregates, event warehouse, materialized views, and streaming metrics |
| Offline reconciliation | Merge/dedupe by client identifiers | Version vectors or updated timestamps, tombstones, conflict policy, sync cursor |
| Observability | Console diagnostics and health endpoint | Structured logs, traces, metrics, payment/session correlation IDs, SLOs, alerting |
| Multi-agent spend | Fixed demo workflows | Policy engine, delegated wallets, escrow, per-hop budgets, quote auctions, and settlement batching |

### Throughput notes

- Algorand finality is fast enough for interactive purchases, but a workflow with many strictly sequential hops multiplies end-to-end latency. Independent branches should execute and settle in parallel when policy permits.
- Very small purchases may benefit from prepaid channels, escrow balances, net settlement, or batched reconciliation while preserving per-call signed receipts.
- Seller execution should be decoupled from public API workers so long LLM or data tasks cannot exhaust HTTP capacity.
- Registry reads are cache-friendly. Prices and ownership require round-aware invalidation; descriptions and schemas can use long-lived content hashes.
- Every write endpoint should accept an idempotency key before automatic agents are allowed to retry aggressively.

## Deployment Topology

```text
Vercel / Render Static Site
          │ VITE_API_URL
          ▼
Render FastAPI Web Service ─────► Managed Postgres (recommended)
          │      │
          │      ├──────────────► Redis / queue / pub-sub (scale phase)
          │      ├──────────────► Algonode Algod + Indexer
          │      └──────────────► LLM and live-data providers
          │
          └─ HTTPS + WSS to browser
```

The repository's `render.yaml` deploys a FastAPI web service and a static frontend. `vercel.json` supplies the React Router SPA rewrite for a Vercel frontend. Because Render service filesystems are not a durable database strategy, production deployments should point `DATABASE_URL` at managed Postgres or attach an explicitly persistent disk.
