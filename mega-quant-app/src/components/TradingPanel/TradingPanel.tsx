import { IoWarning, IoFlash, IoRocket, IoBarChart, IoWifi, IoCheckmarkCircle, IoInformationCircle } from 'react-icons/io5';
import React, { useState, useEffect } from 'react';
import { SUPPORTED_NETWORKS, Network } from '../../config/networks';
import { SUPPORTED_PROTOCOLS, Protocol, TradingPair, getTradingPairsByNetwork, getProtocolsByNetwork } from '../../config/protocols';
import { CandlestickChart } from '../CandlestickChart/CandlestickChart';
import { useLiveData, TradeData as LiveTradeData, MempoolTx as LiveMempoolTx } from '../../hooks/useLiveData';
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
  onConfigChange?: (config: { networkId?: number; protocolId?: string; pairSymbol?: string }) => void;
  initialNetwork?: number;
  initialProtocol?: string;
  initialPair?: string;
  forceMinimized?: boolean;
  alchemyApiKey?: string;
}

export const TradingPanel: React.FC<TradingPanelProps> = ({
  onRemove,
  onConfigChange,
  initialNetwork,
  initialProtocol,
  initialPair,
  forceMinimized = false,
  alchemyApiKey,
}) => {
  const [selectedNetworkId, setSelectedNetworkId] = useState<number | null>(initialNetwork || null);
  const [selectedProtocolId, setSelectedProtocolId] = useState<string | null>(initialProtocol || null);
  const [selectedPair, setSelectedPair] = useState<string | null>(initialPair || null);

  // Report config changes to parent
  const handleNetworkChange = (networkId: number | null) => {
    setSelectedNetworkId(networkId);
    onConfigChange?.({ networkId: networkId || undefined, protocolId: undefined, pairSymbol: undefined });
  };

  const handleProtocolChange = (protocolId: string | null) => {
    setSelectedProtocolId(protocolId);
    onConfigChange?.({ networkId: selectedNetworkId || undefined, protocolId: protocolId || undefined, pairSymbol: undefined });
  };

  const handlePairChange = (pair: string | null) => {
    setSelectedPair(pair);
    onConfigChange?.({ networkId: selectedNetworkId || undefined, protocolId: selectedProtocolId || undefined, pairSymbol: pair || undefined });
  };
  const [availableProtocols, setAvailableProtocols] = useState<Protocol[]>([]);
  const [availablePairs, setAvailablePairs] = useState<TradingPair[]>([]);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Expand/collapse states for different sections
  const [isTradesExpanded, setIsTradesExpanded] = useState<boolean>(false);
  const [isBidsExpanded, setIsBidsExpanded] = useState<boolean>(false);
  const [isAsksExpanded, setIsAsksExpanded] = useState<boolean>(false);
  const [isMempoolExpanded, setIsMempoolExpanded] = useState<boolean>(false);

  // Live data from WebSocket
  const {
    isConnected,
    isSubscribed,
    price: livePrice,
    recentTrades: liveTrades,
    mempoolTxs: liveMempoolTxs,
    error: liveDataError,
    hasAlchemyKey,
    pollIntervalMs,
    setPollRate
  } = useLiveData({
    networkId: selectedNetworkId,
    pairSymbol: selectedPair,
    alchemyApiKey
  });

  // Use live price or fallback to placeholder
  const swapRatio = livePrice || 0;

  // Convert live trades to component format
  const recentTrades: Trade[] = liveTrades.map(t => ({
    time: t.time,
    type: t.type,
    tokenIn: t.tokenIn,
    tokenInAmount: t.tokenInAmount,
    tokenOut: t.tokenOut,
    tokenOutAmount: t.tokenOutAmount,
    gasPrice: t.gasPrice,
    walletAddress: t.walletAddress,
    txHash: t.txHash
  }));

  // Convert live mempool to component format
  const mempoolTxs: MempoolTransaction[] = liveMempoolTxs.map(tx => ({
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    value: tx.value,
    gasPrice: tx.gasPrice,
    timestamp: tx.timestamp,
    type: tx.type
  }));

  // Mock order book data (perpetual DEX only - not needed for spot)
  const [bids, setBids] = useState<OrderBookEntry[]>([
    { price: 2845.50, amount: 1.234, total: 3510.28 },
    { price: 2845.25, amount: 2.567, total: 7304.68 },
    { price: 2845.00, amount: 0.891, total: 2534.70 },
  ]);

  const [asks, setAsks] = useState<OrderBookEntry[]>([
    { price: 2845.75, amount: 0.756, total: 2151.39 },
    { price: 2846.00, amount: 1.892, total: 5384.23 },
    { price: 2846.25, amount: 3.124, total: 8892.49 },
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
                onChange={(e) => handleNetworkChange(Number(e.target.value) || null)}
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
                onChange={(e) => handleProtocolChange(e.target.value || null)}
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
                onChange={(e) => handlePairChange(e.target.value || null)}
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
                <div className="section-header">
                  <h4 className="section-title">Current Swap Ratio</h4>
                  <span className={`live-indicator ${isConnected && isSubscribed ? 'live' : 'offline'}`}>
                    {isConnected && isSubscribed ? 'LIVE' : 'CONNECTING...'}
                  </span>
                </div>
                <div className="swap-ratio-display">
                  <div className="ratio-value">
                    {swapRatio > 0 ? swapRatio.toFixed(4) : 'Loading...'}
                  </div>
                  <div className="ratio-label">{selectedPair}</div>
                  {liveDataError && <div className="error-text">{liveDataError}</div>}
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
                  {recentTrades.length === 0 ? (
                    <div className="empty-trades">Waiting for trades...</div>
                  ) : (
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
                  )}
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

          {/* Poll Rate Control */}
          <div className="trading-section poll-rate-section">
            <div className="section-header">
              <h4 className="section-title">Data Refresh Rate</h4>
              <span className={`api-status ${hasAlchemyKey ? 'configured' : 'not-configured'}`}>
                {hasAlchemyKey ? 'Alchemy API' : 'Public RPC'}
              </span>
            </div>
            <div className="poll-rate-control">
              <label>Poll every:</label>
              <select
                className="cyber-select poll-rate-select"
                value={pollIntervalMs}
                onChange={(e) => setPollRate(Number(e.target.value))}
              >
                <option value={1000}>1 second</option>
                <option value={2000}>2 seconds</option>
                <option value={5000}>5 seconds</option>
                <option value={10000}>10 seconds</option>
                <option value={30000}>30 seconds</option>
                <option value={60000}>60 seconds</option>
              </select>
              {!hasAlchemyKey && (
                <div className="api-warning">
                  Configure Alchemy API in settings for better rate limits
                </div>
              )}
            </div>
          </div>

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
            {!hasAlchemyKey && (
              <div className="mempool-warning">
                Simulated data. Configure Alchemy API for real mempool.
              </div>
            )}
            <div className="mempool-container">
              {mempoolTxs.length === 0 ? (
                <div className="empty-trades">Waiting for mempool data...</div>
              ) : (
                (isMempoolExpanded ? mempoolTxs : mempoolTxs.slice(0, 3)).map((tx, idx) => (
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
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="trading-panel-empty">
          <div className="empty-state-icon"><IoWarning /></div>
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
