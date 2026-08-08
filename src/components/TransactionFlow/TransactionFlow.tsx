/**
 * TransactionFlow — animated step-by-step x402 payment visualization.
 * Reads `steps` from useTransactionFlow hook. Fully presentational.
 */

import { useEffect, useState } from 'react';
import type { FlowStep, AgentResult } from '../../types';
import { formatTimestamp, truncateHash } from '../../utils/format';
import { Icon } from '../Icon/Icon';
import { ResultPanel } from './ResultPanel';
import './TransactionFlow.css';

interface TransactionFlowProps {
  steps: FlowStep[];
  isRunning: boolean;
  result: AgentResult | null;
  sellerName?: string;
  /** True when a live WebSocket stream is driving the timeline. */
  isStreaming?: boolean;
}

export function TransactionFlow({ steps, isRunning, result, sellerName, isStreaming = false }: TransactionFlowProps) {
  const doneCount = steps.filter((s) => s.status === 'done').length;
  const totalCount = steps.length;
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  const hasStarted = steps.some((s) => s.status !== 'pending');

  // Final on-chain hash from the last step that carried one (e.g. 'confirmed').
  const txHash = steps.reduce<string | undefined>((acc, s) => s.txHash ?? acc, undefined);

  // Success flash — replays every time the final 'done' step completes.
  const isDone = steps.find((s) => s.id === 'done')?.status === 'done';
  const [flashKey, setFlashKey] = useState(0);
  useEffect(() => {
    if (isDone) setFlashKey((k) => k + 1);
  }, [isDone]);

  return (
    <section className="tx-flow" aria-label="Transaction flow">
      {/* Panel header */}
      <div className="tx-flow__header">
        <div className="tx-flow__title-row">
          <h2 className="tx-flow__title">Live Transaction Flow</h2>
          {isRunning && (
            <span className="badge badge-amber tx-flow__live-badge" title={isStreaming ? 'Streaming live from AgentHub API over WebSocket' : undefined}>
              <span className="status-dot active animate-pulse-glow" />
              {isStreaming ? 'LIVE STREAM' : 'LIVE'}
            </span>
          )}
          {!isRunning && result && (
            <span className="badge badge-green tx-flow__live-badge">
              <span className="status-dot done" />
              SETTLED
            </span>
          )}
        </div>

        {/* Progress bar */}
        {hasStarted && (
          <div className="tx-flow__progress-wrap" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="tx-flow__progress-bar" style={{ width: `${progress}%` }} />
          </div>
        )}

        {hasStarted && (
          <div className="tx-flow__progress-label">
            <span className="mono text-xs text-muted">{doneCount}/{totalCount} steps</span>
            {sellerName && (
              <span className="text-xs text-secondary">→ {sellerName}</span>
            )}
          </div>
        )}
      </div>

      {/* Steps list */}
      <div className="tx-flow__steps" role="log" aria-live="polite" aria-label="Transaction steps">
        {!hasStarted ? (
          <div className="tx-flow__idle">
            <div className="tx-flow__idle-icon" aria-hidden="true">
              <Icon name="transactions" size={20} />
            </div>
            <p className="tx-flow__idle-text">
              Select a seller, enter a task, and press <strong>Run Payment Flow</strong> to begin.
            </p>
            <div className="tx-flow__idle-steps">
              {steps.slice(0, 5).map((s) => (
                <div key={s.id} className="tx-flow__idle-step">
                  <span className="status-dot pending" />
                  <span className="text-muted text-sm">{s.label}</span>
                </div>
              ))}
              <div className="tx-flow__idle-step">
                <span className="status-dot pending" />
                <span className="text-muted text-sm">...and {steps.length - 5} more steps</span>
              </div>
            </div>
          </div>
        ) : (
          steps
            .filter((s) => s.status !== 'pending' || true)
            .map((step) => (
              <FlowStepRow key={step.id} step={step} />
            ))
        )}
      </div>

      {/* Result panel — skeleton placeholder mirroring the ResultPanel footprint while the flow runs */}
      {isRunning && !result && (
        <div className="tx-flow__result-wrap" role="status" aria-busy="true" aria-label="Agent output loading">
          <div className="result-panel surface-glass">
            <div className="result-panel__header">
              <span className="skeleton tx-flow__skel-title" aria-hidden="true" />
              <span className="skeleton tx-flow__skel-badge" aria-hidden="true" />
            </div>
            <div className="result-panel__body">
              <span className="skeleton tx-flow__skel-line" aria-hidden="true" />
              <span className="skeleton tx-flow__skel-line tx-flow__skel-line--short" aria-hidden="true" />
              <span className="skeleton tx-flow__skel-line tx-flow__skel-line--shorter" aria-hidden="true" />
            </div>
          </div>
        </div>
      )}

      {/* Result panel */}
      {result && (
        <div className="tx-flow__result-wrap animate-fade-in">
          <ResultPanel result={result} txHash={txHash} />
        </div>
      )}

      {/* Success flash — green burst + check pop when payment completes */}
      {isDone && (
        <div className="tx-flow__flash" key={flashKey} aria-hidden="true">
          <div className="tx-flow__flash-burst" />
          <span className="tx-flow__flash-check">✓</span>
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FlowStepRow — single animated step row
// ─────────────────────────────────────────────────────────────────────────────

function FlowStepRow({ step }: { step: FlowStep }) {
  const isPending = step.status === 'pending';

  return (
    <div
      className={`flow-step flow-step--${step.status} ${step.status !== 'pending' ? 'animate-fade-in' : ''}`}
      id={`step-${step.id}`}
    >
      {/* Left: dot + connector */}
      <div className="flow-step__track">
        <span className={`status-dot ${step.status}`} aria-hidden="true" />
        <div className="flow-step__connector" aria-hidden="true" />
      </div>

      {/* Right: content */}
      <div className="flow-step__content">
        <div className="flow-step__top-row">
          <span className={`flow-step__label ${isPending ? 'flow-step__label--muted' : ''}`}>
            {step.label}
          </span>

          <div className="flow-step__badges">
            {/* HTTP status badge */}
            {step.httpStatus && (
              <span className={`badge ${step.httpStatus === 402 ? 'badge-amber' : 'badge-green'} flow-step__http-badge`}>
                HTTP {step.httpStatus}
              </span>
            )}
            {/* Timestamp */}
            {step.timestamp && (
              <span className="flow-step__ts mono text-xs text-muted">
                {formatTimestamp(step.timestamp)}
              </span>
            )}
          </div>
        </div>

        {/* Detail line */}
        {step.detail && (
          <p className="flow-step__detail mono">{step.detail}</p>
        )}

        {/* TX hash pill */}
        {step.txHash && (
          <div className="flow-step__hash">
            <span className="flow-step__hash-label">TX</span>
            <span className="flow-step__hash-value mono">{truncateHash(step.txHash, 14)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
