/**
 * MyServicesPage — Dedicated page for Subscribed Services & Active Agent Runtimes.
 * Allows developers to manage active subscriptions, pause/resume services, and inspect usage logs.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SELLER_AGENTS } from '../data/agents';
import { Icon } from '../components/Icon/Icon';
import './MyServicesPage.css';

export function MyServicesPage() {
  const [subscribedIds, setSubscribedIds] = useState<string[]>([
    'agent-summarizer-01',
    'agent-chart-01',
    'agent-security-01',
  ]);
  const [pausedIds, setPausedIds] = useState<string[]>([]);

  const subscribedAgents = SELLER_AGENTS.filter((a) => subscribedIds.includes(a.id));

  const togglePause = (id: string) => {
    if (pausedIds.includes(id)) {
      setPausedIds(pausedIds.filter((x) => x !== id));
    } else {
      setPausedIds([...pausedIds, id]);
    }
  };

  const handleUnsubscribe = (id: string) => {
    setSubscribedIds(subscribedIds.filter((x) => x !== id));
  };

  return (
    <div className="my-services-page animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">My Subscribed Services</h1>
          <p className="text-sm text-secondary">
            Manage your active AI agent subscriptions, monitor live runtimes, and configure auto-pay limits.
          </p>
        </div>
        <Link to="/marketplace" className="btn btn-primary btn-sm">
          <Icon name="plus" size={13} />
          Subscribe to New Service
        </Link>
      </div>

      {/* Subscriptions Grid */}
      <div className="flex flex-col gap-4">
        {subscribedAgents.length > 0 ? (
          subscribedAgents.map((agent) => {
            const isPaused = pausedIds.includes(agent.id);
            return (
              <div key={agent.id} className="surface p-6 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-2xl surface-elevated p-3 rounded flex items-center justify-center text-green">
                    <Icon name="bot" size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-primary">{agent.name}</h3>
                      <span className={`badge ${isPaused ? 'badge-amber' : 'badge-green'}`}>
                        {isPaused ? 'PAUSED' : 'ACTIVE RUNTIME'}
                      </span>
                      <span className="badge badge-muted">Credit: {agent.reputation}/100</span>
                    </div>
                    <p className="text-xs text-secondary mt-1">{agent.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted mono">
                      <span>Endpoint: {agent.endpoint}</span>
                      <span>Rate Limit: 100 req/min</span>
                      <span>Avg SLA: 1.8s</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right mr-4">
                    <span className="mono text-green font-bold text-base">{agent.priceAlgo} ALGO</span>
                    <span className="block text-xs text-muted">per call</span>
                  </div>

                  <button
                    type="button"
                    className={`btn btn-sm ${isPaused ? 'btn-primary' : 'btn-amber'}`}
                    onClick={() => togglePause(agent.id)}
                  >
                    <Icon name={isPaused ? 'play' : 'pause'} size={12} />
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>

                  <Link to={`/marketplace/${agent.id}`} className="btn btn-ghost btn-sm">
                    Inspect
                  </Link>

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm text-red"
                    onClick={() => handleUnsubscribe(agent.id)}
                  >
                    Unsubscribe
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="surface p-12 text-center text-muted rounded-lg">
            <p className="text-base mb-4">You have no active subscriptions.</p>
            <Link to="/marketplace" className="btn btn-primary">
              Browse Marketplace Catalog
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
