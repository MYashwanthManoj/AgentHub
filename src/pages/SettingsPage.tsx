/**
 * SettingsPage — account & application configuration only.
 *
 * Wallet is a payment identity and lives on its own page (/wallet).
 * Settings covers: Workspace, Wallet Funding, Preferences, and Security.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon/Icon';
import { useWalletFunding } from '../hooks/useWalletFunding';
import './SettingsPage.css';

interface SectionProps {
  icon: IconName;
  title: string;
  description: string;
  children: React.ReactNode;
}

function Section({ icon, title, description, children }: SectionProps) {
  return (
    <section className="settings-section card p-6">
      <div className="settings-section__head">
        <div className="settings-section__icon" aria-hidden="true">
          <Icon name={icon} size={16} />
        </div>
        <div>
          <h2 className="section-title">{title}</h2>
          <p className="text-xs text-secondary mt-1">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, htmlFor, children, hint }: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="settings-field">
      <label className="settings-field__label meta-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <span className="settings-field__hint text-xs text-muted">{hint}</span>}
    </div>
  );
}

export function SettingsPage() {
  const { fundedBalance, fundedAmount, setFundedAmount } = useWalletFunding();
  const [workspaceName, setWorkspaceName] = useState('BlockHack Workspace');
  const [defaultBudget, setDefaultBudget] = useState('0.10');
  const [agentIdle, setAgentIdle] = useState('5');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [notifications, setNotifications] = useState(true);
  const [defaultNetwork, setDefaultNetwork] = useState('testnet');
  const [fundedAmountInput, setFundedAmountInput] = useState(String(fundedAmount));
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('agenthub-theme', theme);
    // Persist the wallet's funded amount (validated — no-op on garbage input).
    const n = Number.parseFloat(fundedAmountInput);
    if (Number.isFinite(n) && n >= 0) setFundedAmount(n);
  };

  return (
    <div className="settings-page animate-fade-in">
      <div className="settings-page__header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Workspace, preferences, and security for your AgentHub account.</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={handleSave}>
          <Icon name={saved ? 'check' : 'settings'} size={13} />
          {saved ? 'Saved' : 'Save Changes'}
        </button>
      </div>

      {/* Workspace */}
      <Section
        icon="users"
        title="Workspace"
        description="Team identity, budget guards, and default agent behavior."
      >
        <div className="settings-section__grid">
          <Field label="Workspace Name" htmlFor="settings-workspace-name">
            <input
              id="settings-workspace-name"
              name="workspaceName"
              type="text"
              className="input"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
            />
          </Field>
          <Field
            label="Default Budget Cap (ALGO per task)"
            htmlFor="settings-default-budget"
            hint="Hard ceiling per x402 execution — budget guard enforces it."
          >
            <input
              id="settings-default-budget"
              name="defaultBudget"
              type="text"
              className="input mono"
              value={defaultBudget}
              onChange={(e) => setDefaultBudget(e.target.value)}
            />
          </Field>
          <Field label="Agent Idle Timeout (minutes)" htmlFor="settings-agent-idle" hint="Agents auto-park after inactivity.">
            <input
              id="settings-agent-idle"
              name="agentIdle"
              type="text"
              className="input mono"
              value={agentIdle}
              onChange={(e) => setAgentIdle(e.target.value)}
            />
          </Field>
          <Field label="Team Members" hint="2 members — managed via GitHub OAuth.">
            <div className="settings-page__members">
              <span className="settings-page__member">
                <Icon name="github" size={12} />
                yashwanthmanoj623
                <span className="badge badge-green">Owner</span>
              </span>
              <span className="settings-page__member">
                <Icon name="bot" size={12} />
                Buyer Agent (AI)
                <span className="badge badge-muted">Service</span>
              </span>
            </div>
          </Field>
        </div>
      </Section>

      {/* Wallet Funding */}
      <Section
        icon="wallet"
        title="Wallet Funding"
        description="The funded amount that seeds your Testnet wallet — persisted, not hardcoded."
      >
        <div className="settings-section__grid">
          <Field
            label="Initial Wallet Funding (ALGO)"
            htmlFor="settings-wallet-funding"
            hint="Sets the wallet's starting balance. Persists across reloads — top-ups add on top."
          >
            <input
              id="settings-wallet-funding"
              name="fundedAmount"
              type="text"
              inputMode="decimal"
              className="input mono"
              value={fundedAmountInput}
              onChange={(e) => setFundedAmountInput(e.target.value)}
            />
          </Field>
          <Field label="Current Funded Balance" hint="Genesis funding plus confirmed top-ups.">
            <div className="settings-page__row">
              <span className="mono text-sm text-green font-semibold">{fundedBalance.toFixed(4)} ALGO</span>
              <Link to="/wallet" className="btn btn-sm btn-ghost">
                <Icon name="wallet" size={13} />
                Wallet
              </Link>
            </div>
          </Field>
        </div>
      </Section>

      {/* Preferences */}
      <Section
        icon="sliders"
        title="Preferences"
        description="Look & feel, alerts, and default network behavior."
      >
        <div className="settings-section__grid">
          <Field label="Theme">
            <div className="settings-page__segmented" role="radiogroup" aria-label="Theme">
              {(['dark', 'light'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={theme === t}
                  aria-label={`${t === 'dark' ? 'Dark' : 'Light'} theme`}
                  className={`settings-page__segment ${theme === t ? 'settings-page__segment--active' : ''}`}
                  onClick={() => setTheme(t)}
                >
                  <Icon name={t === 'dark' ? 'moon' : 'sun'} size={13} />
                  {t === 'dark' ? 'Dark' : 'Light'}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Notifications">
            <label className="settings-page__toggle">
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
              />
              <span className="settings-page__toggle-track" aria-hidden="true">
                <span className="settings-page__toggle-thumb" />
              </span>
              <span className="text-sm text-secondary">
                Payment confirmed · agent failed · budget limit reached
              </span>
            </label>
          </Field>
          <Field label="Default Network" hint="Testnet funds have no real value — safe for development.">
            <div className="settings-page__segmented" role="radiogroup" aria-label="Default network">
              {(['testnet', 'mainnet'] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={defaultNetwork === n}
                  aria-label={`${n === 'testnet' ? 'Testnet' : 'Mainnet'} network`}
                  className={`settings-page__segment ${defaultNetwork === n ? 'settings-page__segment--active' : ''}`}
                  onClick={() => setDefaultNetwork(n)}
                >
                  <Icon name={n === 'testnet' ? 'globe' : 'shield'} size={13} />
                  {n === 'testnet' ? 'Testnet' : 'Mainnet'}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Section>

      {/* Security */}
      <Section
        icon="shield"
        title="Security"
        description="Session, authentication, and account controls."
      >
        <div className="settings-section__grid">
          <Field label="Session">
            <div className="settings-page__row">
              <span className="text-sm text-secondary">Active session · GitHub OAuth</span>
              <button type="button" className="btn btn-sm btn-ghost text-red">
                Sign out
              </button>
            </div>
          </Field>
          <Field label="Authentication">
            <div className="settings-page__row">
              <span className="text-sm text-secondary">yashwanthmanoj623</span>
              <span className="badge badge-green">Verified</span>
            </div>
          </Field>
          <Field label="Account Controls">
            <div className="settings-page__row">
              <span className="text-sm text-secondary">Manage credentials</span>
              <Link to="/developer/keys" className="btn btn-sm btn-ghost">
                <Icon name="keys" size={13} />
                API Keys
              </Link>
            </div>
          </Field>
        </div>
      </Section>

      {/* Wallet pointer */}
      <div className="settings-page__wallet-note">
        <Icon name="wallet" size={14} />
        <p className="text-xs text-muted">
          Looking for your connected wallet, balance, or payments? Wallet is a payment identity —{' '}
          <Link to="/wallet" className="text-green hover:underline">open Wallet</Link>.
        </p>
      </div>
    </div>
  );
}
