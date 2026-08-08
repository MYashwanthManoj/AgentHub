/**
 * Marketplace — search bar + seller card grid.
 * Handles search state; delegates routing to agentRouter (no direct service calls).
 */

import { useState, useMemo } from 'react';
import { Icon } from '../Icon/Icon';
import { SellerCard } from './SellerCard';
import { searchRegistry } from '../../services/registryService';
import { routeTask } from '../../services/agentRouter';
import { useRegistry } from '../../hooks/useRegistry';
import { RegisterAgentModal } from './RegisterAgentModal';
import type { SellerAgent } from '../../types';
import './Marketplace.css';

interface MarketplaceProps {
  selectedSeller: SellerAgent | null;
  onSellerSelect: (seller: SellerAgent) => void;
  isDisabled?: boolean;
  task: string;
  onTaskChange: (task: string) => void;
  onRunFlow: () => void;
  onRunMultiHop: () => void;
  isRunning: boolean;
  /** Per-agent usage counts keyed by seller id (from ledger). */
  agentUsage?: Record<string, number>;
}

export function Marketplace({
  selectedSeller,
  onSellerSelect,
  isDisabled,
  task,
  onTaskChange,
  onRunFlow,
  onRunMultiHop,
  isRunning,
  agentUsage,
}: MarketplaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Live registry (backend-hydrated, falls back to static seed offline).
  const agents = useRegistry();

  const displayedAgents = useMemo(() => {
    if (searchQuery.trim()) return searchRegistry(searchQuery);
    return agents;
  }, [searchQuery, agents]);

  // Auto-route when task changes
  const routing = useMemo(() => {
    if (!task.trim()) return null;
    return routeTask(task);
  }, [task]);

  // If task is typed and no manual selection, auto-highlight best match
  const effectiveSeller = selectedSeller ?? routing?.seller ?? null;

  return (
    <section className="marketplace" aria-label="Agent marketplace">
      {/* Section header */}
      <div className="marketplace__header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="marketplace__title">Service Registry</h2>
          <span className="marketplace__count badge badge-muted">
            {displayedAgents.length} agent{displayedAgents.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-primary flex items-center gap-1"
          onClick={() => setIsRegisterOpen(true)}
        >
          <Icon name="plus" size={13} />
          Register New Agent
        </button>
      </div>

      <RegisterAgentModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onRegister={(newAgent) => {
          agents.push(newAgent);
          onSellerSelect(newAgent);
        }}
      />

      {/* Search */}
      <div className="marketplace__search-row">
        <div className="marketplace__search-wrap">
          <Icon name="search" size={14} className="marketplace__search-icon" />
          <input
            id="registry-search"
            type="text"
            className="input marketplace__search-input"
            placeholder="Search registry: summarize, chart, lookup..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search agent registry"
          />
          {searchQuery && (
            <button
              className="btn btn-ghost btn-sm marketplace__clear-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <Icon name="x" size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Agent grid */}
      <div className="marketplace__grid">
        {displayedAgents.length > 0 ? (
          displayedAgents.map((agent) => (
            <SellerCard
              key={agent.id}
              agent={agent}
              isSelected={effectiveSeller?.id === agent.id}
              isDisabled={isDisabled}
              onSelect={onSellerSelect}
              usageCount={agentUsage?.[agent.id] ?? 0}
            />
          ))
        ) : (
          <div className="marketplace__empty">
            <Icon name="search" size={18} className="marketplace__empty-icon" />
            <p>No agents found for "{searchQuery}"</p>
          </div>
        )}
      </div>

      {/* Task input + routing indicator */}
      <div className="marketplace__task-section surface">
        <div className="marketplace__task-header">
          <span className="marketplace__task-label">Task Input</span>
          {routing && (
            <div className="marketplace__routing-hint">
              <span className="status-dot done" />
              <span className="text-sm text-secondary">
                Auto-routed → <strong className="text-green">{routing.seller.name}</strong>
                {routing.matchedKeywords.length > 0 && (
                  <span className="text-muted">
                    {' '}({routing.matchedKeywords.join(', ')})
                  </span>
                )}
              </span>
              <span className={`badge ${routing.confidence === 'high' ? 'badge-green' : routing.confidence === 'medium' ? 'badge-amber' : 'badge-muted'}`}>
                {routing.confidence}
              </span>
            </div>
          )}
        </div>

        {/* Demo quick-fill chips */}
        <div className="marketplace__demo-chips">
          {[
            { label: 'Summarize', value: 'summarize the Algorand x402 payment protocol spec' },
            { label: 'Chart', value: 'chart quarterly transaction volume data' },
            { label: 'Lookup', value: 'lookup Algorand Foundation entity details' },
          ].map((chip) => (
            <button
              key={chip.label}
              className="btn btn-ghost btn-sm"
              onClick={() => onTaskChange(chip.value)}
              disabled={isRunning}
              type="button"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* AI-Wallet Limitations & Token Budget Control (Notebook item 5 & 6) */}
        <div className="marketplace__budget-bar flex items-center justify-between p-2 mb-3 surface-elevated rounded border border-subtle text-xs">
          <div className="flex items-center gap-3">
            <span className="text-secondary flex items-center gap-1 font-medium">
              <Icon name="zap" size={12} className="text-amber" /> AI Budget Cap: <strong className="text-primary mono">0.10 ALGO</strong>
            </span>
            <span className="text-muted">|</span>
            <span className="text-secondary flex items-center gap-1">
              <Icon name="dollar" size={12} /> Est. Tokens: <strong className="text-green mono">{task.trim() ? Math.min(650, Math.max(120, task.length * 8)) : 0} tok</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-green text-xs">LOW BUDGET TIER</span>
            <span className="text-muted text-xs" title="Auto-optimizes task allocation within wallet limits">Budget Guard Active</span>
          </div>
        </div>

        <textarea
          id="task-input"
          className="input input-mono marketplace__task-textarea"
          placeholder="Enter a task... e.g. 'summarize this document', 'chart quarterly revenue', 'lookup Algorand'"
          value={task}
          onChange={(e) => onTaskChange(e.target.value)}
          onKeyDown={(e) => {
            // Enter submits the task form; Shift+Enter inserts a newline.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (!isRunning && task.trim()) onRunFlow();
            }
          }}
          rows={3}
          disabled={isRunning}
          aria-label="Task description"
          aria-describedby="task-input-hint"
        />
        <span id="task-input-hint" className="marketplace__task-hint">
          Press <kbd>Enter</kbd> to run · <kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line
        </span>

        {/* Action buttons */}
        <div className="marketplace__actions">
          <button
            id="run-flow-btn"
            className="btn btn-primary marketplace__run-btn"
            onClick={onRunFlow}
            disabled={isRunning || !task.trim()}
            aria-label="Run payment flow"
            aria-busy={isRunning}
          >
            {isRunning ? (
              <>
                <span className="marketplace__spinner" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.2" />
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="40 17" />
                  </svg>
                </span>
                Running flow...
              </>
            ) : (
              <>
                <Icon name="play" size={14} />
                Run Payment Flow
              </>
            )}
          </button>

          <button
            id="multi-hop-btn"
            className="btn btn-amber marketplace__multi-btn"
            onClick={onRunMultiHop}
            disabled={isRunning}
            aria-label="Run multi-agent workflow"
          >
            <Icon name="automations" size={14} />
            Multi-Agent Workflow
          </button>
        </div>
      </div>
    </section>
  );
}
