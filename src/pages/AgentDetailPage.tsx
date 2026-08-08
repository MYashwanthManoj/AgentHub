/**
 * AgentDetailPage — service detail + API Playground.
 *
 * Used for both /marketplace/:id and /developer/playground (defaults to the
 * Summarizer Agent). Tabs: Playground · API · Schemas · SLA & Metrics ·
 * Transactions. The Playground runs the live 14-step x402 payment flow.
 */

import { useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { SELLER_AGENTS } from '../data/agents';
import { PLAYGROUND_DEFAULT_AGENT } from '../App';
import { TransactionFlow } from '../components/TransactionFlow/TransactionFlow';
import { useTransactionFlow } from '../hooks/useTransactionFlow';
import { useLedger } from '../hooks/useLedger';
import { Icon, type IconName } from '../components/Icon/Icon';
import { StatusBadge } from '../components/ui/StatusBadge';
import { CopyButton } from '../components/ui/CopyButton';
import { truncateHash } from '../utils/format';
import './AgentDetailPage.css';

type TabId = 'playground' | 'api' | 'schemas' | 'sla' | 'transactions';

const TABS: Array<{ id: TabId; label: string; icon: IconName }> = [
  { id: 'playground', label: 'Playground', icon: 'playground' },
  { id: 'api', label: 'API', icon: 'link' },
  { id: 'schemas', label: 'Schemas', icon: 'list' },
  { id: 'sla', label: 'SLA & Metrics', icon: 'activity' },
  { id: 'transactions', label: 'Transactions', icon: 'transactions' },
];

export function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>('playground');
  const [task, setTask] = useState('summarize the Algorand x402 payment protocol spec');

  const agent = SELLER_AGENTS.find((a) => a.id === id) ?? SELLER_AGENTS.find((a) => a.id === PLAYGROUND_DEFAULT_AGENT) ?? SELLER_AGENTS[0];
  const isPlaygroundRoute = location.pathname.startsWith('/developer/playground');

  const { steps, isRunning, isStreaming, result, runFlow, resetFlow } = useTransactionFlow();
  const { addEntry, entries } = useLedger();
  const agentTxs = entries.filter((e) => e.sellerId === agent.id);

  const handleRunPlayground = async () => {
    if (!task.trim() || isRunning) return;
    resetFlow();
    try {
      const entry = await runFlow(agent, task);
      addEntry(entry);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="agent-detail-page animate-fade-in">
      {/* Breadcrumb */}
      <div className="agent-detail-page__breadcrumb">
        {isPlaygroundRoute ? (
          <>
            <Link to="/developer/playground" className="agent-detail-page__crumb">API Playground</Link>
            <span>/</span>
            <span className="text-secondary">{agent.name}</span>
          </>
        ) : (
          <>
            <Link to="/registry" className="agent-detail-page__crumb">Registry</Link>
            <span>/</span>
            <span className="text-secondary">{agent.name}</span>
          </>
        )}
      </div>

      {/* Hero */}
      <div className="agent-detail-page__hero card card--primary p-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="agent-detail-page__hero-icon" aria-hidden="true">
              <Icon name="bot" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-primary">{agent.name}</h1>
                <StatusBadge status="verified" label="Verified ARC-72" />
              </div>
              <p className="text-sm text-secondary mt-1 max-w-2xl">{agent.description}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="mono text-2xl font-bold text-green">{agent.priceAlgo.toFixed(2)} ALGO</div>
            <span className="text-xs text-muted">per x402 execution</span>
          </div>
        </div>

        {/* Specs */}
        <div className="agent-detail-page__specs">
          <div>
            <span className="meta-label">Reputation</span>
            <span className="mono text-green font-semibold">{agent.reputation}/100</span>
          </div>
          <div>
            <span className="meta-label">Uptime</span>
            <span className="mono text-primary font-semibold">99.94%</span>
          </div>
          <div>
            <span className="meta-label">Avg Latency</span>
            <span className="mono text-primary font-semibold">1.8s</span>
          </div>
          <div>
            <span className="meta-label">Endpoint</span>
            <span className="mono text-primary text-xs">{agent.endpoint}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="agent-detail-page__tabs" role="tablist" aria-label="Service sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`agent-detail-page__tab ${activeTab === tab.id ? 'agent-detail-page__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon name={tab.icon} size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: PLAYGROUND */}
      {activeTab === 'playground' && (
        <div className="agent-detail-page__playground">
          <div className="card p-6">
            <h3 className="section-title mb-1">Task</h3>
            <p className="text-sm text-secondary mb-4">
              Submit a task prompt to trigger the 14-step x402 payment and on-chain verification loop.
            </p>
            <textarea
              className="input input-mono agent-detail-page__task"
              rows={5}
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Enter task description..."
              aria-label="Task description"
            />
            <div className="agent-detail-page__task-meta">
              <span className="text-xs text-muted">
                Est. cost <strong className="mono text-green">{agent.priceAlgo.toFixed(2)} ALGO</strong>
              </span>
              <span className="text-xs text-muted">
                <Icon name="shield" size={11} /> Budget guard active (0.10 ALGO cap)
              </span>
            </div>
            <button
              type="button"
              className="btn btn-primary w-full justify-center agent-detail-page__execute"
              onClick={handleRunPlayground}
              disabled={isRunning || !task.trim()}
              aria-busy={isRunning}
            >
              {isRunning ? (
                <>
                  <span className="agent-detail-page__spinner animate-spin" aria-hidden="true">
                    <Icon name="refresh" size={14} />
                  </span>
                  Executing x402 flow...
                </>
              ) : (
                <>
                  <Icon name="play" size={14} />
                  Execute Agent Service
                  <span className="mono text-xs opacity-80">{agent.priceAlgo.toFixed(2)} ALGO</span>
                </>
              )}
            </button>
          </div>

          {/* Live payment flow — the visual centerpiece */}
          <TransactionFlow steps={steps} isRunning={isRunning} isStreaming={isStreaming} result={result} sellerName={agent.name} />
        </div>
      )}

      {/* TAB: API */}
      {activeTab === 'api' && (
        <div className="card p-6">
          <h3 className="section-title mb-4">FastAPI Endpoint Reference</h3>
          <div className="agent-detail-page__endpoint">
            <span className="badge badge-amber">POST</span>
            <code className="mono text-xs">{`http://localhost:8000/agent/${agent.id}/call`}</code>
            <CopyButton text={`http://localhost:8000/agent/${agent.id}/call`} label="Copy" />
          </div>
          <h4 className="text-sm font-bold text-secondary mb-2 mt-5">Request Body (JSON)</h4>
          <pre className="agent-detail-page__code mono text-xs text-green">
{`{
  "task": "${task}",
  "buyer_address": "BUYER_WALLET_ADDRESS"
}`}
          </pre>
          <h4 className="text-sm font-bold text-secondary mb-2 mt-5">Response: 402 Payment Required</h4>
          <pre className="agent-detail-page__code mono text-xs text-amber">
{`{
  "status": 402,
  "scheme": "x402",
  "network": "algorand-testnet",
  "maxAmountRequired": ${(agent.priceAlgo * 1_000_000).toFixed(0)},
  "payToAddress": "SELLER_WALLET_ADDRESS",
  "nonce": "NONCE_..."
}`}
          </pre>
          <h4 className="text-sm font-bold text-secondary mb-2 mt-5">Response: 200 OK (after payment proof)</h4>
          <pre className="agent-detail-page__code mono text-xs text-green">
{`{
  "status": 200,
  "result_type": "text",
  "content": "<agent output>",
  "execution_time_ms": 842
}`}
          </pre>
        </div>
      )}

      {/* TAB: SCHEMAS */}
      {activeTab === 'schemas' && (
        <div className="grid-2 gap-6">
          <div className="card p-6">
            <h3 className="section-title mb-4">TaskInput</h3>
            <pre className="agent-detail-page__code mono text-xs">
{`{
  "task": string,          // required
  "buyer_address": string, // required
  "budget_algo"?: number,  // optional cap
}`}
            </pre>
          </div>
          <div className="card p-6">
            <h3 className="section-title mb-4">PaymentRequired (x402)</h3>
            <pre className="agent-detail-page__code mono text-xs">
{`{
  "scheme": "x402",
  "network": "algorand-testnet",
  "maxAmountRequired": int, // micro-ALGO
  "resource": string,
  "description": string,
  "mimeType": string,
  "payToAddress": string,
  "nonce": string,
}`}
            </pre>
          </div>
          <div className="card p-6">
            <h3 className="section-title mb-4">SettlementReceipt</h3>
            <pre className="agent-detail-page__code mono text-xs">
{`{
  "txHash": string,
  "roundNumber": number,
  "confirmationTimeMs": number,
  "finalityStatus": "confirmed" | "pending" | "failed",
  "explorerUrl": string,
}`}
            </pre>
          </div>
          <div className="card p-6">
            <h3 className="section-title mb-4">AgentResult</h3>
            <pre className="agent-detail-page__code mono text-xs">
{`{
  "agentId": string,
  "resultType": "text" | "chart" | "json",
  "content": string,
  "chartData"?: ChartDataPoint[],
  "executionTimeMs": number,
}`}
            </pre>
          </div>
        </div>
      )}

      {/* TAB: SLA */}
      {activeTab === 'sla' && (
        <div className="agent-detail-page__sla">
          <div className="grid-3 gap-6">
            <div className="card card--metric p-4">
              <span className="meta-label">24-Hour Success Rate</span>
              <div className="metric-value metric-value--green mt-2">100%</div>
              <span className="text-xs text-secondary">0 failed transactions</span>
            </div>
            <div className="card card--metric p-4">
              <span className="meta-label">Average Block Time</span>
              <div className="metric-value mt-2">3.85s</div>
              <span className="text-xs text-secondary">Algorand PPOS consensus</span>
            </div>
            <div className="card card--metric p-4">
              <span className="meta-label">Total Call Volume</span>
              <div className="metric-value mt-2">1,420</div>
              <span className="text-xs text-secondary">x402 invocations</span>
            </div>
          </div>
          <div className="card p-6 mt-4">
            <h3 className="section-title mb-4">SLA Guarantee</h3>
            <ul className="agent-detail-page__sla-list">
              <li><Icon name="check" size={13} className="text-green" /> 99.9% uptime over trailing 30 days</li>
              <li><Icon name="check" size={13} className="text-green" /> p95 latency under 3.0s including settlement</li>
              <li><Icon name="check" size={13} className="text-green" /> On-chain refunds on verified execution failure</li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB: TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div className="card p-6">
          <div className="agent-detail-page__section-head">
            <h3 className="section-title">Transactions for this service</h3>
            <span className="text-xs text-muted mono">{agentTxs.length} settled</span>
          </div>
          {agentTxs.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Task</th>
                  <th>Amount</th>
                  <th>TX Hash</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {agentTxs.map((tx) => (
                  <tr key={tx.id}>
                    <td className="mono text-xs text-muted">{new Date(tx.timestamp).toLocaleString()}</td>
                    <td className="text-xs text-secondary max-w-[300px] truncate">{tx.task}</td>
                    <td className="mono text-green font-semibold">{tx.priceAlgo.toFixed(4)}</td>
                    <td className="mono text-xs text-green">{truncateHash(tx.txHash, 8)}</td>
                    <td><StatusBadge status={tx.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <div className="empty-state__icon">
                <Icon name="transactions" size={18} />
              </div>
              <p className="empty-state__title">No transactions yet</p>
              <p className="empty-state__body">Run this service from the Playground tab to see settlements here.</p>
              <button type="button" className="btn btn-sm btn-primary mt-2" onClick={() => setActiveTab('playground')}>
                Open Playground
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
