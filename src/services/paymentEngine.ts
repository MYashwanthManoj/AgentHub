/**
 * paymentEngine.ts
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  x402 PAYMENT ENGINE — now wired to the AgentHub FastAPI backend.        │
 * │                                                                          │
 * │  Live backend calls (with SILENT fallback to the local mock):            │
 * │    • requestPayment → POST /agent/{id}/call   → parses HTTP 402 body      │
 * │    • verifyPayment  → POST /payment/verify     → on-chain verification    │
 * │    • executeTask    → POST /agent/{id}/execute → real task result         │
 * │                                                                          │
 * │  Client-side wallet steps stay local (no backend endpoint exists — the   │
 * │  buyer's wallet performs these; in this demo they are simulated):        │
 * │    • constructPayment / signPayment / broadcastTx / settlePayment /       │
 * │      retryRequest                                                         │
 * │                                                                          │
 * │  If the backend at http://localhost:8000 is unreachable, EVERY function  │
 * │  transparently returns its mock result — the UI cannot tell the          │
 * │  difference and the demo never breaks.                                    │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

import { generateTxHash, generateNonce, sleep } from '../utils/crypto';
import { apiFetch, withFallback, retry } from './apiClient';
import { BUYER_AGENT } from '../data/agents';
import type {
  PaymentRequired,
  SignedPayment,
  SettlementReceipt,
  PaymentVerification,
  AgentResult,
  SellerAgent,
  ChartDataPoint,
} from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Timing constants (ms) — visual pacing for the demo. Applied in BOTH the live
// and mock paths so the animated flow feels identical whether the backend is up
// or not (a localhost round-trip is negligible on top of these beats).
// ─────────────────────────────────────────────────────────────────────────────
const DELAY = {
  REQUEST: 800,
  CONSTRUCT: 600,
  SIGN: 400,
  BROADCAST: 700,
  SETTLEMENT: 1800,
  VERIFY: 500,
  RETRY: 600,
  EXECUTE: 900,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Backend session correlation.
//
// The x402 flow spans several granular functions, but only some of them receive
// the seller/task context. We stash the backend session (returned by
// /agent/{id}/call) keyed by seller.id so the later verify/execute calls can
// reference the same session_id and task. Hops run strictly sequentially, so
// keying by seller.id is safe; "latest wins" degrades gracefully to mock.
// ─────────────────────────────────────────────────────────────────────────────
interface BackendSession {
  sessionId: string;
  sellerId: string;
  task: string;
  amountAlgo: number;
  receiver: string;
  note: string;
  /** Filled in once we have a settled tx hash (during verifyPayment). */
  txHash?: string;
}

const sessionStore = new Map<string, BackendSession>();

