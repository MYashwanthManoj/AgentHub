/**
 * crypto.ts — utility helpers for generating realistic blockchain artifacts.
 *
 * These are deterministic mock helpers.
 * Phase 2: remove this file entirely; use the algosdk equivalents.
 */

const HEX_CHARS = '0123456789ABCDEF';

function randomHex(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += HEX_CHARS[Math.floor(Math.random() * 16)];
  }
  return result;
}

/** Generates a realistic Algorand-style transaction hash. */
export function generateTxHash(): string {
  return `ALGO_TX_${randomHex(12)}`;
}

/** Generates a cryptographic nonce for x402 payment requests. */
export function generateNonce(): string {
  return `NONCE_${randomHex(8)}_${Date.now().toString(36).toUpperCase()}`;
}

/** Generates a UUID-like ledger entry ID. */
export function generateId(): string {
  return `${randomHex(8)}-${randomHex(4)}-${randomHex(4)}-${randomHex(4)}-${randomHex(12)}`.toLowerCase();
}

/** Promise-based sleep for simulating async delays. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
