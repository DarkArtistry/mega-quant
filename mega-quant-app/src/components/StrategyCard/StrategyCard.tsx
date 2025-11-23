import React from 'react';
import { ChainStats } from '../../types/strategy';
import { MultiChainBadgeList } from '../MultiChainBadgeList/MultiChainBadgeList';
import './StrategyCard.css';

export interface StrategyCardProps {
  name: string;
  status: 'running' | 'stopped' | 'error' | 'paused';
  profit: number;
  runtime: string;
  tradesExecuted: number;
  chain?: string; // Deprecated: use chains instead
  chains?: ChainStats[]; // Multi-chain support
  onStart?: () => void;
  onStop?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onChainClick?: (chainId: number) => void;
}

export const StrategyCard: React.FC<StrategyCardProps> = ({
  name,
  status,
  profit,
  runtime,
  tradesExecuted,
  chain,
  chains,
  onStart,
  onStop,
  onDelete,
  onEdit,
  onChainClick,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'running': return '#4ade80';
      case 'stopped': return '#94a3b8';
      case 'error': return '#f87171';
      case 'paused': return '#fbbf24';
      default: return '#94a3b8';
    }
  };

  const formatProfit = (value: number) => {
    const prefix = value >= 0 ? '+' : '';
    return `${prefix}$${value.toFixed(2)}`;
  };

  return (
    <div className="strategy-card">
      <div className="strategy-header">
        <h3 className="strategy-name">{name}</h3>
        <div
          className="strategy-status"
          style={{ backgroundColor: getStatusColor() }}
        >
          {status}
        </div>
      </div>

      <div className="strategy-metrics">
        <div className="metric">
          <span className="metric-label">P&L</span>
          <span className={`metric-value ${profit >= 0 ? 'positive' : 'negative'}`}>
            {formatProfit(profit)}
          </span>
        </div>
        <div className="metric">
          <span className="metric-label">Runtime</span>
          <span className="metric-value">{runtime}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Trades</span>
          <span className="metric-value">{tradesExecuted}</span>
        </div>
        <div className="metric metric-chains">
          <span className="metric-label">Chains</span>
          <div className="metric-value">
            {chains && chains.length > 0 ? (
              <MultiChainBadgeList
                chains={chains}
                compact={true}
                maxVisible={3}
                onChainClick={onChainClick}
              />
            ) : (
              <span>{chain || 'No chains'}</span>
            )}
          </div>
        </div>
      </div>

      <div className="strategy-actions">
        {status === 'stopped' ? (
          <button className="action-btn start-btn" onClick={onStart}>
            Start
          </button>
        ) : (
          <button className="action-btn stop-btn" onClick={onStop}>
            Stop
          </button>
        )}
        {onEdit && (
          <button className="action-btn edit-btn" onClick={onEdit}>
            Edit
          </button>
        )}
        <button className="action-btn delete-btn" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
};