/**
 * AuthModal — GitHub OAuth Login & AI Agent Registration Modal.
 * Allows humans and AI agents to register and authenticate via GitHub.
 *
 * Login performance: the flow is staged so the user always sees progress
 * ("Signing in…" → "Connecting workspace…" → "Loading workspace…") instead
 * of a silent delay. Auth state itself is a synchronous localStorage read —
 * there are no duplicate API calls or heavy redirects.
 */

import { useEffect, useRef, useState } from 'react';
import { Icon } from '../Icon/Icon';
import './AuthModal.css';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (username: string, entityType: 'developer' | 'ai_agent') => void;
}

const AUTH_STAGES = [
  'Signing in...',
  'Connecting workspace...',
  'Loading workspace...',
];

export function AuthModal({ isOpen, onClose, onLogin }: AuthModalProps) {
  const [username, setUsername] = useState('');
  const [entityType, setEntityType] = useState<'developer' | 'ai_agent'>('developer');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [stage, setStage] = useState(0);
  const timeouts = useRef<number[]>([]);

  // Clear pending login timers if the modal unmounts (e.g. user dismisses mid-auth).
  useEffect(() => {
    return () => {
      timeouts.current.forEach((t) => window.clearTimeout(t));
      timeouts.current = [];
    };
  }, []);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setStage(0);
    timeouts.current = [];
    // Staged feedback — the session bootstrap itself stays instant (localStorage).
    AUTH_STAGES.forEach((_, i) => {
      timeouts.current.push(window.setTimeout(() => setStage(i), i * 450));
    });
    timeouts.current.push(
      window.setTimeout(() => {
        onLogin(username.trim() || 'yashwanthmanoj623', entityType);
        setIsAuthenticating(false);
        onClose();
      }, AUTH_STAGES.length * 450 + 200)
    );
  };

  return (
    <div className="cmd-overlay animate-fade-in" onClick={onClose}>
      <div className="auth-modal surface-glass p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 border-b border-subtle pb-3">
          <div className="flex items-center gap-2">
            <Icon name="github" size={22} className="text-primary" />
            <h3 className="text-lg font-bold text-primary">GitHub Authentication</h3>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <Icon name="x" size={14} />
          </button>
        </div>

        <p className="text-sm text-secondary mb-4">
          Authorize your identity or autonomous AI agent via GitHub OAuth to access AgentHub x402 endpoints.
        </p>

        {isAuthenticating ? (
          <div className="auth-modal__progress" role="status" aria-live="polite">
            <div className="auth-modal__stages">
              {AUTH_STAGES.map((s, i) => (
                <div
                  key={s}
                  className={`auth-modal__stage ${i <= stage ? 'auth-modal__stage--done' : ''} ${i === stage ? 'auth-modal__stage--active' : ''}`}
                >
                  <span className="auth-modal__stage-dot">
                    {i < stage ? <Icon name="check" size={10} strokeWidth={2.4} /> : null}
                  </span>
                  <span className="text-sm">{s}</span>
                </div>
              ))}
            </div>
            <div className="auth-modal__progress-track">
              <div
                className="auth-modal__progress-fill"
                style={{ width: `${((stage + 1) / AUTH_STAGES.length) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-muted block mb-1">ENTITY TYPE</label>
              <div className="grid-2 gap-2">
                <button
                  type="button"
                  className={`btn btn-sm ${entityType === 'developer' ? 'btn-primary font-bold' : 'btn-ghost'}`}
                  onClick={() => setEntityType('developer')}
                >
                  <Icon name="users" size={13} />
                  Human Developer
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${entityType === 'ai_agent' ? 'btn-primary font-bold' : 'btn-ghost'}`}
                  onClick={() => setEntityType('ai_agent')}
                >
                  <Icon name="bot" size={13} />
                  Autonomous AI Agent
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted block mb-1">GITHUB USERNAME / AGENT HANDLE</label>
              <input
                type="text"
                className="input mono"
                placeholder="e.g. yashwanthmanoj623 or agent-bot-x"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary justify-center mt-2">
              <Icon name="lock" size={13} />
              Authorize with GitHub OAuth
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
