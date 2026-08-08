/**
 * useWalletFunding.ts
 *
 * Wallet top-up persistence — "Top Up" refills the funded balance and every
 * entry is logged so it survives reloads, exactly like the ledger.
 *
 * The FUNDED AMOUNT is a persisted setting (edited on the Settings page), not
 * a hardcoded constant: it lives in localStorage AND the backend
 * (/wallet/settings), and it seeds the wallet's genesis funding entry.
 *
 * Storage strategy (mirrors useLedger / useBackendCollection):
 *  - localStorage is the instant cache (genesis seed included), so the wallet
 *    renders a correct balance immediately with no flash.
 *  - On mount we GET /wallet/funding + /wallet/settings from the backend and
 *    reconcile (back-fill local-only rows, merge by id, local rows win).
 *  - topUp() records a PENDING entry instantly, then flips it to CONFIRMED
 *    after a short simulated on-chain confirmation — dispatching a sync event
 *    so the header pill / dashboard / wallet all update live.
 *  - setFundedAmount() updates the setting + the genesis entry, so Total
 *    Balance everywhere follows the persisted value.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useBackendCollection } from './useBackendCollection';
import { apiFetch } from '../services/apiClient';
import { BUYER_AGENT } from '../data/agents';
import type { FundingEntry } from '../types';

export const FUNDING_STORAGE_KEY = 'blockhack_wallet_funding_v1';
export const WALLET_SETTINGS_STORAGE_KEY = 'blockhack_wallet_settings_v1';
/**
 * Fired after the confirmed funded balance changes, so every useLedger
 * instance in the tab (header pill, dashboard strip) recomputes its
 * availableBalance. Only the funding hook dispatches — no feedback loops.
 */
export const FUNDING_SYNC_EVENT = 'agenthub-funding-sync';

/** Simulated confirmation window for a top-up (pending → confirmed). */
export const TOPUP_CONFIRM_MS = 2600;

/**
 * The wallet's funded amount — a PERSISTED setting. This constant is only the
 * factory default for a brand-new install; once set (Settings → Wallet
 * Funding) the persisted value wins everywhere.
 */
const FUNDED_AMOUNT_DEFAULT = BUYER_AGENT.balanceAlgo;

interface WalletSettings {
  fundedAmount: number;
}

function loadSettings(): WalletSettings {
  try {
    const raw = localStorage.getItem(WALLET_SETTINGS_STORAGE_KEY);
    if (!raw) return { fundedAmount: FUNDED_AMOUNT_DEFAULT };
    const parsed = JSON.parse(raw) as Partial<WalletSettings>;
    const n = Number(parsed.fundedAmount);
    return {
      fundedAmount: Number.isFinite(n) && n >= 0 ? n : FUNDED_AMOUNT_DEFAULT,
    };
  } catch {
    return { fundedAmount: FUNDED_AMOUNT_DEFAULT };
  }
}

