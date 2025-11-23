import React, { useState, useEffect } from 'react';
import { SUPPORTED_NETWORKS, Network } from '../../config/networks';
import { SUPPORTED_PROTOCOLS, Protocol, TradingPair, getTradingPairsByNetwork, getProtocolsByNetwork } from '../../config/protocols';
import { CandlestickChart } from '../CandlestickChart/CandlestickChart';
import './TradingPanel.css';

export interface Trade {
  time: string;
  type: 'buy' | 'sell';
  tokenIn: string;
  tokenInAmount: number;
  tokenOut: string;
  tokenOutAmount: number;
  gasPrice: number;
  walletAddress: string;
  txHash: string;
}

export interface MempoolTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasPrice: number;
  timestamp: number;
  type: 'buy' | 'sell' | 'transfer';
}

export interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

export interface TradingPanelProps {
  onRemove?: () => void;
  initialNetwork?: number;
  initialProtocol?: string;
  initialPair?: string;
  forceMinimized?: boolean;
}

export const TradingPanel: React.FC<TradingPanelProps> = ({
  onRemove,
  initialNetwork,
  initialProtocol,
  initialPair,
  forceMinimized = false,
}) => {
  const [selectedNetworkId, setSelectedNetworkId] = useState<number | null>(initialNetwork || null);
  const [selectedProtocolId, setSelectedProtocolId] = useState<string | null>(initialProtocol || null);
  const [selectedPair, setSelectedPair] = useState<string | null>(initialPair || null);
  const [availableProtocols, setAvailableProtocols] = useState<Protocol[]>([]);
  const [availablePairs, setAvailablePairs] = useState<TradingPair[]>([]);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Expand/collapse states for different sections
  const [isTradesExpanded, setIsTradesExpanded] = useState<boolean>(false);
  const [isBidsExpanded, setIsBidsExpanded] = useState<boolean>(false);
  const [isAsksExpanded, setIsAsksExpanded] = useState<boolean>(false);
  const [isMempoolExpanded, setIsMempoolExpanded] = useState<boolean>(false);

  // Mock data for demonstration
  const [swapRatio, setSwapRatio] = useState<number>(2845.67);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([
    {
      time: '14:32:15',
      type: 'buy',
      tokenIn: 'USDC',
      tokenInAmount: 5000,
      tokenOut: 'ETH',
      tokenOutAmount: 1.756,
      gasPrice: 25.3,
      walletAddress: '0x1234...5678',
      txHash: '0xabcd...ef01'
    },
    {
      time: '14:31:42',
      type: 'sell',
      tokenIn: 'ETH',
      tokenInAmount: 0.5,
      tokenOut: 'USDC',
      tokenOutAmount: 1422.84,
      gasPrice: 23.1,
      walletAddress: '0x9876...5432',
      txHash: '0x1234...abcd'
    },
    {
      time: '14:30:18',
      type: 'buy',
      tokenIn: 'USDC',
      tokenInAmount: 10000,
      tokenOut: 'ETH',
      tokenOutAmount: 3.512,
      gasPrice: 28.7,
      walletAddress: '0xabcd...1234',
      txHash: '0x5678...9abc'
    },
    {
      time: '14:29:05',
      type: 'sell',
      tokenIn: 'ETH',
      tokenInAmount: 2.1,
      tokenOut: 'USDC',
      tokenOutAmount: 5975.91,
      gasPrice: 22.4,
      walletAddress: '0xdef0...abcd',
      txHash: '0xfed1...2345'
    },
    {
      time: '14:28:33',
      type: 'buy',
      tokenIn: 'USDC',
      tokenInAmount: 7500,
      tokenOut: 'ETH',
      tokenOutAmount: 2.634,
      gasPrice: 26.8,
      walletAddress: '0x4567...89ef',
      txHash: '0x9abc...def0'
    },
    {
      time: '14:27:51',
      type: 'sell',
      tokenIn: 'ETH',
      tokenInAmount: 1.8,
      tokenOut: 'USDC',
      tokenOutAmount: 5122.21,
      gasPrice: 24.5,
      walletAddress: '0x2345...6789',
      txHash: '0xabcd...ef12'
    },
  ]);

  const [bids, setBids] = useState<OrderBookEntry[]>([
    { price: 2845.50, amount: 1.234, total: 3510.28 },
    { price: 2845.25, amount: 2.567, total: 7304.68 },
    { price: 2845.00, amount: 0.891, total: 2534.70 },
    { price: 2844.75, amount: 3.456, total: 9831.26 },
    { price: 2844.50, amount: 1.789, total: 5088.41 },
    { price: 2844.25, amount: 2.345, total: 6670.67 },
    { price: 2844.00, amount: 4.123, total: 11725.81 },
  ]);

  const [asks, setAsks] = useState<OrderBookEntry[]>([
    { price: 2845.75, amount: 0.756, total: 2151.39 },
    { price: 2846.00, amount: 1.892, total: 5384.23 },
    { price: 2846.25, amount: 3.124, total: 8892.49 },
    { price: 2846.50, amount: 2.567, total: 7305.16 },
    { price: 2846.75, amount: 1.234, total: 3513.25 },
    { price: 2847.00, amount: 4.567, total: 12999.85 },
    { price: 2847.25, amount: 0.987, total: 2810.30 },
  ]);

  const [mempoolTxs, setMempoolTxs] = useState<MempoolTransaction[]>([
    {
      hash: '0xabc123...def456',
      from: '0x1234...5678',
      to: '0x9876...5432',
      value: '1.5 ETH',
      gasPrice: 45.2,
      timestamp: Date.now(),
      type: 'buy'
    },
    {
      hash: '0x123abc...456def',
      from: '0x5678...1234',
      to: '0xabcd...5678',
      value: '0.8 ETH',
      gasPrice: 52.8,
      timestamp: Date.now() - 10000,
      type: 'sell'
    },
    {
      hash: '0xdef456...abc123',
      from: '0x9876...abcd',
      to: '0x1234...ef01',
      value: '2.3 ETH',
      gasPrice: 38.5,
      timestamp: Date.now() - 20000,
      type: 'buy'
    },
    {
      hash: '0x789xyz...123abc',
      from: '0xabcd...9876',
      to: '0xef01...2345',
      value: '0.5 ETH',
      gasPrice: 61.3,
      timestamp: Date.now() - 30000,
      type: 'transfer'
    },
    {
      hash: '0x456def...789xyz',
      from: '0x2345...6789',
      to: '0x6789...abcd',
      value: '3.2 ETH',
      gasPrice: 42.7,
      timestamp: Date.now() - 40000,
      type: 'buy'
    },
  ]);

  // Update available protocols when network changes
  useEffect(() => {
    if (selectedNetworkId) {
      const protocols = getProtocolsByNetwork(selectedNetworkId);
      setAvailableProtocols(protocols);

      // Reset protocol if not available on new network
      if (selectedProtocolId && !protocols.find(p => p.id === selectedProtocolId)) {
        setSelectedProtocolId(null);
        setSelectedPair(null);
      }
    } else {
      setAvailableProtocols([]);
      setSelectedProtocolId(null);
      setSelectedPair(null);
    }
  }, [selectedNetworkId]);

  // Update available pairs when network changes
  useEffect(() => {
    if (selectedNetworkId) {
      const network = SUPPORTED_NETWORKS.find(n => n.id === selectedNetworkId);
      if (network) {
        const pairs = getTradingPairsByNetwork(network.name);
        setAvailablePairs(pairs);

        // Reset pair if not available
        if (selectedPair && !pairs.find(p => p.symbol === selectedPair)) {
          setSelectedPair(null);
        }
      }
    } else {
      setAvailablePairs([]);
      setSelectedPair(null);
    }
  }, [selectedNetworkId]);

  const selectedNetwork = SUPPORTED_NETWORKS.find(n => n.id === selectedNetworkId);
  const selectedProtocol = SUPPORTED_PROTOCOLS.find(p => p.id === selectedProtocolId);
  const isSpotDex = selectedProtocol?.type === 'spot';
  const isPerpetualDex = selectedProtocol?.type === 'perpetual';

  // Panel is minimized if either forceMinimized is true OR user manually minimized it
  const isCurrentlyMinimized = forceMinimized || isMinimized;

  return (
    <div className={`trading-panel ${isCurrentlyMinimized ? 'minimized' : ''}`}>
      {/* Header with controls */}
      <div className="trading-panel-header">
        <div className="trading-panel-title">Trading View</div>
        <div className="trading-panel-controls">
          <button
            className="trading-panel-minimize"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isCurrentlyMinimized ? 'Expand' : 'Minimize'}
            disabled={forceMinimized && !isMinimized}
          >
            {isCurrentlyMinimized ? '□' : '—'}
          </button>
          {onRemove && (
            <button className="trading-panel-remove" onClick={onRemove}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Collapsible content */}
      {!isCurrentlyMinimized && (
        <>
          {/* Selectors */}
          <div className="trading-panel-selectors">
            <div className="selector-group">
              <label className="selector-label">Network</label>
              <select
                className="cyber-select"
                value={selectedNetworkId || ''}
                onChange={(e) => setSelectedNetworkId(Number(e.target.value) || null)}
              >
                <option value="">Select Network</option>
                {SUPPORTED_NETWORKS.map(network => (
                  <option key={network.id} value={network.id}>
                    {network.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div className="selector-group">
              <label className="selector-label">Protocol</label>
              <select
                className="cyber-select"
                value={selectedProtocolId || ''}
                onChange={(e) => setSelectedProtocolId(e.target.value || null)}
                disabled={!selectedNetworkId || availableProtocols.length === 0}
              >
                <option value="">Select Protocol</option>
                {availableProtocols.map(protocol => (
                  <option key={protocol.id} value={protocol.id}>
                    {protocol.displayName} ({protocol.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="selector-group">
              <label className="selector-label">Trading Pair</label>
              <select
                className="cyber-select"
                value={selectedPair || ''}
                onChange={(e) => setSelectedPair(e.target.value || null)}
                disabled={!selectedProtocolId || availablePairs.length === 0}
              >
                <option value="">Select Pair</option>
                {availablePairs.map(pair => (
                  <option key={pair.symbol} value={pair.symbol}>
                    {pair.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>

      {/* Content Area */}
      {selectedNetworkId && selectedProtocolId && selectedPair ? (
        <div className="trading-panel-content">
          {/* Spot DEX View */}
          {isSpotDex && (
            <>
              <div className="trading-section">
                <h4 className="section-title">Current Swap Ratio</h4>
                <div className="swap-ratio-display">
                  <div className="ratio-value">{swapRatio.toFixed(2)}</div>
                  <div className="ratio-label">{selectedPair}</div>
                </div>
              </div>

              <div className="trading-section">
                <div className="section-header">
                  <h4 className="section-title">Recent Trades</h4>
                  <button
                    className="expand-btn"
                    onClick={() => setIsTradesExpanded(!isTradesExpanded)}
                  >
                    {isTradesExpanded ? '▼ Collapse' : '▶ Expand'}
                  </button>
                </div>
                <div className="trades-table-container">
                  <table className="cyber-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Type</th>
                        <th>Token In</th>
                        <th>Token Out</th>
                        <th>Gas (Gwei)</th>
                        <th>Wallet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(isTradesExpanded ? recentTrades : recentTrades.slice(0, 3)).map((trade, idx) => (
                        <tr key={idx}>
                          <td>{trade.time}</td>
                          <td>
                            <span className={`trade-type ${trade.type}`}>
                              {trade.type.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            {trade.tokenInAmount.toFixed(4)} {trade.tokenIn}
                          </td>
                          <td>
                            {trade.tokenOutAmount.toFixed(4)} {trade.tokenOut}
                          </td>
                          <td>{trade.gasPrice.toFixed(1)}</td>
                          <td className="wallet-address">{trade.walletAddress}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Perpetual DEX View */}
          {isPerpetualDex && (
            <>
              <div className="trading-section">
                <h4 className="section-title">Candlestick Chart</h4>
                <CandlestickChart symbol={selectedPair || undefined} />
              </div>

              <div className="trading-grid">
                <div className="trading-section">
                  <div className="section-header">
                    <h4 className="section-title">Order Book - Bids</h4>
                    <button
                      className="expand-btn"
                      onClick={() => setIsBidsExpanded(!isBidsExpanded)}
                    >
                      {isBidsExpanded ? '▼ Collapse' : '▶ Expand'}
                    </button>
                  </div>
                  <div className="orderbook-container">
                    <table className="orderbook-table">
                      <thead>
                        <tr>
                          <th>Price</th>
                          <th>Amount</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(isBidsExpanded ? bids : bids.slice(0, 3)).map((bid, idx) => (
                          <tr key={idx} className="bid-row">
                            <td className="price-cell bid">{bid.price.toFixed(2)}</td>
                            <td>{bid.amount.toFixed(3)}</td>
                            <td>{bid.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="trading-section">
                  <div className="section-header">
                    <h4 className="section-title">Order Book - Asks</h4>
                    <button
                      className="expand-btn"
                      onClick={() => setIsAsksExpanded(!isAsksExpanded)}
                    >
                      {isAsksExpanded ? '▼ Collapse' : '▶ Expand'}
                    </button>
                  </div>
                  <div className="orderbook-container">
                    <table className="orderbook-table">
                      <thead>
                        <tr>
                          <th>Price</th>
                          <th>Amount</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(isAsksExpanded ? asks : asks.slice(0, 3)).map((ask, idx) => (
                          <tr key={idx} className="ask-row">
                            <td className="price-cell ask">{ask.price.toFixed(2)}</td>
                            <td>{ask.amount.toFixed(3)}</td>
                            <td>{ask.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="trading-section">
                <div className="section-header">
                  <h4 className="section-title">Recent Trades</h4>
                  <button
                    className="expand-btn"
                    onClick={() => setIsTradesExpanded(!isTradesExpanded)}
                  >
                    {isTradesExpanded ? '▼ Collapse' : '▶ Expand'}
                  </button>
                </div>
                <div className="trades-table-container">
                  <table className="cyber-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Type</th>
                        <th>Price</th>
                        <th>Amount</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(isTradesExpanded ? recentTrades : recentTrades.slice(0, 3)).map((trade, idx) => (
                        <tr key={idx}>
                          <td>{trade.time}</td>
                          <td>
                            <span className={`trade-type ${trade.type}`}>
                              {trade.type.toUpperCase()}
                            </span>
                          </td>
                          <td>{swapRatio.toFixed(2)}</td>
                          <td>{trade.tokenOutAmount.toFixed(4)}</td>
                          <td>{(trade.tokenOutAmount * swapRatio).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Mempool Stream (common for both) */}
          <div className="trading-section">
            <div className="section-header">
              <h4 className="section-title">Mempool - Pending Transactions</h4>
              <button
                className="expand-btn"
                onClick={() => setIsMempoolExpanded(!isMempoolExpanded)}
              >
                {isMempoolExpanded ? '▼ Collapse' : '▶ Expand'}
              </button>
            </div>
            <div className="mempool-container">
              {(isMempoolExpanded ? mempoolTxs : mempoolTxs.slice(0, 3)).map((tx, idx) => (
                <div key={idx} className="mempool-tx">
                  <div className="mempool-tx-header">
                    <span className={`mempool-tx-type ${tx.type}`}>{tx.type.toUpperCase()}</span>
                    <span className="mempool-tx-hash">{tx.hash}</span>
                  </div>
                  <div className="mempool-tx-details">
                    <span>From: {tx.from}</span>
                    <span>Value: {tx.value}</span>
                    <span>Gas: {tx.gasPrice.toFixed(1)} Gwei</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="trading-panel-empty">
          <div className="empty-state-icon">⚠️</div>
          <div className="empty-state-text">
            Select network, protocol, and trading pair to view data
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