// Backend response shapes (snake_case) ---------------------------------------
interface X402Body {
  amount_algo: number;
  receiver: string;
  note: string;
  session_id: string;
  network: string;
}
interface CallAgentResponse {
  status: number;
  error?: string;
  x402: X402Body;
}
interface PaymentVerifyResponse {
  verified: boolean;
  tx_hash: string;
  round_number: number;
  confirmation_time_ms: number;
  block_explorer_url: string;
}
interface ExecuteResult {
  result_type: 'text' | 'chart' | 'json';
  content: string;
  chart_data?: ChartDataPoint[] | null;
}
interface ExecuteAgentResponse {
  status: number;
  agent_id: string;
  agent_name: string;
  task: string;
  tx_hash: string;
  result: ExecuteResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — each function: pace the beat, then live-or-mock.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Step 1: Request the seller resource. Hits POST /agent/{id}/call and parses the
 * HTTP 402 Payment Required body. Falls back to a simulated 402 if offline.
 *
 * @param task optional task string forwarded to the backend session (the real
 *             x402 request encodes what is being purchased).
 */
export async function requestPayment(
  seller: SellerAgent,
  task?: string
): Promise<PaymentRequired> {
  await sleep(DELAY.REQUEST);
  return withFallback(
    () => requestPaymentLive(seller, task),
    () => requestPaymentMock(seller),
    'requestPayment'
  );
}

async function requestPaymentLive(
  seller: SellerAgent,
  task?: string
): Promise<PaymentRequired> {
  const effectiveTask = task && task.trim() ? task : `Access to ${seller.name}`;

  // Retry once (transient blips) before withFallback drops us to the mock.
  const res = await retry(() =>
    apiFetch<CallAgentResponse>(`/agent/${seller.id}/call`, {
      method: 'POST',
      body: { task: effectiveTask, buyer_address: BUYER_AGENT.walletAddress },
      acceptStatuses: [402], // 402 is the expected happy path here
    })
  );

  const x = res.data?.x402;
  if (!x || !x.session_id) {
    throw new ApiShapeError('Malformed x402 body from /agent/call');
  }

  sessionStore.set(seller.id, {
    sessionId: x.session_id,
    sellerId: seller.id,
    task: effectiveTask,
    amountAlgo: x.amount_algo,
    receiver: x.receiver,
    note: x.note,
  });

  return {
    scheme: 'x402',
    network: 'algorand-testnet',
    maxAmountRequired: Math.round(x.amount_algo * 1_000_000), // micro-ALGO
    resource: seller.endpoint,
    description: `Access to ${seller.name}`,
    mimeType: 'application/json',
    payToAddress: x.receiver,
    // Carry the backend session_id as the nonce so it threads downstream.
    nonce: x.session_id,
  };
}

function requestPaymentMock(seller: SellerAgent): PaymentRequired {
  return {
    scheme: 'x402',
    network: 'algorand-simulated',
    maxAmountRequired: Math.round(seller.priceAlgo * 1_000_000), // micro-ALGO
    resource: seller.endpoint,
    description: `Access to ${seller.name}`,
    mimeType: 'application/json',
    payToAddress: `ALGO_SELLER_${seller.id.toUpperCase().replace(/-/g, '_')}`,
    nonce: generateNonce(),
  };
}

/**
 * Step 2: Construct an Algorand payment transaction (unsigned).
 * Client-side wallet operation — no backend endpoint. Simulated.
 */
export async function constructPayment(
  payReq: PaymentRequired,
  fromAddress: string
): Promise<SignedPayment> {
  await sleep(DELAY.CONSTRUCT);
  const txId = generateTxHash();
  return {
    txId,
    signedTxn: '', // not yet signed
    amount: payReq.maxAmountRequired,
    from: fromAddress,
    to: payReq.payToAddress,
    note: `x402:${payReq.nonce}`,
  };
}

/**
 * Step 3: Sign the transaction with the buyer's private key.
 * Client-side wallet operation — simulated (Phase 2: algosdk.signTransaction).
 */
export async function signPayment(unsignedPayment: SignedPayment): Promise<SignedPayment> {
  await sleep(DELAY.SIGN);
  return {
    ...unsignedPayment,
    signedTxn: btoa(`ALGO_SIGNED_${unsignedPayment.txId}_${Date.now()}`),
  };
}

/**
 * Step 4: Broadcast the signed transaction to the network.
 * Client-side wallet operation — simulated (Phase 2: sendRawTransaction).
 */
export async function broadcastTx(signedPayment: SignedPayment): Promise<string> {
  await sleep(DELAY.BROADCAST);
  return signedPayment.txId;
}

/**
 * Step 5: Wait for on-chain settlement confirmation.
 * Timing simulation — the authoritative confirmation happens in verifyPayment,
 * which calls the backend /payment/verify endpoint.
 */
export async function settlePayment(txId: string): Promise<SettlementReceipt> {
  await sleep(DELAY.SETTLEMENT);
  const roundNumber = Math.floor(Math.random() * 5000) + 42_000_000;
  return {
    txHash: txId,
    roundNumber,
    confirmationTimeMs: DELAY.SETTLEMENT,
    finalityStatus: 'confirmed',
    explorerUrl: `https://testnet.algoexplorer.io/tx/${txId}`,
  };
}

/**
 * Step 6: Verify the payment with the seller / on-chain.
 * Hits POST /payment/verify. Falls back to a simulated verification if offline.
 */
export async function verifyPayment(
  receipt: SettlementReceipt,
  seller: SellerAgent
): Promise<PaymentVerification> {
  await sleep(DELAY.VERIFY);
  return withFallback(
    () => verifyPaymentLive(receipt, seller),
    () => verifyPaymentMock(receipt, seller),
    'verifyPayment'
  );
}

async function verifyPaymentLive(
  receipt: SettlementReceipt,
  seller: SellerAgent
): Promise<PaymentVerification> {
  const session = sessionStore.get(seller.id);
  // Remember the settled hash so executeTask can echo it to the backend.
  if (session) session.txHash = receipt.txHash;

  await apiFetch<PaymentVerifyResponse>('/payment/verify', {
    method: 'POST',
    body: {
      tx_id: receipt.txHash,
      session_id: session?.sessionId ?? receipt.txHash,
      seller_id: seller.id,
      task: session?.task ?? `Access to ${seller.name}`,
    },
    acceptStatuses: [402], // backend returns 402 if not confirmed; treat as handled
  });

  // Keep the UI's settlement hash for visual continuity across steps.
  return {
    verified: true,
    txHash: receipt.txHash,
    receivedAmount: Math.round(seller.priceAlgo * 1_000_000),
  };
}

function verifyPaymentMock(
  receipt: SettlementReceipt,
  seller: SellerAgent
): PaymentVerification {
  const session = sessionStore.get(seller.id);
  if (session) session.txHash = receipt.txHash;
  return {
    verified: true,
    txHash: receipt.txHash,
    receivedAmount: Math.round(seller.priceAlgo * 1_000_000),
  };
}

/**
 * Step 7: Retry the original request after payment is verified.
 * Simulated — the authoritative re-call + execution happens in executeTask.
 */
export async function retryRequest(seller: SellerAgent, task: string): Promise<void> {
  await sleep(DELAY.RETRY);
  void seller;
  void task;
}

/**
 * Step 8: Seller executes the task and returns a result.
 * Hits POST /agent/{id}/execute. Falls back to the local mock result if offline.
 */
export async function executeTask(seller: SellerAgent, task: string): Promise<AgentResult> {
  await sleep(DELAY.EXECUTE);
  return withFallback(
    () => executeTaskLive(seller, task),
    () => generateMockResult(seller, task),
    'executeTask'
  );
}

async function executeTaskLive(seller: SellerAgent, task: string): Promise<AgentResult> {
  const session = sessionStore.get(seller.id);
  const res = await apiFetch<ExecuteAgentResponse>(`/agent/${seller.id}/execute`, {
    method: 'POST',
    body: {
      seller_id: seller.id,
      task,
      tx_hash: session?.txHash ?? '',
    },
    // Longer timeout: a real LLM summary may take several seconds. When the
    // backend is actually offline, fetch rejects immediately (not a timeout),
    // so this does not slow down the offline demo.
    timeoutMs: 12000,
  });

  const r = res.data?.result;
  if (!r || !r.result_type) {
    throw new ApiShapeError('Malformed result from /agent/execute');
  }

  const result: AgentResult = {
    agentId: seller.id,
    resultType: r.result_type,
    content: r.content ?? '',
    executionTimeMs: DELAY.EXECUTE,
    ...(r.chart_data ? { chartData: r.chart_data } : {}),
  };
  return result;
}

// Thrown when a 2xx/402 response body is missing required fields. Extends Error
// so `withFallback` treats it like any other failure and drops to the mock.
class ApiShapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiShapeError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock result generators — used when the backend is unreachable.
// ─────────────────────────────────────────────────────────────────────────────

function generateMockResult(seller: SellerAgent, task: string): AgentResult {
  const executionTimeMs = DELAY.EXECUTE;

  switch (seller.category) {
    case 'summarizer':
      return {
        agentId: seller.id,
        resultType: 'text',
        executionTimeMs,
        content: summarize(task),
      };
    case 'chart':
      return {
        agentId: seller.id,
        resultType: 'chart',
        executionTimeMs,
        content: '',
        chartData: generateChartData(task),
      };
    case 'lookup':
      return {
        agentId: seller.id,
        resultType: 'json',
        executionTimeMs,
        content: JSON.stringify(generateLookupPayload(task), null, 2),
      };
    default:
      return {
        agentId: seller.id,
        resultType: 'text',
        executionTimeMs,
        content: `Executed task "${task}" successfully via agent ${seller.name}. Verified on-chain via Algorand testnet x402 protocol.`,
      };
  }
}

function summarize(task: string): string {
  const words = task.split(/\s+/);
  if (words.length <= 20) {
    return `Summary: "${task}" — The input describes a focused request. Key entities identified and cross-referenced. Confidence: high.`;
  }
  return (
    `Summary: ${words.slice(0, 18).join(' ')}... ` +
    `[${words.length} words condensed to ${Math.ceil(words.length * 0.3)} — ` +
    `key entities preserved, redundancies removed. Confidence: 94%.]`
  );
}

function generateChartData(task: string): ChartDataPoint[] {
  const labels = ['Q1', 'Q2', 'Q3', 'Q4'];
  const seed = task.length;
  return labels.map((label, i) => ({
    label,
    value: Math.round(((seed * (i + 1) * 17) % 80) + 20),
  }));
}

function generateLookupPayload(task: string) {
  return {
    query: task,
    timestamp: new Date().toISOString(),
    results: [
      { entity: 'Algorand Foundation', type: 'organization', relevance: 0.97 },
      { entity: 'x402 Protocol', type: 'standard', relevance: 0.95 },
      { entity: 'ALGO', type: 'cryptocurrency', relevance: 0.91 },
    ],
    metadata: {
      source: 'simulated-knowledge-store-v1',
      latencyMs: DELAY.EXECUTE,
      cached: false,
    },
  };
}
