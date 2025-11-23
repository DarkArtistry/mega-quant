import React from 'react';
import { SUPPORTED_NETWORKS } from '../../config/networks';
import './ChainBadge.css';

export interface ChainBadgeProps {
  chainId: number;
  isActive?: boolean;
  showStats?: boolean;
  tradeCount?: number;
  profit?: number;
  compact?: boolean;
  onClick?: () => void;
}

export const ChainBadge: React.FC<ChainBadgeProps> = ({
  chainId,
  isActive = false,
  showStats = false,
  tradeCount = 0,
  profit = 0,
  compact = false,
  onClick,
}) => {
  const network = SUPPORTED_NETWORKS.find((n) => n.id === chainId);

  if (!network) {
    return (
      <div className={`chain-badge chain-badge--unknown ${compact ? 'chain-badge--compact' : ''}`}>
        <span className="chain-badge__icon">?</span>
        <span className="chain-badge__name">Unknown</span>
      </div>
    );
  }

  const statusClass = isActive ? 'chain-badge--active' : 'chain-badge--inactive';
  const clickableClass = onClick ? 'chain-badge--clickable' : '';
  const compactClass = compact ? 'chain-badge--compact' : '';

  const formatProfit = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}$${value.toFixed(2)}`;
  };

  return (
    <div
      className={`chain-badge ${statusClass} ${clickableClass} ${compactClass}`}
      onClick={onClick}
      style={{
        '--chain-color': network.color,
      } as React.CSSProperties}
    >
      {/* Status indicator */}
      <div className="chain-badge__status-dot" />

      {/* Chain logo/icon */}
      <div className="chain-badge__icon-wrapper">
        {network.logoUrl ? (
          <img
            src={network.logoUrl}
            alt={network.displayName}
            className="chain-badge__logo"
          />
        ) : (
          <span className="chain-badge__icon">{network.icon}</span>
        )}
      </div>

      {/* Chain name */}
      {!compact && (
        <span className="chain-badge__name">{network.displayName}</span>
      )}

      {/* Optional stats */}
      {showStats && !compact && (
        <div className="chain-badge__stats">
          <div className="chain-badge__stat">
            <span className="chain-badge__stat-label">Trades:</span>
            <span className="chain-badge__stat-value">{tradeCount}</span>
          </div>
          <div className="chain-badge__stat">
            <span className="chain-badge__stat-label">P&L:</span>
            <span
              className={`chain-badge__stat-value chain-badge__stat-value--${
                profit >= 0 ? 'positive' : 'negative'
              }`}
            >
              {formatProfit(profit)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
