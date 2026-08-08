/**
 * Header component — top navigation bar with mode badge and wallet display.
 * Completely self-contained. No props required for basic display.
 */

import { useEffect, useState } from 'react';
import type { NetworkMode } from '../../types';
import { BUYER_AGENT } from '../../data/agents';
import './Header.css';

interface HeaderProps {
  mode?: NetworkMode;
  balance?: number;
}

type ThemeMode = 'dark' | 'light';

const THEME_KEY = 'agenthub-theme';

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  // Apply synchronously to avoid a flash of the wrong theme on first paint.
  document.documentElement.dataset.theme = stored;
  return stored;
}

export function Header({ mode = 'simulated', balance = BUYER_AGENT.balanceAlgo }: HeaderProps) {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  // Apply + persist the active theme on <html data-theme>
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const modeBadgeClass =
    mode === 'simulated' ? 'badge-amber' : mode === 'testnet' ? 'badge-blue' : 'badge-green';

  const modeLabel =
    mode === 'simulated' ? 'SIMULATED MODE' : mode === 'testnet' ? 'TESTNET MODE' : 'MAINNET';

  return (
    <header className="header">
      <div className="container header__inner">
        {/* Left: Logo */}
        <div className="header__brand">
          <div className="header__logo-mark" aria-hidden="true">
            <span className="header__logo-hex" aria-hidden="true">⬡</span>
          </div>
          <div className="header__title-group">
            <span className="header__title gradient-text">AgentHub</span>
            <span className="header__subtitle">x402 Service Registry</span>
          </div>
        </div>

        {/* Center: Mode badge */}
        <div className="header__center">
          <span className={`badge ${modeBadgeClass} header__mode-badge`} id="network-mode-badge">
            <span className="status-dot active" />
            {modeLabel}
          </span>
          <span className="header__track-label">Algorand x402 Track · BlockHack 2026</span>
        </div>

        {/* Right: theme toggle + wallet */}
        <button
          type="button"
          className="header__theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4.5" />
              <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.5 4.5l1.8 1.8M17.7 17.7l1.8 1.8M19.5 4.5l-1.8 1.8M6.3 17.7l-1.8 1.8" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
            </svg>
          )}
        </button>
        <div className="header__wallet flex items-center gap-3">
          {/* GitHub / Pera Wallet Auth Badge */}
          <div className="header__auth-badge flex items-center gap-2">
            <span className="badge badge-green" title="Authorized via GitHub OAuth & Pera Wallet">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              Git Auth
            </span>
          </div>

          <div className="header__wallet-info">
            <span className="header__wallet-label">Buyer Agent</span>
            <span className="header__wallet-addr mono">
              {BUYER_AGENT.walletAddress.slice(0, 16)}…
            </span>
          </div>
          <div className="header__balance">
            <span className="header__balance-value">{balance.toFixed(4)}</span>
            <span className="header__balance-unit">ALGO</span>
          </div>
        </div>
      </div>
    </header>
  );
}
