import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../services/apiClient';

export type BackendHealthStatus = 'checking' | 'online' | 'offline';

const HEALTH_CHECK_INTERVAL_MS = 30_000;
const HEALTH_CHECK_TIMEOUT_MS = 3_000;

function isHealthyResponse(value: unknown): value is { status: 'ok' } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    value.status === 'ok'
  );
}

async function getBackendHealth(
  lifecycleSignal: AbortSignal,
): Promise<Exclude<BackendHealthStatus, 'checking'> | null> {
  const requestController = new AbortController();
  const abortRequest = () => requestController.abort();
  const timeoutId = window.setTimeout(abortRequest, HEALTH_CHECK_TIMEOUT_MS);

  lifecycleSignal.addEventListener('abort', abortRequest, { once: true });

  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: requestController.signal,
    });

    if (!response.ok) {
      throw new Error(`Health endpoint returned HTTP ${response.status}`);
    }

    const payload: unknown = await response.json();
    if (!isHealthyResponse(payload)) {
      throw new Error('Health endpoint returned an invalid response');
    }

    return 'online';
  } catch (error) {
    if (lifecycleSignal.aborted) return null;

    console.error('[health] Backend health check failed:', error);
    return 'offline';
  } finally {
    window.clearTimeout(timeoutId);
    lifecycleSignal.removeEventListener('abort', abortRequest);
  }
}

export function useBackendHealth(): BackendHealthStatus {
  const [status, setStatus] = useState<BackendHealthStatus>('checking');

  useEffect(() => {
    const lifecycleController = new AbortController();
    let requestPending = false;

    const updateHealth = async () => {
      if (requestPending) return;
      requestPending = true;

      const nextStatus = await getBackendHealth(lifecycleController.signal);
      requestPending = false;

      if (nextStatus !== null && !lifecycleController.signal.aborted) {
        setStatus(nextStatus);
      }
    };

    void updateHealth();
    const intervalId = window.setInterval(() => {
      void updateHealth();
    }, HEALTH_CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      lifecycleController.abort();
    };
  }, []);

  return status;
}
