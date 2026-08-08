/**
 * useTransactionFlow.ts
 *
 * Orchestrates the complete x402 payment flow.
 * Calls paymentEngine functions in sequence, emitting step updates to the UI.
 *
 * The UI never calls paymentEngine directly — it only calls `runFlow`.
 * This keeps all async orchestration in one place.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  requestPayment,
  constructPayment,
  signPayment,
  broadcastTx,
  settlePayment,
  verifyPayment,
  retryRequest,
  executeTask,
} from '../services/paymentEngine';
import { openFlowStream, canStreamFlow } from '../services/flowStream';
import { generateId } from '../utils/crypto';
import { BUYER_AGENT } from '../data/agents';
import type { FlowStep, LedgerEntry, AgentResult, SellerAgent, StepStatus } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Step definitions (ids used for keying and CSS animations)
// ─────────────────────────────────────────────────────────────────────────────
const STEP_DEFINITIONS: Array<{ id: string; label: string }> = [
  { id: 'search',    label: 'Buyer Agent searching registry...' },
  { id: 'found',     label: 'Seller found in registry' },
  { id: 'calling',   label: 'Calling seller endpoint' },
  { id: 'http402',   label: 'HTTP 402 Payment Required' },
  { id: 'construct', label: 'Constructing Algorand payment' },
  { id: 'sign',      label: 'Signing transaction' },
  { id: 'broadcast', label: 'Broadcasting to network' },
  { id: 'settle',    label: 'Waiting for settlement...' },
  { id: 'confirmed', label: 'Transaction confirmed on-chain' },
  { id: 'retry',     label: 'Retrying request with payment proof' },
  { id: 'http200',   label: 'HTTP 200 OK — Access granted' },
  { id: 'execute',   label: 'Seller executing task' },
  { id: 'result',    label: 'Result returned' },
  { id: 'done',      label: 'Flow complete' },
];

function buildInitialSteps(): FlowStep[] {
  return STEP_DEFINITIONS.map((s) => ({ ...s, status: 'pending' as StepStatus }));
}

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket step correlation
//
// The backend streams its own step ids (/ws/flow/{session_id}); map them onto
// the frontend timeline so real-time telemetry drives the same 14-step UI.
// ─────────────────────────────────────────────────────────────────────────────

const WS_STEP_MAP: Record<string, string> = {
  REGISTRY_SEARCH: 'search',
  SELLER_FOUND: 'found',
  CALL_ENDPOINT: 'calling',
  HTTP_402: 'http402',
  CONSTRUCT_TX: 'construct',
  SIGN_TX: 'sign',
  BROADCAST_TX: 'broadcast',
  WAIT_CONFIRM: 'settle',
  PAYMENT_SETTLED: 'confirmed',
  VERIFY_ONCHAIN: 'retry',
  RETRY_REQUEST: 'http200',
  SELLER_VALIDATES: 'execute',
  HTTP_200: 'result',
  TASK_EXECUTING: 'done',
};

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface UseTransactionFlowReturn {
  steps: FlowStep[];
  isRunning: boolean;
  /** True while a live WebSocket stream is driving the timeline. */
  isStreaming: boolean;
  result: AgentResult | null;
  ledgerEntry: LedgerEntry | null;
  runFlow: (seller: SellerAgent, task: string) => Promise<LedgerEntry>;
  resetFlow: () => void;
}