function saveSettings(settings: WalletSettings): void {
  try {
    localStorage.setItem(WALLET_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* storage full / disabled — non-fatal */
  }
}

/**
 * The genesis funding entry — the wallet's starting balance. Its amount
 * follows the persisted setting, so changing Settings → Wallet Funding
 * re-amounts the genesis entry and Total Balance everywhere.
 */
function genesisFunding(amount: number): FundingEntry {
  return {
    id: 'genesis',
    amount,
    method: 'genesis',
    status: 'confirmed',
    note: 'Initial wallet funding',
    txHash: 'ALGO_TX_7F3A9C2E5D81',
    createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000, // 14 days ago
  };
}

/** Random fake tx hash in the app's established ALGO_TX_<12 hex> format. */
function randomTxHash(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `ALGO_TX_${hex}`;
}

/**
 * The funded balance — the sum of CONFIRMED top-ups. Falls back to the
 * persisted funded-amount setting (factory default 12.5) when nothing is
 * recorded yet (fresh visitor / cleared storage), so the header pill never
 * flashes an empty balance. Pending top-ups don't count.
 */
export function getFundedBalance(): number {
  const fallback = loadSettings().fundedAmount;
  try {
    const raw = localStorage.getItem(FUNDING_STORAGE_KEY);
    if (!raw) return fallback;
    const entries = JSON.parse(raw) as FundingEntry[];
    const funded = entries
      .filter((e) => e.status === 'confirmed')
      .reduce((sum, e) => sum + e.amount, 0);
    return funded > 0 ? funded : fallback;
  } catch {
    return fallback;
  }
}

interface BackendFunding {
  id: string;
  amount: number;
  method: string;
  status: string;
  note?: string | null;
  txHash?: string | null;
  createdAt: string;
}

export interface UseWalletFundingReturn {
  /** All funding entries (unsorted — sort by createdAt desc to display). */
  entries: FundingEntry[];
  /** Confirmed funds in the wallet (genesis + successful top-ups). */
  fundedBalance: number;
  /** Top-ups currently confirming (in-flight). */
  pendingCount: number;
  /** The persisted funded-amount setting (what the wallet starts with). */
  fundedAmount: number;
  /** Persist a new funded amount (updates the setting + genesis entry). */
  setFundedAmount: (amount: number) => void;
  /**
   * Record a top-up: PENDING now, CONFIRMED after the simulated confirmation
   * window. Resolves with the confirmed entry. Safe to fire while the backend
   * is offline — localStorage holds it either way.
   */
  topUp: (amount: number, method: FundingEntry['method']) => Promise<FundingEntry>;
}

export function useWalletFunding(): UseWalletFundingReturn {
  const initialSettings = loadSettings();
  const [settings, setSettings] = useState<WalletSettings>(initialSettings);

  const { items, addItem, updateItem } = useBackendCollection<FundingEntry>({
    storageKey: FUNDING_STORAGE_KEY,
    seed: [genesisFunding(initialSettings.fundedAmount)],
    fetchPath: '/wallet/funding',
    postPath: '/wallet/funding',
    fromBackend: (raw) => {
      const r = raw as unknown as BackendFunding;
      return {
        id: r.id,
        amount: Number(r.amount),
        method: (r.method as FundingEntry['method']) ?? 'faucet',
        status: (r.status as FundingEntry['status']) ?? 'pending',
        note: r.note != null ? String(r.note) : undefined,
        txHash: r.txHash != null ? String(r.txHash) : undefined,
        createdAt: Date.parse(String(r.createdAt)) || Date.now(),
      };
    },
    toCreateBody: (e) => ({
      id: e.id,
      amount: e.amount,
      method: e.method,
      status: e.status,
      note: e.note ?? null,
      tx_hash: e.txHash ?? null,
      created_at: new Date(e.createdAt).toISOString(),
    }),
    updateRequest: (id, patch) => ({
      path: `/wallet/funding/${id}`,
      method: 'PATCH' as const,
      body: { status: patch.status, tx_hash: patch.txHash, amount: patch.amount },
    }),
  });

  // Reconcile the settings with the backend once.
  //  - Local value explicitly edited (differs from the factory default): keep
  //    it and back-fill to the backend — an offline edit is never clobbered.
  //  - Local is still the factory default (fresh device): the backend holds a
  //    real saved value (e.g. from another device) — adopt it instead of
  //    clobbering it with 12.5.
  const didHydrateSettings = useRef(false);
  useEffect(() => {
    if (didHydrateSettings.current) return;
    didHydrateSettings.current = true;
    (async () => {
      try {
        const res = await apiFetch<{ fundedAmount: number }>('/wallet/settings', { timeoutMs: 3000 });
        const backend = Number(res.data?.fundedAmount);
        if (!Number.isFinite(backend)) return;
        const local = loadSettings();
        if (Math.abs(local.fundedAmount - backend) < 1e-9) return;
        if (local.fundedAmount !== FUNDED_AMOUNT_DEFAULT) {
          // Explicitly edited locally → keep it and back-fill the backend.
          void apiFetch('/wallet/settings', {
            method: 'POST',
            body: { funded_amount: local.fundedAmount },
          }).catch(() => {
            /* offline — localStorage holds it */
          });
          return;
        }
        // Factory default locally → adopt the backend's saved value.
        const next = { fundedAmount: backend };
        saveSettings(next);
        setSettings(next);
      } catch {
        /* backend offline — localStorage value stands */
      }
    })();
  }, []);

  const fundedBalance = items
    .filter((e) => e.status === 'confirmed')
    .reduce((sum, e) => sum + e.amount, 0);

  // A top-up interrupted by a page reload would otherwise stay PENDING
  // forever. Treat any pending entry older than the confirmation window as
  // already confirmed — the broadcast finished while we were away.
  const didHeal = useRef(false);
  useEffect(() => {
    if (didHeal.current) return;
    didHeal.current = true;
    const now = Date.now();
    items.forEach((e) => {
      if (e.status === 'pending' && now - e.createdAt > TOPUP_CONFIRM_MS) {
        updateItem(e.id, { status: 'confirmed', txHash: randomTxHash() });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the genesis entry's amount in lockstep with the persisted setting —
  // this is what makes Total Balance follow Settings → Wallet Funding.
  useEffect(() => {
    const genesis = items.find((e) => e.id === 'genesis');
    if (genesis && Math.abs(genesis.amount - settings.fundedAmount) > 1e-9) {
      updateItem('genesis', { amount: settings.fundedAmount });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.fundedAmount]);

  // Tell peer useLedger instances (header pill, dashboard strip) whenever the
  // confirmed funded balance changes — including after a backend reconcile.
  // Peers only re-read storage and re-render; they never write or re-dispatch.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(FUNDING_SYNC_EVENT));
  }, [fundedBalance]);

  const setFundedAmount = useCallback((amount: number) => {
    const next = { fundedAmount: Math.max(0, amount) };
    setSettings(next);
    saveSettings(next); // flush synchronously so getFundedBalance readers see it
    void apiFetch('/wallet/settings', { method: 'POST', body: { funded_amount: next.fundedAmount } }).catch(
      () => {
        /* offline — localStorage holds it; back-filled on next mount */
      }
    );
    // The genesis-sync effect re-amounts the genesis entry → fundedBalance
    // changes → FUNDING_SYNC_EVENT propagates to the header/dashboard.
  }, []);

  const topUp = useCallback(
    (amount: number, method: FundingEntry['method']): Promise<FundingEntry> =>
      new Promise((resolve) => {
        const id = `fund-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const pending: FundingEntry = {
          id,
          amount,
          method,
          status: 'pending',
          createdAt: Date.now(),
        };
        addItem(pending); // optimistic, instant
        window.setTimeout(() => {
          const confirmed: FundingEntry = {
            ...pending,
            status: 'confirmed',
            txHash: randomTxHash(),
          };
          updateItem(id, { status: 'confirmed', txHash: confirmed.txHash });
          resolve(confirmed);
        }, TOPUP_CONFIRM_MS);
      }),
    [addItem, updateItem]
  );

  return {
    entries: items,
    fundedBalance,
    pendingCount: items.filter((e) => e.status === 'pending').length,
    fundedAmount: settings.fundedAmount,
    setFundedAmount,
    topUp,
  };
}
