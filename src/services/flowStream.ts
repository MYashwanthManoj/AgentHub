/**
 * flowStream.ts — real-time payment step stream over WebSocket.
 *
 * Connects to the backend's WS /ws/flow/{session_id}, sends a `start`
 * message, and relays each `step_update` to the UI as it arrives:
 *   { type: "step_update", step_id: "HTTP_402", status: "active"|"done", label, timestamp }
 *   { type: "flow_complete", tx_hash, timestamp }
 *
 * The client pipeline in useTransactionFlow runs in parallel (it produces the
 * real tx hash, result and ledger entry); this stream only drives the visual
 * timeline. If the backend is unreachable the stream fails fast and the hook
 * falls back to its local pacing — the demo never waits on a dead socket.
 */

import { API_BASE_URL, isBackendKnownOffline } from './apiClient';

export type StreamStatus = 'active' | 'done';

export interface FlowStreamHandlers {
  /** Called for every step_update. `httpStatus` is derived for HTTP_402 / HTTP_200. */
  onStep: (stepId: string, status: StreamStatus, label: string | undefined, httpStatus?: number) => void;
  /** Called once the backend finishes streaming the flow. */
  onComplete: (txHash: string) => void;
  /** Called if the socket cannot be established or drops mid-stream. */
  onError: () => void;
}

export interface FlowStream {
  close: () => void;
  readonly connected: boolean;
}

/** Fast-path: don't even attempt a socket when we already know the backend is down. */
export function canStreamFlow(): boolean {
  return !isBackendKnownOffline();
}

/**
 * Open a WebSocket to /ws/flow/{session_id} and start streaming.
 * Returns a handle with `close()`. Safe to call anytime; errors are reported
 * through `onError` (never thrown).
 */
export function openFlowStream(sessionId: string, handlers: FlowStreamHandlers): FlowStream {
  const wsUrl = `${API_BASE_URL.replace(/^http/, 'ws')}/ws/flow/${sessionId}`;

  let ws: WebSocket | null = null;
  let closed = false;
  let connected = false;
  let completed = false;

  const finish = (err: boolean) => {
    if (closed) return;
    closed = true;
    if (err && !completed) handlers.onError();
    try {
      ws?.close();
    } catch {
      /* noop */
    }
  };

  // Safety net: if the socket never opens (backend down / hanging), fail over.
  const failTimer = window.setTimeout(() => finish(true), 2500);

  try {
    ws = new WebSocket(wsUrl);
  } catch {
    window.clearTimeout(failTimer);
    handlers.onError();
    return { close: () => undefined, connected: false };
  }

  ws.onopen = () => {
    connected = true;
    // Connection established — the fail-safety timer was only meant to cover
    // a socket that never opens; clear it so a long healthy stream survives.
    window.clearTimeout(failTimer);
    try {
      ws?.send(JSON.stringify({ type: 'start', tx_hash: '' }));
    } catch {
      /* socket closed between open and send */
    }
  };

  ws.onmessage = (evt) => {
    if (closed) return;
    try {
      const msg = JSON.parse(String(evt.data)) as {
        type?: string;
        step_id?: string;
        status?: string;
        label?: string;
        tx_hash?: string;
      };
      if (msg.type === 'step_update' && msg.step_id) {
        const httpStatus =
          msg.step_id === 'HTTP_402' ? 402 : msg.step_id === 'HTTP_200' ? 200 : undefined;
        handlers.onStep(
          msg.step_id,
          msg.status === 'done' ? 'done' : 'active',
          msg.label,
          httpStatus
        );
      } else if (msg.type === 'flow_complete') {
        completed = true;
        window.clearTimeout(failTimer);
        handlers.onComplete(msg.tx_hash ?? '');
      }
    } catch {
      /* ignore malformed frames */
    }
  };

  ws.onerror = () => finish(true);
  ws.onclose = () => {
    window.clearTimeout(failTimer);
    finish(false);
  };

  return {
    close: () => {
      window.clearTimeout(failTimer);
      closed = true;
      try {
        ws?.close();
      } catch {
        /* noop */
      }
    },
    get connected() {
      return connected;
    },
  };
}
