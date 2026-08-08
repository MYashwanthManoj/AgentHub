/**
 * StatusPill — color-coded pill for arbitrary status values.
 *
 * Known statuses map onto the design-system tones (green / amber / red /
 * neutral pending); unknown values fall back to the neutral tone unless an
 * explicit `tone` is provided.
 */

import './StatusPill.css';

export type PillTone = 'green' | 'amber' | 'red' | 'pending';

export interface StatusPillProps {
  /** Raw status value used to infer the tone. */
  status: string;
  /** Override the rendered text. Defaults to the status value. */
  label?: string;
  /** Explicit tone; overrides inference. Defaults to 'auto'. */
  tone?: PillTone | 'auto';
  /** Show the status dot. Defaults to true. */
  showDot?: boolean;
  /** Extra classes appended to the pill root (e.g. animation modifiers). */
  className?: string;
}

const TONE_BY_STATUS: Record<string, PillTone> = {
  // Success
  confirmed: 'green', done: 'green', success: 'green', complete: 'green',
  completed: 'green', paid: 'green', operational: 'green', healthy: 'green',
  online: 'green', live: 'green', ready: 'green',
  // In progress
  active: 'amber', running: 'amber', in_progress: 'amber', processing: 'amber',
  // Waiting / neutral
  pending: 'pending', queued: 'pending', idle: 'pending', waiting: 'pending',
  // Failure
  failed: 'red', error: 'red', rejected: 'red', cancelled: 'red', canceled: 'red',
  offline: 'red', down: 'red',
};

export function StatusPill({
  status,
  label,
  tone = 'auto',
  showDot = true,
  className,
}: StatusPillProps) {
  const resolvedTone: PillTone =
    tone !== 'auto' ? tone : TONE_BY_STATUS[status.toLowerCase()] ?? 'pending';

  return (
    <span className={`status-pill status-pill--${resolvedTone}${className ? ` ${className}` : ''}`}>
      {showDot && (
        <span
          className={`status-pill__dot status-pill__dot--${resolvedTone}`}
          aria-hidden="true"
        />
      )}
      <span className="status-pill__value">{label ?? status}</span>
    </span>
  );
}
