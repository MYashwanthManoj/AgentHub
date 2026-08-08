/**
 * apiClient.ts
 *
 * Central HTTP client for the AgentHub FastAPI backend (http://localhost:8000).
 *
 * Design goals:
 *  - Single source of truth for the API base URL (override with VITE_API_URL).
 *  - Short-timeout fetch via AbortController so a dead backend never hangs the UI.
 *  - SILENT FALLBACK: every integration point wraps its live call in `withFallback`,
 *    so when the backend is offline the app transparently uses the local mock
 *    implementations. The demo can never break because the backend is down.
 *  - Cheap "backend offline" caching (short TTL) to avoid repeated connection waits
 *    once we've detected the backend is unreachable.
 */

const envUrl = import.meta.env.VITE_API_URL;

/** Base URL for all backend calls. Trailing slash stripped for clean concatenation. */
export const API_BASE_URL = (envUrl && envUrl.replace(/\/+$/, '')) || 'http://localhost:8000';

const DEFAULT_TIMEOUT_MS = 4000;
/** Once we detect the backend is down, skip live calls for this long. */
const OFFLINE_TTL_MS = 5000;

let offlineUntil = 0;

/** True if we recently failed to reach the backend and are within the cool-down window. */
export function isBackendKnownOffline(): boolean {
  return Date.now() < offlineUntil;
}

function markOffline(): void {
  offlineUntil = Date.now() + OFFLINE_TTL_MS;
}

function markOnline(): void {
  offlineUntil = 0;
}

/** Error carrying the HTTP status + parsed body for a non-acceptable response. */
export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  timeoutMs?: number;
  /**
   * Status codes that are expected and should resolve instead of throwing.
   * e.g. the x402 flow expects HTTP 402 from /agent/{id}/call.
   */
  acceptStatuses?: number[];
}

export interface ApiResponse<T> {
  ok: boolean;
  status: number;
  data: T;
}

/**
 * Low-level typed fetch wrapper. Throws on network failure, timeout, or a
 * non-acceptable HTTP status — logging a single console.error for every failed
 * call first (the central choke point for fetch-error logging). Marks the backend
 * offline on network failure so subsequent `withFallback` calls short-circuit to
 * the mock.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    acceptStatuses = [],
  } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: body != null ? { 'Content-Type': 'application/json' } : undefined,
      body: body != null ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    // We reached the server — it's online, regardless of status code.
    markOnline();

    let data: T;
    try {
      data = (await res.json()) as T;
    } catch {
      // Empty / non-JSON body (e.g. 204). Represent as undefined.
      data = undefined as unknown as T;
    }

    const isAcceptable = res.ok || acceptStatuses.includes(res.status);
    if (!isAcceptable) {
      throw new ApiError(`HTTP ${res.status} for ${path}`, res.status, data);
    }

    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    // A non-acceptable HTTP status still means the backend is reachable.
    if (err instanceof ApiError) {
      console.error(`[apiClient] ${method} ${path} → HTTP ${err.status}`, err.data);
      throw err;
    }
    // Network error, DNS failure, or abort/timeout → treat backend as offline.
    markOffline();
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';
    const reason = isTimeout
      ? `timed out after ${timeoutMs}ms`
      : err instanceof Error
        ? err.message
        : String(err);
    console.error(`[apiClient] ${method} ${path} → fetch failed (${reason})`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Run a live backend call; on ANY failure (or when the backend is known-offline),
 * silently run the mock fallback instead. This is the core of the
 * "real when available, mock when not" contract used across the app.
 *
 * @param live     the backend-backed implementation
 * @param fallback the local mock implementation
 * @param label    optional label for a single console.warn on fallback (dev aid)
 */
export async function withFallback<T>(
  live: () => Promise<T>,
  fallback: () => Promise<T> | T,
  label?: string
): Promise<T> {
  if (isBackendKnownOffline()) {
    return fallback();
  }
  try {
    return await live();
  } catch (err) {
    if (label) {
      const msg = err instanceof Error ? err.message : String(err);
      // Single, quiet line — never throws into the UI.
      console.warn(`[apiClient] ${label} → mock fallback (${msg})`);
    }
    return fallback();
  }
}

/**
 * Retry a live call up to `attempts` times (with a tiny backoff) before letting
 * the error propagate. Intended to be composed inside `withFallback`, e.g.:
 *   withFallback(() => retry(() => callAgent(...)), mock, 'call')
 */
export async function retry<T>(
  fn: () => Promise<T>,
  attempts = 2,
  backoffMs = 150
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      // Don't waste time retrying once we know the backend is offline.
      if (isBackendKnownOffline()) break;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    }
  }
  throw lastErr;
}

/** Lightweight health probe. Returns true if GET /health responds ok. */
export async function pingHealth(): Promise<boolean> {
  try {
    const res = await apiFetch<{ status: string }>('/health', { timeoutMs: 2000 });
    return res.ok && res.data?.status === 'ok';
  } catch {
    return false;
  }
}
