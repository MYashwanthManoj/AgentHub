/**
 * AnalyticsPage — usage & performance analytics from real ledger data.
 *
 * Time filters: 24H / 7D / 30D / 90D. All charts are computed from the
 * live ledger (no fake data). When there's no activity a meaningful empty
 * state is shown instead of a decorative chart.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLedger } from '../hooks/useLedger';
import { Icon, type IconName } from '../components/Icon/Icon';
import { formatDuration } from '../utils/format';
import './AnalyticsPage.css';

type Range = '24h' | '7d' | '30d' | '90d';

const RANGES: Array<{ id: Range; label: string; hours: number }> = [
  { id: '24h', label: '24H', hours: 24 },
  { id: '7d', label: '7D', hours: 24 * 7 },
  { id: '30d', label: '30D', hours: 24 * 30 },
  { id: '90d', label: '90D', hours: 24 * 90 },
];

interface Point { t: number; count: number; spend: number }

export function AnalyticsPage() {
  const { entries } = useLedger();
  const [range, setRange] = useState<Range>('7d');

  const rangeHours = RANGES.find((r) => r.id === range)!.hours;
  const cutoff = Date.now() - rangeHours * 3_600_000;

  const scoped = useMemo(() => entries.filter((e) => e.timestamp >= cutoff), [entries, cutoff]);

  const calls = scoped.length;
  const spend = scoped.filter((e) => e.status === 'confirmed').reduce((s, e) => s + e.priceAlgo, 0);
  const confirmed = scoped.filter((e) => e.status === 'confirmed').length;
  const successRate = calls > 0 ? (confirmed / calls) * 100 : 0;
  const avgLatency = calls > 0 ? scoped.reduce((s, e) => s + e.confirmationTimeMs, 0) / calls : 0;
  const maxLatency = calls > 0 ? Math.max(...scoped.map((e) => e.confirmationTimeMs)) : 0;

  // Bucket into ≤48 buckets for the line/area charts
  const buckets = useMemo<Point[]>(() => {
    if (scoped.length === 0) return [];
    const bucketCount = Math.min(48, Math.max(12, Math.ceil(scoped.length / 3)));
    const span = Math.max(1, rangeHours * 3_600_000 / bucketCount);
    const start = cutoff;
    const points: Point[] = [];
    for (let i = 0; i < bucketCount; i++) {
      const t0 = start + i * span;
      const t1 = t0 + span;
      const slice = scoped.filter((e) => e.timestamp >= t0 && e.timestamp < t1);
      points.push({
        t: t0,
        count: slice.length,
        spend: slice.filter((e) => e.status === 'confirmed').reduce((s, e) => s + e.priceAlgo, 0),
      });
    }
    return points;
  }, [scoped, cutoff, rangeHours]);

  // Agent usage donut
  const agentUsage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of scoped) counts.set(e.sellerName, (counts.get(e.sellerName) ?? 0) + 1);
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [scoped]);

  const topServices = useMemo(() => {
    const map = new Map<string, { calls: number; spend: number }>();
    for (const e of scoped) {
      const cur = map.get(e.sellerName) ?? { calls: 0, spend: 0 };
      cur.calls += 1;
      if (e.status === 'confirmed') cur.spend += e.priceAlgo;
      map.set(e.sellerName, cur);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 5);
  }, [scoped]);

  const maxCount = Math.max(1, ...buckets.map((b) => b.count));
  const maxSpend = Math.max(0.01, ...buckets.map((b) => b.spend));

  const hasData = calls > 0;

  return (
    <div className="analytics-page animate-fade-in">
      <div className="analytics-page__header">
        <div>
          <h1 className="page-title">Usage & Performance</h1>
          <p className="page-subtitle">Monitor agent activity, spending, and settlement performance.</p>
        </div>
        <div className="analytics-page__range" role="radiogroup" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={range === r.id}
              className={`analytics-page__range-btn ${range === r.id ? 'analytics-page__range-btn--active' : ''}`}
              onClick={() => setRange(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="card p-10 analytics-page__empty">
          <div className="empty-state__icon">
            <Icon name="analytics" size={18} />
          </div>
          <p className="empty-state__title">No usage data yet</p>
          <p className="empty-state__body">
            Execute your first agent service to start generating analytics. Charts will be computed from your real ledger.
          </p>
          <Link to="/developer/playground" className="btn btn-primary mt-3">
            <Icon name="play" size={13} />
            Open API Playground
          </Link>
        </div>
      ) : (
        <>
          {/* Metrics */}
          <div className="analytics-page__metrics">
            <MetricCard label="Agent Calls" value={calls.toLocaleString()} icon="bot" />
            <MetricCard label="Spend" value={`${spend.toFixed(4)} ALGO`} icon="dollar" green />
            <MetricCard label="Success Rate" value={`${successRate.toFixed(1)}%`} icon="activity" green={successRate >= 95} />
            <MetricCard label="Avg Latency" value={formatDuration(avgLatency)} icon="clock" />
          </div>

          {/* Charts */}
          <div className="analytics-page__charts">
            {/* Request volume line */}
            <section className="card p-6">
              <div className="analytics-page__chart-head">
                <h2 className="section-title">Request Volume</h2>
                <span className="text-xs text-muted">executions · {range}</span>
              </div>
              <VolumeChart buckets={buckets} max={maxCount} />
            </section>

            {/* ALGO spending bars */}
            <section className="card p-6">
              <div className="analytics-page__chart-head">
                <h2 className="section-title">ALGO Spending</h2>
                <span className="text-xs text-muted">settled · {range}</span>
              </div>
              <SpendChart buckets={buckets} max={maxSpend} />
            </section>

            {/* Agent usage donut */}
            <section className="card p-6">
              <div className="analytics-page__chart-head">
                <h2 className="section-title">Agent Usage</h2>
                <span className="text-xs text-muted">share of calls</span>
              </div>
              <DonutChart data={agentUsage} />
            </section>

            {/* Settlement latency */}
            <section className="card p-6">
              <div className="analytics-page__chart-head">
                <h2 className="section-title">Settlement Time</h2>
                <span className="text-xs text-muted">avg vs max · {range}</span>
              </div>
              <LatencyChart avg={avgLatency} max={maxLatency} />
            </section>
          </div>

          {/* Top services */}
          <section className="card p-6">
            <div className="analytics-page__chart-head">
              <h2 className="section-title">Top Services</h2>
              <span className="text-xs text-muted">by calls</span>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Calls</th>
                  <th>Spend (ALGO)</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {topServices.map((s) => (
                  <tr key={s.name}>
                    <td className="text-sm text-primary font-medium">{s.name}</td>
                    <td className="mono text-xs text-secondary">{s.calls}</td>
                    <td className="mono text-xs text-green">{s.spend.toFixed(4)}</td>
                    <td>
                      <div className="analytics-page__share-track">
                        <div
                          className="analytics-page__share-fill"
                          style={{ width: `${(s.calls / maxCount) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function MetricCard({ label, value, icon, green }: {
  label: string;
  value: string;
  icon: IconName;
  green?: boolean;
}) {
  return (
    <div className="card card--metric p-4">
      <div className="analytics-page__metric-top">
        <span className="meta-label">{label}</span>
        <span className="analytics-page__metric-icon" aria-hidden="true">
          <Icon name={icon} size={14} />
        </span>
      </div>
      <div className={`metric-value ${green ? 'metric-value--green' : ''}`}>{value}</div>
    </div>
  );
}

/** Pure-SVG line/area chart with hover tooltips. */
function VolumeChart({ buckets, max }: { buckets: Point[]; max: number }) {
  const W = 480;
  const H = 160;
  const step = W / Math.max(1, buckets.length - 1);
  const pts = buckets.map((b, i) => ({ x: i * step, y: H - (b.count / max) * H, b }));
  const line = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `0,${H} ${line} ${W},${H}`;

  return (
    <div className="analytics-page__chart">
      <svg viewBox={`0 0 ${W} ${H}`} className="analytics-page__line" role="img" aria-label="Request volume over time">
        <defs>
          <linearGradient id="volFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00d4aa" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#00d4aa" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" y1={H * f} x2={W} y2={H * f} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 4" />
        ))}
        <polygon points={area} fill="url(#volFill)" />
        <polyline points={line} fill="none" stroke="#00d4aa" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="2.5" fill="#00d4aa">
              <title>{`${p.b.count} calls`}</title>
            </circle>
            <rect x={p.x - 10} y={0} width="20" height={H} fill="transparent">
              <title>{`${p.b.count} calls`}</title>
            </rect>
          </g>
        ))}
      </svg>
      <div className="analytics-page__chart-axis">
        <span className="mono text-2xs text-muted">{formatAxisLabel(buckets[0]?.t, buckets.length)}</span>
        <span className="mono text-2xs text-muted">{formatAxisLabel(buckets[buckets.length - 1]?.t, buckets.length)}</span>
      </div>
    </div>
  );
}

function formatAxisLabel(t: number | undefined, bucketCount: number): string {
  if (!t) return '—';
  if (bucketCount <= 24) {
    return new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Bar chart for ALGO spending. */
function SpendChart({ buckets, max }: { buckets: Point[]; max: number }) {
  return (
    <div className="analytics-page__spend">
      <div className="analytics-page__spend-bars">
        {buckets.map((b, i) => (
          <div key={i} className="analytics-page__spend-col" title={`${b.spend.toFixed(4)} ALGO`}>
            <div
              className="analytics-page__spend-bar"
              style={{ height: `${Math.max(4, (b.spend / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="analytics-page__chart-axis">
        <span className="mono text-2xs text-muted">{formatAxisLabel(buckets[0]?.t, buckets.length)}</span>
        <span className="mono text-2xs text-muted">{formatAxisLabel(buckets[buckets.length - 1]?.t, buckets.length)}</span>
      </div>
    </div>
  );
}

/** Conic-gradient donut for agent usage share. */
function DonutChart({ data }: { data: Array<{ name: string; count: number }> }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return null;
  // Teal→cyan→blue ramp — mid-tones that read on both dark and light surfaces.
  const palette = ['#00d4aa', '#0fc2a8', '#1daebc', '#2e9bd0', '#4f86dc', '#7f86d8', '#a588d2', '#c88acf'];
  let acc = 0;
  const stops = data.map((d, i) => {
    const start = (acc / total) * 100;
    acc += d.count;
    const end = (acc / total) * 100;
    return `${palette[i % palette.length]} ${start}% ${end}%`;
  });
  const gradient = `conic-gradient(${stops.join(', ')})`;

  return (
    <div className="analytics-page__donut">
      <div className="analytics-page__donut-ring" style={{ background: gradient }} role="img" aria-label="Agent usage distribution">
        <div className="analytics-page__donut-hole">
          <span className="mono text-lg font-semibold text-primary">{total}</span>
          <span className="text-2xs text-muted">calls</span>
        </div>
      </div>
      <ul className="analytics-page__donut-legend">
        {data.map((d, i) => (
          <li key={d.name}>
            <span className="analytics-page__legend-dot" style={{ background: palette[i % palette.length] }} />
            <span className="text-xs text-secondary">{d.name}</span>
            <span className="mono text-xs text-muted">{((d.count / total) * 100).toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Settlement latency mini-bar (avg vs max). */
function LatencyChart({ avg, max }: { avg: number; max: number }) {
  const avgPct = Math.min(100, (avg / Math.max(max, 1)) * 100);
  return (
    <div className="analytics-page__latency">
      <div className="analytics-page__latency-row">
        <span className="text-xs text-secondary">Avg</span>
        <div className="analytics-page__latency-track">
          <div className="analytics-page__latency-fill" style={{ width: `${Math.max(4, avgPct)}%` }} />
        </div>
        <span className="mono text-xs text-green">{formatDuration(avg)}</span>
      </div>
      <div className="analytics-page__latency-row">
        <span className="text-xs text-secondary">Max</span>
        <div className="analytics-page__latency-track">
          <div className="analytics-page__latency-fill analytics-page__latency-fill--max" style={{ width: '100%' }} />
        </div>
        <span className="mono text-xs text-amber">{formatDuration(max)}</span>
      </div>
      <p className="text-[11px] text-muted mt-3">
        Algorand finality ~3.9s · 0.001 ALGO network fee
      </p>
    </div>
  );
}
