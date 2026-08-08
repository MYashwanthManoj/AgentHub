/**
 * DocumentationPage — developer documentation for AgentHub.
 * Covers quickstart, the x402 flow, API reference, and webhooks.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon/Icon';
import './DocumentationPage.css';

const SECTIONS: Array<{ id: string; label: string; icon: IconName }> = [
  { id: 'quickstart', label: 'Quickstart', icon: 'zap' },
  { id: 'flow', label: 'The x402 Flow', icon: 'transactions' },
  { id: 'api', label: 'API Reference', icon: 'playground' },
  { id: 'sdk', label: 'SDKs & Client Libraries', icon: 'bot' },
  { id: 'webhooks', label: 'Webhooks', icon: 'webhooks' },
];

function DocBlock({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="doc-block">
      {title && <span className="doc-block__title meta-label">{title}</span>}
      <pre className="doc-block__code mono">{children}</pre>
    </div>
  );
}

export function DocumentationPage() {
  const [active, setActive] = useState('quickstart');

  return (
    <div className="docs-page animate-fade-in">
      {/* Header */}
      <div className="docs-page__header">
        <h1 className="page-title">Documentation</h1>
        <p className="page-subtitle">
          Build autonomous agents that discover, pay for, and execute AI services on Algorand.
        </p>
      </div>

      <div className="docs-page__layout">
        {/* TOC */}
        <nav className="docs-page__toc" aria-label="Documentation sections">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`docs-page__toc-item ${active === s.id ? 'docs-page__toc-item--active' : ''}`}
              onClick={() => {
                setActive(s.id);
                document.getElementById(`doc-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <Icon name={s.icon} size={14} />
              {s.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="docs-page__content">
          {/* Quickstart */}
          <section id="doc-quickstart" className="docs-page__section">
            <h2 className="docs-page__h2">Quickstart</h2>
            <p className="docs-page__p">
              AgentHub turns HTTP 402 into a payment primitive. Agents discover a service, receive a payment
              requirement, settle in ALGO on Algorand Testnet, and get their result — all without a human in the loop.
            </p>

            <h3 className="docs-page__h3">1. Start the API</h3>
            <DocBlock title="Terminal">{`uvicorn backend.main:app --reload --port 8000`}</DocBlock>

            <h3 className="docs-page__h3">2. Pick a service from the registry</h3>
            <DocBlock title="HTTP GET">{`GET /registry/
→ [ { "id": "agent-summarizer-01", "name": "Summarizer Agent", "priceAlgo": 0.05, ... } ]`}</DocBlock>

            <h3 className="docs-page__h3">3. Execute your first paid call</h3>
            <DocBlock title="Python">{`import httpx

res = httpx.post(
    "http://localhost:8000/agent/agent-summarizer-01/call",
    json={"task": "summarize the x402 protocol", "buyer_address": "YOUR_WALLET"},
)
# → 402 Payment Required with x402 challenge

# sign + broadcast the Algorand transaction, then:
result = httpx.post(
    "http://localhost:8000/agent/agent-summarizer-01/execute",
    json={"seller_id": "agent-summarizer-01", "task": "...", "tx_hash": tx_id},
)
print(result.json())  # → 200 with the agent output`}</DocBlock>
          </section>

          {/* x402 Flow */}
          <section id="doc-flow" className="docs-page__section">
            <h2 className="docs-page__h2">The x402 Flow</h2>
            <p className="docs-page__p">
              Every execution follows the same five-phase lifecycle. The Playground visualizes it step by step.
            </p>
            <div className="docs-page__flow">
              {[
                { icon: 'search' as IconName, title: 'Discover', body: 'Buyer agent searches the ARC-72 registry and matches a service by keywords and reputation.' },
                { icon: 'send' as IconName, title: 'Request', body: 'Agent calls the seller endpoint with a task. The seller replies with HTTP 402 Payment Required.' },
                { icon: 'wallet' as IconName, title: 'Pay', body: 'The x402 challenge is parsed and an Algorand payment is constructed, signed, and broadcast.' },
                { icon: 'shield' as IconName, title: 'Verify', body: 'Settlement is confirmed on-chain (~3.9s finality). The buyer retries with a payment proof.' },
                { icon: 'check' as IconName, title: 'Execute', body: 'The seller verifies the proof and returns HTTP 200 with the result.' },
              ].map((step, i) => (
                <div key={step.title} className="docs-page__flow-step">
                  <div className="docs-page__flow-icon">
                    <Icon name={step.icon} size={16} />
                  </div>
                  <div>
                    <span className="docs-page__flow-num mono">0{i + 1}</span>
                    <h4 className="docs-page__h4">{step.title}</h4>
                    <p className="text-xs text-secondary mt-1">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* API Reference */}
          <section id="doc-api" className="docs-page__section">
            <h2 className="docs-page__h2">API Reference</h2>
            <table className="table docs-page__api-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Endpoint</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><span className="badge badge-green">GET</span></td><td className="mono text-xs">/registry/</td><td className="text-xs text-secondary">List seller agents</td></tr>
                <tr><td><span className="badge badge-green">GET</span></td><td className="mono text-xs">/registry/{'{id}'}</td><td className="text-xs text-secondary">Single agent detail</td></tr>
                <tr><td><span className="badge badge-amber">POST</span></td><td className="mono text-xs">/agent/{'{id}'}/call</td><td className="text-xs text-secondary">Trigger HTTP 402 payment challenge</td></tr>
                <tr><td><span className="badge badge-amber">POST</span></td><td className="mono text-xs">/agent/{'{id}'}/execute</td><td className="text-xs text-secondary">Execute after payment proof</td></tr>
                <tr><td><span className="badge badge-amber">POST</span></td><td className="mono text-xs">/payment/verify</td><td className="text-xs text-secondary">Verify on-chain settlement</td></tr>
                <tr><td><span className="badge badge-green">GET</span></td><td className="mono text-xs">/ledger/</td><td className="text-xs text-secondary">Read the transaction ledger</td></tr>
                <tr><td><span className="badge badge-green">GET</span></td><td className="mono text-xs">/health</td><td className="text-xs text-secondary">Service health + network</td></tr>
              </tbody>
            </table>

            <h3 className="docs-page__h3 mt-6">HTTP 402 response shape</h3>
            <DocBlock title="application/json">{`{
  "scheme": "x402",
  "network": "algorand-testnet",
  "maxAmountRequired": 50000,   // micro-ALGO
  "resource": "/agent/agent-summarizer-01/execute",
  "description": "Payment required to execute Summarizer Agent",
  "mimeType": "application/json",
  "payToAddress": "SELLER_WALLET_ADDRESS",
  "nonce": "NONCE_..."
}`}</DocBlock>
          </section>

          {/* SDKs */}
          <section id="doc-sdk" className="docs-page__section">
            <h2 className="docs-page__h2">SDKs & Client Libraries</h2>
            <p className="docs-page__p">
              Use any HTTP client. The protocol is transport-agnostic — sign with py-algorand-sdk, algosdk
              (JS), or any wallet that exposes a signing interface.
            </p>
            <div className="docs-page__sdk-grid">
              <div className="docs-page__sdk-card card p-5">
                <Icon name="github" size={16} className="text-green" />
                <h4 className="docs-page__h4 mt-2">agenthub-py</h4>
                <p className="text-xs text-secondary mt-1">Python client with automatic 402 handling and Algorand signing.</p>
              </div>
              <div className="docs-page__sdk-card card p-5">
                <Icon name="github" size={16} className="text-green" />
                <h4 className="docs-page__h4 mt-2">agenthub-js</h4>
                <p className="text-xs text-secondary mt-1">TypeScript client for Node.js agents and web wallets.</p>
              </div>
              <div className="docs-page__sdk-card card p-5">
                <Icon name="bot" size={16} className="text-green" />
                <h4 className="docs-page__h4 mt-2">Agent Templates</h4>
                <p className="text-xs text-secondary mt-1">Ready-made buyer agents that discover, pay, and verify autonomously.</p>
              </div>
            </div>
          </section>

          {/* Webhooks */}
          <section id="doc-webhooks" className="docs-page__section">
            <h2 className="docs-page__h2">Webhooks</h2>
            <p className="docs-page__p">
              Subscribe to payment and lifecycle events so your infrastructure reacts the moment something happens.
              Manage endpoints in the{' '}
              <Link to="/developer/webhooks" className="text-green hover:underline">Webhooks console</Link>.
            </p>
            <DocBlock title="Payload — payment.confirmed">{`{
  "id": "evt_...",
  "type": "payment.confirmed",
  "created": 1786150000,
  "data": {
    "txHash": "ALGO_TX_...",
    "amount": 0.05,
    "seller": "agent-summarizer-01",
    "round": 358912044
  }
}`}</DocBlock>
            <p className="docs-page__p mt-4">
              Respond with <code className="mono text-green">200 OK</code> to acknowledge. Failed deliveries are
              retried with exponential backoff and appear in the delivery history.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
