/**
 * agentRouter.ts
 *
 * Given a free-text user request, determines which seller agent should
 * handle it and returns seller metadata.
 *
 * No UI logic. No side effects. Pure functions only.
 *
 * Phase 2 migration: swap `findBestSeller` with a smart-contract registry
 * lookup without touching this file.
 */

import { findBestSeller } from './registryService';
import type { SellerAgent } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface RoutingResult {
  seller: SellerAgent;
  confidence: 'high' | 'medium' | 'low';
  matchedKeywords: string[];
}

/**
 * Routes a task string to the best available seller agent.
 * Returns routing metadata so the UI can display matched keywords.
 */
export function routeTask(task: string): RoutingResult {
  const seller = findBestSeller(task);
  const tokens = task.toLowerCase().split(/\W+/).filter(Boolean);
  const matchedKeywords = seller.keywords.filter((kw) => tokens.includes(kw));

  const confidence: RoutingResult['confidence'] =
    matchedKeywords.length >= 2
      ? 'high'
      : matchedKeywords.length === 1
      ? 'medium'
      : 'low';

  return { seller, confidence, matchedKeywords };
}

/**
 * Convenience: returns just the seller for a given task.
 */
export function selectSeller(task: string): SellerAgent {
  return routeTask(task).seller;
}
