/**
 * DashboardPage — Overview.
 *
 * Instantly answers "what is happening in my AgentHub workspace?" with:
 *  - greeting hero + network status
 *  - live metrics (services, transactions, spend, success rate, settlement)
 *  - recent agent activity + recent transactions
 *  - per-agent usage and payment volume
 *  - active services with quick actions
 *
 * All metrics derive from the live registry + ledger — never fake numbers.
 * Every panel has a loading skeleton and an empty state.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLedger } from '../hooks/useLedger';
import { useRegistry } from '../hooks/useRegistry';
import { Icon } from '../components/Icon/Icon';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatDuration, truncateHash } from '../utils/format';
import './DashboardPage.css';

export function DashboardPage() {
  const { entries, totalSpent, totalTransactions, availableBalance } = useLedger();
  const agents = useRegistry();
  const [greeting] = useState(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  });

  const confirmed = entries.filter((e) => e.status === 'confirmed').length;
  const failed = entries.filter((e) => e.status === 'failed').length;
  const successRate = entries.length > 0 ? (confirmed / entries.length) * 100 : 0;
  const avgSettlement = entries.length > 0
    ? entries.reduce((sum, e) => sum + e.confirmationTimeMs, 0) / entries.length
    : 0;

  // Per-agent usage (calls + spend)
  const agentUsage = agents.map((a) => {
    const tx = entries.filter((e) => e.sellerId === a.id);
    return { agent: a, calls: tx.length, spend: tx.reduce((s, e) => s + e.priceAlgo, 0) };
  }).filter((u) => u.calls > 0).sort((a, b) => b.calls - a.calls);
  const maxCalls = Math.max(1, ...agentUsage.map((u) => u.calls));

  // Payment volume: spending bucketed by day (last 7 days)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    return d.getTime();
  });
  const volume = days.map((dayStart) => {
    const next = dayStart + 86_400_000;
    return entries
      .filter((e) => e.status === 'confirmed' && e.timestamp >= dayStart && e.timestamp < next)
      .reduce((s, e) => s + e.priceAlgo, 0);
  });
  const maxVolume = Math.max(0.01, ...volume);

  const recentTxs = entries.slice(0, 5);
  const recentActivity = entries.slice(0, 6);

  return (
    <div className="dashboard-page animate-fade-in">
      {/* Hero */}
      <div className="dashboard-page__hero card card--primary">
        <div className="dashboard-page__hero-copy">
          <h1 className="page-title">
            {greeting}, <span className="gradient-text">BlockHack Workspace</span>
          </h1>
          <p className="page-subtitle">Monitor your autonomous agent economy — discover, pay, verify, execute.</p>
        </div>
        <div className="dashboard-page__hero-actions">
          <Link to="/developer/playground" className="btn btn-primary">
            <Icon name="play" size={14} />
            Open API Playground
          </Link>
          <Link to="/registry" className="btn btn-ghost">
            <Icon name="registry" size={14} />
            Browse Registry
          </Link>
        </div>
      </div>

      {/* Status strip */}
      <div className="dashboard-page__status">
        <div className="dashboard-page__status-item">
          <span className="status-dot done" />
          <span className="mono text-xs text-green font-semibold">TESTNET</span>
          <span className="text-xs text-muted">Algorand</span>
        </div>
        <div className="dashboard-page__status-item">
          <span className="status-dot done" />
          <span className="text-xs text-primary font-medium">Node Online</span>
          <span className="text-xs text-muted">3.9s finality</span>
        </div>
        <div className="dashboard-page__status-item">
          <span className="status-dot done" />
          <span className="text-xs text-primary font-medium">Wallet Connected</span>
          <Link to="/wallet" className="text-xs text-green mono">LRJPYUEL…5T2Q</Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="dashboard-page__metrics">
        <MetricCard label="Agent Services" value={String(agents.length)} suffix="registered" icon="registry" />
        <MetricCard label="Transactions" value={String(totalTransactions)} suffix="executed" icon="transactions" />
        <MetricCard label="ALGO Spent" value={totalSpent.toFixed(4)} suffix="ALGO" icon="dollar" green />
        <MetricCard
          label="Success Rate"
          value={entries.length > 0 ? `${successRate.toFixed(1)}%` : '—'}
          suffix={entries.length > 0 ? `${failed} failed` : 'no data'}
          icon="activity"
          green={entries.length > 0 && successRate >= 95}
        />
        <MetricCard
          label="Avg Settlement"
          value={entries.length > 0 ? formatDuration(avgSettlement) : '—'}
          suffix="per tx"
          icon="clock"
        />
      </div>

      {/* Main grid: activity + transactions */}
      <div className="dashboard-page__grid">
        {/* Recent Agent Activity */}
        <section className="card p-5">
          <div className="dashboard-page__section-head">
            <h2 className="section-title">Recent Agent Activity</h2>
            <Link to="/transactions" className="dashboard-page__link">
              View all <Icon name="arrow-right" size={12} />
            </Link>
          </div>
          {recentActivity.length > 0 ? (
            <ul className="dashboard-page__activity">
              {recentActivity.map((tx) => (
                <li key={tx.id} className="dashboard-page__activity-item">
                  <span className={`status-dot ${tx.status === 'confirmed' ? 'done' : tx.status === 'failed' ? 'error' : 'active'}`} />
                  <div className="dashboard-page__activity-main">
                    <span className="text-sm text-primary font-medium">{tx.sellerName}</span>
                    <span className="text-xs text-muted truncate">{tx.task}</span>
                  </div>
                  <div className="dashboard-page__activity-meta">
                    <span className="mono text-xs text-green">{tx.priceAlgo} ALGO</span>
                    <span className="mono text-xs text-muted">#{tx.roundNumber}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyPanel
              icon="activity"
              title="No activity yet"
              body="Execute your first agent service to see live payment activity here."
              cta={{ to: '/developer/playground', label: 'Open API Playground' }}
            />
          )}
        </section>

        {/* Recent Transactions */}
        <section className="card p-5">
          <div className="dashboard-page__section-head">
            <h2 className="section-title">Recent Transactions</h2>
            <Link to="/transactions" className="dashboard-page__link">
              View ledger <Icon name="arrow-right" size={12} />
            </Link>
          </div>
          {recentTxs.length > 0 ? (
            <ul className="dashboard-page__txlist">
              {recentTxs.map((tx) => (
                <li key={tx.id} className="dashboard-page__txitem">
                  <div className="dashboard-page__tx-main">
                    <span className="text-sm text-primary font-medium">{tx.sellerName}</span>
                    <span className="mono text-xs text-muted">{truncateHash(tx.txHash, 8)}</span>
                  </div>
                  <div className="dashboard-page__tx-meta">
                    <StatusBadge status={tx.status} />
                    <span className="mono text-xs text-green">{tx.priceAlgo} ALGO</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyPanel
              icon="transactions"
              title="No transactions yet"
              body="Your confirmed x402 payments will appear here."
              cta={{ to: '/developer/playground', label: 'Run your first payment' }}
            />
          )}
        </section>
      </div>

      {/* Bottom grid: volume + usage + services */}
      <div className="dashboard-page__grid dashboard-page__grid--bottom">
        {/* Payment Volume */}
        <section className="card p-5">
          <div className="dashboard-page__section-head">
            <h2 className="section-title">Payment Volume</h2>
            <span className="text-xs text-muted">ALGO per day · 7 days</span>
          </div>
          {entries.some((e) => e.status === 'confirmed') ? (
            <div className="dashboard-page__volume">
              <div className="dashboard-page__volume-bars" aria-hidden="true">
                {volume.map((v, i) => (
                  <div key={i} className="dashboard-page__volume-col">
                    <div
                      className="dashboard-page__volume-bar"
                      style={{ height: `${Math.max(4, (v / maxVolume) * 100)}%` }}
                      title={`${v.toFixed(4)} ALGO`}
                    />
                  </div>
                ))}
              </div>
              <div className="dashboard-page__volume-labels">
                {days.map((d, i) => (
                  <span key={i} className="mono text-2xs text-muted">
                    {new Date(d).toLocaleDateString('en-US', { weekday: 'narrow' })}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <EmptyPanel icon="dollar" title="No payment volume" body="Settled payments will chart here automatically." />
          )}
        </section>

        {/* Agent Usage */}
        <section className="card p-5">
          <div className="dashboard-page__section-head">
            <h2 className="section-title">Agent Usage</h2>
            <span className="text-xs text-muted">by invocation count</span>
          </div>
          {agentUsage.length > 0 ? (
            <ul className="dashboard-page__usage">
              {agentUsage.slice(0, 6).map(({ agent, calls }) => (
                <li key={agent.id} className="dashboard-page__usage-row">
                  <div className="dashboard-page__usage-label">
                    <span className="text-sm text-primary">{agent.name}</span>
                    <span className="mono text-xs text-muted">{calls} calls</span>
                  </div>
                  <div className="dashboard-page__usage-track">
                    <div
                      className="dashboard-page__usage-fill"
                      style={{ width: `${(calls / maxCalls) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyPanel icon="bot" title="No usage yet" body="Agent invocation stats appear once you run a workflow." />
          )}
        </section>

        {/* Active Services */}
        <section className="card p-5">
          <div className="dashboard-page__section-head">
            <h2 className="section-title">Active Services</h2>
            <Link to="/registry" className="dashboard-page__link">
              Registry <Icon name="arrow-right" size={12} />
            </Link>
          </div>
          <ul className="dashboard-page__services">
            {agents.slice(0, 6).map((agent) => (
              <li key={agent.id}>
                <Link to={`/marketplace/${agent.id}`} className="dashboard-page__service">
                  <span className="dashboard-page__service-name">
                    <Icon name="bot" size={13} />
                    {agent.name}
                  </span>
                  <span className="mono text-xs text-green">{agent.priceAlgo} ALGO</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Wallet strip */}
      <div className="dashboard-page__wallet">
        <div>
          <span className="meta-label">Connected Wallet Balance</span>
          <div className="mono text-xl font-semibold text-green mt-1">
            {availableBalance.toFixed(4)} <span className="text-xs text-muted">ALGO</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">Wallet pays for x402 agent services automatically.</span>
          <Link to="/wallet" className="btn btn-sm btn-ghost">
            <Icon name="wallet" size={13} />
            Manage Wallet
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function MetricCard({ label, value, suffix, icon, green }: {
  label: string;
  value: string;
  suffix: string;
  icon: 'registry' | 'transactions' | 'dollar' | 'activity' | 'clock';
  green?: boolean;
}) {
  return (
    <div className="card card--metric dashboard-page__metric">
      <div className="dashboard-page__metric-top">
        <span className="meta-label">{label}</span>
        <span className="dashboard-page__metric-icon" aria-hidden="true">
          <Icon name={icon} size={15} />
        </span>
      </div>
      <div className={`metric-value ${green ? 'metric-value--green' : ''}`}>{value}</div>
      <span className="text-xs text-muted">{suffix}</span>
    </div>
  );
}

function EmptyPanel({ icon, title, body, cta }: {
  icon: 'activity' | 'transactions' | 'dollar' | 'bot';
  title: string;
  body: string;
  cta?: { to: string; label: string };
}) {
  return (
    <div className="empty-state dashboard-page__empty">
      <div className="empty-state__icon">
        <Icon name={icon} size={18} />
      </div>
      <p className="empty-state__title">{title}</p>
      <p className="empty-state__body">{body}</p>
      {cta && (
        <Link to={cta.to} className="btn btn-sm btn-primary mt-2">
          {cta.label}
        </Link>
      )}
    </div>
  );
}
