/**
 * TopHeader — Top bar with Global Search, Command Palette trigger (Ctrl+K),
 * Wallet Balance, Git Auth status, and Theme Toggle.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getFundedBalance } from '../../hooks/useWalletFunding';
import { AuthModal } from '../Auth/AuthModal';
import { Icon } from '../Icon/Icon';
import './TopHeader.css';

interface TopHeaderProps {
  onOpenCommandPalette?: () => void;
  onToggleNav?: () => void;
  balance?: number;
}

type ThemeMode = 'dark' | 'light';

export function TopHeader({ onOpenCommandPalette, onToggleNav, balance = getFundedBalance() }: TopHeaderProps) {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { user, loginWithGitHub, logout } = useAuth();

  useEffect(() => {
    const stored = window.localStorage.getItem('agenthub-theme') === 'light' ? 'light' : 'dark';
    setTheme(stored);
    document.documentElement.dataset.theme = stored;
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem('agenthub-theme', next);
  };

  return (
    <header className="top-header">
      {/* Mobile nav toggle */}
      <button
        type="button"
        className="top-header__menu-btn btn btn-ghost btn-sm"
        onClick={onToggleNav}
        aria-label="Toggle navigation"
      >
        <Icon name="list" size={18} />
      </button>

      {/* Search / Command Palette trigger */}
      <div className="top-header__search">
        <button
          type="button"
          className="top-header__cmd-btn"
          onClick={onOpenCommandPalette}
          title="Search agents, jump to pages, or execute commands (Ctrl+K)"
        >
          <Icon name="search" size={15} className="top-header__cmd-icon" />
          <span className="top-header__cmd-placeholder">Search or type a command...</span>
          <kbd className="top-header__cmd-kbd">Ctrl K</kbd>
        </button>
      </div>

      {/* Right controls */}
      <div className="top-header__controls">
        {/* Network status */}
        <div
          className="top-header__status-badge badge badge-green"
          title="Live connection to Algorand Testnet node"
        >
          <span className="status-dot done" />
          Testnet
        </div>

        {/* GitHub Auth Pill / Trigger */}
        {user ? (
          <div
            className="top-header__auth-badge badge cursor-pointer flex items-center gap-2"
            onClick={logout}
            title="Click to Sign Out"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && logout()}
          >
            <Icon name="github" size={13} />
            @{user.username}
          </div>
        ) : (
          <button type="button" className="btn btn-sm btn-primary flex items-center gap-1" onClick={() => setIsAuthOpen(true)}>
            <Icon name="lock" size={13} />
            Sign In
          </button>
        )}

        {/* Theme toggle */}
        <button
          type="button"
          className="btn btn-ghost btn-sm top-header__theme-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
        </button>

        {/* Wallet Pill */}
        <Link to="/wallet" className="top-header__wallet" title="Open wallet">
          <Icon name="wallet" size={14} className="top-header__wallet-icon" />
          <span className="mono text-xs text-green font-bold">{balance.toFixed(4)} ALGO</span>
        </Link>
      </div>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={(username, entityType) => loginWithGitHub({ username, entityType })}
      />
    </header>
  );
}
