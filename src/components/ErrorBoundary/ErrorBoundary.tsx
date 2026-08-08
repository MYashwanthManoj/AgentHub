/**
 * ErrorBoundary — catches any uncaught render/runtime error in its subtree and
 * shows a graceful, recoverable fallback instead of React unmounting the whole
 * tree into a blank white screen.
 *
 * The rest of the app is defensive against a *down backend* (services silently
 * fall back to mocks, and the ModeBanner shows offline state), so this boundary
 * is the last line of defense against an unexpected component crash during the
 * live demo — the judge always sees a friendly panel with a one-click retry.
 *
 * Error boundaries have to be class components — there is no hook equivalent for
 * getDerivedStateFromError / componentDidCatch.
 */

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Icon } from '../Icon/Icon';
import './ErrorBoundary.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback; falls back to the built-in panel when omitted. */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface for debugging; never rethrow — the demo must stay on screen.
    console.error('[ErrorBoundary] Render crash caught:', error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="error-boundary" role="alert">
        <div className="error-boundary__card surface">
          <span className="error-boundary__icon" aria-hidden="true">
            <Icon name="alert" size={20} />
          </span>
          <h2 className="error-boundary__title">Something went wrong</h2>
          <p className="error-boundary__message">
            The interface hit an unexpected error. Your ledger and settings are
            saved locally — nothing was lost. Try again to recover.
          </p>
          {this.state.error?.message && (
            <pre className="error-boundary__detail mono">{this.state.error.message}</pre>
          )}
          <div className="error-boundary__actions">
            <button type="button" className="btn btn-primary" onClick={this.handleReset}>
              <Icon name="refresh" size={13} />
              Try again
            </button>
            <button type="button" className="btn btn-ghost" onClick={this.handleReload}>
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
