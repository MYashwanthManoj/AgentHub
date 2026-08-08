# BlockHack 2026 · Judging Guide — AgentHub

**Track:** Algorand x402 · **Entry:** AgentHub — x402 Service Registry
**Time:** ~2 minutes (full walkthrough script in [docs/DEMO_SCRIPT.md](DEMO_SCRIPT.md))

---

## What is x402

x402 is a protocol that lets an HTTP endpoint charge money before serving a
response: a server answers `402 Payment Required` with payment metadata
(amount, recipient, nonce), and the client settles an Algorand payment
on-chain, then retries with proof of payment to unlock the resource. It turns
"API key" gating into "pay-per-call" gating that any AI agent can transact with
directly.

## 30-second pitch (read aloud)

> "AgentHub shows what happens when AI agents have a wallet. When an agent
> needs a service — a summary, a chart, a data lookup — it discovers a seller
> in a registry, calls the seller's endpoint, and the seller answers with
> HTTP 402: pay me first. The buyer agent constructs an Algorand payment,
> signs it, broadcasts it, and waits for on-chain settlement — about four
> seconds. Then it retries with proof of payment and the seller grants access.
> You'll see all 14 steps animated live, every transaction recorded in a
> persistent ledger, and a multi-agent workflow that chains three purchases
> end to end. The whole thing runs in the browser with zero backend, and every
> mocked function is a one-to-one mirror of the real Algorand SDK — so this
> demo is already wired for testnet."

## What this demo proves

That the x402 lifecycle works as a complete, auditable economic loop between
autonomous agents — registry discovery, pricing, payment, on-chain settlement,
proof-of-payment verification, and delivery — and that the UI is already
wired for the real SDK (only internal functions change in Phase 2).

## How to run it locally

```bash
npm install
npm run dev          # → http://localhost:5173
npm run build        # (optional) production build + `npm run preview`
```

Requires Node + npm. No backend, no keys, no wallet needed — everything is
simulated client-side.

## What to click, in order (and what you should see)

| # | Action | What you should see |
|---|--------|---------------------|
| 1 | Click the **Summarizer Agent** card in the Service Registry grid | Card highlights with a green "Selected" badge |
| 2 | Type `summarize the Algorand x402 payment protocol spec` into **Task Input** | Routing hint appears: auto-routed → Summarizer, matched keywords, `high` confidence badge |
| 3 | Click **▶ Run Payment Flow** | Live 14-step timeline animates: search → 402 (amber badge) → construct/sign/broadcast (TX hash pills) → settlement round # → retry → 200 OK (green badge) → result panel |
| 4 | After it finishes, click **⇢ Multi-Agent Workflow** | Three hop cards run in sequence (Summarizer → Chart → Lookup), each with its own price and tx hash, ending with a **total settled** readout of 0.1600 ALGO |
| 5 | Scroll to the **Transaction Ledger**, then refresh the page | Four rows (1 single + 3 hops) persist: time, seller, task, amount, round, confirm time, tx hash |

## What to look for in the UI

- **Auto-routing:** typing a task highlights the best seller and shows matched
  keywords + a confidence badge (`high` / `medium` / `low`).
- **The HTTP status journey:** amber `402` badge appears when the seller
  charges, green `200` when access is granted after payment proof.
- **Realistic chain artifacts:** TX hash pills, settlement round number, and an
  AlgoExplorer link on every transaction.
- **Ledger integrity:** each row shows time, seller, task, amount, round,
  confirmation time, and hash — and survives a page refresh (localStorage).
- **Multi-hop economics:** three independent settlements, per-hop status, and a
  total-spent summary (default run: 0.1600 ALGO).

## How Phase 2 migration works

Every exported function in `src/services/paymentEngine.ts` is a 1:1 mirror of
the real SDK surface with identical signatures and return types. Migration is a
per-function swap: `requestPayment` becomes a real `fetch` against the seller
endpoint; `constructPayment` becomes
`algosdk.makePaymentTxnWithSuggestedParams(...)`; `signPayment` uses a real
key/wallet session; `broadcastTx` and `settlePayment` call `algod` and
`waitForConfirmation`; `verifyPayment`/`retryRequest` re-issue the request with
an `X-Payment-Receipt` header. Because the types never change, the UI, hooks,
and components are untouched — the full mapping and code snippets are in
[docs/MIGRATION.md](MIGRATION.md).

## Why this is ready for Phase 2 real integration

The demo was designed so the simulation is the only thing standing between it
and testnet. Every mock function in `paymentEngine.ts` returns the exact types
the real SDK produces (`PaymentRequired`, `SignedPayment`,
`SettlementReceipt`, `PaymentVerification`), the 14-step flow mirrors the real
x402 wire protocol step for step, and the migration guide ships ready-to-paste
algosdk snippets for each function. Going live is a per-function swap with one
documented signature change (`retryRequest` gains `receiptTxId`) — no UI
rewrite, no hook rewrite, no type changes. Add a wallet (Pera/Defly or
custodial key), point at Algonode testnet, and the same UI runs against the
real chain.

## Why Algorand

- **~4-second finality:** `waitForConfirmation(txId, 4)` settles a purchase in
  seconds — fast enough for agent-to-agent commerce at machine speed.
- **Sub-penny fees:** per-call pricing at 0.03–0.08 ALGO stays economical
  because transactions cost fractions of a cent; micro-payments are viable.
- **ARC standards:** a rich standards ecosystem (ARC-72-style registries,
  ARC-0300 wallet sessions) gives the registry and wallet flows a real,
  interoperable path from demo to production.
