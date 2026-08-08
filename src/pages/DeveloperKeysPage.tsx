/**
 * DeveloperKeysPage — API Key management.
 *
 * Security model:
 *  - Secrets are generated once and shown a single time (reveal modal with
 *    Copy / Download / Done actions).
 *  - A warning makes it explicit the key can never be viewed again.
 *  - Revoking requires a confirmation dialog.
 */

import { useState } from 'react';
import { Icon } from '../components/Icon/Icon';
import { CopyButton } from '../components/ui/CopyButton';
import { useBackendCollection } from '../hooks/useBackendCollection';
import './DeveloperKeysPage.css';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  created: string;
  lastUsed: string;
  status: 'active' | 'revoked';
  environment: 'live' | 'test';
}

const SEED_KEYS: ApiKey[] = [
  {
    id: 'key-1',
    name: 'Production Server Key',
    keyPrefix: 'ah_live_9f8a...3b21',
    created: '2026-08-01',
    lastUsed: '2 min ago',
    status: 'active',
    environment: 'live',
  },
  {
    id: 'key-2',
    name: 'Staging Agent Bot',
    keyPrefix: 'ah_live_4c1d...8e90',
    created: '2026-08-05',
    lastUsed: '2 hours ago',
    status: 'active',
    environment: 'test',
  },
];

function generateSecret(): string {
  const rand = (n: number) => Math.random().toString(36).slice(2, 2 + n);
  return `ah_live_${rand(16)}${rand(16)}${rand(8)}`;
}

