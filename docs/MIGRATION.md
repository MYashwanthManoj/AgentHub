# Migration Guide — Simulated Engine → Real Algorand x402 SDK

**Phase 2 of AgentHub.** The current codebase is a *faithful simulation* of the
x402 payment lifecycle. Every function in `src/services/paymentEngine.ts` is a
1:1 mirror of the real SDK surface, with identical signatures and return types —
only the internals change. This document maps each mock to its real-world
counterpart and gives a step-by-step, testable migration plan.

> The demo is built for the wire: the UI, the hooks, and the types already
> consume `PaymentRequired`, `SignedPayment`, `SettlementReceipt`, and
> `PaymentVerification`. If a migration step keeps those contracts stable, the
> UI does not need to change at all.

---

## 1. Why the mapping holds

`src/services/paymentEngine.ts` currently simulates eight steps:

| Step | Mock (current) | Real-world counterpart |
| ---- | -------------- | ---------------------- |
| 1 | `requestPayment(seller)` | HTTP request to seller endpoint → `402 Payment Required` x402 body |
| 2 | `constructPayment(payReq, from)` | `algosdk.makePaymentTxnWithSuggestedParams(...)` (unsigned txn) |
| 3 | `signPayment(unsigned)` | `txn.signTxn(sk)` or wallet session (ARC-0300 / Pera / Defly) |
| 4 | `broadcastTx(signed)` | `algod.sendRawTransaction(signed).do()` |
| 5 | `settlePayment(txId)` | `algod.waitForConfirmation(txId, rounds).do()` |
| 6 | `verifyPayment(receipt, seller)` | Re-call seller with `X-Payment-Receipt: <txId>`; seller checks indexer |
| 7 | `retryRequest(seller, task)` | Re-issue original request with payment-receipt header |
| 8 | `executeTask(seller, task)` | Real seller API response (text / chart JSON / lookup JSON) |

`src/utils/crypto.ts` (`generateTxHash`, `generateNonce`, `generateId`) is
mock-only and should be **deleted** once step 2–4 are real; `sleep` moves into a
timing utility or disappears entirely.

---

## 2. Prerequisites (do once)

```bash
npm install algosdk
```

Create a small network module that will become the single place holding node
clients (keep it mock-switchable during the migration):

```ts
// src/services/network.ts (new)
import algosdk from 'algosdk';

const TESTNET = 'https://testnet-api.algonode.cloud';  // public algod
const INDEXER = 'https://testnet-idx.algonode.cloud';  // public indexer

export const algod = new algosdk.Algodv2('', TESTNET, '');

export const indexer = new algosdk.Indexer('', INDEXER, '');

export const NETWORK = 'algorand-testnet';
```

