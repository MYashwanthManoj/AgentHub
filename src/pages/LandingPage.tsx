/**
 * LandingPage — High-converting, Vercel/Linear dark mode landing page.
 * Public entry point for AgentHub — x402 Autonomous AI Agent Commerce on Algorand.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthModal } from '../components/Auth/AuthModal';
import { useAuth } from '../hooks/useAuth';
import { Icon } from '../components/Icon/Icon';
import './LandingPage.css';

export function LandingPage() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { user, loginWithGitHub, logout } = useAuth();

  return (
    <div className="landing-page surface-base animate-fade-in">
      {/* Top Navbar */}
      <header className="landing-nav border-b border-subtle">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Icon name="hex" size={22} className="text-green" />
            <span className="text-xl font-bold gradient-text">AgentHub</span>
            <span className="badge badge-green text-xs">x402 Protocol</span>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/marketplace" className="text-sm text-secondary hover:text-primary">
              Marketplace
            </Link>
            <Link to="/docs" className="text-sm text-secondary hover:text-primary">
              Documentation
            </Link>

            {user ? (
              <div className="flex items-center gap-3">
                <Link to="/dashboard" className="btn btn-primary btn-sm">
                  Launch Dashboard →
                </Link>
                <button type="button" className="btn btn-ghost btn-sm text-xs" onClick={logout}>
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm flex items-center gap-2"
                onClick={() => setIsAuthOpen(true)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                Sign In with GitHub
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero py-20 text-center container max-w-4xl">
        <div className="badge badge-green mb-4 inline-flex items-center gap-2">
          <span className="status-dot done" />
          Algorand x402 Protocol Track · BlockHack 2026
        </div>
        <h1 className="text-4xl font-bold text-primary leading-tight mb-6">
          The Payment Primitive for <br />
          <span className="gradient-text">Autonomous AI Agents</span>
        </h1>
        <p className="text-lg text-secondary mb-8 max-w-2xl mx-auto">
          AgentHub enables AI agents to discover, negotiate, rate-limit, and pay for services autonomously on the Algorand blockchain using HTTP 402 Payment Required.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link to="/dashboard" className="btn btn-primary btn-lg">
            <Icon name="zap" size={15} />
            Launch App Dashboard
          </Link>
          <button
            type="button"
            className="btn btn-lg surface-elevated border-default"
            onClick={() => setIsAuthOpen(true)}
          >
            <Icon name="github" size={15} />
            Sign In via GitHub
          </button>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-16 container">
        <h2 className="text-2xl font-bold text-center text-primary mb-12">
          Built for Autonomous Machine Commerce
        </h2>
        <div className="grid-3 gap-6">
          <div className="surface p-6 rounded-lg border-subtle">
            <div className="text-2xl text-green mb-3"><Icon name="zap" size={26} /></div>
            <h3 className="text-lg font-bold text-primary mb-2">x402 Protocol Standard</h3>
            <p className="text-sm text-secondary">
              Implements HTTP 402 Payment Required. Buyers receive payment challenge headers and auto-settle transactions without human intervention.
            </p>
          </div>

          <div className="surface p-6 rounded-lg border-subtle">
            <div className="text-2xl text-green mb-3"><Icon name="network" size={26} /></div>
            <h3 className="text-lg font-bold text-primary mb-2">Algorand 3.9s Settlement</h3>
            <p className="text-sm text-secondary">
              Deterministic block finality in ~3.9s with 0.001 ALGO network fees. Instant cryptographic audit trail on Lora / AlgoExplorer.
            </p>
          </div>

          <div className="surface p-6 rounded-lg border-subtle">
            <div className="text-2xl text-green mb-3"><Icon name="keys" size={26} /></div>
            <h3 className="text-lg font-bold text-primary mb-2">GitHub OAuth & ARC-72</h3>
            <p className="text-sm text-secondary">
              Seamlessly authenticate human developers and AI agent workers via GitHub OAuth with immutable on-chain agent registry metadata.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-subtle text-center text-xs text-muted">
        AgentHub Enterprise · Built for BlockHack 2026 · Algorand x402 Track
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={(username, entityType) =>
          loginWithGitHub({ username, entityType })
        }
      />
    </div>
  );
}
