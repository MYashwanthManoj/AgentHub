/**
 * useMultiHopFlow.ts
 *
 * Self-contained pipeline hook for the multi-agent workflow.
 *
 * KEY DESIGN: This hook runs payment hops sequentially WITHOUT touching the
 * global step state in useTransactionFlow. Each hop calls paymentEngine
 * functions directly, so the TransactionFlow panel (single-hop view) is
 * never reset mid-workflow.
 *
 * Phase 2 migration: same as paymentEngine.ts — swap the internal calls
 * with real algosdk equivalents. All exported types stay identical.
 */

import { useState, useCallback } from 'react';
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
import { generateId } from '../utils/crypto';
import { BUYER_AGENT } from '../data/agents';
import type { SellerAgent, LedgerEntry, AgentResult } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Public types (exported so MultiHopPanel and MarketplacePage can import them)
// ─────────────────────────────────────────────────────────────────────────────

export interface HopState {
  hopIndex: number;
  sellerName: string;
  task: string;
  status: 'pending' | 'running' | 'done' | 'error';
  ledgerEntry?: LedgerEntry;
  result?: AgentResult;
}

export interface WorkflowStep {
  seller: SellerAgent;
  task: string;
}

export interface UseMultiHopFlowReturn {
  hops: HopState[];
  isRunning: boolean;
  isComplete: boolean;
  totalSpent: number;
  runWorkflow: (
    steps: WorkflowStep[],
    onHopComplete: (entry: LedgerEntry) => void
  ) => Promise<void>;
  resetWorkflow: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useMultiHopFlow(): UseMultiHopFlowReturn {
  const [hops, setHops] = useState<HopState[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [totalSpent, setTotalSpent] = useState(0);

  const runWorkflow = useCallback(
    async (
      steps: WorkflowStep[],
      onHopComplete: (entry: LedgerEntry) => void
    ) => {
      setIsRunning(true);
      setIsComplete(false);
      setTotalSpent(0);

      // Initialise all hops as pending
      setHops(
        steps.map((s, i) => ({
          hopIndex: i,
          sellerName: s.seller.name,
          task: s.task,
          status: 'pending' as const,
        }))
      );

      let spent = 0;

      for (let i = 0; i < steps.length; i++) {
        const { seller, task } = steps[i];

        // Mark this hop as running
        setHops((prev) =>
          prev.map((h) => (h.hopIndex === i ? { ...h, status: 'running' as const } : h))
        );

        try {
          // Full x402 payment pipeline — isolated from useTransactionFlow state
          const payReq   = await requestPayment(seller, task);
          const unsigned = await constructPayment(payReq, BUYER_AGENT.walletAddress);
          const signed   = await signPayment(unsigned);
          const txId     = await broadcastTx(signed);
          const receipt  = await settlePayment(txId);
          await verifyPayment(receipt, seller);
          await retryRequest(seller, task);
          const agentResult = await executeTask(seller, task);

          const entry: LedgerEntry = {
            id: generateId(),
            timestamp: Date.now(),
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
              agentResult.resultType !== 'chart'
                ? agentResult.content.slice(0, 120)
                : '[Chart data]',
          };

          spent += entry.priceAlgo;
          onHopComplete(entry);

          setHops((prev) =>
            prev.map((h) =>
              h.hopIndex === i
                ? { ...h, status: 'done' as const, ledgerEntry: entry, result: agentResult }
                : h
            )
          );
        } catch {
          setHops((prev) =>
            prev.map((h) =>
              h.hopIndex === i ? { ...h, status: 'error' as const } : h
            )
          );
        }

        // Brief pause between hops for visual clarity
        if (i < steps.length - 1) {
          await new Promise((r) => setTimeout(r, 700));
        }
      }

      setTotalSpent(spent);
      setIsRunning(false);
      setIsComplete(true);
    },
    []
  );

  const resetWorkflow = useCallback(() => {
    setHops([]);
    setIsRunning(false);
    setIsComplete(false);
    setTotalSpent(0);
  }, []);

  return { hops, isRunning, isComplete, totalSpent, runWorkflow, resetWorkflow };
}
