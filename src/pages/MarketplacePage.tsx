/**
 * MarketplacePage — the single page of the demo.
 *
 * Orchestrates:
 *  - Marketplace (seller selection + task input)
 *  - Transaction flow panel  (single-hop view — useTransactionFlow)
 *  - Multi-hop panel         (pipeline view  — useMultiHopFlow)
 *  - Ledger
 *
 * Business logic lives in hooks and services. This component only wires them together.
 */

import { useState, useCallback, useMemo } from 'react';
import { Icon } from '../components/Icon/Icon';
import { Marketplace } from '../components/Marketplace/Marketplace';
import { TransactionFlow } from '../components/TransactionFlow/TransactionFlow';
import { Ledger } from '../components/Ledger/Ledger';
import { ExplorerStatsBar } from '../components/Badges/ExplorerStatsBar';
import { MultiHopPanel } from '../components/Timeline/MultiHopPanel';
import { useTransactionFlow } from '../hooks/useTransactionFlow';
import { useMultiHopFlow } from '../hooks/useMultiHopFlow';
import { useLedger } from '../hooks/useLedger';
import { routeTask } from '../services/agentRouter';
import { loadRegistry } from '../services/registryService';
import type { SellerAgent, LedgerEntry } from '../types';
import './MarketplacePage.css';

// ─────────────────────────────────────────────────────────────────────────────
// Multi-hop workflow definition
// Add / remove hops here without touching any other file.
// ─────────────────────────────────────────────────────────────────────────────
const MULTI_HOP_TASKS: Array<{ sellerId: string; task: string }> = [
  { sellerId: 'agent-summarizer-01', task: 'summarize the Algorand x402 payment protocol spec' },
  { sellerId: 'agent-chart-01',      task: 'chart the transaction volume growth data' },
  { sellerId: 'agent-lookup-01',     task: 'lookup Algorand Foundation entity details' },
];

