/**
 * ResultPanel — displays the agent execution result.
 * Handles text, chart, JSON, and image result types.
 */

import { useCallback, useEffect, useState } from 'react';
import type { AgentResult } from '../../types';
import { formatDuration, truncateHash } from '../../utils/format';
import { Icon } from '../Icon/Icon';
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
          <CopyButton content={result.content} />
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
        {result.resultType === 'image' && <ImageResult url={result.content} />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-renderers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Copy button — writes the result payload to the clipboard and flashes
 * "Copied ✓" for 2 seconds before reverting to "Copy".
 */
function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  // Revert the button label after 2 seconds.
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
    } catch {
      /* Clipboard unavailable (e.g. non-secure context) — ignore silently. */
    }
  }, [content]);

  return (
    <button
      type="button"
      className={`btn btn-sm result-panel__copy-btn ${copied ? 'result-panel__copy-btn--copied' : ''}`}
      onClick={handleCopy}
      aria-label={copied ? 'Copied to clipboard' : 'Copy result to clipboard'}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      <Icon name={copied ? 'check' : 'copy'} size={12} />
      {copied ? 'Copied ✓' : 'Copy'}
    </button>
  );
}

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

/**
 * Typewriter text result — reveals content character by character
 * (~15 ms per character) with a blinking cursor while typing.
 * Honors prefers-reduced-motion by revealing instantly.
 */
function TextResult({ content }: { content: string }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Empty content or reduced-motion preference: reveal instantly.
    if (content.length === 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisibleCount(content.length);
      setDone(true);
      return;
    }

    setVisibleCount(0);
    setDone(false);

    let i = 0;
    const timer = window.setInterval(() => {
      i += 1;
      setVisibleCount(i);
      if (i >= content.length) {
        window.clearInterval(timer);
        setDone(true);
      }
    }, 15);

    return () => window.clearInterval(timer);
  }, [content]);

  return (
    <p className="result-panel__text">
      {content.slice(0, visibleCount)}
      {!done && <span className="result-panel__cursor" aria-hidden="true" />}
    </p>
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

/**
 * Image result — shows a pulsing skeleton + spinner until the Pollinations.ai
 * image has loaded (onLoad), then fades it in. Failures render an error state.
 */
function ImageResult({ url }: { url: string }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  // A new task produces a new URL — reset back to the loading state.
  useEffect(() => {
    setStatus('loading');
  }, [url]);

  const isError = status === 'error';

  return (
    <div className="result-image-wrapper">
      <div className="result-image__label mono text-xs text-muted" style={{ marginBottom: '10px' }}>
        🎨 AI-generated image · powered by Pollinations.ai · paid via x402
      </div>

      {isError ? (
        <p className="result-image__error" role="alert">
          Image generation failed — check your internet connection and try again.
        </p>
      ) : (
        <div
          className="result-image-frame"
          style={{ minHeight: status === 'loading' ? '280px' : undefined }}
        >
          {status === 'loading' && (
            <div className="result-image__skeleton" role="status" aria-label="Generating image">
              <span className="result-image__skeleton-spinner" aria-hidden="true" />
              <span className="result-image__skeleton-text">Generating image…</span>
            </div>
          )}
          <img
            src={url}
            alt="AI Generated"
            className="result-image"
            loading="lazy"
            onLoad={() => setStatus('loaded')}
            onError={() => setStatus('error')}
            style={{
              opacity: status === 'loaded' ? 1 : 0,
              transition: 'opacity 0.5s ease',
              maxWidth: '100%',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          />
        </div>
      )}

      {!isError && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="result-image__download mono text-xs"
          style={{ display: 'inline-block', marginTop: '10px', color: 'var(--color-accent, #818cf8)' }}
        >
          ↗ Open full image
        </a>
      )}
    </div>
  );
}
