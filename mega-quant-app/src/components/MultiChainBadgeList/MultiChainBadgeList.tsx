import React from 'react';
import { ChainBadge } from '../ChainBadge/ChainBadge';
import { ChainStats } from '../../types/strategy';
import './MultiChainBadgeList.css';

export interface MultiChainBadgeListProps {
  chains: ChainStats[];
  compact?: boolean;
  showStats?: boolean;
  maxVisible?: number;
  onChainClick?: (chainId: number) => void;
}

export const MultiChainBadgeList: React.FC<MultiChainBadgeListProps> = ({
  chains,
  compact = false,
  showStats = false,
  maxVisible,
  onChainClick,
}) => {
  const visibleChains = maxVisible ? chains.slice(0, maxVisible) : chains;
  const remainingCount = maxVisible && chains.length > maxVisible
    ? chains.length - maxVisible
    : 0;

  if (chains.length === 0) {
    return (
      <div className="multi-chain-badge-list multi-chain-badge-list--empty">
        <span className="multi-chain-badge-list__empty-text">
          No chains configured
        </span>
      </div>
    );
  }

  return (
    <div className={`multi-chain-badge-list ${compact ? 'multi-chain-badge-list--compact' : ''}`}>
      <div className="multi-chain-badge-list__badges">
        {visibleChains.map((chain) => (
          <ChainBadge
            key={chain.chainId}
            chainId={chain.chainId}
            isActive={chain.isActive}
            showStats={showStats}
            tradeCount={chain.trades}
            profit={chain.profit}
            compact={compact}
            onClick={onChainClick ? () => onChainClick(chain.chainId) : undefined}
          />
        ))}

        {remainingCount > 0 && (
          <div className="multi-chain-badge-list__overflow">
            <span className="multi-chain-badge-list__overflow-text">
              +{remainingCount} more
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
