/**
 * useLedger.ts
 *
 * Manages the persistent transaction ledger.
 *
 * Storage strategy (backend-first, offline-safe):
 *  - localStorage is the instant, always-available cache. State is seeded from it
 *    synchronously so the ledger renders immediately with no flash.
 *  - On mount we GET /ledger from the FastAPI backend and RECONCILE:
 *      • backend entries are the source of truth,
 *      • any local-only entries (created while the backend was offline) are kept
 *        AND back-filled to the backend via POST,
 *      • the merged, de-duplicated set (newest first) becomes the visible ledger.
 *  - addEntry writes locally (optimistic, instant) and POSTs to /ledger.
 *  - clearLedger clears locally and DELETEs /ledger.
 *
 * Every network call fails silently — the app works fully offline on localStorage.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../services/apiClient';
import type { LedgerEntry, TransactionStatus } from '../types';
import { FUNDING_SYNC_EVENT, getFundedBalance } from './useWalletFunding';

const STORAGE_KEY = 'blockhack_ledger_v1';
/**
 * Fired by addEntry/clearLedger AFTER localStorage is written, so every other
 * useLedger instance in the same tab (e.g. the TopHeader wallet pill) re-reads
 * the cache and updates live. Only mutations dispatch — no feedback loops.
 */
const LEDGER_SYNC_EVENT = 'agenthub-ledger-sync';

function loadFromStorage(): LedgerEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LedgerEntry[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(entries: LedgerEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* storage full / disabled — non-fatal */
  }
}

// ─── Backend <-> frontend mapping ────────────────────────────────────────────

/** Shape returned by GET /ledger (already camelCase, but timestamp is an ISO string). */
interface BackendLedgerEntry {
  id: string;
  timestamp: string | number;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  priceAlgo: number;
  status: string;
  txHash: string;
  confirmationTimeMs: number;
  roundNumber: number;
  task: string;
  result?: string | null;
}

function fromBackend(e: BackendLedgerEntry): LedgerEntry {
  const ts =
    typeof e.timestamp === 'number' ? e.timestamp : Date.parse(e.timestamp) || Date.now();
  return {
    id: e.id,
    timestamp: ts,
    buyerId: e.buyerId,
    buyerName: e.buyerName,
    sellerId: e.sellerId,
    sellerName: e.sellerName,
    priceAlgo: e.priceAlgo,
    status: (e.status as TransactionStatus) ?? 'confirmed',
    txHash: e.txHash,
    confirmationTimeMs: e.confirmationTimeMs,
    roundNumber: e.roundNumber,
    task: e.task,
    result: e.result ?? undefined,
  };
}

/** Body for POST /ledger (snake_case — mirrors LedgerEntryCreate). */
function toCreateBody(e: LedgerEntry) {
  return {
    buyer_id: e.buyerId,
    buyer_name: e.buyerName,
    seller_id: e.sellerId,
    seller_name: e.sellerName,
    price_algo: e.priceAlgo,
    tx_hash: e.txHash,
    confirmation_time_ms: e.confirmationTimeMs,
    round_number: e.roundNumber,
    task: e.task,
    result: e.result ?? null,
  };
}

