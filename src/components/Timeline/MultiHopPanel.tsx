/**
 * MultiHopPanel — displays the multi-agent workflow status.
 * Shows each hop as a separate mini-timeline.
 *
 * HopState is imported from useMultiHopFlow (single source of truth).
 */

import type { LedgerEntry, AgentResult } from '../../types';
import type { HopState } from '../../hooks/useMultiHopFlow';
import { formatAlgo, formatDuration, truncateHash } from '../../utils/format';
import './MultiHopPanel.css';

export type { HopState };

interface MultiHopPanelProps {
  hops: HopState[];
  isRunning: boolean;
  isComplete: boolean;
  totalSpent: number;
}

export function MultiHopPanel({ hops, isRunning, isComplete, totalSpent }: MultiHopPanelProps) {
  if (hops.length === 0) return null;

  return (
    <aside className="multi-hop-panel animate-fade-in" aria-label="Multi-agent workflow">
      <div className="multi-hop-panel__header">
        <span className="multi-hop-panel__title">Multi-Agent Workflow</span>
        {isRunning && (
          <span className="badge badge-amber">
            <span className="status-dot active animate-pulse-glow" /> Running
          </span>
        )}
        {isComplete && (
          <span className="badge badge-green">
            <span className="status-dot done" /> Complete
          </span>
        )}
      </div>

      <div className="multi-hop-panel__hops">
        {hops.map((hop) => (
          <HopCard key={hop.hopIndex} hop={hop} />
        ))}
      </div>

      {isComplete && (
        <div className="multi-hop-panel__summary animate-fade-in">
          <span className="multi-hop-panel__summary-label">Total settled</span>
          <span className="multi-hop-panel__summary-value mono text-green">
            {formatAlgo(totalSpent)}
          </span>
        </div>
      )}
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function HopCard({ hop }: { hop: HopState }) {
  const statusClass =
    hop.status === 'done'
      ? 'hop-card--done'
      : hop.status === 'running'
      ? 'hop-card--running'
      : hop.status === 'error'
      ? 'hop-card--error'
      : '';

  return (
    <div className={`hop-card ${statusClass} ${hop.status !== 'pending' ? 'animate-fade-in' : ''}`}
      id={`hop-card-${hop.hopIndex}`}
    >
      <div className="hop-card__header">
        <div className="hop-card__hop-num">
          <span className="mono text-xs text-muted">HOP {hop.hopIndex + 1}</span>
        </div>
        <span className="hop-card__seller">{hop.sellerName}</span>
        <span
          className={`status-dot ${
            hop.status === 'done' ? 'done' : hop.status === 'running' ? 'active' : 'pending'
          }`}
        />
      </div>

      <p className="hop-card__task mono text-xs text-muted">{hop.task}</p>

      {hop.ledgerEntry && (
        <div className="hop-card__meta">
          <span className="mono text-xs text-green">{formatAlgo(hop.ledgerEntry.priceAlgo)}</span>
          <span className="mono text-xs text-muted">
            {formatDuration(hop.ledgerEntry.confirmationTimeMs)}
          </span>
          <span className="mono text-xs text-green">
            {truncateHash(hop.ledgerEntry.txHash, 6)}
          </span>
        </div>
      )}

      {hop.result && hop.result.resultType !== 'chart' && (
        <p className="hop-card__result text-xs text-secondary">
          {hop.result.content.slice(0, 100)}{hop.result.content.length > 100 ? '...' : ''}
        </p>
      )}

      {hop.result && hop.result.resultType === 'chart' && (
        <p className="hop-card__result text-xs text-secondary">[Chart data returned — {hop.result.chartData?.length} data points]</p>
      )}
    </div>
  );
}
