/**
 * WebhooksPage — receive real-time events from AgentHub.
 *
 * This page owns /developer/webhooks (previously mis-routed to API Keys).
 * Shows endpoint cards, subscribed events, delivery history with retry,
 * and test/disable/delete/logs actions.
 */

import { useState } from 'react';
import { Icon } from '../components/Icon/Icon';
import { CopyButton } from '../components/ui/CopyButton';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useBackendCollection } from '../hooks/useBackendCollection';
import './WebhooksPage.css';

const ALL_EVENTS = [
  'payment.created',
  'payment.confirmed',
  'agent.executed',
  'agent.failed',
  'transaction.confirmed',
];

interface Endpoint {
  id: string;
  url: string;
  description: string;
  events: string[];
  status: 'active' | 'disabled';
  createdAt: string;
}

interface Delivery {
  id: string;
  event: string;
  timestamp: string;
  status: 'success' | 'failed';
  responseCode: number;
  /** Epoch ms — used only to keep history newest-first across reloads. */
  createdAt: number;
}

const SEED_ENDPOINTS: Endpoint[] = [
  {
    id: 'wh-1',
    url: 'https://example.com/webhooks/agenthub',
    description: 'Production pipeline notifier',
    events: ['payment.created', 'payment.confirmed', 'agent.executed', 'agent.failed', 'transaction.confirmed'],
    status: 'active',
    createdAt: '2026-08-01',
  },
];

const SEED_DELIVERIES: Delivery[] = [
  { id: 'd1', event: 'payment.confirmed', timestamp: '2 min ago', status: 'success', responseCode: 200, createdAt: Date.now() - 2 * 60_000 },
  { id: 'd2', event: 'agent.executed', timestamp: '2 min ago', status: 'success', responseCode: 200, createdAt: Date.now() - 2 * 60_000 },
  { id: 'd3', event: 'payment.created', timestamp: '12 min ago', status: 'success', responseCode: 200, createdAt: Date.now() - 12 * 60_000 },
  { id: 'd4', event: 'agent.failed', timestamp: '1 hour ago', status: 'failed', responseCode: 500, createdAt: Date.now() - 60 * 60_000 },
];