export function useTransactionFlow(): UseTransactionFlowReturn {
  const [steps, setSteps] = useState<FlowStep[]>(buildInitialSteps());
  const [isRunning, setIsRunning] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [ledgerEntry, setLedgerEntry] = useState<LedgerEntry | null>(null);

  // Live WS stream — closed on unmount / reset so no socket leaks.
  const streamRef = useRef<ReturnType<typeof openFlowStream> | null>(null);
  const streamActive = useRef(false);

  useEffect(() => {
    return () => {
      streamRef.current?.close();
      streamRef.current = null;
    };
  }, []);

  /** Merge a partial patch into one step. */
  const applyStep = useCallback((id: string, patch: Partial<FlowStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  /**
   * Marks a step as active (fades in), then done after the async work.
   * When the WS stream is live it owns the status transitions; the client
   * pipeline only enriches steps with details / timestamps / tx hashes.
   */
  const activate = (id: string, detail?: string, extra?: Partial<FlowStep>) => {
    const patch: Partial<FlowStep> = { detail, timestamp: Date.now(), ...extra };
    if (!streamActive.current) patch.status = 'active';
    applyStep(id, patch);
  };

  const complete = (id: string, detail?: string, extra?: Partial<FlowStep>) => {
    const patch: Partial<FlowStep> = { detail, ...extra };
    if (!streamActive.current) patch.status = 'done';
    applyStep(id, patch);
  };

  const runFlow = useCallback(
    async (seller: SellerAgent, task: string): Promise<LedgerEntry> => {
      setIsRunning(true);
      setIsStreaming(false);
      setResult(null);
      setLedgerEntry(null);
      setSteps(buildInitialSteps());

      // Realtime telemetry: stream step progress from the backend when it's
      // reachable. Falls back silently to local pacing otherwise.
      streamRef.current?.close();
      streamRef.current = null;
      streamActive.current = false;

      if (canStreamFlow()) {
        const sessionId = `flow-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        streamRef.current = openFlowStream(sessionId, {
          onStep: (wsStepId, status, label, httpStatus) => {
            const stepId = WS_STEP_MAP[wsStepId];
            if (!stepId) return;
            streamActive.current = true;
            setIsStreaming(true);
            applyStep(stepId, {
              status,
              label: label ?? undefined,
              httpStatus,
              timestamp: Date.now(),
            });
          },
          onComplete: () => {
            // The authoritative result + ledger entry come from the client
            // pipeline; the stream only drives the visual timeline.
          },
          onError: () => {
            // Socket dropped — hand step-driving back to the client pipeline.
            streamActive.current = false;
            setIsStreaming(false);
          },
        });
      }

      const flowStart = Date.now();

      try {
        // 1. Search registry
        activate('search');
        await new Promise((r) => setTimeout(r, 600));
        complete('search', `Registry queried — ${seller.name} matched`);

        // 2. Found seller
        activate('found', `Seller: ${seller.name} @ ${seller.priceAlgo} ALGO`);
        await new Promise((r) => setTimeout(r, 400));
        complete('found', `Endpoint: ${seller.endpoint}`);

        // 3. Call endpoint
        activate('calling', `POST ${seller.endpoint}`);
        const payReq = await requestPayment(seller, task);
        complete('calling', `Response received`);

        // 4. HTTP 402
        activate('http402', `402 Payment Required — ${seller.priceAlgo} ALGO`, { httpStatus: 402 });
        await new Promise((r) => setTimeout(r, 300));
        complete('http402', `x402 scheme detected — nonce: ${payReq.nonce.slice(0, 16)}...`, { httpStatus: 402 });

        // 5. Construct payment
        activate('construct', `Building transaction: ${BUYER_AGENT.walletAddress} → ${payReq.payToAddress}`);
        const unsigned = await constructPayment(payReq, BUYER_AGENT.walletAddress);
        complete('construct', `txId: ${unsigned.txId}`, { txHash: unsigned.txId });

        // 6. Sign
        activate('sign', 'Signing with buyer private key...');
        const signed = await signPayment(unsigned);
        complete('sign', 'Transaction signed successfully', { txHash: signed.txId });

        // 7. Broadcast
        activate('broadcast', 'Broadcasting signed transaction...');
        const txId = await broadcastTx(signed);
        complete('broadcast', `txId: ${txId} submitted to mempool`, { txHash: txId });

        // 8. Settlement
        activate('settle', 'Awaiting block confirmation...');
        const receipt = await settlePayment(txId);
        complete('settle', `Round #${receipt.roundNumber} — ${receipt.confirmationTimeMs}ms`);

        // 9. Confirmed
        activate('confirmed', `Hash: ${receipt.txHash}`, { txHash: receipt.txHash });
        await verifyPayment(receipt, seller);
        complete('confirmed', `Finality: ${receipt.finalityStatus}`, { txHash: receipt.txHash });

        // 10. Retry
        activate('retry', 'Sending payment proof to seller...');
        await retryRequest(seller, task);
        complete('retry', 'X-Payment-Receipt header accepted');

        // 11. HTTP 200
        activate('http200', '200 OK — service access granted', { httpStatus: 200 });
        await new Promise((r) => setTimeout(r, 300));
        complete('http200', 'Seller verified payment on-chain', { httpStatus: 200 });

        // 12. Execute
        activate('execute', `Executing: "${task}"`);
        const agentResult = await executeTask(seller, task);
        complete('execute', `Executed in ${agentResult.executionTimeMs}ms`);
        setResult(agentResult);

        // 13. Result
        activate('result', 'Packaging response payload...');
        await new Promise((r) => setTimeout(r, 200));
        complete('result', 'Payload delivered to buyer agent');

        // 14. Done
        activate('done', `Total time: ${Date.now() - flowStart}ms`);
        await new Promise((r) => setTimeout(r, 100));
        complete('done', 'Transaction settled and recorded in ledger');

        // Build ledger entry
        const entry: LedgerEntry = {
          id: generateId(),
          timestamp: flowStart,
          buyerId: BUYER_AGENT.id,
          buyerName: BUYER_AGENT.name,
          sellerId: seller.id,
          sellerName: seller.name,
          priceAlgo: seller.priceAlgo,
          status: 'confirmed',
          txHash: receipt.txHash,
          confirmationTimeMs: receipt.confirmationTimeMs,
          roundNumber: receipt.roundNumber,
          task,
          result:
            agentResult.resultType === 'text' || agentResult.resultType === 'json'
              ? agentResult.content.slice(0, 120)
              : '[Chart data]',
        };

        setLedgerEntry(entry);
        return entry;
      } finally {
        // Always clear the running state — even if a step throws mid-pipeline.
        streamRef.current?.close();
        streamRef.current = null;
        streamActive.current = false;
        setIsStreaming(false);
        setIsRunning(false);
      }
    },
    [applyStep]
  );

  const resetFlow = useCallback(() => {
    streamRef.current?.close();
    streamRef.current = null;
    streamActive.current = false;
    setIsStreaming(false);
    setSteps(buildInitialSteps());
    setResult(null);
    setLedgerEntry(null);
    setIsRunning(false);
  }, []);

  return { steps, isRunning, isStreaming, result, ledgerEntry, runFlow, resetFlow };
}
