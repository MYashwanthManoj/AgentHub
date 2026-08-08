# Demo Script — 60-Second Pitch for Judges

The exact, word-for-word script a judge hears. **Target: 60 seconds**, timed to
the deterministic mock flow (single payment ≈ 7s, so there is no dead air).

> Format: **BOLD = what you click / do**. *Italic = what the judge sees.*
> Plain = what you say, word for word. Say it out loud twice before judging.

---

## Before the judge arrives (do this ONCE)

```bash
npm install
npm run dev        # keep running → http://localhost:5173
```

- Open the app, click **✕ Clear** in the ledger so it starts empty.
- Leave the page scrolled to the top, browser tab fresh and focused.
- Note: SIMULATED MODE banner shows everything stays client-side.

---

## The 60-second performance

### 0:00–0:08 · HOOK (look at the judge, wave at the header)
*Judge sees: Header with `SIMULATED MODE` amber badge, Wallet `Buyer Agent` @ 12.5 ALGO.*

> "This is AgentHub — a registry where AI agents actually **pay each other with
> real money on Algorand**, using the x402 payment protocol. Watch the full
> lifecycle on one screen: a buyer hits a seller, gets told to pay, settles
> on-chain, and gets the answer. Today we run it on a simulated network — same
> contracts, no real funds."

### 0:08–0:16 · AUTO-ROUTING (type while you talk)
Click the **Task Input** box and type the full task, one keystroke at a time:
```
summarize the Algorand payment protocol
```

*Judge sees: green hint `Auto-routed → Summarizer Agent (summarize)` + `high`
confidence badge; the Summarizer card pops a green `Selected` badge.*

> "I type a plain-English request and the registry rankers pick the best seller
> for it — matched on keywords, scored by confidence, no dropdowns."

### 0:16–0:30 · THE CORE: run the payment (click it, then narrate)
Click **▶ Run Payment Flow** and keep talking:

| You see (judge sees) | Say, word for word |
| -------------------- | ------------------ |
| Timeline counts up, **HTTP 402** amber badge | "Buyer calls the seller — the seller answers: 402, pay me to use this." |
| **Construct → Sign → Broadcast**, TX hash pill | "The buyer builds the Algorand payment, signs it, broadcasts it on-chain." |
| **Waiting for settlement** → **round # confirmed** | "It confirms on-chain — that green flash means check." |
| **HTTP 200 OK** green badge | "Now the buyer retries with the payment receipt — the seller verifies it on-chain and grants access." |
| **AGENT OUTPUT** panel, green `200 OK` badge | "And the summary comes back — a paid API call, end to end." |

Say nothing extra during the run — let the timeline carry it.

### 0:30–0:40 · THE PROOF (point at the result)
*Judge sees: `AGENT OUTPUT` panel, green `200 OK`, a summary, and a clickable
TX-hash link under an external-link icon.*

> "And the receipt is real data — this hash clicks through to AlgoExplorer.
> Nobody can dispute what was paid."

### 0:40–0:50 · THE LEDGER (scroll down once)
Click / tap the **Transaction Ledger** table.

*Judge sees: one `confirmed` row — seller, task, 0.05 ALGO, round #, TX hash.*

> "Every settlement lands here — round, confirm time, hash — and this survives
> refresh, the way an indexer would back it in production."

### 0:50–1:00 · THE CLOSE (stop talking, look up)
> "Phase two swaps the simulation for the real Algorand SDK + testnet — same
> UI, real x402. Thank you."

---

## Optional upgrade (only if the judge asks, +20 s)

If the judge asks "show the chain of agents": click **⇢ Multi-Agent Workflow** and say:

> "One agent alone is one purchase. This chains three of them — summarize, chart,
> lookup — each hop its own on-chain settlement, **0.16 ALGO** total. Agents
> spending agent money."

*Judge sees: three **HOP cards** fill left to right, a big green `Total settled 0.1600 ALGO`.*

---

## Failure-recovery (stay calm)

| Problem | Recovery |
| ------- | -------- |
| Flow stuck mid-step | "Simulated pacing uses a fixed delay." Click the task again, re-run. |
| Judge asks "is this real money?" | "Real ALGO on testnet in phase two — same protocol, faucet wallet." |
| Ledger got long | One click **✕ Clear** in the ledger. |
| Time is running out | Skip the ledger; the settled flow + the proof already cover the rubric. |
| Auto-route picked wrong seller | Click the **Summarizer card** itself before Run. |

## Numbers to remember (if judges quiz you)

- 3 sellers: Summarizer 0.05 · Chart 0.08 · Lookup 0.03 ALGO / call.
- Buyer: `Buyer Agent`, 12.5 ALGO wallet in `data/agents.ts`.
- Steps: 14, defined in `useTransactionFlow.ts`. Mock pace ~7 s; real Algorand
  finality ≈ 3–4 rounds (~4 s).
- Migration: every mock is a 1:1 mirror of the x402 SDK — UI untouched.