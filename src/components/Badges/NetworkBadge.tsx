/**
 * NetworkBadge — compact pill showing the active Algorand network mode.
 *
 * Color-coded per the design system: simulated = amber, testnet = blue,
 * mainnet = green. Includes a small status dot; simulated pulses to signal
 * a live sandbox.
 */

import type { NetworkMode } from '../../types';
import './NetworkBadge.css';

export interface NetworkBadgeProps {
  /** Network mode to display. Defaults to 'simulated'. */
  mode?: NetworkMode;
  /** Override the rendered label. Defaults to a readable mode name. */
  label?: string;
  /** Show the status dot. Defaults to true. */
  showDot?: boolean;
}

const MODE_META: Record<NetworkMode, { label: string; className: string }> = {
  simulated: { label: 'Simulated', className: 'network-badge--simulated' },
  testnet:   { label: 'Testnet',   className: 'network-badge--testnet' },
  mainnet:   { label: 'Mainnet',   className: 'network-badge--mainnet' },
};

export function NetworkBadge({
  mode = 'simulated',
  label,
  showDot = true,
}: NetworkBadgeProps) {
  const meta = MODE_META[mode];

  return (
    <span
      className={`network-badge ${meta.className}`}
      title={`Network: ${meta.label}`}
    >
      {showDot && (
        <span
          className={`network-badge__dot network-badge__dot--${mode}`}
          aria-hidden="true"
        />
      )}
      {label ?? meta.label}
    </span>
  );
}
