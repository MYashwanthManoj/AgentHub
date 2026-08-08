/**
 * WalletPage — the wallet is a payment identity, not an account setting.
 *
 * Shows: connection status, network, balance, available funds, total spent,
 * transaction count, recent payments, and a persistent funding history.
 * "Top Up" refills the funded balance (logged + survives reloads, like the
 * ledger). Every secret/address stays masked until copied. Testnet is
 * labelled explicitly so it can never be confused with Mainnet.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLedger } from '../hooks/useLedger';
import { useWalletFunding, TOPUP_CONFIRM_MS } from '../hooks/useWalletFunding';
import { Icon, type IconName } from '../components/Icon/Icon';
import { StatusBadge } from '../components/ui/StatusBadge';
import { CopyButton } from '../components/ui/CopyButton';
import { timeAgo, truncateHash } from '../utils/format';
import type { FundingEntry, FundingMethod } from '../types';
import './WalletPage.css';

const WALLET_ADDRESS = 'LRJPYUELQTWYEDWVHZD5PAR7EZ7LPLWEXOSHOCZZNJX3Z4FQY5T2QOFYNY';
const EXPLORER_URL = `https://lora.algokit.io/testnet/account/${WALLET_ADDRESS}`;

const METHOD_LABEL: Record<FundingMethod, string> = {
  genesis: 'Genesis Funding',
  faucet: 'Testnet Faucet',
  transfer: 'Peer Transfer',
  card: 'Card Top-Up',
};

const METHOD_ICON: Record<FundingMethod, IconName> = {
  genesis: 'sparkles',
  faucet: 'zap',
  transfer: 'send',
  card: 'dollar',
};

/** Steps shown while a top-up confirms (mirrors the x402 timeline aesthetic). */
const CONFIRM_STEPS = ['Signing transaction', 'Broadcasting to Testnet', 'Waiting for confirmation'];

