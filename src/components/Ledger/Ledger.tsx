/**
 * Ledger component — persistent transaction history table.
 */

import type { LedgerEntry } from '../../types';
import { formatAlgo, formatTimestamp, formatDuration, truncateHash } from '../../utils/format';
import { Icon } from '../Icon/Icon';
import './Ledger.css';

interface LedgerProps {
  entries: LedgerEntry[];
  totalSpent: number;
  totalTransactions: number;
  onClear: () => void;
}

export function Ledger({ entries, totalSpent, totalTransactions, onClear }: LedgerProps) {
  return (
    <section className="ledger" aria-label="Transaction ledger">
      {/* Header */}
      <div className="ledger__header">
        <div className="ledger__title-row">
          <h2 className="ledger__title">Transaction Ledger</h2>
          <div className="ledger__stats">
            <div className="ledger__stat">
              <span className="ledger__stat-value mono">{totalTransactions}</span>
              <span className="ledger__stat-label">transactions</span>
            </div>
            <div className="ledger__stat">
              <span className="ledger__stat-value mono text-green">{formatAlgo(totalSpent)}</span>
              <span className="ledger__stat-label">total spent</span>
            </div>
          </div>
        </div>

        {entries.length > 0 && (
          <button
            className="btn btn-ghost btn-sm ledger__clear-btn"
            onClick={onClear}
            id="clear-ledger-btn"
            aria-label="Clear ledger"
          >
            <Icon name="trash" size={12} />
            Clear
          </button>
        )}
      </div>

      {/* Persistence note */}
      {entries.length === 0 ? (
        <div className="ledger__empty">
          <Icon name="transactions" size={18} className="ledger__empty-icon" />
          <p>No transactions yet. Run a payment flow to begin.</p>
          <p className="text-xs text-muted">Entries persist across page refreshes via localStorage.</p>
        </div>
      ) : (
        <div className="ledger__table-wrap">
          <table className="ledger__table" id="ledger-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Seller</th>
                <th>Task</th>
                <th>Amount</th>
                <th>Round</th>
                <th>Confirm</th>
                <th>TX Hash</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <LedgerRow key={entry.id} entry={entry} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function LedgerRow({ entry }: { entry: LedgerEntry }) {
  const statusBadge =
    entry.status === 'confirmed'
      ? 'badge-green'
      : entry.status === 'pending'
      ? 'badge-amber'
      : 'badge-red';

  return (
    <tr className="ledger__row animate-fade-in">
      <td className="mono text-muted">{formatTimestamp(entry.timestamp)}</td>
      <td>{entry.sellerName}</td>
      <td className="ledger__task-cell">
        <span className="ledger__task-text" title={entry.task}>{entry.task}</span>
      </td>
      <td className="mono text-green">{formatAlgo(entry.priceAlgo)}</td>
      <td className="mono text-muted">#{entry.roundNumber.toLocaleString()}</td>
      <td className="mono text-muted">{formatDuration(entry.confirmationTimeMs)}</td>
      <td>
        <span className="ledger__hash mono" title={entry.txHash}>
          {truncateHash(entry.txHash, 8)}
        </span>
      </td>
      <td>
        <span className={`badge ${statusBadge}`}>{entry.status}</span>
      </td>
    </tr>
  );
}