export function WebhooksPage() {
  const {
    items: endpoints,
    addItem: addEndpoint,
    updateItem: updateEndpoint,
    removeItem: removeEndpoint,
  } = useBackendCollection<Endpoint>({
    storageKey: 'blockhack_webhook_endpoints_v1',
    seed: SEED_ENDPOINTS,
    fetchPath: '/webhooks/endpoints',
    postPath: '/webhooks/endpoints',
    fromBackend: (r) => ({
      id: String(r.id ?? ''),
      url: String(r.url ?? ''),
      description: String(r.description ?? 'New endpoint'),
      events: Array.isArray(r.events) ? r.events.map((ev) => String(ev)) : [],
      status: r.status === 'disabled' ? 'disabled' : 'active',
      createdAt: String(r.createdAt ?? ''),
    }),
    toCreateBody: (e) => ({
      id: e.id,
      url: e.url,
      description: e.description,
      events: e.events,
      status: e.status,
      created_at: e.createdAt,
    }),
    updateRequest: (id, patch) => ({ path: `/webhooks/endpoints/${id}`, method: 'PATCH', body: { status: patch.status } }),
    deleteRequest: (id) => `/webhooks/endpoints/${id}`,
  });

  const {
    items: deliveries,
    addItem: addDelivery,
    updateItem: updateDelivery,
  } = useBackendCollection<Delivery>({
    storageKey: 'blockhack_webhook_deliveries_v1',
    seed: SEED_DELIVERIES,
    fetchPath: '/webhooks/deliveries',
    postPath: '/webhooks/deliveries',
    fromBackend: (r) => ({
      id: String(r.id ?? ''),
      event: String(r.event ?? ''),
      timestamp: String(r.timestamp ?? ''),
      status: r.status === 'failed' ? 'failed' : 'success',
      responseCode: Number(r.responseCode ?? 200),
      createdAt: Date.now(),
    }),
    toCreateBody: (d) => ({
      id: d.id,
      event: d.event,
      timestamp: d.timestamp,
      status: d.status,
      response_code: d.responseCode,
      created_at: new Date(d.createdAt).toISOString(),
    }),
    updateRequest: (id, patch) => ({
      path: `/webhooks/deliveries/${id}`,
      method: 'PATCH',
      body: { status: patch.status, response_code: patch.responseCode },
    }),
  });

  const [addOpen, setAddOpen] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['payment.confirmed', 'agent.executed']);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  };

  const handleAddEndpoint = () => {
    if (!newUrl.trim()) return;
    const endpoint: Endpoint = {
      id: `wh-${Date.now()}`,
      url: newUrl.trim(),
      description: 'New endpoint',
      events: selectedEvents,
      status: 'active',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    addEndpoint(endpoint);
    setNewUrl('');
    setSelectedEvents(['payment.confirmed', 'agent.executed']);
    setAddOpen(false);
    showToast('Endpoint added');
  };

  const toggleEvent = (ev: string) => {
    setSelectedEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]
    );
  };

  const handleTest = (endpoint: Endpoint) => {
    addDelivery({
      id: `d-${Date.now()}`,
      event: 'payment.created',
      timestamp: 'just now',
      status: 'success',
      responseCode: 200,
      createdAt: Date.now(),
    });
    showToast(`Test event sent to ${endpoint.url}`);
  };

  const handleRetry = (delivery: Delivery) => {
    updateDelivery(delivery.id, { status: 'success', responseCode: 200 });
    showToast(`Retried ${delivery.event}`);
  };

  const activeEndpoints = endpoints.filter((e) => e.status === 'active').length;

  return (
    <div className="webhooks-page animate-fade-in">
      <div className="webhooks-page__header">
        <div>
          <h1 className="page-title">Webhooks</h1>
          <p className="page-subtitle">Receive real-time events from AgentHub.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setAddOpen(true)}>
          <Icon name="plus" size={14} />
          Add Endpoint
        </button>
      </div>

      {/* Summary metrics */}
      <div className="webhooks-page__metrics">
        <div className="card card--metric p-4">
          <span className="meta-label">Endpoints</span>
          <div className="metric-value">{endpoints.length}</div>
          <span className="text-xs text-muted">{activeEndpoints} active</span>
        </div>
        <div className="card card--metric p-4">
          <span className="meta-label">Deliveries</span>
          <div className="metric-value">{deliveries.length}</div>
          <span className="text-xs text-muted">last 30 days</span>
        </div>
        <div className="card card--metric p-4">
          <span className="meta-label">Success Rate</span>
          <div className="metric-value metric-value--green">
            {deliveries.length > 0
              ? `${((deliveries.filter((d) => d.status === 'success').length / deliveries.length) * 100).toFixed(0)}%`
              : '—'}
          </div>
          <span className="text-xs text-muted">delivery rate</span>
        </div>
      </div>

      {/* Endpoint cards */}
      {endpoints.length > 0 ? (
        <div className="webhooks-page__endpoints">
          {endpoints.map((endpoint) => (
            <section key={endpoint.id} className={`card p-6 ${endpoint.status === 'disabled' ? 'webhooks-page__endpoint--disabled' : ''}`}>
              <div className="webhooks-page__endpoint-head">
                <div className="webhooks-page__endpoint-title">
                  <Icon name="webhooks" size={15} className="webhooks-page__endpoint-icon" />
                  <div>
                    <h2 className="section-title">{endpoint.description}</h2>
                    <code className="webhooks-page__url mono">{endpoint.url}</code>
                  </div>
                </div>
                <div className="webhooks-page__endpoint-actions">
                  <StatusBadge status={endpoint.status} />
                  <CopyButton text={endpoint.url} label="Copy URL" />
                </div>
              </div>

              {/* Events */}
              <div className="webhooks-page__events">
                <span className="meta-label">Subscribed Events</span>
                <div className="webhooks-page__events-list">
                  {endpoint.events.map((ev) => (
                    <span key={ev} className="webhooks-page__event-chip mono">
                      {ev}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="webhooks-page__endpoint-actions-row">
                <button type="button" className="btn btn-sm" onClick={() => handleTest(endpoint)}>
                  <Icon name="send" size={12} />
                  Test Webhook
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => {
                    updateEndpoint(endpoint.id, { status: endpoint.status === 'active' ? 'disabled' : 'active' });
                    showToast(endpoint.status === 'active' ? 'Endpoint disabled' : 'Endpoint enabled');
                  }}
                >
                  <Icon name={endpoint.status === 'active' ? 'pause' : 'play'} size={12} />
                  {endpoint.status === 'active' ? 'Disable' : 'Enable'}
                </button>
                <button type="button" className="btn btn-sm btn-ghost">
                  <Icon name="list" size={12} />
                  View Logs
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost text-red"
                  onClick={() => {
                    removeEndpoint(endpoint.id);
                    showToast('Endpoint deleted');
                  }}
                >
                  <Icon name="trash" size={12} />
                  Delete
                </button>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="empty-state card p-10">
          <div className="empty-state__icon">
            <Icon name="webhooks" size={18} />
          </div>
          <p className="empty-state__title">No endpoints yet</p>
          <p className="empty-state__body">
            Add an endpoint URL to receive payment and agent lifecycle events in real time.
          </p>
          <button type="button" className="btn btn-sm btn-primary mt-2" onClick={() => setAddOpen(true)}>
            <Icon name="plus" size={13} />
            Add Endpoint
          </button>
        </div>
      )}

      {/* Delivery history */}
      <section className="card p-6">
        <div className="webhooks-page__section-head">
          <h2 className="section-title">Delivery History</h2>
          <span className="text-xs text-muted mono">{deliveries.length} deliveries</span>
        </div>
        {deliveries.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Timestamp</th>
                <th>Status</th>
                <th>Response</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d.id}>
                  <td className="mono text-xs text-primary">{d.event}</td>
                  <td className="text-xs text-muted">{d.timestamp}</td>
                  <td>
                    <StatusBadge status={d.status === 'success' ? 'success' : 'failed'} />
                  </td>
                  <td className="mono text-xs text-secondary">HTTP {d.responseCode}</td>
                  <td>
                    {d.status === 'failed' && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleRetry(d)}>
                        <Icon name="refresh" size={12} />
                        Retry
                      </button>
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
            <p className="empty-state__title">No deliveries yet</p>
            <p className="empty-state__body">Send a test event to see deliveries here.</p>
          </div>
        )}
      </section>

      {/* Available events legend */}
      <section className="card p-6">
        <h2 className="section-title mb-2">Available Events</h2>
        <p className="text-xs text-secondary mb-4">Subscribe to any of these event types when adding an endpoint.</p>
        <div className="webhooks-page__events-list">
          {ALL_EVENTS.map((ev) => (
            <span key={ev} className="webhooks-page__event-chip mono">{ev}</span>
          ))}
        </div>
      </section>

      {/* Add endpoint modal */}
      {addOpen && (
        <div className="cmd-overlay" onClick={() => setAddOpen(false)}>
          <div className="cmd-dialog surface-glass p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Add webhook endpoint">
            <h3 className="text-lg font-bold text-primary mb-1">Add Endpoint</h3>
            <p className="text-sm text-secondary mb-4">Events will be POSTed to this URL.</p>

            <label className="text-xs text-muted block mb-1">ENDPOINT URL</label>
            <input
              type="url"
              className="input mono mb-4"
              placeholder="https://example.com/webhooks/agenthub"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              autoFocus
            />

            <span className="text-xs text-muted block mb-2">EVENTS</span>
            <div className="webhooks-page__event-picker">
              {ALL_EVENTS.map((ev) => {
                const selected = selectedEvents.includes(ev);
                return (
                  <button
                    key={ev}
                    type="button"
                    className={`webhooks-page__event-option mono ${selected ? 'webhooks-page__event-option--selected' : ''}`}
                    onClick={() => toggleEvent(ev)}
                    aria-pressed={selected}
                  >
                    <Icon name={selected ? 'check' : 'plus'} size={11} />
                    {ev}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button type="button" className="btn btn-ghost" onClick={() => setAddOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleAddEndpoint} disabled={!newUrl.trim() || selectedEvents.length === 0}>
                Add Endpoint
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="webhooks-page__toast animate-fade-in" role="status">
          <Icon name="check" size={13} />
          {toast}
        </div>
      )}
    </div>
  );
}
