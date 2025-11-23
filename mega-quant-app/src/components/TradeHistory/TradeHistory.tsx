import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TradeHistory.css';

export interface Trade {
  id: number;
  execution_id: string;
  strategy_id: string;
  wallet_address: string;
  timestamp: string;
  chain_id: number;
  protocol: string;
  tx_hash: string;
  block_number: number;
  token_in_symbol: string;
  token_in_amount: string;
  token_out_symbol: string;
  token_out_amount: string;
  value_in_usd: number | null;
  value_out_usd: number | null;
  profit_loss_usd: number | null;
  gas_used: number;
  gas_cost_usd: number | null;
  status: string;
}

export interface PNLData {
  strategy_id: string;
  total_trades: number;
  total_value_in: number;
  total_value_out: number;
  gross_pnl: number;
  total_gas_cost: number;
  net_pnl: number;
}

export interface TradeHistoryProps {
  strategyId: string;
  executionId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

export const TradeHistory: React.FC<TradeHistoryProps> = ({
  strategyId,
  executionId,
  autoRefresh = true,
  refreshInterval = 5000,
}) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [pnl, setPnl] = useState<PNLData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPNL = async () => {
    try {
      const params = executionId ? { executionId } : {};
      const response = await axios.get(`http://localhost:3001/api/trades/pnl/${strategyId}`, { params });

      if (response.data.success) {
        setPnl(response.data.pnl);
      }
    } catch (err: any) {
      console.error('Failed to fetch PNL:', err);
    }
  };

  const fetchTrades = async () => {
    try {
      const params: any = { strategy_id: strategyId, limit: 100 };
      if (executionId) {
        params.execution_id = executionId;
      }

      const response = await axios.get('http://localhost:3001/api/trades', { params });

      if (response.data.success) {
        setTrades(response.data.trades);
        setError(null);
      }
    } catch (err: any) {
      console.error('Failed to fetch trades:', err);
      setError(err.message || 'Failed to load trades');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    await Promise.all([fetchPNL(), fetchTrades()]);
  };

  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [strategyId, executionId, autoRefresh, refreshInterval]);

  const formatUSD = (value: number | null): string => {
    if (value === null) return 'N/A';
    const sign = value >= 0 ? '+' : '';
    return `${sign}$${value.toFixed(2)}`;
  };

  const formatNumber = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return value.toString();
    return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
  };

  const getChainName = (chainId: number): string => {
    const chains: Record<number, string> = {
      1: 'Ethereum',
      8453: 'Base',
      11155111: 'Sepolia',
      84532: 'Base Sepolia',
    };
    return chains[chainId] || `Chain ${chainId}`;
  };

  const getExplorerUrl = (chainId: number, txHash: string): string => {
    const explorers: Record<number, string> = {
      1: 'https://etherscan.io',
      8453: 'https://basescan.org',
      11155111: 'https://sepolia.etherscan.io',
      84532: 'https://sepolia.basescan.org',
    };
    const baseUrl = explorers[chainId] || 'https://etherscan.io';
    return `${baseUrl}/tx/${txHash}`;
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (loading && trades.length === 0) {
    return (
      <div className="trade-history">
        <div className="trade-history__loading">Loading trade history...</div>
      </div>
    );
  }

  return (
    <div className="trade-history">
      {/* PNL Summary */}
      {pnl && (
        <div className="trade-history__pnl">
          <h3 className="trade-history__pnl-title">Performance Summary</h3>
          <div className="trade-history__pnl-grid">
            <div className="trade-history__pnl-item">
              <span className="trade-history__pnl-label">Total Trades</span>
              <span className="trade-history__pnl-value">{pnl.total_trades}</span>
            </div>
            <div className="trade-history__pnl-item">
              <span className="trade-history__pnl-label">Volume In</span>
              <span className="trade-history__pnl-value">${pnl.total_value_in.toFixed(2)}</span>
            </div>
            <div className="trade-history__pnl-item">
              <span className="trade-history__pnl-label">Volume Out</span>
              <span className="trade-history__pnl-value">${pnl.total_value_out.toFixed(2)}</span>
            </div>
            <div className="trade-history__pnl-item">
              <span className="trade-history__pnl-label">Gross P&L</span>
              <span className={`trade-history__pnl-value ${pnl.gross_pnl >= 0 ? 'positive' : 'negative'}`}>
                {formatUSD(pnl.gross_pnl)}
              </span>
            </div>
            <div className="trade-history__pnl-item">
              <span className="trade-history__pnl-label">Gas Costs</span>
              <span className="trade-history__pnl-value negative">-${pnl.total_gas_cost.toFixed(2)}</span>
            </div>
            <div className="trade-history__pnl-item trade-history__pnl-item--highlight">
              <span className="trade-history__pnl-label">Net P&L</span>
              <span className={`trade-history__pnl-value trade-history__pnl-value--large ${pnl.net_pnl >= 0 ? 'positive' : 'negative'}`}>
                {formatUSD(pnl.net_pnl)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Trade History Table */}
      <div className="trade-history__table-container">
        <h3 className="trade-history__table-title">Trade History</h3>

        {error && (
          <div className="trade-history__error">{error}</div>
        )}

        {trades.length === 0 && !error && (
          <div className="trade-history__empty">
            No trades yet. Deploy and run your strategy to see trade history here.
          </div>
        )}

        {trades.length > 0 && (
          <table className="trade-history__table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Chain</th>
                <th>Protocol</th>
                <th>From</th>
                <th>To</th>
                <th>P&L</th>
                <th>Gas</th>
                <th>Tx</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id} className={`trade-history__row trade-history__row--${trade.status}`}>
                  <td className="trade-history__cell--time">
                    {formatTimestamp(trade.timestamp)}
                  </td>
                  <td className="trade-history__cell--chain">
                    {getChainName(trade.chain_id)}
                  </td>
                  <td className="trade-history__cell--protocol">
                    {trade.protocol}
                  </td>
                  <td className="trade-history__cell--token-in">
                    <div className="trade-history__token">
                      <span className="trade-history__token-amount">{formatNumber(trade.token_in_amount)}</span>
                      <span className="trade-history__token-symbol">{trade.token_in_symbol}</span>
                    </div>
                  </td>
                  <td className="trade-history__cell--token-out">
                    <div className="trade-history__token">
                      <span className="trade-history__token-amount">{formatNumber(trade.token_out_amount)}</span>
                      <span className="trade-history__token-symbol">{trade.token_out_symbol}</span>
                    </div>
                  </td>
                  <td className={`trade-history__cell--pnl ${trade.profit_loss_usd !== null && trade.profit_loss_usd >= 0 ? 'positive' : 'negative'}`}>
                    {formatUSD(trade.profit_loss_usd)}
                  </td>
                  <td className="trade-history__cell--gas">
                    {trade.gas_cost_usd !== null ? `$${trade.gas_cost_usd.toFixed(4)}` : 'N/A'}
                  </td>
                  <td className="trade-history__cell--tx">
                    <a
                      href={getExplorerUrl(trade.chain_id, trade.tx_hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="trade-history__tx-link"
                    >
                      {trade.tx_hash.substring(0, 8)}...
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