export function WalletPage() {
  const { entries, totalSpent, totalTransactions, availableBalance, fundedBalance } = useLedger();
  const { entries: funding, pendingCount, topUp } = useWalletFunding();
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(true);
  const [topUpOpen, setTopUpOpen] = useState(false);

  const confirmedCount = entries.filter((e) => e.status === 'confirmed').length;
  const recentPayments = entries.slice(0, 6);
  const fundingSorted = [...funding].sort((a, b) => b.createdAt - a.createdAt);

  const handleReconnect = () => {
    setConnecting(true);
    setConnected(false);
    window.setTimeout(() => {
      setConnecting(false);
      setConnected(true);
    }, 1400);
  };

  return (
    <div className="wallet-page animate-fade-in">
      {/* Header */}
      <div className="wallet-page__header">
        <div>
          <h1 className="page-title">Wallet</h1>
          <p className="page-subtitle">Your Algorand payment identity — funds every x402 agent settlement.</p>
        </div>
        <div className="wallet-page__header-actions">
          <button type="button" className="btn btn-sm" onClick={handleReconnect} disabled={connecting}>
            <Icon name="refresh" size={13} className={connecting ? 'animate-spin' : ''} />
            {connecting ? 'Connecting...' : 'Reconnect Wallet'}
          </button>
          <Link to="/transactions" className="btn btn-sm btn-ghost">
            <Icon name="transactions" size={13} />
            View Transactions
          </Link>
        </div>
      </div>

      {/* Connection banner */}
      <div className={`wallet-page__connection ${connected ? 'wallet-page__connection--ok' : 'wallet-page__connection--off'}`}>
        <span className={`status-dot ${connected ? 'done' : 'active animate-pulse-glow'}`} />
        <div className="wallet-page__connection-copy">
          <span className="wallet-page__connection-title">
            {connecting ? 'Connecting wallet…' : connected ? 'Connected' : 'Disconnected'}
          </span>
          <span className="wallet-page__connection-sub">Algorand Testnet · Pera Wallet</span>
        </div>
        <span className="badge badge-green wallet-page__network-badge">
          <Icon name="globe" size={11} />
          TESTNET
        </span>
      </div>

      {/* Balance hero */}
      <div className="wallet-page__balance card card--primary">
        <div>
          <span className="meta-label">Total Balance</span>
          <div className="wallet-page__balance-value">
            {fundedBalance.toFixed(4)} <span className="wallet-page__balance-unit">ALGO</span>
          </div>
          <span className="wallet-page__balance-sub">
            {availableBalance.toFixed(4)} ALGO available for agent payments
            {pendingCount > 0 && (
              <>
                {' · '}
                <span className="text-amber">{pendingCount} confirming</span>
              </>
            )}
          </span>
        </div>
        <div className="wallet-page__balance-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm wallet-page__topup-btn"
            onClick={() => setTopUpOpen(true)}
          >
            <Icon name="plus" size={14} />
            Top Up
          </button>
          <CopyButton text={WALLET_ADDRESS} label="Copy Address" />
          <a href={EXPLORER_URL} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost">
            <Icon name="external" size={13} />
            View on Explorer
          </a>
        </div>
      </div>

      {/* Address card */}
      <div className="wallet-page__address card p-5">
        <div className="wallet-page__address-top">
          <span className="meta-label">Wallet Address</span>
          <span className="mono text-xs text-green">{connected ? '● Active' : '○ Inactive'}</span>
        </div>
        <div className="wallet-page__address-row">
          <code className="wallet-page__address-code mono">{WALLET_ADDRESS}</code>
          <CopyButton text={WALLET_ADDRESS} label="Copy" />
        </div>
        <div className="wallet-page__address-notes">
          <Icon name="info" size={12} />
          <span className="text-xs text-muted">
            This is a Testnet address. Funds have no real-world value. Never send Mainnet funds here.
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="wallet-page__metrics">
        <div className="card card--metric p-4">
          <span className="meta-label">Available Balance</span>
          <div className="metric-value metric-value--green">{availableBalance.toFixed(4)}</div>
          <span className="text-xs text-muted">ALGO spendable</span>
        </div>
        <div className="card card--metric p-4">
          <span className="meta-label">Total Spent</span>
          <div className="metric-value">{totalSpent.toFixed(4)}</div>
          <span className="text-xs text-muted">ALGO settled on-chain</span>
        </div>
        <div className="card card--metric p-4">
          <span className="meta-label">Transactions</span>
          <div className="metric-value">{totalTransactions}</div>
          <span className="text-xs text-muted">{confirmedCount} confirmed</span>
        </div>
      </div>

      {/* Funding history — the persistent top-up log */}
      <section className="card p-5">
        <div className="wallet-page__section-head">
          <h2 className="section-title">Funding History</h2>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setTopUpOpen(true)}>
            <Icon name="plus" size={12} />
            Top Up
          </button>
        </div>
        {fundingSorted.length > 0 ? (
          <ul className="wallet-page__funding">
            {fundingSorted.map((f) => (
              <li key={f.id} className="wallet-page__funding-row">
                <span className="wallet-page__funding-icon" aria-hidden="true">
                  <Icon name={METHOD_ICON[f.method] ?? 'wallet'} size={13} />
                </span>
                <div className="wallet-page__funding-main">
                  <span className="text-sm text-primary font-medium">
                    {METHOD_LABEL[f.method] ?? f.method}
                    {f.note && <span className="text-xs text-muted font-normal"> · {f.note}</span>}
                  </span>
                  <span className="mono text-xs text-muted">
                    {f.txHash ? truncateHash(f.txHash, 10) : 'awaiting confirmation…'}
                  </span>
                </div>
                <div className="wallet-page__funding-meta">
                  <StatusBadge status={f.status} />
                  <span className="mono text-xs text-muted">{timeAgo(f.createdAt)}</span>
                  <span
                    className={`mono text-sm font-semibold ${f.status === 'confirmed' ? 'text-green' : 'text-muted'}`}
                  >
                    +{f.amount.toFixed(4)} ALGO
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <div className="empty-state__icon">
              <Icon name="wallet" size={18} />
            </div>
            <p className="empty-state__title">No funding yet</p>
            <p className="empty-state__body">Top up your wallet to fund agent executions.</p>
            <button type="button" className="btn btn-sm btn-primary mt-2" onClick={() => setTopUpOpen(true)}>
              <Icon name="plus" size={12} />
              Top Up
            </button>
          </div>
        )}
      </section>

      {/* Recent payments */}
      <section className="card p-5">
        <div className="wallet-page__section-head">
          <h2 className="section-title">Recent Payments</h2>
          <Link to="/transactions" className="wallet-page__link">
            Full ledger <Icon name="arrow-right" size={12} />
          </Link>
        </div>
        {recentPayments.length > 0 ? (
          <ul className="wallet-page__payments">
            {recentPayments.map((tx) => (
              <li key={tx.id} className="wallet-page__payment">
                <span className="wallet-page__payment-icon" aria-hidden="true">
                  <Icon name="send" size={13} />
                </span>
                <div className="wallet-page__payment-main">
                  <span className="text-sm text-primary font-medium">{tx.sellerName}</span>
                  <span className="mono text-xs text-muted">{truncateHash(tx.txHash, 10)}</span>
                </div>
                <div className="wallet-page__payment-meta">
                  <StatusBadge status={tx.status} />
                  <span className="mono text-xs text-muted">{timeAgo(tx.timestamp)}</span>
                  <span className="mono text-sm text-green font-semibold">−{tx.priceAlgo.toFixed(4)} ALGO</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <div className="empty-state__icon">
              <Icon name="wallet" size={18} />
            </div>
            <p className="empty-state__title">No payments yet</p>
            <p className="empty-state__body">
              When agents pay for services, the settlements will appear here.
            </p>
            <Link to="/developer/playground" className="btn btn-sm btn-primary mt-2">
              Run a payment
            </Link>
          </div>
        )}
      </section>

      {/* Security note */}
      <div className="wallet-page__security">
        <Icon name="shield" size={14} />
        <div>
          <span className="text-sm text-primary font-medium">Payment identity is separate from your account</span>
          <p className="text-xs text-muted mt-1">
            Your wallet signs transactions on-chain. Manage workspace, theme and notifications in{' '}
            <Link to="/settings" className="text-green hover:underline">Settings</Link>.
          </p>
        </div>
      </div>

      <TopUpModal
        isOpen={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        onTopUp={topUp}
      />
    </div>
  );
}

// ─── Top Up modal ────────────────────────────────────────────────────────────

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTopUp: (amount: number, method: FundingMethod) => Promise<FundingEntry>;
}

const AMOUNT_PRESETS = [5, 10, 25, 50];

function TopUpModal({ isOpen, onClose, onTopUp }: TopUpModalProps) {
  const [phase, setPhase] = useState<'form' | 'confirming' | 'success'>('form');
  const [amount, setAmount] = useState<number>(AMOUNT_PRESETS[1]);
  const [customAmount, setCustomAmount] = useState('');
  const [method, setMethod] = useState<FundingMethod>('faucet');
  const [step, setStep] = useState(0);
  const [txHash, setTxHash] = useState<string | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Reset + focus when the modal opens.
  useEffect(() => {
    if (isOpen) {
      setPhase('form');
      setAmount(AMOUNT_PRESETS[1]);
      setCustomAmount('');
      setMethod('faucet');
      setStep(0);
      setTxHash(null);
      const t = window.setTimeout(() => confirmRef.current?.focus(), 60);
      return () => window.clearTimeout(t);
    }
  }, [isOpen]);

  // Advance the confirm step labels while a top-up is confirming.
  useEffect(() => {
    if (phase !== 'confirming') return;
    const t = window.setInterval(() => setStep((s) => Math.min(s + 1, CONFIRM_STEPS.length - 1)), TOPUP_CONFIRM_MS / CONFIRM_STEPS.length);
    return () => window.clearInterval(t);
  }, [phase]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const effectiveAmount = customAmount !== '' ? Math.max(0, parseFloat(customAmount) || 0) : amount;

  const handleConfirm = async () => {
    if (effectiveAmount <= 0) return;
    setPhase('confirming');
    setStep(0);
    try {
      const entry = await onTopUp(effectiveAmount, method);
      setTxHash(entry.txHash ?? null);
      setPhase('success');
    } catch {
      // topUp never rejects, but stay safe.
      onClose();
    }
  };

  return (
    <div className="cmd-overlay animate-fade-in" onClick={onClose}>
      <div
        className="topup-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="topup-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <h3 id="topup-title" className="text-lg font-bold text-primary flex items-center gap-2">
            <Icon name="wallet" size={16} className="text-green" /> Top Up Wallet
          </h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <Icon name="x" size={14} />
          </button>
        </div>

        {phase === 'form' && (
          <div className="flex flex-col gap-4 text-sm">
            <div>
              <span className="meta-label">AMOUNT (ALGO)</span>
              <div className="topup-modal__amounts mt-2">
                {AMOUNT_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`topup-chip mono ${customAmount === '' && amount === p ? 'topup-chip--active' : ''}`}
                    onClick={() => {
                      setAmount(p);
                      setCustomAmount('');
                    }}
                    aria-pressed={customAmount === '' && amount === p}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-muted">Custom</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className="input input-mono text-xs topup-modal__custom"
                  placeholder="e.g. 7.5"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  aria-label="Custom top-up amount"
                />
                <span className="text-xs text-muted mono">ALGO</span>
              </div>
            </div>

            <div>
              <span className="meta-label">FUNDING METHOD</span>
              <div className="flex flex-col gap-2 mt-2">
                {(
                  [
                    ['faucet', 'Testnet Faucet', 'Simulated claim from the Algorand Testnet dispenser', 'zap'],
                    ['transfer', 'Peer Transfer', 'Transfer from another wallet address', 'send'],
                    ['card', 'Card Top-Up', 'Simulated card purchase of Testnet ALGO', 'dollar'],
                  ] as [FundingMethod, string, string, IconName][]
                ).map(([m, label, sub, icon]) => (
                  <button
                    key={m}
                    type="button"
                    className={`topup-method ${method === m ? 'topup-method--active' : ''}`}
                    onClick={() => setMethod(m)}
                    aria-pressed={method === m}
                  >
                    <span className="topup-method__icon" aria-hidden="true">
                      <Icon name={icon} size={14} />
                    </span>
                    <span className="topup-method__copy">
                      <span className="text-sm text-primary font-medium">{label}</span>
                      <span className="text-xs text-muted">{sub}</span>
                    </span>
                    <span className={`status-dot ${method === m ? 'done' : 'pending'}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted">
              <Icon name="shield" size={13} className="text-green" />
              Testnet funds only — no real-world value. Never send Mainnet ALGO here.
            </div>

            <button
              ref={confirmRef}
              type="button"
              className="btn btn-primary justify-center w-full"
              onClick={handleConfirm}
              disabled={effectiveAmount <= 0}
            >
              <Icon name="send" size={13} />
              Sign &amp; Send {effectiveAmount.toFixed(2)} ALGO
            </button>
          </div>
        )}

        {phase === 'confirming' && (
          <div className="topup-modal__confirming">
            <div className="topup-modal__confirming-amount mono">
              +{effectiveAmount.toFixed(4)} <span className="text-muted">ALGO</span>
            </div>
            <ul className="topup-modal__steps">
              {CONFIRM_STEPS.map((label, i) => (
                <li key={label} className={i < step ? 'done' : i === step ? 'active' : ''}>
                  <span className="topup-modal__step-icon" aria-hidden="true">
                    {i < step ? <Icon name="check" size={11} strokeWidth={2.4} /> : <Icon name="dot" size={10} />}
                  </span>
                  <span>{label}</span>
                </li>
              ))}
            </ul>
            <div className="topup-modal__bar" aria-hidden="true">
              <div className="topup-modal__bar-fill" style={{ width: `${((step + 1) / CONFIRM_STEPS.length) * 100}%` }} />
            </div>
          </div>
        )}

        {phase === 'success' && (
          <div className="topup-modal__success animate-fade-scale">
            <span className="topup-modal__success-icon" aria-hidden="true">
              <Icon name="check" size={20} strokeWidth={2.2} />
            </span>
            <div className="mono text-2xl text-green font-bold">
              +{effectiveAmount.toFixed(4)} ALGO
            </div>
            <p className="text-sm text-primary font-medium">Funds confirmed on Algorand Testnet</p>
            {txHash && <span className="mono text-xs text-muted">{truncateHash(txHash, 12)}</span>}
            <p className="text-xs text-muted">Your balance updated. New top-ups are logged in Funding History.</p>
            <button type="button" className="btn btn-primary w-full justify-center mt-3" onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
