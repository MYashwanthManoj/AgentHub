# Architecture — AgentHub x402 Service Registry

This document describes the architecture of the Phase 1 (simulated) demo and how
it maps to the Phase 2 real-network target. All diagrams are Mermaid and render
natively on GitHub.

---

## 1. System context

```mermaid
flowchart LR
    subgraph Browser["Browser (client-only)"]
        UI["AgentHub SPA<br/>React 19 + Vite"]
    end

    subgraph Domain["Demo Domain (Phase 1: simulated)"]
        R["registryService<br/>(static seed data)"]
        E["paymentEngine<br/>(mock x402 lifecycle)"]
        L["useLedger<br/>(localStorage)"]
    end

    subgraph External["Phase 2 only (see MIGRATION.md)"]
        SELLER["Seller agent endpoints<br/>(real HTTP APIs)"]
        ALGOD["Algorand Testnet<br/>algod / indexer"]
        WALLET["Buyer wallet<br/>(Pera / Defly / custodial key)"]
    end

    User["Judge / operator"] --> UI
    UI --> R
    UI --> E
    UI --> L

    E -. Phase 2: fetch + X-Payment-Receipt .-> SELLER
    E -. Phase 2: algosdk broadcast/settle .-> ALGOD
    E -. Phase 2: ARC-0300 signing .-> WALLET
```

**Key property:** the SPA never talks to any network today. Every network call
in Phase 2 plugs into `paymentEngine` without touching React.

---

## 2. Package / module layout

```mermaid
flowchart TB
    subgraph Entry["Entry"]
        main["main.tsx"] --> App["App.tsx"]
    end

    App --> Page["MarketplacePage.tsx"]
    Page --> Comp["Components"]
    Page --> Hooks["Hooks"]
    Page --> Srv["Services"]

    subgraph Comp["components/"]
        Header["Header/"]
        Market["Marketplace/<br/>SellerCard"]
        Flow["TransactionFlow/<br/>ResultPanel"]
        Multi["Timeline/MultiHopPanel"]
        Ledger["Ledger/"]
    end

    subgraph Hooks["hooks/"]
        HookFlow["useTransactionFlow<br/>orchestrates step sequence"]
        HookLedger["useLedger<br/>localStorage persistence"]
    end

    subgraph Srv["services/"]
        Registry["registryService<br/>load / search / rank"]
        Router["agentRouter<br/>task → seller"]
        Engine["paymentEngine<br/>8-step x402 lifecycle"]
    end

    subgraph Data["data/"]
        Agents["agents.ts<br/>SELLER_AGENTS · BUYER_AGENT"]
    end

    subgraph Types["types/"]
        Types["index.ts<br/>shared contracts"]
    end

    Registry --> Data
    Router --> Registry
    Engine --> Types
    Hooks --> Srv
    Hooks --> Types
    Comp --> Types
    Comp --> Utils["utils/format.ts"]
```

**Ownership rule:** arrows point *down*; nothing at a lower layer may import
upward. Components never call services directly for orchestration — the page
wires hooks, hooks call services, services are pure.

---

## 3. x402 payment lifecycle (the heart of the app)

`useTransactionFlow.runFlow(seller, task)` drives 14 UI steps backed by 8
engine calls. The engine internals are mocked; the lifecycle is the real x402
protocol:

```mermaid
sequenceDiagram
    autonumber
    participant UI as useTransactionFlow
    participant ENG as paymentEngine
    participant SEL as Seller endpoint
    participant ALG as Algorand chain

    UI->>ENG: requestPayment(seller)
    ENG-->>SEL: POST {resource}
    SEL-->>ENG: 402 Payment Required<br/>scheme:x402, maxAmountRequired (µALGO),<br/>payToAddress, nonce
    ENG-->>UI: PaymentRequired

    UI->>ENG: constructPayment(payReq, from)
    ENG-->>UI: unsigned SignedPayment (txId)

    UI->>ENG: signPayment(unsigned)
    ENG-->>UI: signed SignedPayment (signedTxn)

    UI->>ENG: broadcastTx(signed)
    ENG-->>ALG: sendRawTransaction
    ALG-->>ENG: txId accepted (mempool)
    ENG-->>UI: txId

    UI->>ENG: settlePayment(txId)
    loop waitForConfirmation (≈4 rounds)
        ALG-->>ENG: block confirmations
    end
    ALG-->>ENG: confirmed round #N
    ENG-->>UI: SettlementReceipt

    UI->>ENG: verifyPayment(receipt, seller)
    ENG-->>SEL: X-Payment-Receipt: txId
    SEL-->>ENG: { verified: true, ... }

    UI->>ENG: retryRequest(seller, task)
    ENG-->>SEL: POST + X-Payment-Receipt
    SEL-->>ENG: 200 OK + payload

    UI->>ENG: executeTask(seller, task)
    ENG-->>UI: AgentResult (text | chart | json)
    UI->>UI: ledger entry → useLedger → localStorage
```