export function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'catalog' | 'execution' | 'ledger'>('overview');
  const [selectedSeller, setSelectedSeller] = useState<SellerAgent | null>(null);
  const [task, setTask] = useState('');

  // Single-hop flow (animates TransactionFlow step panel)
  const { steps, isRunning, isStreaming, result, runFlow, resetFlow } = useTransactionFlow();

  // Multi-hop pipeline (runs hops without resetting the step panel)
  const {
    hops,
    isRunning: multiHopRunning,
    isComplete: multiHopComplete,
    totalSpent: multiHopSpent,
    runWorkflow,
    resetWorkflow,
  } = useMultiHopFlow();

  const { entries, addEntry, clearLedger, totalSpent, totalTransactions } = useLedger();

  // Per-agent usage counts for SellerCard badges (updates live as ledger grows)
  const agentUsage = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entries) counts[e.sellerId] = (counts[e.sellerId] ?? 0) + 1;
    return counts;
  }, [entries]);

  // Resolve effective seller (manual selection or auto-route from task)
  const effectiveSeller: SellerAgent | null =
    selectedSeller ?? (task.trim() ? routeTask(task).seller : null);

  // ── Single-hop handler ──────────────────────────────────────────────────────
  const handleRunFlow = useCallback(async () => {
    if (!effectiveSeller || !task.trim()) return;
    resetFlow();
    resetWorkflow(); // clear multi-hop panel when running single-hop

    try {
      const entry: LedgerEntry = await runFlow(effectiveSeller, task);
      addEntry(entry);
    } catch (err) {
      console.error('Flow error:', err);
    }
  }, [effectiveSeller, task, runFlow, resetFlow, resetWorkflow, addEntry]);

  // ── Multi-hop handler ───────────────────────────────────────────────────────
  const handleRunMultiHop = useCallback(async () => {
    if (multiHopRunning) return;
    resetWorkflow();

    const workflowSteps = MULTI_HOP_TASKS
      .map((h) => ({
        seller: loadRegistry().find((s) => s.id === h.sellerId)!,
        task: h.task,
      }))
      .filter((s) => s.seller != null);

    await runWorkflow(workflowSteps, addEntry);
  }, [multiHopRunning, runWorkflow, resetWorkflow, addEntry]);

  const showMultiHop = hops.length > 0;

  return (
    <main className="marketplace-page">
      <div className="container">
        {/* Simple 3-step Quick Start Onboarding Guide */}
        <div className="surface p-4 mb-6 rounded-lg border-subtle flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="badge badge-green text-xs font-bold">SIMPLE 3-STEP FLOW</span>
            <span className="text-sm text-primary font-medium">How AgentHub Machine Commerce Works:</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="badge badge-muted">1</span>
              <span className="text-secondary font-medium">Select Agent</span>
            </div>
            <span className="text-muted">→</span>
            <div className="flex items-center gap-2">
              <span className="badge badge-muted">2</span>
              <span className="text-secondary font-medium">Enter Prompt Task</span>
            </div>
            <span className="text-muted">→</span>
            <div className="flex items-center gap-2">
              <span className="badge badge-green">3</span>
              <span className="text-green font-bold">Run x402 Settlement</span>
            </div>
          </div>
        </div>

        {/* Clean Workspace Tabs */}
        <nav className="marketplace-page__nav-tabs flex items-center justify-between surface border-subtle p-2 mb-6 rounded-md">
          <div className="flex items-center gap-2">
            {[
              { id: 'overview', label: 'Agent Studio & Flow' },
              { id: 'catalog', label: 'Full Agent Catalog (8)' },
              { id: 'ledger', label: 'On-Chain Ledger' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`btn btn-sm ${activeTab === tab.id ? 'btn-primary font-bold' : 'btn-ghost text-secondary'}`}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="text-xs text-muted pr-2">
            <span className="mono text-green">12.5000 ALGO</span> Balance
          </div>
        </nav>
      </div>

      {/* VIEW 1: OVERVIEW DASHBOARD (Unified View) */}
      {(activeTab === 'overview' || activeTab === 'catalog') && (
        <div className="container marketplace-page__container">
          {/* Left column: marketplace */}
          <div className="marketplace-page__left">
            <Marketplace
              selectedSeller={selectedSeller}
              onSellerSelect={setSelectedSeller}
              isDisabled={isRunning || multiHopRunning}
              task={task}
              onTaskChange={setTask}
              onRunFlow={handleRunFlow}
              onRunMultiHop={handleRunMultiHop}
              isRunning={isRunning || multiHopRunning}
              agentUsage={agentUsage}
            />
          </div>

          {/* Right column: flow + multi-hop (Visible in Overview or Execution tabs) */}
          {activeTab === 'overview' && (
            <div className="marketplace-page__right">
              <TransactionFlow
                steps={steps}
                isRunning={isRunning}
                isStreaming={isStreaming}
                result={result}
                sellerName={effectiveSeller?.name}
              />

              {showMultiHop && (
                <MultiHopPanel
                  hops={hops}
                  isRunning={multiHopRunning}
                  isComplete={multiHopComplete}
                  totalSpent={multiHopSpent}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: EXECUTION ENGINE ONLY */}
      {activeTab === 'execution' && (
        <div className="container grid-2 gap-6">
          <div className="surface p-6">
            <h3 className="text-lg font-bold text-primary mb-2 flex items-center gap-2">
              <Icon name="zap" size={14} className="text-amber" /> Task Router & Budget Control
            </h3>
            <p className="text-sm text-secondary mb-4">
              Submit prompt tasks directly into the x402 payment pipeline. Agents are auto-routed based on keyword matching and budget limits.
            </p>
            <Marketplace
              selectedSeller={selectedSeller}
              onSellerSelect={setSelectedSeller}
              isDisabled={isRunning || multiHopRunning}
              task={task}
              onTaskChange={setTask}
              onRunFlow={handleRunFlow}
              onRunMultiHop={handleRunMultiHop}
              isRunning={isRunning || multiHopRunning}
              agentUsage={agentUsage}
            />
          </div>

          <div>
            <TransactionFlow
              steps={steps}
              isRunning={isRunning}
              isStreaming={isStreaming}
              result={result}
              sellerName={effectiveSeller?.name}
            />
            {showMultiHop && (
              <MultiHopPanel
                hops={hops}
                isRunning={multiHopRunning}
                isComplete={multiHopComplete}
                totalSpent={multiHopSpent}
              />
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: LEDGER ONLY OR OVERVIEW */}
      {(activeTab === 'overview' || activeTab === 'ledger') && (
        <div className="container marketplace-page__ledger">
          <Ledger
            entries={entries}
            totalSpent={totalSpent}
            totalTransactions={totalTransactions}
            onClear={clearLedger}
          />
        </div>
      )}
    </main>
  );
}
