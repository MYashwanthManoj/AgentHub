/**
 * TransactionsPage — immutable x402 settlement ledger.
 *
 * Real statuses from the ledger (confirmed / failed / pending) drive the
 * badges — never a hard-coded CONFIRMED. Search + status/agent filters,
 * a detail drawer, and CSV export.
 */

import { useMemo, useState } from 'react';
import { useLedger } from '../hooks/useLedger';
import type { LedgerEntry, TransactionStatus } from '../types';
import { Icon } from '../components/Icon/Icon';
import { StatusBadge } from '../components/ui/StatusBadge';
import { CopyButton } from '../components/ui/CopyButton';
import { formatDuration, truncateHash } from '../utils/format';
import './TransactionsPage.css';

type StatusFilter = 'all' | TransactionStatus;

export function TransactionsPage() {
  const { entries, totalSpent, totalTransactions, clearLedger } = useLedger();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [selectedTx, setSelectedTx] = useState<LedgerEntry | null>(null);

  const confirmed = entries.filter((e) => e.status === 'confirmed').length;
  const failed = entries.filter((e) => e.status === 'failed').length;
  const pending = entries.filter((e) => e.status === 'pending').length;

  const agents = useMemo(
    () => Array.from(new Set(entries.map((e) => e.sellerName))).sort(),
    [entries]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return entries.filter((e) => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (agentFilter !== 'all' && e.sellerName !== agentFilter) return false;
      if (!q) return true;
      return (
        e.sellerName.toLowerCase().includes(q) ||
        e.task.toLowerCase().includes(q) ||
        e.txHash.toLowerCase().includes(q)
      );
    });
  }, [entries, search, statusFilter, agentFilter]);

  const handleExportCSV = () => {
    const headers = 'ID,Timestamp,Seller,Task,Amount_ALGO,Round,TxHash,Status\n';
    const rows = entries
      .map(
        (e) =>
          `"${e.id}","${e.timestamp}","${e.sellerName}","${e.task.replace(/"/g, '""')}",${e.priceAlgo},${e.roundNumber},"${e.txHash}","${e.status}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agenthub-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="transactions-page animate-fade-in">
      {/* Header */}
      <div className="transactions-page__header">
        <div>
          <h1 className="page-title">On-Chain Transactions</h1>
          <p className="page-subtitle">Immutable x402 settlement ledger on Algorand Testnet.</p>
        </div>
        <div className="transactions-page__header-actions">
          <button type="button" className="btn btn-sm" onClick={handleExportCSV}>
            <Icon name="download" size={13} />
            Export CSV
          </button>
          {entries.length > 0 && (
            <button type="button" className="btn btn-ghost btn-sm text-red" onClick={clearLedger}>
              <Icon name="trash" size={13} />
              Clear Ledger
            </button>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="transactions-page__metrics">
        <div className="card card--metric p-4">
          <span className="meta-label">Transactions</span>
          <div className="metric-value">{totalTransactions}</div>
          <span className="text-xs text-muted">all time</span>
        </div>
        <div className="card card--metric p-4">
          <span className="meta-label">Volume</span>
          <div className="metric-value metric-value--green">{totalSpent.toFixed(4)}</div>
          <span className="text-xs text-muted">ALGO settled</span>
        </div>
        <div className="card card--metric p-4">
          <span className="meta-label">Successful</span>
          <div className="metric-value metric-value--green">{confirmed}</div>
          <span className="text-xs text-muted">confirmed on-chain</span>
        </div>
        <div className="card card--metric p-4">
          <span className="meta-label">Failed</span>
          <div className="metric-value metric-value--muted">{failed}</div>
          <span className="text-xs text-muted">{pending} pending</span>
        </div>
      </div>

      {/* Table */}
      <section className="card p-6">
        {/* Toolbar */}
        <div className="transactions-page__toolbar">
          <div className="transactions-page__search">
            <Icon name="search" size={14} className="transactions-page__search-icon" />
            <input
              type="text"
              className="transactions-page__search-input"
              placeholder="Search agent, task, transaction hash..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search transactions"
            />
          </div>
          <div className="transactions-page__filters">
            <select className="input transactions-page__select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} aria-label="Filter by status">
              <option value="all">All statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            <select className="input transactions-page__select" value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} aria-label="Filter by agent">
              <option value="all">All agents</option>
              {agents.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <span className="text-xs text-muted mono">{filtered.length} records</span>
          </div>
        </div>

        {/* Table body */}
        {filtered.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Agent</th>
                <th>Task</th>
                <th>Amount</th>
                <th>TX Hash</th>
                <th>Settlement</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="transactions-page__row" onClick={() => setSelectedTx(e)}>
                  <td className="mono text-xs text-muted">
                    {new Date(e.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
                    {new Date(e.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </td>
                  <td>
                    <span className="text-sm text-primary font-medium">{e.sellerName}</span>
                    <span className="text-xs text-muted block mono">#{e.roundNumber.toLocaleString()}</span>
                  </td>
                  <td className="transactions-page__task">{e.task}</td>
                  <td className="mono text-green font-semibold">{e.priceAlgo.toFixed(4)}</td>
                  <td className="mono text-xs">
                    <a
                      href={`https://lora.algokit.io/testnet/transaction/${e.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-green hover:underline"
                      onClick={(evt) => evt.stopPropagation()}
                    >
                      {truncateHash(e.txHash, 8)}
                    </a>
                  </td>
                  <td className="mono text-xs text-secondary">{formatDuration(e.confirmationTimeMs)}</td>
                  <td>
                    <StatusBadge status={e.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">
              <Icon name="transactions" size={18} />
            </div>
            <p className="empty-state__title">No transactions yet</p>
            <p className="empty-state__body">Your confirmed x402 payments will appear here.</p>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state__icon">
              <Icon name="search" size={18} />
            </div>
            <p className="empty-state__title">No matches</p>
            <p className="empty-state__body">Adjust your search or filters.</p>
          </div>
        )}
      </section>

      {/* Detail drawer */}
      {selectedTx && (
        <div className="tx-drawer-overlay" onClick={() => setSelectedTx(null)}>
          <div
            className="tx-drawer surface-glass border-subtle"
            onClick={(evt) => evt.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Transaction detail"
          >
            <div className="flex items-center justify-between mb-4 border-b border-subtle pb-3">
              <div>
                <h3 className="text-lg font-bold text-primary">Transaction Detail</h3>
                <StatusBadge status={selectedTx.status} />
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedTx(null)} aria-label="Close">
                <Icon name="x" size={14} />
              </button>
            </div>
            <div className="flex flex-col gap-3 text-xs">
              <DetailRow label="Transaction ID" mono>{selectedTx.id}</DetailRow>
              <DetailRow label="Sender">{selectedTx.buyerName} <span className="mono text-muted">{selectedTx.buyerId}</span></DetailRow>
              <DetailRow label="Receiver">{selectedTx.sellerName} <span className="mono text-muted">{selectedTx.sellerId}</span></DetailRow>
              <DetailRow label="Amount" mono green>{selectedTx.priceAlgo.toFixed(4)} ALGO</DetailRow>
              <DetailRow label="Network" mono>algorand-testnet</DetailRow>
              <DetailRow label="Round" mono>#{selectedTx.roundNumber.toLocaleString()}</DetailRow>
              <DetailRow label="Timestamp" mono>
                {new Date(selectedTx.timestamp).toLocaleString()}
              </DetailRow>
              <DetailRow label="Settlement Time" mono>{formatDuration(selectedTx.confirmationTimeMs)}</DetailRow>
              <DetailRow label="Status">
                <StatusBadge status={selectedTx.status} />
              </DetailRow>
              <DetailRow label="Task">{selectedTx.task}</DetailRow>
              <DetailRow label="TX Hash">
                <div className="flex items-center gap-2">
                  <span className="mono text-green break-all">{selectedTx.txHash}</span>
                  <CopyButton text={selectedTx.txHash} label="Copy" />
                </div>
              </DetailRow>
              <div className="pt-4 border-t border-subtle flex gap-2">
                <a
                  href={`https://lora.algokit.io/testnet/transaction/${selectedTx.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary w-full justify-center"
                >
                  <Icon name="external" size={13} />
                  View on Algorand Explorer
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, children, mono, green }: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
  green?: boolean;
}) {
  return (
    <div>
      <span className="text-muted block">{label}</span>
      <span className={`${mono ? 'mono' : ''} ${green ? 'text-green font-bold' : 'text-primary font-medium'}`}>
        {children}
      </span>
    </div>
  );
}
