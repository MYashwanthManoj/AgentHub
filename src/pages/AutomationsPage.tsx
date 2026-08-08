/**
 * AutomationsPage — multi-agent workflows, the autonomous showcase.
 * Workflows chain verified agents: Lookup → Summarizer → Chart etc.
 * Each workflow card shows trigger, agent chain, estimated cost, and status.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon/Icon';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useBackendCollection } from '../hooks/useBackendCollection';
import { formatDuration, timeAgo } from '../utils/format';
import './AutomationsPage.css';

interface WorkflowAgent {
  id: string;
  name: string;
  cost: number;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  triggerIcon: IconName;
  agents: WorkflowAgent[];
  estimatedCost: number;
  lastRun: string;
  nextRun: string;
  status: 'active' | 'paused';
  runs: number;
}

interface AutomationRun {
  id: string;
  automationId: string;
  workflowName: string;
  trigger: 'manual' | 'schedule' | 'event';
  status: 'running' | 'success' | 'failed';
  costAlgo: number;
  /** Epoch ms — displayed as a relative "started" label. */
  startedAt: number;
  durationMs: number | null;
}

const TRIGGER_LABEL: Record<AutomationRun['trigger'], string> = {
  manual: 'Manual',
  schedule: 'Scheduled',
  event: 'Event',
};

const SEED: Workflow[] = [
  {
    id: 'wf-1',
    name: 'Research Pipeline',
    description: 'Compiles a weekly research digest from the Research Orchestrator, lookup, summarization, and charting agents.',
    trigger: 'Every 6 hours',
    triggerIcon: 'clock',
    agents: [
      { id: 'agent-researcher-01', name: 'Research Orchestrator Agent', cost: 0.12 },
      { id: 'agent-lookup-01', name: 'Lookup Agent', cost: 0.03 },
      { id: 'agent-summarizer-01', name: 'Summarizer Agent', cost: 0.05 },
      { id: 'agent-chart-01', name: 'Chart Agent', cost: 0.08 },
    ],
    estimatedCost: 0.28,
    lastRun: '2 hours ago',
    nextRun: 'In 4 hours',
    status: 'active',
    runs: 128,
  },
  {
    id: 'wf-2',
    name: 'Security Watch',
    description: 'Monitors contracts for exploit patterns and alerts the team on anomalies.',
    trigger: 'Continuous',
    triggerIcon: 'activity',
    agents: [{ id: 'agent-security-01', name: 'Security Sentinel Agent', cost: 0.15 }],
    estimatedCost: 3.6,
    lastRun: '12 min ago',
    nextRun: 'Continuous',
    status: 'active',
    runs: 512,
  },
  {
    id: 'wf-3',
    name: 'Invoice Extraction',
    description: 'Parses incoming invoices into structured JSON and archives summaries.',
    trigger: 'On event',
    triggerIcon: 'zap',
    agents: [
      { id: 'agent-extractor-01', name: 'Data Extractor Agent', cost: 0.06 },
      { id: 'agent-summarizer-01', name: 'Summarizer Agent', cost: 0.05 },
    ],
    estimatedCost: 0.11,
    lastRun: 'Yesterday',
    nextRun: 'On next event',
    status: 'paused',
    runs: 43,
  },
  {
    id: 'wf-4',
    name: 'Media & Market Digest',
    description: 'Pulls live crypto + weather data, renders a branded market image, and ships a scannable QR digest.',
    trigger: 'Every 3 hours',
    triggerIcon: 'sparkles',
    agents: [
      { id: 'agent-market-01', name: 'Market Intelligence Agent', cost: 0.09 },
      { id: 'agent-weather-01', name: 'Weather Intelligence Agent', cost: 0.02 },
      { id: 'agent-image-01', name: 'Image Generator Agent', cost: 0.10 },
      { id: 'agent-qr-01', name: 'QR Code Generator Agent', cost: 0.03 },
    ],
    estimatedCost: 0.24,
    lastRun: '35 min ago',
    nextRun: 'In 2 hours',
    status: 'active',
    runs: 57,
  },
];