/** Fire-and-forget POST — never throws into the UI. */
async function postEntry(entry: LedgerEntry): Promise<void> {
  try {
    await apiFetch('/ledger/', { method: 'POST', body: toCreateBody(entry) });
  } catch {
    /* offline — localStorage already holds it */
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseLedgerReturn {
  entries: LedgerEntry[];
  addEntry: (entry: LedgerEntry) => void;
  clearLedger: () => void;
  totalSpent: number;
  totalTransactions: number;
  /** Confirmed funds in the wallet (genesis + top-ups) — see useWalletFunding. */
  fundedBalance: number;
  /** Current wallet balance — funded balance minus confirmed spends (never negative). */
  availableBalance: number;
}

export function useLedger(): UseLedgerReturn {
  const [entries, setEntries] = useState<LedgerEntry[]>(loadFromStorage);
  const [fundedBalance, setFundedBalance] = useState(getFundedBalance);
  const didHydrate = useRef(false);

  // Persist on every change (offline cache).
  useEffect(() => {
    saveToStorage(entries);
  }, [entries]);

  // Stay live with other instances in the same tab (e.g. the header pill
  // updates the instant a purchase settles on the playground page).
  useEffect(() => {
    const onLedgerSync = () => {
      const synced = loadFromStorage();
      setEntries((prev) => {
        const changed =
          prev.length !== synced.length ||
          prev.some((e, i) => e.id !== synced[i]?.id || e.status !== synced[i]?.status);
        return changed ? synced : prev;
      });
    };
    window.addEventListener(LEDGER_SYNC_EVENT, onLedgerSync);
    return () => window.removeEventListener(LEDGER_SYNC_EVENT, onLedgerSync);
  }, []);

  // Recompute the funded balance whenever a top-up confirms elsewhere in the
  // tab (useWalletFunding dispatches this after its confirmed sum changes —
  // e.g. a Top Up on the wallet page updates the header pill instantly).
  useEffect(() => {
    const onFundingSync = () => setFundedBalance(getFundedBalance());
    window.addEventListener(FUNDING_SYNC_EVENT, onFundingSync);
    return () => window.removeEventListener(FUNDING_SYNC_EVENT, onFundingSync);
  }, []);

  // On mount: reconcile with the backend ledger (once).
  //
  // NOTE: there is deliberately NO cleanup `cancelled` flag here. StrictMode
  // runs mount → cleanup → mount in dev, and the cleanup would flip the flag
  // before the async GET resolves — silently killing the back-fill. The
  // `didHydrate` ref already guards against duplicate runs across the remount.
  useEffect(() => {
    if (didHydrate.current) return;
    didHydrate.current = true;

    (async () => {
      try {
        const res = await apiFetch<BackendLedgerEntry[]>('/ledger/', { timeoutMs: 3000 });
        if (!Array.isArray(res.data)) return;

        const backend = res.data.map(fromBackend);
        const backendHashes = new Set(backend.map((e) => e.txHash));

        // Local entries the backend never persisted (created while offline).
        const localOnly = loadFromStorage().filter((e) => !backendHashes.has(e.txHash));

        // Back-fill local-only entries to the backend so it becomes complete.
        for (const e of localOnly) void postEntry(e);

        // Merge, de-dupe by txHash, newest first — computed against CURRENT
        // state so an entry added while the GET was in flight is never
        // clobbered. Local rows win for same-hash collisions (they carry the
        // freshest optimistic edits).
        setEntries((prev) =>
          dedupeByHash([...prev, ...backend]).sort((a, b) => b.timestamp - a.timestamp)
        );
      } catch {
        /* backend offline — keep localStorage-backed state as-is */
      }
    })();
  }, []);

  const addEntry = useCallback((entry: LedgerEntry) => {
    setEntries((prev) => [entry, ...prev]); // optimistic, instant
    saveToStorage([entry, ...loadFromStorage()]); // flush cache synchronously…
    window.dispatchEvent(new CustomEvent(LEDGER_SYNC_EVENT)); // …then tell peers
    void postEntry(entry); // persist to backend (silent on failure)
  }, []);

  const clearLedger = useCallback(() => {
    setEntries([]);
    saveToStorage([]);
    window.dispatchEvent(new CustomEvent(LEDGER_SYNC_EVENT));
    (async () => {
      try {
        await apiFetch('/ledger/', { method: 'DELETE' });
      } catch {
        /* offline — local clear already applied */
      }
    })();
  }, []);

  const totalSpent = entries
    .filter((e) => e.status === 'confirmed')
    .reduce((sum, e) => sum + e.priceAlgo, 0);

  return {
    entries,
    addEntry,
    clearLedger,
    totalTransactions: entries.length,
    totalSpent,
    fundedBalance,
    availableBalance: Math.max(0, fundedBalance - totalSpent),
  };
}

/** Keep the first occurrence of each txHash (order-preserving). */
function dedupeByHash(list: LedgerEntry[]): LedgerEntry[] {
  const seen = new Set<string>();
  const out: LedgerEntry[] = [];
  for (const e of list) {
    if (seen.has(e.txHash)) continue;
    seen.add(e.txHash);
    out.push(e);
  }
  return out;
}
