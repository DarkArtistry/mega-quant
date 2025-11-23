import React, { useState } from 'react';
import { IoFlash, IoRocket } from 'react-icons/io5';
import { Strategy } from '../../types/strategy';
import { StrategyCard } from '../StrategyCard/StrategyCard';
import './ActiveStrategiesContainer.css';

export interface ActiveStrategiesContainerProps {
  strategies?: Strategy[];
  onDeployStrategy?: () => void;
  onStartStrategy?: (strategyId: string) => void;
  onStopStrategy?: (strategyId: string) => void;
  onEditStrategy?: (strategyId: string) => void;
  onDeleteStrategy?: (strategyId: string) => void;
  onViewStrategy?: (strategyId: string) => void;
}

export const ActiveStrategiesContainer: React.FC<ActiveStrategiesContainerProps> = ({
  strategies = [],
  onDeployStrategy,
  onStartStrategy,
  onStopStrategy,
  onEditStrategy,
  onDeleteStrategy,
  onViewStrategy,
}) => {
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);

  // Helper to format runtime from milliseconds to human-readable format
  const formatRuntime = (ms: number): string => {
    if (ms === 0) return '0m';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  };

  // Get primary chain for single-chain display (for now)
  const getPrimaryChain = (strategy: Strategy): string => {
    const chainIds = Object.keys(strategy.chains);
    if (chainIds.length === 0) return 'No chains';
    if (chainIds.length === 1) {
      const chainId = Number(chainIds[0]);
      return getChainName(chainId);
    }
    return `${chainIds.length} chains`;
  };

  // Simple chain name mapper (will use network config later)
  const getChainName = (chainId: number): string => {
    const chainNames: { [key: number]: string } = {
      1: 'Ethereum',
      10: 'Optimism',
      56: 'BSC',
      137: 'Polygon',
      8453: 'Base',
      42161: 'Arbitrum',
      43114: 'Avalanche',
      1301: 'Unichain',
      59144: 'Linea',
      324: 'zkSync',
      998: 'HyperEVM',
    };
    return chainNames[chainId] || `Chain ${chainId}`;
  };

  const handleStrategyClick = (strategyId: string) => {
    if (onViewStrategy) {
      onViewStrategy(strategyId);
    } else {
      // Toggle expanded state for detail view
      setExpandedStrategy(expandedStrategy === strategyId ? null : strategyId);
    }
  };

  return (
    <div className="active-strategies-container">
      {/* Header */}
      <div className="strategies-header">
        <div className="strategies-title">
          <span className="title-icon"><IoFlash /></span>
          <span className="title-text">Active Strategies</span>
          <span className="title-count">({strategies.length})</span>
        </div>
        <div className="header-controls">
          <button
            className="deploy-strategy-btn"
            onClick={onDeployStrategy}
            title="Deploy New Strategy"
          >
            <span className="btn-icon">+</span>
            <span className="btn-text">Deploy Strategy</span>
          </button>
        </div>
      </div>

      {/* Strategies Content */}
      <div className="strategies-content">
        {strategies.length === 0 ? (
          // Empty State
          <div className="empty-state">
            <div className="empty-icon"><IoRocket /></div>
            <h3 className="empty-title">No Active Strategies</h3>
            <p className="empty-description">
              Deploy your first trading strategy to start automating your trades across multiple blockchains.
            </p>
            <button className="empty-cta-btn" onClick={onDeployStrategy}>
              <span className="btn-icon">+</span>
              <span className="btn-text">Deploy Your First Strategy</span>
            </button>
          </div>
        ) : (
          // Strategy Cards Grid
          <div className="strategies-grid">
            {strategies.map((strategy) => (
              <div
                key={strategy.id}
                className="strategy-card-wrapper"
                onClick={() => handleStrategyClick(strategy.id)}
              >
                <StrategyCard
                  name={strategy.name}
                  status={strategy.status as 'running' | 'stopped' | 'error' | 'paused'}
                  profit={strategy.totalProfit}
                  runtime={formatRuntime(strategy.runtime)}
                  tradesExecuted={strategy.totalTrades}
                  chain={getPrimaryChain(strategy)}
                  onStart={() => {
                    onStartStrategy?.(strategy.id);
                  }}
                  onStop={() => {
                    onStopStrategy?.(strategy.id);
                  }}
                  onEdit={() => {
                    onEditStrategy?.(strategy.id);
                  }}
                  onDelete={() => {
                    onDeleteStrategy?.(strategy.id);
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