export function DeveloperKeysPage() {
  const {
    items: keys,
    addItem: addKey,
    updateItem: updateKey,
    removeItem: removeKey,
  } = useBackendCollection<ApiKey>({
    storageKey: 'blockhack_api_keys_v1',
    seed: SEED_KEYS,
    fetchPath: '/api-keys/',
    postPath: '/api-keys/',
    fromBackend: (r) => ({
      id: String(r.id ?? ''),
      name: String(r.name ?? ''),
      keyPrefix: String(r.keyPrefix ?? ''),
      created: String(r.created ?? ''),
      lastUsed: String(r.lastUsed ?? 'Never'),
      status: r.status === 'revoked' ? 'revoked' : 'active',
      environment: r.environment === 'test' ? 'test' : 'live',
    }),
    toCreateBody: (k) => ({
      id: k.id,
      name: k.name,
      key_prefix: k.keyPrefix,
      created: k.created,
      last_used: k.lastUsed,
      environment: k.environment,
    }),
    updateRequest: (id) => ({ path: `/api-keys/${id}/revoke` }),
    deleteRequest: (id) => `/api-keys/${id}`,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [revealedSecret, setRevealedSecret] = useState<{ name: string; secret: string } | null>(null);
  const [revokingKey, setRevokingKey] = useState<ApiKey | null>(null);
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null);

  const handleCreateKey = () => {
    if (!newKeyName.trim()) return;
    const secret = generateSecret();
    const prefix = `${secret.slice(0, 10)}...${secret.slice(-4)}`;
    const newKey: ApiKey = {
      id: `key-${Date.now()}`,
      name: newKeyName.trim(),
      keyPrefix: prefix,
      created: new Date().toISOString().slice(0, 10),
      lastUsed: 'Never',
      status: 'active',
      environment: 'live',
    };
    addKey(newKey);
    setNewKeyName('');
    setCreateOpen(false);
    setRevealedSecret({ name: newKey.name, secret });
  };

  const handleRevoke = () => {
    if (!revokingKey) return;
    updateKey(revokingKey.id, { status: 'revoked' });
    setRevokingKey(null);
  };

  const handleDelete = () => {
    if (!keyToDelete) return;
    removeKey(keyToDelete.id);
    setKeyToDelete(null);
  };

  return (
    <div className="developer-keys-page animate-fade-in">
      <div className="developer-keys-page__header">
        <div>
          <h1 className="page-title">API Keys</h1>
          <p className="page-subtitle">Manage credentials used by agents and external services.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          <Icon name="plus" size={14} />
          Create API Key
        </button>
      </div>

      {/* Keys table */}
      <section className="card p-6">
        <div className="developer-keys-page__section-head">
          <h2 className="section-title">Secret Keys</h2>
          <span className="text-xs text-muted mono">{keys.length} key{keys.length !== 1 ? 's' : ''}</span>
        </div>

        {keys.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Key</th>
                <th>Created</th>
                <th>Last Used</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className={k.status === 'revoked' ? 'developer-keys-page__row--revoked' : ''}>
                  <td>
                    <span className="text-sm text-primary font-medium">{k.name}</span>
                    <span className="text-xs text-muted block">{k.environment}</span>
                  </td>
                  <td className="mono text-xs text-green">{k.keyPrefix}</td>
                  <td className="text-xs text-muted">{k.created}</td>
                  <td className="text-xs text-secondary">{k.lastUsed}</td>
                  <td>
                    <span className={`badge ${k.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                      {k.status.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {k.status === 'active' ? (
                        <>
                          <button type="button" className="btn btn-ghost btn-sm text-red" onClick={() => setRevokingKey(k)}>
                            Revoke
                          </button>
                          <button type="button" className="btn btn-ghost btn-sm text-muted" onClick={() => setKeyToDelete(k)} title="Delete key">
                            <Icon name="trash" size={13} />
                          </button>
                        </>
                      ) : (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setKeyToDelete(k)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <div className="empty-state__icon">
              <Icon name="keys" size={18} />
            </div>
            <p className="empty-state__title">No API keys created</p>
            <p className="empty-state__body">Create a key so agents and services can authenticate x402 requests.</p>
            <button type="button" className="btn btn-sm btn-primary mt-2" onClick={() => setCreateOpen(true)}>
              <Icon name="plus" size={13} />
              Create your first key
            </button>
          </div>
        )}
      </section>

      {/* Security note */}
      <div className="developer-keys-page__security">
        <Icon name="lock" size={14} />
        <p className="text-xs text-muted">
          Keys are shown once at creation. Store them in your secret manager. Anyone with a key can spend ALGO on your behalf.
        </p>
      </div>

      {/* SDK quickstart */}
      <section className="card p-6">
        <h2 className="section-title mb-2">SDK Quickstart</h2>
        <p className="text-sm text-secondary mb-4">Execute x402 agent transactions autonomously from any Python or Node.js service:</p>

        <h3 className="text-xs font-bold text-muted uppercase mb-2">Python (httpx)</h3>
        <pre className="developer-keys-page__code mono text-xs text-green">
{`import httpx

# Step 1: Call Agent (returns HTTP 402)
res = httpx.post("http://localhost:8000/agent/agent-summarizer-01/call", json={
    "task": "summarize whitepaper",
    "buyer_address": "LRJPYUEL..."
})

# Step 2: Sign and broadcast Algorand TX
# Step 3: Execute with verified TX hash
result = httpx.post("http://localhost:8000/agent/agent-summarizer-01/execute", json={
    "seller_id": "agent-summarizer-01",
    "task": "summarize whitepaper",
    "tx_hash": tx_id,
    "api_key": "ah_live_..."
})

print("Result:", result.json())`}
        </pre>
      </section>

      {/* Create modal */}
      {createOpen && (
        <div className="cmd-overlay" onClick={() => setCreateOpen(false)}>
          <div className="cmd-dialog surface-glass p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Create API key">
            <h3 className="text-lg font-bold text-primary mb-2">Create API Key</h3>
            <p className="text-sm text-secondary mb-4">Give your key a descriptive name (e.g. Production Bot).</p>
            <input
              type="text"
              className="input mb-4"
              placeholder="Key Name..."
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button type="button" className="btn btn-ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleCreateKey} disabled={!newKeyName.trim()}>
                Create Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* One-time secret reveal */}
      {revealedSecret && (
        <div className="cmd-overlay" onClick={() => setRevealedSecret(null)}>
          <div className="cmd-dialog surface-glass p-6" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-label="Secret key created">
            <div className="developer-keys-page__reveal-banner">
              <Icon name="check" size={16} />
              Key created
            </div>
            <h3 className="text-lg font-bold text-primary mb-1">{revealedSecret.name}</h3>
            <p className="text-sm text-amber mb-4 flex items-center gap-2">
              <Icon name="alert" size={13} />
              Store this key securely. You won't be able to view it again.
            </p>
            <div className="developer-keys-page__secret mono">
              {revealedSecret.secret}
            </div>
            <div className="flex items-center gap-3 mt-4">
              <CopyButton text={revealedSecret.secret} label="Copy Key" className="flex-1 justify-center" />
              <button
                type="button"
                className="btn flex-1 justify-center"
                onClick={() => {
                  const blob = new Blob([revealedSecret.secret], { type: 'text/plain' });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = 'agenthub-api-key.txt';
                  a.click();
                }}
              >
                <Icon name="download" size={13} />
                Download
              </button>
              <button type="button" className="btn btn-primary flex-1 justify-center" onClick={() => setRevealedSecret(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke confirmation */}
      {revokingKey && (
        <div className="cmd-overlay" onClick={() => setRevokingKey(null)}>
          <div className="cmd-dialog surface-glass p-6" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-label="Revoke API key">
            <div className="developer-keys-page__danger-banner">
              <Icon name="alert" size={16} />
              Revoke key?
            </div>
            <p className="text-sm text-secondary mt-4 mb-6">
              <strong className="text-primary">{revokingKey.name}</strong> will stop working immediately. Any services using it must be updated.
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" className="btn btn-ghost" onClick={() => setRevokingKey(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={handleRevoke}>
                Revoke Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {keyToDelete && (
        <div className="cmd-overlay" onClick={() => setKeyToDelete(null)}>
          <div className="cmd-dialog surface-glass p-6" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-label="Delete API key">
            <div className="developer-keys-page__danger-banner">
              <Icon name="trash" size={16} />
              Delete key?
            </div>
            <p className="text-sm text-secondary mt-4 mb-6">
              <strong className="text-primary">{keyToDelete.name}</strong> will be permanently removed.
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" className="btn btn-ghost" onClick={() => setKeyToDelete(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
