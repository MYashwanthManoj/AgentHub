/**
 * ResultPanel — displays the agent execution result.
 * Handles text, chart, and JSON result types.
 */

import type { AgentResult } from '../../types';
import { formatDuration, truncateHash } from '../../utils/format';
import './ResultPanel.css';

interface ResultPanelProps {
  result: AgentResult;
  /** On-chain transaction hash — renders a clickable AlgoExplorer link. */
  txHash?: string;
}

export function ResultPanel({ result, txHash }: ResultPanelProps) {
  return (
    <div className="result-panel surface-glass" id="result-panel">
      <div className="result-panel__header">
        <span className="result-panel__title">Agent Output</span>
        <div className="result-panel__meta">
          <span className="badge badge-green">200 OK</span>
          {txHash && <TxLink txHash={txHash} />}
          <span className="mono text-xs text-muted">
            Executed in {formatDuration(result.executionTimeMs)}
          </span>
        </div>
      </div>

      <div className="result-panel__body">
        {result.resultType === 'text' && <TextResult content={result.content} />}
        {result.resultType === 'json' && <JsonResult content={result.content} />}
        {result.resultType === 'chart' && result.chartData && (
          <ChartResult data={result.chartData} />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-renderers
// ─────────────────────────────────────────────────────────────────────────────

/** Clickable link to the transaction on AlgoExplorer (testnet). */
function TxLink({ txHash }: { txHash: string }) {
  return (
    <a
      className="result-panel__tx-link mono"
      href={`https://testnet.algoexplorer.io/tx/${txHash}`}
      target="_blank"
      rel="noopener noreferrer"
      title={`View transaction ${txHash} on AlgoExplorer`}
    >
      <svg
        className="result-panel__tx-icon"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8A1.5 1.5 0 0 0 13 12.5V10" />
        <path d="M9.5 2.5H13.5V6.5" />
        <path d="M13 3L8.5 7.5" />
      </svg>
      {truncateHash(txHash, 10)}
    </a>
  );
}

function TextResult({ content }: { content: string }) {
  return (
    <p className="result-panel__text">{content}</p>
  );
}

function JsonResult({ content }: { content: string }) {
  return (
    <pre className="result-panel__json mono">{content}</pre>
  );
}

function ChartResult({ data }: { data: { label: string; value: number }[] }) {
  const maxVal = Math.max(...data.map((d) => d.value));

  return (
    <div className="result-chart" aria-label="Bar chart">
      {data.map((d) => {
        const pct = (d.value / maxVal) * 100;
        return (
          <div key={d.label} className="result-chart__bar-row">
            <span className="result-chart__label mono">{d.label}</span>
            <div className="result-chart__track">
              <div
                className="result-chart__fill animate-fade-in"
                style={{ width: `${pct}%` }}
                aria-label={`${d.label}: ${d.value}`}
              />
            </div>
            <span className="result-chart__value mono">{d.value}</span>
          </div>
        );
      })}
    </div>
  );
}