export function AutomationsPage() {
  const { items: workflows, updateItem: updateWorkflow } = useBackendCollection<Workflow>({
    storageKey: 'blockhack_automations_v1',
    seed: SEED,
    fetchPath: '/automations/',
    postPath: '/automations/',
    fromBackend: (r) => ({
      id: String(r.id ?? ''),
      name: String(r.name ?? ''),
      description: String(r.description ?? ''),
      trigger: String(r.trigger ?? ''),
      triggerIcon: (r.triggerIcon as IconName) ?? 'clock',
      agents: Array.isArray(r.agents)
        ? (r.agents as { id?: unknown; name?: unknown; cost?: unknown }[]).map((a) => ({
            id: String(a.id ?? ''),
            name: String(a.name ?? ''),
            cost: Number(a.cost ?? 0),
          }))
        : [],
      estimatedCost: Number(r.estimatedCost ?? 0),
      lastRun: String(r.lastRun ?? ''),
      nextRun: String(r.nextRun ?? ''),
      status: r.status === 'paused' ? 'paused' : 'active',
      runs: Number(r.runs ?? 0),
    }),
    toCreateBody: (w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      trigger: w.trigger,
      trigger_icon: w.triggerIcon,
      agents: w.agents,
      estimated_cost: w.estimatedCost,
      last_run: w.lastRun,
      next_run: w.nextRun,
      status: w.status,
      runs: w.runs,
    }),
    updateRequest: (id, patch) => ({
      path: `/automations/${id}`,
      method: 'PATCH',
      body: {
        status: patch.status,
        last_run: patch.lastRun,
        next_run: patch.nextRun,
        runs: patch.runs,
      },
    }),
  });

  const { items: runs, addItem: addRun, updateItem: updateRun } = useBackendCollection<AutomationRun>({
    storageKey: 'blockhack_automation_runs_v1',
    seed: [],
    fetchPath: '/automations/runs',
    postPath: '/automations/runs',
    fromBackend: (r) => ({
      id: String(r.id ?? ''),
      automationId: String(r.automationId ?? ''),
      workflowName: String(r.workflowName ?? ''),
      trigger: r.trigger === 'schedule' || r.trigger === 'event' ? r.trigger : 'manual',
      status: r.status === 'success' || r.status === 'failed' ? r.status : 'running',
      costAlgo: Number(r.costAlgo ?? 0),
      startedAt:
        typeof r.startedAt === 'number'
          ? r.startedAt
          : Date.parse(String(r.startedAt ?? '')) || Date.now(),
      durationMs: r.durationMs != null ? Number(r.durationMs) : null,
    }),
    toCreateBody: (run) => ({
      id: run.id,
      automation_id: run.automationId,
      workflow_name: run.workflowName,
      trigger: run.trigger,
      status: run.status,
      cost_algo: run.costAlgo,
      started_at: new Date(run.startedAt).toISOString(),
      duration_ms: run.durationMs,
    }),
    updateRequest: (id, patch) => ({
      path: `/automations/runs/${id}`,
      method: 'PATCH',
      body: { status: patch.status, duration_ms: patch.durationMs },
    }),
  });

  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const toggleStatus = (id: string) => {
    const wf = workflows.find((w) => w.id === id);
    if (!wf) return;
    const next = wf.status === 'active' ? 'paused' : 'active';
    updateWorkflow(id, { status: next });
    showToast(`${wf.name} ${next === 'active' ? 'resumed' : 'paused'}`);
  };

  const runNow = (id: string) => {
    const wf = workflows.find((w) => w.id === id);
    if (!wf) return;
    updateWorkflow(id, {
      lastRun: 'Just now',
      nextRun: 'Recalculating…',
      runs: wf.runs + 1,
    });
    // Log the execution — starts RUNNING, flips to SUCCESS once the
    // simulated agent chain settles (persisted to the backend either way).
    const run: AutomationRun = {
      id: `run-${Date.now()}`,
      automationId: wf.id,
      workflowName: wf.name,
      trigger: 'manual',
      status: 'running',
      costAlgo: wf.estimatedCost,
      startedAt: Date.now(),
      durationMs: null,
    };
    addRun(run);
    showToast('Workflow triggered');
    window.setTimeout(() => {
      updateRun(run.id, {
        status: 'success',
        durationMs: 3200 + Math.round(Math.random() * 1800),
      });
    }, 3600);
  };

  const totalMonthly = workflows
    .filter((wf) => wf.status === 'active')
    .reduce((sum, wf) => sum + wf.estimatedCost * 4, 0);

  return (
    <div className="automations-page animate-fade-in">
      <div className="automations-page__header">
        <div>
          <h1 className="page-title">Automations</h1>
          <p className="page-subtitle">
            Multi-agent workflows that discover, pay, and execute — with no human in the loop.
          </p>
        </div>
        <div className="automations-page__header-actions">
          <span className="text-xs text-muted">Est. monthly spend</span>
          <span className="mono text-sm text-green font-semibold">{totalMonthly.toFixed(2)} ALGO</span>
          <Link to="/marketplace" className="btn btn-sm btn-primary">
            <Icon name="plus" size={13} />
            New Workflow
          </Link>
        </div>
      </div>

      {workflows.length > 0 ? (
        <div className="automations-page__grid">
          {workflows.map((wf) => (
            <section key={wf.id} className={`card card--primary p-6 ${wf.status === 'paused' ? 'automations-page__card--paused' : ''}`}>
              <div className="automations-page__card-head">
                <div className="automations-page__card-title">
                  <span className="automations-page__card-icon" aria-hidden="true">
                    <Icon name={wf.triggerIcon} size={15} />
                  </span>
                  <div>
                    <h2 className="section-title">{wf.name}</h2>
                    <span className="text-xs text-secondary">{wf.description}</span>
                  </div>
                </div>
                <StatusBadge status={wf.status === 'active' ? 'active' : 'inactive'} label={wf.status} />
              </div>

              {/* Agent chain */}
              <div className="automations-page__chain">
                {wf.agents.map((agent, i) => (
                  <span key={agent.id} className="automations-page__chain-item">
                    <span className="automations-page__chain-node">
                      <Icon name="bot" size={12} />
                      {agent.name}
                      <span className="mono text-2xs text-muted">{agent.cost.toFixed(2)}</span>
                    </span>
                    {i < wf.agents.length - 1 && (
                      <Icon name="chevron-right" size={13} className="automations-page__chain-arrow" />
                    )}
                  </span>
                ))}
              </div>

              {/* Meta */}
              <div className="automations-page__meta">
                <div className="automations-page__meta-item">
                  <span className="meta-label">Trigger</span>
                  <span className="text-sm text-primary">{wf.trigger}</span>
                </div>
                <div className="automations-page__meta-item">
                  <span className="meta-label">Est. Cost</span>
                  <span className="mono text-sm text-green">{wf.estimatedCost.toFixed(2)} ALGO / run</span>
                </div>
                <div className="automations-page__meta-item">
                  <span className="meta-label">Last Run</span>
                  <span className="text-sm text-primary">{wf.lastRun}</span>
                </div>
                <div className="automations-page__meta-item">
                  <span className="meta-label">Next Run</span>
                  <span className="text-sm text-secondary">{wf.nextRun}</span>
                </div>
                <div className="automations-page__meta-item">
                  <span className="meta-label">Runs</span>
                  <span className="mono text-sm text-primary">{wf.runs.toLocaleString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="automations-page__actions">
                <button type="button" className="btn btn-sm" onClick={() => runNow(wf.id)}>
                  <Icon name="play" size={12} />
                  Run Now
                </button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => toggleStatus(wf.id)}>
                  <Icon name={wf.status === 'active' ? 'pause' : 'play'} size={12} />
                  {wf.status === 'active' ? 'Pause' : 'Resume'}
                </button>
                <Link to="/marketplace" className="btn btn-sm btn-ghost">
                  <Icon name="eye" size={12} />
                  View Execution
                </Link>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="empty-state card p-10">
          <div className="empty-state__icon">
            <Icon name="automations" size={18} />
          </div>
          <p className="empty-state__title">No automations</p>
          <p className="empty-state__body">Chain verified agents into recurring, self-paying workflows.</p>
          <Link to="/marketplace" className="btn btn-sm btn-primary mt-2">
            Build a workflow
          </Link>
        </div>
      )}

      {/* Run History — persistent execution log */}
      <section className="card p-6">
        <div className="automations-page__section-head">
          <h2 className="section-title">Run History</h2>
          <span className="text-xs text-muted mono">
            {runs.length} execution{runs.length !== 1 ? 's' : ''}
          </span>
        </div>
        {runs.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Workflow</th>
                <th>Trigger</th>
                <th>Cost</th>
                <th>Started</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td>
                    <span className="text-sm text-primary font-medium">{run.workflowName}</span>
                  </td>
                  <td className="text-xs text-secondary">{TRIGGER_LABEL[run.trigger]}</td>
                  <td className="mono text-xs text-green">{run.costAlgo.toFixed(2)} ALGO</td>
                  <td className="text-xs text-muted">{timeAgo(run.startedAt)}</td>
                  <td className="mono text-xs text-secondary">
                    {run.durationMs != null ? formatDuration(run.durationMs) : '—'}
                  </td>
                  <td>
                    {run.status === 'running' ? (
                      <StatusBadge status="pending" label="Running" />
                    ) : run.status === 'failed' ? (
                      <StatusBadge status="failed" />
                    ) : (
                      <StatusBadge status="success" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <div className="empty-state__icon">
              <Icon name="activity" size={18} />
            </div>
            <p className="empty-state__title">No executions yet</p>
            <p className="empty-state__body">Trigger a workflow to start building its persistent execution log.</p>
          </div>
        )}
      </section>

      {/* Demo pointer */}
      <div className="automations-page__demo-note">
        <Icon name="info" size={13} />
        <span className="text-xs text-secondary">
          Try the demo pipeline in the <Link to="/marketplace" className="text-green hover:underline">Agent Studio</Link> — it chains Lookup → Summarizer → Chart with live x402 settlement.
        </span>
      </div>

      {toast && (
        <div className="automations-page__toast animate-fade-in" role="status">
          <Icon name="check" size={13} />
          {toast}
        </div>
      )}
    </div>
  );
}