Funding the buyer wallet: use the [Algorand dispenser](https://dispenser.testnet.aws.algodev.network/)
or `goal clerk send` for a custodial testnet key. For a wallet-based demo
(Pera/Defly), use ARC-0300 `wallet.connect()` to get the sender address and a
signing session — the rest of the flow is unchanged.

---

## 3. Step-by-step migration

Migrate one function at a time. Each section is independently testable because
the return contracts never change.

### 3.1 `requestPayment` — real HTTP 402 handshake

**Current behavior:** returns a canned `PaymentRequired` after 800 ms.

**Real behavior:** fetch the seller endpoint *without* any payment header. The
seller responds `HTTP 402` with an x402 body. The wire format the mock already
emits matches the x402 protocol (`scheme`, `network`, `maxAmountRequired`,
`resource`, `description`, `mimeType`, `payToAddress`, `nonce`).

```ts
export async function requestPayment(seller: SellerAgent): Promise<PaymentRequired> {
  const res = await fetch(seller.endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ resource: seller.endpoint }),
  });
  if (res.status !== 402) {
    throw new Error(`Expected 402 Payment Required, got ${res.status}`);
  }
  const body = (await res.json()) as PaymentRequired;
  body.scheme = 'x402';
  return body;
}
```

> **Note:** `maxAmountRequired` arrives in **micro-ALGO** (1 ALGO = 1,000,000
> µALGO). The mock already does this; do not "fix" it on the way in.

### 3.2 `constructPayment` — build the transaction

**Current behavior:** fabricates a `txId` and returns an unsigned `SignedPayment`.

**Real behavior:**

```ts
export async function constructPayment(
  payReq: PaymentRequired,
  fromAddress: string
): Promise<SignedPayment> {
  const suggestedParams = await algod.getTransactionParams().do();
  const txn = algosdk.makePaymentTxnWithSuggestedParams(
    fromAddress,
    payReq.payToAddress,
    payReq.maxAmountRequired,        // µALGO
    new Uint8Array(Buffer.from(`x402:${payReq.nonce}`)),
    suggestedParams
  );
  return {
    txId: txn.txID(),                // ← keep as `txId`
    signedTxn: Buffer.from(txn.toByte()).toString('base64'),  // unsigned, encoded
    amount: payReq.maxAmountRequired,
    from: fromAddress,
    to: payReq.payToAddress,
    note: `x402:${payReq.nonce}`,
  };
}
```

The hook (`useTransactionFlow.ts`) only reads `txId`, `from`, `to`, and
`amount` — none of those semantics change. `signedTxn` now carries the encoded
(unsigned) transaction so `signPayment` can decode and sign it in §3.3.

### 3.3 `signPayment` — real signing

**Current behavior:** returns a fake `ALGO_SIGNED_...` base64 blob.

**Real behavior (custodial key path):** decode the unsigned transaction that
`constructPayment` encoded in `signedTxn`, then `signTxn` and overwrite the
field with the signed blob:

```ts
export async function signPayment(unsigned: SignedPayment): Promise<SignedPayment> {
  // Decode the unsigned txn bytes stored in constructPayment → signedTxn.
  const raw = Uint8Array.from(Buffer.from(unsigned.signedTxn, 'base64'));
  const decoded = algosdk.decodeObj(raw);                     // { txn: {...} }
  const txn = algosdk.Transaction.from_obj_for_encoding(decoded.txn);

  const signed = txn.signTxn(PRIVATE_KEY);                    // 64-byte ed25519 secret key
  return { ...unsigned, signedTxn: Buffer.from(signed).toString('base64') };
}
```

**Wallet path (recommended for the demo):** keep a `wallet` session handle from
ARC-0300 and call `session.signTxns([{ txn: unsigned.signedTxn, signers: [from] }])`
(ARC-0300 expects base64), then store the returned signed blob in `signedTxn`.
Same return contract.

### 3.4 `broadcastTx` — submit to algod

**Current behavior:** returns the fake `txId` after 700 ms.

**Real behavior:**

```ts
export async function broadcastTx(signedPayment: SignedPayment): Promise<string> {
  const raw = Uint8Array.from(Buffer.from(signedPayment.signedTxn, 'base64'));
  const { txId } = await algod.sendRawTransaction(raw).do();
  return txId;                                  // ← same return contract
}
```

### 3.5 `settlePayment` — wait for confirmation

**Current behavior:** returns a randomized `SettlementReceipt` after 1.8 s.

**Real behavior:** `waitForConfirmation` polls algod until the round count
passes; then fetch the confirmed transaction for round + finality data.

```ts
export async function settlePayment(txId: string): Promise<SettlementReceipt> {
  await algod.waitForConfirmation(txId, 4).do();        // 4 rounds ≈ few seconds
  const txn = await algod.pendingTransactionInformation(txId).do();

  const explorerUrl = `https://testnet.algoexplorer.io/tx/${txId}`;
  return {
    txHash: txId,
    roundNumber: txn['confirmed-round'] ?? 0,
    confirmationTimeMs: <measured elapsed ms>,
    finalityStatus: txn['confirmed-round'] ? 'confirmed' : 'pending',
    explorerUrl,
  };
}
```

The UI renders `roundNumber`, `confirmationTimeMs`, `finalityStatus`, and the
explorer link — all present here.

### 3.6 `verifyPayment` + `retryRequest` — present the receipt

Per the x402 flow, after settlement the buyer retries the original request with
the receipt so the seller can verify on-chain and grant access.

```ts
export async function verifyPayment(receipt: SettlementReceipt, seller: SellerAgent): Promise<PaymentVerification> {
  const res = await fetch(`${seller.endpoint}/verify`, {
    method: 'POST',
    headers: { 'X-Payment-Receipt': receipt.txHash },   // x402 header name
  });
  const body = (await res.json()) as PaymentVerification;
  if (!body.verified) throw new Error('Seller rejected payment proof');
  return body;
}

