/**
 * registryService.ts
 *
 * Responsibilities:
 *  - Hold the seller registry in a mutable in-memory cache (seeded from static
 *    data, hydrated from the backend).
 *  - Search / filter sellers.
 *  - Keyword-based best-match ranking.
 *
 * Backend wiring: `hydrateRegistry()` fetches GET http://localhost:8000/registry/
 * and replaces the cache, notifying subscribers so the UI re-renders. All the
 * existing SYNCHRONOUS functions (`loadRegistry`, `searchRegistry`,
 * `findBestSeller`) keep working unchanged — they simply read the current cache,
 * which is the static seed until hydration completes (and the seed mirrors the
 * backend, so routing is correct either way).
 */

import { SELLER_AGENTS } from '../data/agents';
import { apiFetch } from './apiClient';
import type { SellerAgent, AgentCategory } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Cache + subscription (external store for React's useSyncExternalStore)
// ─────────────────────────────────────────────────────────────────────────────

let registryCache: SellerAgent[] = [...SELLER_AGENTS];
let hydrated = false;
const subscribers = new Set<() => void>();

function notify(): void {
  for (const fn of subscribers) fn();
}

/** Subscribe to registry changes. Returns an unsubscribe fn. */
export function subscribeRegistry(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

/**
 * Stable snapshot for useSyncExternalStore — returns the SAME array reference
 * until the cache is replaced by hydration (required to avoid render loops).
 */
export function getRegistrySnapshot(): SellerAgent[] {
  return registryCache;
}

/** True once the backend registry has successfully replaced the seed. */
export function isRegistryHydrated(): boolean {
  return hydrated;
}

// ─────────────────────────────────────────────────────────────────────────────
// Backend shape → SellerAgent mapping
// ─────────────────────────────────────────────────────────────────────────────

interface BackendAgent {
  id: string;
  name: string;
  description: string;
  category: string;
  priceAlgo: number;
  reputationScore: number;
  endpoint: string;
  walletAddress?: string;
  tags?: string[];
}

function fromBackend(a: BackendAgent): SellerAgent {
  return {
    id: a.id,
    name: a.name,
    description: a.description,
    priceAlgo: a.priceAlgo,
    reputation: a.reputationScore,
    category: a.category as AgentCategory,
    endpoint: a.endpoint,
    keywords: a.tags ?? [],
  };
}

/**
 * Fetch the registry from the backend and replace the cache. On any failure
 * (or an empty response) the static seed is kept — the demo works offline.
 * Safe to call multiple times; notifies subscribers only when data changes.
 */
export async function hydrateRegistry(): Promise<SellerAgent[]> {
  try {
    const res = await apiFetch<BackendAgent[]>('/registry/', { timeoutMs: 3000 });
    if (Array.isArray(res.data) && res.data.length > 0) {
      registryCache = res.data.map(fromBackend);
      hydrated = true;
      notify();
    }
  } catch {
    /* backend offline — keep the static seed */
  }
  return registryCache;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API (synchronous — reads the current cache)
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the full registry (current cache snapshot). */
export function loadRegistry(): SellerAgent[] {
  return [...registryCache];
}

/**
 * Fuzzy keyword search across name, description and keyword list.
 * Returns sellers whose score exceeds 0, sorted descending.
 */
export function searchRegistry(query: string): SellerAgent[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return loadRegistry();

  return loadRegistry()
    .map((agent) => ({ agent, score: scoreAgent(agent, tokens) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ agent }) => agent);
}

/**
 * Returns the single best-matching seller for a given task string.
 * Falls back to the highest-reputation agent if no match.
 */
export function findBestSeller(task: string): SellerAgent {
  const results = searchRegistry(task);
  if (results.length > 0) return results[0];

  // Fallback: highest reputation
  return loadRegistry().sort((a, b) => b.reputation - a.reputation)[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter(Boolean);
}

function scoreAgent(agent: SellerAgent, tokens: string[]): number {
  let score = 0;
  const searchTarget = [
    agent.name,
    agent.description,
    ...agent.keywords,
    agent.category,
  ]
    .join(' ')
    .toLowerCase();

  for (const token of tokens) {
    if (agent.keywords.includes(token)) score += 3;
    else if (searchTarget.includes(token)) score += 1;
  }

  // Reputation tie-breaker (0–1 range)
  score += agent.reputation / 1000;
  return score;
}
