/**
 * SellerCard — displays a single seller agent in the marketplace grid.
 * Completely stateless / presentational.
 */

import type { SellerAgent } from '../../types';
import { formatReputation } from '../../utils/format';
import { Icon } from '../Icon/Icon';
import './SellerCard.css';

interface SellerCardProps {
  agent: SellerAgent;
  isSelected?: boolean;
  isDisabled?: boolean;
  onSelect?: (agent: SellerAgent) => void;
  /** How many times this agent was used in the ledger. */
  usageCount?: number;
}

export function SellerCard({ agent, isSelected, isDisabled, onSelect, usageCount }: SellerCardProps) {

  return (
    <article
      className={`seller-card ${isSelected ? 'seller-card--selected' : ''} ${isDisabled ? 'seller-card--disabled' : ''}`}
      onClick={() => !isDisabled && onSelect?.(agent)}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-pressed={isSelected}
      aria-label={`Select ${agent.name}`}
      id={`seller-card-${agent.id}`}
      onKeyDown={(e) => e.key === 'Enter' && !isDisabled && onSelect?.(agent)}
    >
      {/* Header row */}
      <div className="seller-card__header flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <div className="seller-card__icon" aria-hidden="true">
            <Icon name="bot" size={15} />
          </div>
          <div className="seller-card__title-group min-w-0">
            <h3 className="seller-card__name font-bold text-primary">{agent.name}</h3>
            <span className="badge badge-muted seller-card__category text-xs">{agent.category}</span>
          </div>
        </div>
        {isSelected && (
          <span className="badge badge-green seller-card__selected-badge flex-shrink-0">SELECTED</span>
        )}
      </div>

      {/* Description */}
      <p className="seller-card__desc text-xs text-secondary">{agent.description}</p>

      {/* Footer: Price + Credit Score Stacked Rows (Guarantees 0 Overlap) */}
      <div className="seller-card__footer flex flex-col gap-2 pt-3 border-t border-subtle">
        <div className="flex items-center justify-between">
          <div className="seller-card__price flex items-baseline gap-1">
            <span className="seller-card__price-value mono text-green font-bold">{agent.priceAlgo}</span>
            <span className="seller-card__price-unit text-xs text-muted">ALGO / call</span>
          </div>

          {(usageCount ?? 0) > 0 && (
            <span className="badge badge-muted text-xs">
              {usageCount}× USED
            </span>
          )}
        </div>

        {/* Credit Score Bar */}
        <div 
          className="seller-card__rep surface-elevated px-2 py-1 rounded flex items-center justify-between text-xs"
          title={`Agent CIBIL/Credit Score: ${agent.reputation}/100 • Uptime: 99.9% • On-chain Settlement: 100%`}
        >
          <span className="text-muted text-xs font-mono">CREDIT SCORE</span>
          <span className="seller-card__rep-value text-green font-bold mono">
            {formatReputation(agent.reputation)}
          </span>
        </div>
      </div>

      {/* Endpoint */}
      <div className="seller-card__endpoint mt-1">
        <span className="seller-card__endpoint-label text-xs text-muted block">ENDPOINT</span>
        <span className="seller-card__endpoint-url mono text-xs text-muted truncate block">{agent.endpoint}</span>
      </div>
    </article>
  );
}