export async function retryRequest(
  seller: SellerAgent,
  task: string,
  receiptTxId: string                       // NEW param — see note below
): Promise<Response> {
  return fetch(seller.endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Payment-Receipt': receiptTxId,
    },
    body: JSON.stringify({ task }),
  });
}
```

> **Signature note:** the mock `retryRequest(seller, task)` has no receipt
> parameter. Phase 2 adds `receiptTxId` — a one-line call-site update in
> `useTransactionFlow.ts` (pass `receipt.txHash`). This is the *only* planned
> signature change in the entire migration; everything else is pure internals.

**Contract note:** the seller side can verify with the indexer
(`indexer.lookupTransactionByID(txId).do()`) or a delegation point
(x402 "delegator") that settles micro-payments in bulk. That verification logic
lives server-side, not in this repo.

### 3.7 `executeTask` — real seller output

**Current behavior:** generates mock text/chart/JSON results.

**Real behavior:** parse the `200 OK` response from `retryRequest` into
`AgentResult`. The three `resultType`s map cleanly:

| Mock type | Real response shape |
| --------- | ------------------- |
| `text` | Markdown/plain text payload |
| `chart` | `{ chartData: { label, value }[] }` |
| `json` | Raw JSON body |

```ts
export async function executeTask(seller: SellerAgent, task: string): Promise<AgentResult> {
  const res = await retryRequest(seller, task);
  if (res.status !== 200) throw new Error(`Seller returned ${res.status}`);
  const payload = await res.json();
  return toAgentResult(payload, seller.category);   // thin adapter, keeps type contract
}
```

---

## 4. Registry migration (optional, larger scope)

`registryService.ts` + `data/agents.ts` can also move on-chain in Phase 2, while
keeping the same API:

- `loadRegistry(): SellerAgent[]` → query an ARC-72-style registry contract
  (`algod` app call + ABI decode → map to `SellerAgent[]`).
- `findBestSeller(task)` → unchanged; it already only consumes the registry
  list. **No UI change.**

Keep this separate from the payment migration — it is independently shippable.

---

## 5. Suggested migration order (each step is demo-safe)

| Order | Change | Risk | Keeps demo working? |
| ----- | ------ | ---- | ------------------- |
| 0 | Add `network.ts`, env-config for node URLs | none | ✅ |
| 1 | `requestPayment` → real fetch (needs a test seller; or keep mock + feature flag) | medium | ✅ |
| 2 | `constructPayment` + `signPayment` → algosdk (fund a testnet wallet) | high (funding) | ✅ |
| 3 | `broadcastTx` + `settlePayment` → algod | high (network) | ✅ |
| 4 | `verifyPayment` + `retryRequest` + `executeTask` → real seller API | medium | ✅ |
| 5 | Delete `utils/crypto.ts` mock helpers; purge fake `ALGO_*` addresses from `data/agents.ts` | none | ✅ |
| 6 | (Optional) registry smart contract | high | ✅ if fallback added |

**Rollback:** because the types never change, reverting a step is a git revert
of one file — the hook and components are untouched.

---

## 6. Gotchas

- **µALGO vs ALGO.** `maxAmountRequired` and `amount` are micro-ALGO. The UI
  formats with `formatMicroAlgo` (`src/utils/format.ts`) — do not multiply
  again.
- **Nonce must round-trip.** The `note` field embeds `x402:${nonce}`; sellers
  correlate it with the challenge body.
- **Testnet confirmation is ~2–4 s.** The simulated 1.8 s was tuned for pacing;
  real flows are slower. The UI already shows a "Waiting for settlement…" step,
  but consider bumping `waitForConfirmation` timeout.
- **Fake addresses.** `ALGO_WALLET_7X3K9P2M4N8Q1R5T6W0Y` and
  `ALGO_SELLER_...` are not valid Algorand addresses (58-char base32). Replace
  them with real testnet accounts before broadcasting, or `algod` will reject
  the transaction.
- **CORS.** Public endpoints (Algonode, seller APIs) generally allow browser
  calls, but if you run your own node, enable CORS or proxy through Vite
  (`server.proxy` in `vite.config.ts`).
- **Keys never touch the UI.** If you demo a custodial key, keep it in env
  vars / backend — never in `src/` committed code.
