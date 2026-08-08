/**
 * ModeBanner — top-of-page status strip.
 *
 * Renders one of two states:
 *  - `backendOffline` → red "Running in offline demo mode" alert (fed by the
 *    startup /health probe).
 *  - `mode === 'simulated'` (not dismissed) → amber "SIMULATED MODE" banner
 *    clarifying all payments are mocked.
 *
 * Dismissal is persisted to localStorage under `agenthub_banner_dismissed`.
 */
import { useState } from 'react';
import type { NetworkMode } from '../../types';
import { Icon } from '../Icon/Icon';
import './ModeBanner.css';

const DISMISSED_KEY = 'agenthub_banner_dismissed';

interface ModeBannerProps {
  mode: NetworkMode;
  backendOffline?: boolean;
  /** True while the startup /health probe is still resolving. */
  checking?: boolean;
}

export function ModeBanner({ mode, backendOffline = false, checking = false }: ModeBannerProps) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === 'true'
  );

  // Skeleton placeholder while the backend health check is in flight.
  if (checking) {
    return (
      <div
        className="mode-banner mode-banner--checking"
        role="status"
        aria-busy="true"
        aria-label="Checking backend connection"
      >
        <span className="skeleton mode-banner__skeleton" aria-hidden="true" />
      </div>
    );
  }

  if (backendOffline) {
    return (
      <div className="mode-banner mode-banner--offline" role="alert">
        <span className="mode-banner__text">
          <strong>Running in offline demo mode</strong>
        </span>
      </div>
    );
  }

  if (mode !== 'simulated' || dismissed) return null;
  return (
    <div className="mode-banner" role="alert">
      <span className="mode-banner__text">
        <Icon name="alert" size={12} /> <strong>SIMULATED MODE</strong> — No real ALGO transactions.
        All payments are mocked for demonstration purposes.
      </span>
      <button
        className="mode-banner__dismiss"
        onClick={() => { setDismissed(true); localStorage.setItem(DISMISSED_KEY,'true'); }}
        aria-label="Dismiss banner"
      >
        <Icon name="x" size={11} />
      </button>
    </div>
  );
}
