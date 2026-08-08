/**
 * StatusBadge — semantic status pill for payments & transactions.
 * Never relies on color alone: each state carries an icon + label.
 */

import { Icon } from '../Icon/Icon';
import './StatusBadge.css';

type Status = 'confirmed' | 'success' | 'pending' | 'active' | 'failed' | 'error' | 'revoked' | 'inactive' | 'verified';

interface StatusBadgeProps {
  status: Status | string;
  label?: string;
}

const CONFIG: Record<string, { tone: string; icon: 'check' | 'clock' | 'x' | 'shield' | 'dot'; label: string }> = {
  confirmed: { tone: 'green', icon: 'check', label: 'Confirmed' },
  success: { tone: 'green', icon: 'check', label: 'Success' },
  verified: { tone: 'green', icon: 'shield', label: 'Verified' },
  active: { tone: 'green', icon: 'dot', label: 'Active' },
  pending: { tone: 'amber', icon: 'clock', label: 'Pending' },
  failed: { tone: 'red', icon: 'x', label: 'Failed' },
  error: { tone: 'red', icon: 'x', label: 'Error' },
  revoked: { tone: 'red', icon: 'x', label: 'Revoked' },
  inactive: { tone: 'muted', icon: 'dot', label: 'Inactive' },
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const key = status.toLowerCase();
  const cfg = CONFIG[key] ?? { tone: 'muted', icon: 'dot' as const, label: status };
  return (
    <span className={`status-badge status-badge--${cfg.tone}`}>
      <Icon name={cfg.icon} size={11} strokeWidth={2.2} />
      <span className="status-badge__label">{(label ?? cfg.label).toUpperCase()}</span>
    </span>
  );
}

export default StatusBadge;
