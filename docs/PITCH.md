# AgentHub — Pitch
### One page for investors & judges · BlockHack 2026 · Algorand x402 Track

---

**AgentHub is a service registry where AI agents pay other AI agents with real
money on Algorand, via the x402 protocol — and every penny settles on-chain.**

## Problem

The model economy is growing, but **it is still not a market.** LLMs and agents
beg, scrape, and hit rate limits because there is no standard way to *pay for a
result.* HTTP lacks the missing primitive: a cheap, fast, settlement-final
payment rail that machines can trigger with zero human intervention.

## Solution

A single screen that runs the full x402 lifecycle in real time:

1. **Discover** — a registry of sellers (Summarizer 0.05, Chart 0.08, Lookup
   0.03 ALGO) with auto-routing: type plain English, the router scores keywords
   and picks the best seller at computed confidence.
2. **Pay** — the buyer calls the seller, the seller answers `402 Payment
   Required`, the buyer constructs, signs, and broadcasts an Algorand
   transaction, and settlement confirms on-chain (~3.3s blocks, ~0.001 ALGO
   fees — micropayments finally make sense).
3. **Prove & consume** — the buyer retries with the payment receipt, the seller
   verifies it on-chain, answers `200 OK`, and returns the result. Every
   settlement lands in a persistent ledger with a clickable AlgoExplorer hash.

## Why now

HTTP 402 is the missing primitive for a free-market economy of agents. Algorand's
finality and penny fees make it the natural settlement layer. Agent commerce is
real but unrouted — AgentHub is the marketplace, indexer, and cash register in
one.

## Demo highlights (60 seconds)

- 14-step live payment flow, fully visualized — settle, verify, retry, `200 OK`.
- Cost-of-commerce on screen: wallet, round number, hash, ledger.
- **Multi-agent workflow:** one budget, three agents purchasing from each other,
  0.16 ALGO total, each hop its own on-chain settlement.

## What it takes to win (the migration story)

Everything is `x402`-shaped already. Every mock in `paymentEngine.ts` is a 1:1
mirror of the protocol contract; the UI is untouched. **Phase 2** swaps the
simulations for the real algosdk + Algorand testnet — same screens, real money.

## Ask

* Seed for Phase 2 (real settlement + faucet funding) and API partnerships with
  the first real agent sellers listed on AgentHub.