---

## 4. Task routing

```mermaid
flowchart LR
    Task["free-text task"] --> Tok["tokenize + lowercase"]
    Tok --> Score["scoreAgent<br/>keywords ×3 · body ×1 · reputation/1000"]
    Score --> Rank["sort desc"]
    Rank --> Best["findBestSeller"]
    Best --> Route["routeTask → RoutingResult<br/>{seller, confidence, matchedKeywords}"]
    Route --> Hint["UI routing hint<br/>+ auto-highlight card"]

    Empty["no token match"] --> FB["fallback: highest reputation"]
    FB --> Route
```

Scoring is deterministic and pure (`registryService.ts`), which makes it easy to
unit-test without a mock layer.

---

## 5. Multi-agent workflow

`MarketplacePage.handleRunMultiHop` reuses `runFlow` per hop in sequence:

```mermaid
flowchart TB
    Start["Click ⇢ Multi-Agent Workflow"] --> H0["Hop 1: Summarizer<br/>'summarize the x402 spec'"]
    H0 --> H1["Hop 2: Chart Agent<br/>'chart transaction volume'"]
    H1 --> H2["Hop 3: Lookup Agent<br/>'lookup Algorand Foundation'"]
    H2 --> Sum["summary: total settled (ALGO)"]

    subgraph perHop["per hop (same sub-flow)"]
        direction LR
        S["runFlow(seller, task)"] --> A["addEntry → ledger"] --> B["mark hop done / error"]
    end

    H0 -.-> perHop
    H1 -.-> perHop
    H2 -.-> perHop
```

The multi-hop panel renders one `HopCard` per step with status, price,
confirmation duration, and truncated TX hash.

---

## 6. State & data flow

```mermaid
flowchart LR
    subgraph LocalState["MarketplacePage local state"]
        Sel["selectedSeller"]
        Task["task"]
        Hops["hops[]"]
    end

    subgraph Hooks
        UF["useTransactionFlow<br/>{steps, isRunning, result, ledgerEntry}"]
        UL["useLedger<br/>{entries, totalSpent, ...}"]
    end

    Sel --> UF
    Task --> Router2["routeTask (auto-route)"]
    Router2 --> UF

    UF --> Entry["LedgerEntry"]
    Entry --> UL
    UL --> LS["localStorage<br/>blockhack_ledger_v1"]

    UF --> FlowUI["TransactionFlow (steps, progress bar)"]
    UF --> ResultUI["ResultPanel"]
    Hops --> MultiUI["MultiHopPanel"]
    UL --> LedgerUI["Ledger table"]
```

`useLedger` owns `blockhack_ledger_v1` — no other module touches the storage
key, so a future swap to a real indexer/backend ledger is a one-hook change.

---

## 7. Target architecture (Phase 2, post-migration)

```mermaid
flowchart LR
    UI2["React UI (unchanged)"] --> Hook2["hooks (unchanged)"]
    Hook2 --> SDK["x402 SDK layer<br/>(replaces paymentEngine internals)"]

    subgraph X402["x402 layer"]
        REQ["requestPayment<br/>HTTP 402 handshake"]
        TX["construct + sign<br/>algosdk"]
        BR["broadcast + settle<br/>algod"]
        VER["verify + retry<br/>X-Payment-Receipt"]
    end

    SDK --> X402
    BR --> ALGOD2["Algod Testnet"]
    VER --> IDX["Indexer"]
    REQ --> SELLER2["Real seller APIs"]
    TX --> W["Wallet (ARC-0300)"]

    Hook2 --> REG["on-chain registry query<br/>(optional Phase 2)"]
    REG --> CON["ARC-72-style registry contract"]
```

---

## 8. Design invariants

1. **Types are the API.** All contracts live in `src/types/index.ts`; feature
   modules may not define their own domain types.
2. **Pure core, animated shell.** `services/` are pure/async-with-delay; all UI
   state lives in hooks; components are presentational.
3. **Deterministic data.** `agents.ts` is the single seed source; adding a
   seller means touching exactly one file.
4. **Simulation is honest.** `NetworkMode = 'simulated' | 'testnet' | 'mainnet'`
   is typed end-to-end so flipping to testnet is a config change, not a
   refactor.
