import React from 'react';
import './StrategyStatsDisplay.css';

export interface StrategyStatsDisplayProps {
  profit: number;
  tradesExecuted: number;
  runtime: string;
  layout?: 'horizontal' | 'vertical';
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;
}

export const StrategyStatsDisplay: React.FC<StrategyStatsDisplayProps> = ({
  profit,
  tradesExecuted,
  runtime,
  layout = 'horizontal',
  size = 'medium',
  showLabels = true,
}) => {
  const formatProfit = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    const formatted = Math.abs(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${sign}$${formatted}`;
  };

  const getProfitClass = (): string => {
    if (profit > 0) return 'strategy-stats__value--positive';
    if (profit < 0) return 'strategy-stats__value--negative';
    return 'strategy-stats__value--neutral';
  };

  const layoutClass = `strategy-stats--${layout}`;
  const sizeClass = `strategy-stats--${size}`;

  return (
    <div className={`strategy-stats ${layoutClass} ${sizeClass}`}>
      {/* Profit/Loss */}
      <div className="strategy-stats__item">
        {showLabels && (
          <span className="strategy-stats__label">P&L</span>
        )}
        <span className={`strategy-stats__value ${getProfitClass()}`}>
          {formatProfit(profit)}
        </span>
      </div>

      {/* Trades Executed */}
      <div className="strategy-stats__item">
        {showLabels && (
          <span className="strategy-stats__label">Trades</span>
        )}
        <span className="strategy-stats__value">
          {tradesExecuted.toLocaleString()}
        </span>
      </div>

      {/* Runtime */}
      <div className="strategy-stats__item">
        {showLabels && (
          <span className="strategy-stats__label">Runtime</span>
        )}
        <span className="strategy-stats__value strategy-stats__value--runtime">
          {runtime}
        </span>
      </div>
    </div>
  );
};
