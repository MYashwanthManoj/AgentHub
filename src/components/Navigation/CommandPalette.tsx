/**
 * CommandPalette — Ctrl+K / Cmd+K modal for instant agent search and page navigation.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SELLER_AGENTS } from '../../data/agents';
import { Icon, type IconName } from '../Icon/Icon';
import './CommandPalette.css';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const PAGES: Array<{ path: string; label: string; icon: IconName }> = [
  { path: '/dashboard', label: 'Overview', icon: 'overview' },
  { path: '/registry', label: 'Service Registry', icon: 'registry' },
  { path: '/transactions', label: 'Transactions', icon: 'transactions' },
  { path: '/analytics', label: 'Analytics', icon: 'analytics' },
  { path: '/automations', label: 'Automations', icon: 'automations' },
  { path: '/developer/playground', label: 'API Playground', icon: 'playground' },
  { path: '/developer/keys', label: 'API Keys', icon: 'keys' },
  { path: '/developer/webhooks', label: 'Webhooks', icon: 'webhooks' },
  { path: '/docs', label: 'Documentation', icon: 'docs' },
  { path: '/wallet', label: 'Wallet', icon: 'wallet' },
  { path: '/settings', label: 'Settings', icon: 'settings' },
];

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredAgents = SELLER_AGENTS.filter(
    (a) =>
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.description.toLowerCase().includes(query.toLowerCase()) ||
      a.category.toLowerCase().includes(query.toLowerCase())
  );

  const pages = PAGES.filter((p) => p.label.toLowerCase().includes(query.toLowerCase()));

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="cmd-overlay animate-fade-in" onClick={onClose}>
      <div
        className="cmd-dialog surface-glass border-subtle"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="cmd-input-wrap">
          <Icon name="search" size={15} className="cmd-search-icon" />
          <input
            type="text"
            className="cmd-input"
            placeholder="Type a command or search agents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <kbd className="cmd-esc-kbd">ESC</kbd>
        </div>

        <div className="cmd-body">
          {/* Quick Pages */}
          {pages.length > 0 && (
            <div className="cmd-section">
              <h4 className="cmd-section-title">Navigation</h4>
              {pages.map((p) => (
                <button
                  key={p.path}
                  type="button"
                  className="cmd-item"
                  onClick={() => handleSelect(p.path)}
                >
                  <span className="cmd-item-icon">
                    <Icon name={p.icon} size={15} />
                  </span>
                  <span className="cmd-item-label">{p.label}</span>
                  <span className="cmd-item-path mono">{p.path}</span>
                </button>
              ))}
            </div>
          )}

          {/* Agents */}
          {filteredAgents.length > 0 && (
            <div className="cmd-section">
              <h4 className="cmd-section-title">Agents</h4>
              {filteredAgents.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  className="cmd-item"
                  onClick={() => handleSelect(`/marketplace/${agent.id}`)}
                >
                  <span className="cmd-item-icon">
                    <Icon name="bot" size={15} />
                  </span>
                  <div className="cmd-item-details">
                    <span className="cmd-item-label">{agent.name}</span>
                    <span className="cmd-item-sub">{agent.description}</span>
                  </div>
                  <span className="badge badge-green mono">{agent.priceAlgo} ALGO</span>
                </button>
              ))}
            </div>
          )}

          {pages.length === 0 && filteredAgents.length === 0 && (
            <div className="cmd-empty">
              <p className="text-sm text-muted">No results for "{query}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
