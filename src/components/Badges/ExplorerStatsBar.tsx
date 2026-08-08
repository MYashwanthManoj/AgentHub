/**
 * ExplorerStatsBar — top-of-page network statistics strip for the marketplace.
 *
 * Shows the registry size, live transaction totals (fed from useLedger by the
 * page) and the current network mode. Values render in monospace per the
 * design system.
 */

import type { NetworkMode } from '../../types';
import { SELLER_AGENTS } from '../../data/agents';
import { formatAlgo, truncateHash } from '../../utils/format';
import { NetworkBadge } from './NetworkBadge';
import { StatusPill } from './StatusPill';
import './ExplorerStatsBar.css';

export interface ExplorerStatsBarProps {
  /** Total ledger entries (incl. pending/failed). Defaults to 0. */
  totalTransactions?: number;
  /** Total confirmed volume in ALGO. Defaults to 0. */
  totalSpent?: number;
  /** Number of registered seller agents. Defaults to the registry seed size. */
  agentCount?: number;
  /** Active network mode. Defaults to 'simulated'. */
  networkMode?: NetworkMode;
  /** Hash of the most recent ledger entry. Shown as the latest TX. */
  lastTxHash?: string;
  /** Round number of the most recent ledger entry. */
  lastRound?: number;
}

export function ExplorerStatsBar({
  totalTransactions = 0,
  totalSpent = 0,
  agentCount = SELLER_AGENTS.length,
  networkMode = 'simulated',
  lastTxHash,
  lastRound,
}: ExplorerStatsBarProps) {
  return (
    <section className="explorer-stats-bar" aria-label="Registry network statistics">
      {/* Identity + network mode */}
      <div className="explorer-stats-bar__identity">
        <div className="explorer-stats-bar__title-group">
          <span className="explorer-stats-bar__eyebrow mono">x402 Service Registry</span>
          <h2 className="explorer-stats-bar__title">AgentHub Network</h2>
        </div>
        <NetworkBadge mode={networkMode} />
      </div>

      {/* Live stats */}
      <div className="explorer-stats-bar__stats" role="list">
        <StatItem label="Registered Agents" value={agentCount.toLocaleString()} />
        <StatItem label="Transactions" value={totalTransactions.toLocaleString()} />
        <StatItem label="Total Volume" value={formatAlgo(totalSpent)} accent />
        <StatItem
          label="Latest TX"
          value={lastTxHash ? truncateHash(lastTxHash, 8) : '—'}
        />
        <StatItem
          label="Latest Round"
          value={lastRound != null ? `#${lastRound.toLocaleString()}` : '—'}
        />
      </div>

      {/* System health */}
      <div className="explorer-stats-bar__health">
        {/* key remounts the pill on every change so the pop animation replays */}
        <StatusPill
          key={totalTransactions}
          status="live"
          label={`${totalTransactions} TXs`}
          className="status-pill--pop"
        />
        <StatusPill status="operational" label="Operational" />
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function StatItem({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="explorer-stats-bar__stat" role="listitem">
      <span
        className={`explorer-stats-bar__stat-value mono${accent ? ' text-green' : ''}`}
      >
        {value}
      </span>
      <span className="explorer-stats-bar__stat-label">{label}</span>
    </div>
  );
}
