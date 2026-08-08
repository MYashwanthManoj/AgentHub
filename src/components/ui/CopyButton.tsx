/**
 * CopyButton — copies text to the clipboard with visual feedback.
 * Used for wallet addresses, API keys, and webhook endpoints.
 */

import { useState } from 'react';
import { Icon } from '../Icon/Icon';
import './CopyButton.css';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export function CopyButton({ text, label = 'Copy', className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for non-secure contexts
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      className={`copy-btn ${copied ? 'copy-btn--copied' : ''} ${className}`}
      onClick={handleCopy}
      aria-label={copied ? 'Copied' : `Copy ${label}`}
      title={copied ? 'Copied' : label}
    >
      <Icon name={copied ? 'check' : 'copy'} size={13} strokeWidth={1.8} />
      <span>{copied ? 'Copied' : label}</span>
    </button>
  );
}

export default CopyButton;
