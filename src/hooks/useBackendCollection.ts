/**
 * useBackendCollection.ts
 *
 * Generic persistent collection hook — backend-first, offline-safe, mirroring
 * the useLedger storage strategy so API keys, webhook endpoints/deliveries and
 * automation workflows survive reloads exactly like the transaction ledger:
 *
 *  - localStorage is the instant cache: state is seeded from it synchronously
 *    so pages render immediately with no flash.
 *  - On mount we GET the backend collection and RECONCILE:
 *      • backend rows are the source of truth,
 *      • local-only rows (created while the backend was offline) are kept AND
 *        back-filled to the backend via POST,
 *      • the merged, de-duplicated (by id) set becomes the visible collection.
 *  - addItem / updateItem / removeItem mutate local state optimistically
 *    (instant) and persist to the backend via the adapter's endpoints, failing
 *    silently when the backend is unreachable.
 *
 * Domain types + wire mappings live in the adapter, so every page keeps its own
 * interfaces while sharing one bulletproof persistence implementation.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../services/apiClient';

export interface CollectionAdapter<T extends { id: string }> {
  /** localStorage key for the offline cache. */
  storageKey: string;
  /** Default rows shown before any backend data arrives (module-level constant). */
  seed: T[];
  /** GET path returning the backend rows (camelCase dicts). */
  fetchPath: string;
  /** POST path used to create new rows and back-fill local-only rows. */
  postPath: string;
  /** Map a backend row (camelCase dict) → domain row. */
  fromBackend: (raw: Record<string, unknown>) => T;
  /** Map a domain row → snake_case POST body (id included so ids round-trip). */
  toCreateBody: (item: T) => Record<string, unknown>;
  /** Optional: build the mutation request fired by updateItem. */
  updateRequest?: (
    id: string,
    patch: Partial<T>
  ) => { path: string; method?: 'POST' | 'PATCH'; body?: unknown } | null;
  /** Optional: build the DELETE path fired by removeItem. */
  deleteRequest?: (id: string) => string | null;
}

export interface BackendCollection<T extends { id: string }> {
  items: T[];
  addItem: (item: T) => void;
  updateItem: (id: string, patch: Partial<T>) => void;
  removeItem: (id: string) => void;
}

function loadFromStorage<T>(storageKey: string): T[] | null {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as T[]) : null;
  } catch {
    return null;
  }
}

function saveToStorage<T>(storageKey: string, items: T[]): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(items));
  } catch {
    /* storage full / disabled — non-fatal */
  }
}

export function useBackendCollection<T extends { id: string }>(
  adapter: CollectionAdapter<T>
): BackendCollection<T> {
  const { storageKey, seed, fetchPath, postPath, fromBackend, toCreateBody, updateRequest, deleteRequest } =
    adapter;

  const [items, setItems] = useState<T[]>(() => loadFromStorage<T>(storageKey) ?? seed);
  const didHydrate = useRef(false);

  // Persist on every change (offline cache).
  useEffect(() => {
    saveToStorage(storageKey, items);
  }, [storageKey, items]);

  // On mount: reconcile with the backend collection (once).
  //
  // NOTE: there is deliberately NO cleanup `cancelled` flag here. StrictMode
  // runs mount → cleanup → mount in dev, and the cleanup would flip the flag
  // before the async GET resolves — silently killing the back-fill. The
  // `didHydrate` ref already guards against duplicate runs across the remount,
  // and a stray setState after a real unmount is harmless in React 19.
  useEffect(() => {
    if (didHydrate.current) return;
    didHydrate.current = true;

    (async () => {
      try {
        const res = await apiFetch<Record<string, unknown>[]>(fetchPath, { timeoutMs: 3000 });
        if (!Array.isArray(res.data)) return;

        const backend = res.data.map((raw) => fromBackend(raw));
        const local = loadFromStorage<T>(storageKey) ?? seed;
        const backendIds = new Set(backend.map((b) => b.id));

        // Rows the backend never persisted (created while offline) → back-fill.
        const localOnly = local.filter((i) => !backendIds.has(i.id));
        for (const item of localOnly) {
          try {
            await apiFetch(postPath, { method: 'POST', body: toCreateBody(item) });
          } catch {
            /* offline — localStorage already holds it */
          }
        }

        // Merge, de-dupe by id — computed against CURRENT state (not the
        // storage snapshot) so an item created while the GET was in flight is
        // never clobbered. Local rows win for same-id collisions (they carry
        // the freshest optimistic edits).
        setItems((prev) => {
          const seen = new Set<string>();
          const merged: T[] = [];
          for (const item of [...prev, ...backend]) {
            if (seen.has(item.id)) continue;
            seen.add(item.id);
            merged.push(item);
          }
          return merged;
        });
      } catch {
        /* backend offline — keep localStorage-backed state as-is */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addItem = useCallback(
    (item: T) => {
      setItems((prev) => [item, ...prev]); // optimistic, instant
      void apiFetch(postPath, { method: 'POST', body: toCreateBody(item) }).catch(() => {
        /* offline — localStorage already holds it */
      });
    },
    [postPath, toCreateBody]
  );

  const updateItem = useCallback(
    (id: string, patch: Partial<T>) => {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
      const req = updateRequest?.(id, patch);
      if (req) {
        void apiFetch(req.path, { method: req.method ?? 'POST', body: req.body }).catch(() => {
          /* offline — local update already applied */
        });
      }
    },
    [updateRequest]
  );

  const removeItem = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((i) => i.id !== id));
      const path = deleteRequest?.(id);
      if (path) {
        void apiFetch(path, { method: 'DELETE' }).catch(() => {
          /* offline — local removal already applied */
        });
      }
    },
    [deleteRequest]
  );

  return { items, addItem, updateItem, removeItem };
}
