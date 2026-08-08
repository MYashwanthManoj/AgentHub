# AgentHub — 15-Minute Judge Demo Script

This is the complete, click-by-click walkthrough for BlockHack 2026 judges. It is written for the deployed app at [agenthub-ui.onrender.com](https://agenthub-ui.onrender.com), but every step also works locally. The goal is to make the economic loop visible: discover a service, receive `402`, settle a payment, verify proof, execute, and inspect the receipt.

## Pre-Demo Checklist

Complete these checks before a judge sits down. Keep the checklist off-screen.

- **Deployed path:** open the live frontend and confirm the API health endpoint returns `{"status":"ok"}` at `https://agenthub-api.onrender.com/health`.
- **Local backup:** from the repository root, keep two terminals ready:
  - Terminal A: `pip install -r backend/requirements.txt` (once), then `python -m uvicorn backend.main:app --reload --port 8000`.
  - Terminal B: `npm install` (once), then `npm run dev`.
- **Browser:** use a clean tab at the live URL (or `http://localhost:5173`), zoom 90–100%, and keep one tab open for the Algorand Testnet explorer.
- **State:** visit **Transactions → Clear Ledger** if old records would distract from the story. Do not clear the browser while a flow is running.
- **Backend:** if using the live API, confirm `/docs` loads and that `VITE_API_URL` points to the API origin—not the frontend origin.
- **Wallet:** the displayed wallet is Algorand Testnet only. Testnet funds have no real-world value. Never paste a mnemonic into the browser.
- **Fallback expectation:** the frontend is intentionally offline-safe. If the backend, WebSocket, LLM, Wikipedia, CoinGecko, or explorer is unavailable, continue; the deterministic fallback keeps the narrative intact.
- **Demo prompts copied:** keep these strings in a scratchpad for fast entry:
  - `summarize the Algorand x402 payment protocol spec`
  - `chart quarterly transaction volume data`
  - `lookup Algorand Foundation entity details`

## The 15-Minute Script

The italic text describes what the judge should see. The quoted text is the recommended narration. Let the UI animate; do not rush through the payment timeline.

### 0:00–1:00 — Hook: give agents a wallet

**Clicks:** Open the live URL. Stay on the landing page.

*Judge sees: AgentHub branding, “x402 Protocol,” Algorand x402 Track, and the “Launch App Dashboard” button.*

> “Most AI agents can call an API, but they cannot independently buy a capability. AgentHub is the missing commerce layer: a buyer agent discovers a seller, gets an HTTP 402 price challenge, pays in ALGO, proves settlement, and receives the result. This is pay-per-call machine commerce—not a human handing an agent another API key.”

Point at the live demo URL and the Algorand/x402 badges. Mention that all prices are Testnet ALGO and that no Mainnet money is involved.

### 1:00–2:00 — Enter the operator console

**Clicks:** Click **Launch App Dashboard →**. If the landing page asks for identity instead, click **Sign In with GitHub**, enter a judge-safe handle such as `blockhack-judge`, choose **AI Agent** or **Developer**, and click **Authorize with GitHub OAuth** (the hackathon identity flow is local demo state).

*Judge sees: Overview metrics, the connected Buyer Agent wallet, recent activity, and navigation groups.*

> “This is the operator view around the protocol: registry, payments, analytics, automations, developer tools, and a wallet. The buyer starts with a 12.5 ALGO Testnet budget and a policy guard for low-cost tasks.”

### 2:00–4:00 — Show discovery and the registry

**Clicks:** In the left sidebar, click **Registry**. In **Search services…**, type `summarizer`. Choose **Verified** in the verification filter if available, leave **Sort** on **Reputation**, and click the **Summarizer Agent** row or **Open Service**.

*Judge sees: service metrics, price `0.05 ALGO`, category, reputation, endpoint, and the ARC-72 contract metadata card.*

> “Discovery is a capability lookup, not a hard-coded button. The registry record carries identity, price, endpoint, and reputation. The UI shows App ID `358912044` as the ARC-72-aligned registry anchor; the current FastAPI seed is the offline adapter, while the on-chain contract is the production source-of-truth seam.”

Click the **API** tab briefly, then return to **Playground**.

### 4:00–7:00 — The centerpiece: one paid x402 call

**Clicks:** In the agent detail page, stay on **Playground**. Select the task textarea (it is pre-filled) and replace it with:

```text
summarize the Algorand x402 payment protocol spec
```

Click **Execute Agent Service · 0.05 ALGO**.

*Judge sees: the timeline advance through registry search, seller found, seller call, amber `HTTP 402`, transaction construction, signing, broadcast, waiting, settlement, verification, retry, seller validation, green `HTTP 200`, and task execution.*

> “Watch the status change. First the seller says ‘402—payment required.’ The buyer constructs and signs the exact quoted amount, broadcasts it, waits for a confirmed round, then retries with proof. Only after verification does the seller return 200 and execute.”

While the timeline runs, point to each artifact:

1. The **402** badge is a real protocol outcome, not an error page.
2. The **amount**, receiver, and x402 session/nonce are visible in the challenge.
3. The **TX hash**, round, and confirmation duration form an auditable receipt.
4. The **200 OK** result panel proves that payment gates execution.

When the result appears:

> “The result is now a paid API response. Summaries can use OpenAI or Gemini when configured; without keys, the same typed contract falls back to a deterministic answer so the demo never stalls.”

### 7:00–8:00 — Inspect the proof

**Clicks:** Click the **Transactions** item in the sidebar. Click the newest row to open **Transaction Detail**.

*Judge sees: sender Buyer Agent, receiver Summarizer Agent, `0.0500 ALGO`, network, round, timestamp, settlement time, task, status, and TX hash.*

> “The receipt is not just a spinner. It is a ledger object with a round, latency, hash, and result. In a live Testnet configuration, **View on Algorand Explorer** opens the confirmed transaction. In demo-safe fallback mode, the receipt shape stays identical while the UI remains usable during provider outages.”

If the explorer opens, show the transaction details for 15 seconds, then return to AgentHub. If it does not, stay in the drawer and continue—do not spend time debugging DNS.

### 8:00–10:00 — Wow moment: agents buying agents

**Clicks:** Press `Ctrl+L` (or `Cmd+L`), enter `/marketplace`, and press **Enter**. On the marketplace, click **Multi-Agent Workflow**.

*Judge sees: three hop cards run sequentially—Summarizer `0.05`, Chart `0.08`, Lookup `0.03`—with a hash and status for every hop, followed by `Total settled 0.1600 ALGO`.*

> “A single agent purchase is useful. The bigger idea is composability: one workflow can buy three independent capabilities, settle each hop, and pass the outputs downstream. There is no human in the loop and no shared super-key.”

Point at the per-hop prices and the total. Mention that every hop is independently retryable and ledgered.

### 10:00–11:00 — Show the persistent ledger

**Clicks:** Click the marketplace tab **On-Chain Ledger** or the sidebar **Transactions**. Sort/filter if useful, then refresh the page once.

*Judge sees: the one single-hop row plus three multi-hop rows still present after refresh.*

> “The browser renders instantly from localStorage, then reconciles with the FastAPI ledger. That gives us a resilient demo today and a straightforward path to an indexer-backed ledger tomorrow.”

If the backend is unavailable, explicitly point out the **offline fallback** status and explain that local records are queued for back-fill.

### 11:00–12:00 — Automations: remove the human from the loop

**Clicks:** Click **Automations** in the sidebar. On the **Research Pipeline** card, click **Run Now**. Wait for the status to change from running to success; show the **Run History** table.

*Judge sees: a workflow with trigger, agent chain, estimated cost, status, and a newly recorded execution.*

> “Automations turn the payment primitive into an operating model. Schedules, events, and manual triggers can launch the same discover-pay-execute loop. The run history records cost and duration so an owner can govern autonomous spend.”

Click **Pause** and **Resume** once if the judge asks about controls; leave the workflow active.

### 12:00–13:00 — Wallet and analytics in one glance

**Clicks:** Click **Wallet**. Point to balance, available balance, total spent, **Top Up**, and **View on Explorer**. Then click **Analytics**.

*Judge sees: payment identity separated from workspace identity, Testnet badge, request volume, ALGO spend, success rate, average latency, service mix, and settlement-time visuals.*

> “The wallet is a payment identity, not an account password. Analytics are computed from the same receipts judges just saw: calls, spend, success rate, service usage, and settlement latency.”

### 13:00–14:00 — Developer surface

**Clicks:** Click **API Playground** in the sidebar and show the `POST /agent/agent-summarizer-01/call` request. Click **API Keys**, then **Create API Key**, name it `judge-demo`, click **Create Key**, and point out that the secret is shown once. Close the modal without copying a real secret. Click **Webhooks** and then **Documentation**.

*Judge sees: request/response schema, masked key metadata, webhook endpoints/deliveries, quickstart, x402 flow, and SDK examples.*

> “The platform is not only a UI demo. A developer can copy the challenge and execute schemas, create a key that is revealed once, register webhook events, or integrate directly with the FastAPI/OpenAPI surface.”

### 14:00–15:00 — Close on the thesis

**Clicks:** Return to the **Registry** or **Transactions** page. Leave a confirmed receipt visible.

> “AgentHub makes payment a native agent capability. Discovery is open, pricing is per call, settlement is Algorand-fast and auditable, and the same primitive composes into agent-to-agent workflows. The hackathon build is deliberately safe on Testnet with fallbacks; the production seam is clear: on-chain registry truth, real wallet signing, durable proof consumption, and horizontally scalable workers.”

Pause. Let the judge ask questions.

## Wow Moments to Highlight

- **HTTP 402 is the green light:** the amber 402 is a machine-readable quote that begins the purchase, not a failure.
- **One screen, 14 states:** discovery, price, wallet, settlement, verification, retry, authorization, and execution are observable.
- **Micropayments are composable:** `0.05 + 0.08 + 0.03 = 0.16 ALGO` for a three-agent workflow.
- **AI-to-AI hiring:** Research and Market scenarios visibly explain which downstream agents were hired and why.
- **Proof-shaped receipts:** every row carries amount, round, latency, network, task, result, and a transaction hash.
- **Offline resilience:** close the API or let a third-party API time out; the timeline and local ledger continue, then reconcile later.
- **Budget awareness:** the marketplace exposes a low-budget tier, estimated token count, and a `0.10 ALGO` task cap indicator.
- **Developer-ready surface:** the same flow is available as JSON endpoints, WebSocket events, API-key metadata, webhooks, and OpenAPI docs.

## Q&A Preparation

### 1. What problem does AgentHub solve?

AI agents can call tools but do not have a neutral, programmable way to discover, price, pay for, and verify another agent's service. AgentHub turns capabilities into pay-per-call resources with machine-readable proof.

### 2. Why use x402 instead of API keys or a subscription?

Keys grant standing access and require provisioning. x402 grants access per request, so a buyer can choose a seller dynamically, pay only for the work consumed, and attach a verifiable receipt to the result.

### 3. Why Algorand?

Fast deterministic finality and low transaction fees make small machine payments practical. Testnet also gives judges a safe, faucet-funded environment with explorer-visible receipts.

### 4. Is this Mainnet money?

No. The demo is explicitly Algorand Testnet. Testnet ALGO has no real-world value; never send Mainnet funds to the displayed address.

### 5. Are the transactions real on-chain transactions?

The backend has a `py-algorand-sdk` verification path for real Testnet transaction IDs. The browser's signing/broadcast steps and unresolved-ID verification intentionally have a demo-safe fallback, so a provider outage cannot break judging. A production wallet adapter removes those simulation points.

### 6. What does “ARC-72 registry” mean here?

The UI uses an Algorand application-backed, ARC-72-aligned registry design with App ID `358912044`. The hackathon adapter is seeded in memory for reliability; the documented contract schema and indexer boundary are the migration path to canonical on-chain discovery.

### 7. How is an agent selected from plain text?

The router tokenizes the task, scores exact capability keywords more heavily than description matches, and uses reputation as a tie-breaker. The UI displays matched keywords and high/medium/low confidence so routing is explainable.

### 8. How do agents pay other agents?

An orchestrator owns a wallet or delegated budget, receives a child agent's 402 quote, settles it, verifies the receipt, and composes the child result. The explicit marketplace workflow demonstrates three independent child purchases.

### 9. How do you stop an autonomous agent overspending?

AgentHub exposes per-task pricing, a low-budget tier, estimated tokens, workflow cost, and persistent run history. Production policy adds hard daily/workspace caps, quote expiry, seller allowlists, idempotency, and delegated wallet limits.

### 10. How does a seller know a payment was not forged?

The seller/verifier should query Algod/Indexer, check the exact receiver and amount, require confirmation, bind the transaction to the session nonce, and atomically consume the proof. Those checks are the production verification contract; the demo fallback is clearly documented.

### 11. Where are private keys stored?

The frontend does not receive the backend seller mnemonic. The demo's browser wallet operations are simulated. Production should use Pera/Defly, a custodial signer, or a scoped smart account with policy controls.

### 12. What happens when the backend is down?

The client starts from static registry data, caches state in localStorage, fails fast on network timeouts, and uses local flow pacing and result fallbacks. When the API returns, hooks reconcile and back-fill local records.

### 13. What is persisted in SQLite versus on-chain?

Algorand stores payment proof and finality. SQLite stores ledger projections, key metadata, webhooks, automations, runs, and wallet funding metadata. The browser keeps an instant cache, never the authoritative balance or authorization decision.

### 14. Why use WebSockets?

The 14-step sequence is event-like and judges benefit from seeing it in real time. WebSocket telemetry makes each transition observable without polling; the client can fall back to local pacing if the socket is unavailable.

### 15. What is the expected latency?

The UI paces a readable demo timeline. A real Algorand confirmation is typically a few seconds, while task latency depends on the seller and any LLM/data provider. Analytics expose average and maximum settlement time separately from task execution time.

### 16. How does AgentHub make money?

The marketplace can charge a small protocol or routing fee per successful call, while sellers keep the service price. A future version can add premium discovery, enterprise policy controls, and settlement batching without changing x402.

### 17. What happens if Wikipedia, CoinGecko, or an LLM times out?

Research and market agents return a readable fallback and preserve the typed result contract. Provider calls have bounded timeouts; the transaction receipt and workflow state remain visible.

### 18. How do I add an agent?

Add a normalized seller record to the catalog/registry adapter with an ID, category, endpoint, price, capabilities, and wallet owner. Registering through the UI is currently a local demo action; production registration should be an owner-signed registry transaction.

### 19. Can this scale beyond SQLite and one process?

Yes. Move sessions to Redis, the database to Postgres, task execution to a durable worker queue, WebSocket events to pub/sub, and registry reads to an Indexer-backed cache. The API/client contracts stay stable.

### 20. What would you build next?

Finish the on-chain registry adapter, replace simulated browser signing with a wallet connector, make proof consumption durable and replay-safe, add OAuth/API-key enforcement and rate limits, and ship provider health/cost observability for large agent fleets.

## Backup Plan if Something Breaks

| Symptom | Do this | Say this |
|---|---|---|
| Render is cold or API health is red | Switch to local `npm run dev`, or continue on the deployed frontend | “The client is offline-safe; the same contract runs from the local seed while the API warms.” |
| Timeline stops at WebSocket connect | Refresh once, then run from **API Playground**; the hook automatically uses local pacing | “The socket is telemetry only—the payment pipeline and result are independent.” |
| Wikipedia/CoinGecko/LLM is unavailable | Keep the flow running and show the fallback result/orchestration log | “External data is optional; the paid result schema and receipt remain deterministic.” |
| Explorer link cannot resolve a hash | Close the new tab and show **Transaction Detail**, round, amount, and network; optionally show the known Testnet wallet page | “This run used the demo-safe receipt fallback; configured Testnet runs resolve the same URL to a real transaction.” |
| An experimental QR/weather listing is absent after API hydration | Use one of the 11 stable registry services, especially Summarizer, Chart, or Lookup | “Those two utilities are client-side experiments; the stable backend registry is the 11-agent catalog used for judging.” |
| Ledger contains stale rows | Click **Clear Ledger**, return to Playground, and run one clean flow | “The ledger is intentionally resettable for a repeatable judge session.” |
| API-key modal distracts the judge | Close it with **Done**; do not copy or expose a secret | “Secrets are displayed once and only masked metadata is persisted.” |
| Browser loses network | Keep the app open; use the local cached catalog and flow | “AgentHub degrades to a complete offline simulation and reconciles when connectivity returns.” |
| Time is running out | Jump directly to `/developer/playground`, run the default Summarizer task, then show **Transactions** | “The 402 → settlement → 200 loop is the shortest proof of the thesis.” |

If all else fails, keep the architecture diagram and this script open, narrate the 14-step sequence, and show the recorded screenshots/GIF placeholder prepared before the event. Never improvise a claim that a transaction is Mainnet or that the local GitHub modal is production OAuth.
