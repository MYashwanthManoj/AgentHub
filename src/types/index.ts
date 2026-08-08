/**
 * Core domain types for the BlockHack x402 Service Registry Demo.
 *
 * All types are defined here so every module shares the same contract.
 * Never import types from a feature module — always import from here.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Agent / Seller types
// ─────────────────────────────────────────────────────────────────────────────

export type AgentCategory =
  | 'summarizer'
  | 'chart'
  | 'lookup'
  | 'orchestrator'
  | 'auditor'
  | 'analytics'
  | 'extractor'
  | 'security'
  | 'translator'
  | 'custom'
  | string;

export interface SellerAgent {
  id: string;
  name: string;
  description: string;
  /** Price in ALGO (micro-units stored as number for display) */
  priceAlgo: number;
  /** 0–100 reputation score */
  reputation: number;
  category: AgentCategory;
  endpoint: string;
  keywords: string[];
}

export interface BuyerAgent {
  id: string;
  name: string;
  walletAddress: string;
  balanceAlgo: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment / x402 types
// ─────────────────────────────────────────────────────────────────────────────

/** Mirror of the x402 HTTP 402 response body */
export interface PaymentRequired {
  scheme: 'x402';
  network: 'algorand-testnet' | 'algorand-mainnet' | 'algorand-simulated';
  maxAmountRequired: number; // micro-ALGO
  resource: string;
  description: string;
  mimeType: string;
  payToAddress: string;
  nonce: string;
}

/** Signed payment ready to be broadcast */
export interface SignedPayment {
  txId: string;
  signedTxn: string; // base64 encoded (mocked)
  amount: number;
  from: string;
  to: string;
  note: string;
}

/** On-chain settlement receipt */
export interface SettlementReceipt {
  txHash: string;
  roundNumber: number;
  confirmationTimeMs: number;
  finalityStatus: 'confirmed' | 'pending' | 'failed';
  explorerUrl: string;
}

/** Verification response from the seller after payment */
export interface PaymentVerification {
  verified: boolean;
  txHash: string;
  receivedAmount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Transaction flow step types
// ─────────────────────────────────────────────────────────────────────────────

export type StepStatus = 'pending' | 'active' | 'done' | 'error';

export interface FlowStep {
  id: string;
  label: string;
  detail?: string;
  status: StepStatus;
  timestamp?: number;
  /** Optional HTTP status badge, e.g. 402, 200 */
  httpStatus?: number;
  txHash?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ledger types
// ─────────────────────────────────────────────────────────────────────────────

export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export interface LedgerEntry {
  id: string;
  timestamp: number;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  priceAlgo: number;
  status: TransactionStatus;
  txHash: string;
  confirmationTimeMs: number;
  roundNumber: number;
  task: string;
  result?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent result types
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentResult {
  agentId: string;
  resultType: 'text' | 'chart' | 'json' | 'image';
  content: string; // for text / JSON / image URL
  chartData?: ChartDataPoint[]; // for chart
  executionTimeMs: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mode / Network
// ─────────────────────────────────────────────────────────────────────────────

export type NetworkMode = 'simulated' | 'testnet' | 'mainnet';

// ─────────────────────────────────────────────────────────────────────────────
// Wallet funding types
// ─────────────────────────────────────────────────────────────────────────────

export type FundingStatus = 'pending' | 'confirmed';

export type FundingMethod = 'genesis' | 'faucet' | 'transfer' | 'card';

/** A wallet top-up — refills the funded balance and is logged persistently. */
export interface FundingEntry {
  id: string;
  amount: number;
  method: FundingMethod;
  status: FundingStatus;
  /** Display note, e.g. "Initial wallet funding". */
  note?: string;
  /** Deterministic fake on-chain tx hash (ALGO_TX_<hex> format). */
  txHash?: string;
  /** ms epoch for sorting / relative labels. */
  createdAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-hop workflow
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkflowStep {
  sellerId: string;
  task: string;
}

export interface MultiHopWorkflow {
  id: string;
  steps: WorkflowStep[];
  results: AgentResult[];
  ledgerEntries: LedgerEntry[];
  status: 'idle' | 'running' | 'done' | 'error';
}
