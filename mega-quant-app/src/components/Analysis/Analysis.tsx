import React, { useContext, useState } from 'react';
import './Analysis.css';
import { StandaloneThemeToggle } from '../ThemeToggle/ThemeToggle';
import { StrategyCard } from '../StrategyCard/StrategyCard';
import { Navbar } from '../Navbar/Navbar';
import { Account } from '../AccountManager/AccountManager';
import { APIConfig } from '../APIManager/APIManager';
import { FaChartPie, FaChartLine, FaRobot, FaTrendingUp } from 'react-icons/fa';
import { TbChartAreaLine } from 'react-icons/tb';
import { MdAutoAwesome } from 'react-icons/md';

// Optional import - won't break if context doesn't exist
let ThemeContext: React.Context<any> | undefined;
try {
  const context = require('../../contexts/ThemeContext');
  ThemeContext = context.ThemeContext;
} catch {
  // Context not available, will use prop-based theme
}

export interface AnalysisProps {
  theme?: 'light' | 'dark';
  onThemeChange?: (theme: 'light' | 'dark') => void;
  showThemeToggle?: boolean;
  totalBalance: number;
  activeStrategies: number;
  winRate: number;
  totalPositionsValue: number;
  maxDrawdown: number;
  totalTrades: number;
  gasReserves: {
    chain: string;
    symbol: string;
    balance: number;
    usdValue: number;
    color?: string;
  }[];
  assets?: {
    chain: string;
    token: string;
    symbol: string;
    balance: number;
    usdValue: number;
    color?: string;
  }[];
  recentTrades?: {
    time: string;
    pair: string;
    chain: string;
    protocol: string;
    tokenIn: {
      symbol: string;
      amount: number;
    };
    tokenOut: {
      symbol: string;
      amount: number;
    };
    gasPrice: number; // in gwei
    blockNumber: number;
    txHash: string;
    explorerUrl?: string;
  }[];
  strategies?: {
    name: string;
    status: 'running' | 'stopped' | 'error' | 'paused';
    profit: number;
    runtime: string;
    tradesExecuted: number;
    chain: string;
  }[];
}

export const Analysis: React.FC<AnalysisProps> = ({
  theme: themeProp = 'dark',
  onThemeChange,
  showThemeToggle = false,
  totalBalance,
  activeStrategies,
  winRate,
  totalPositionsValue,
  maxDrawdown,
  totalTrades,
  gasReserves,
  assets = [],
  recentTrades = [],
  strategies = [],
}) => {
  // Try to get theme from context if available, otherwise use prop
  let contextTheme: string | undefined;
  if (ThemeContext) {
    try {
      const context = useContext(ThemeContext);
      contextTheme = context?.theme;
    } catch {
      // Context not available
    }
  }
  const theme = contextTheme || themeProp;
  const [localTheme, setLocalTheme] = React.useState(theme);
  const [activeTab, setActiveTab] = useState('analysis');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [apiConfig, setApiConfig] = useState<APIConfig>({
    rpcProvider: 'alchemy',
    appId: '',
    apiKey: '',
    etherscanApiKey: '',
    coinMarketCapApiKey: '',
  });

  const handleAccountsUpdate = (newAccounts: Account[]) => {
    setAccounts(newAccounts);
  };

  const handleAPIConfigUpdate = (config: APIConfig) => {
    setApiConfig(config);
  };

  // Handle theme changes
  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setLocalTheme(newTheme);
    if (onThemeChange) {
      onThemeChange(newTheme);
    }
  };

  React.useEffect(() => {
    setLocalTheme(theme);
  }, [theme]);

  // Assets sorting and filtering state
  const [assetSortBy, setAssetSortBy] = React.useState<'network' | 'asset' | 'value'>('value');
  const [selectedNetworks, setSelectedNetworks] = React.useState<string[]>([]);
  const [selectedAssets, setSelectedAssets] = React.useState<string[]>([]);

  const formatNumber = (num: number, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatPnL = (num: number) => {
    const formatted = formatCurrency(num);
    const className = num >= 0 ? 'positive' : 'negative';
    const sign = num >= 0 ? '+' : '';
    return <span className={`pnl-value ${className}`}>{sign}{formatted}</span>;
  };

  const formatPercent = (num: number) => {
    const className = num >= 0 ? 'positive' : 'negative';
    return <span className={`percent-value ${className}`}>{num.toFixed(2)}%</span>;
  };

  // Get unique networks and asset symbols for filtering
  const uniqueNetworks = React.useMemo(() => {
    return Array.from(new Set(assets.map(a => a.chain))).sort();
  }, [assets]);

  const uniqueAssetSymbols = React.useMemo(() => {
    return Array.from(new Set(assets.map(a => a.symbol))).sort();
  }, [assets]);

  // Filter and sort assets
  const filteredAndSortedAssets = React.useMemo(() => {
    let filtered = [...assets];

    // Apply network filter
    if (selectedNetworks.length > 0) {
      filtered = filtered.filter(a => selectedNetworks.includes(a.chain));
    }

    // Apply asset filter
    if (selectedAssets.length > 0) {
      filtered = filtered.filter(a => selectedAssets.includes(a.symbol));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (assetSortBy) {
        case 'network':
          return a.chain.localeCompare(b.chain);
        case 'asset':
          return a.symbol.localeCompare(b.symbol);
        case 'value':
          return b.usdValue - a.usdValue;
        default:
          return 0;
      }
    });

    return filtered;
  }, [assets, selectedNetworks, selectedAssets, assetSortBy]);

  // Toggle network filter
  const toggleNetworkFilter = (network: string) => {
    setSelectedNetworks(prev =>
      prev.includes(network)
        ? prev.filter(n => n !== network)
        : [...prev, network]
    );
  };

  // Toggle asset filter
  const toggleAssetFilter = (symbol: string) => {
    setSelectedAssets(prev =>
      prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedNetworks([]);
    setSelectedAssets([]);
  };

  // Calculate active networks
  const activeNetworks = new Set<number>();
  accounts.forEach(account => {
    account.networks.forEach(networkId => {
      activeNetworks.add(networkId);
    });
  });

  return (
    <div className={`dashboard ${localTheme}`}>
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        connectedChains={activeNetworks.size}
        accounts={accounts}
        onAccountsUpdate={handleAccountsUpdate}
        apiConfig={apiConfig}
        onAPIConfigUpdate={handleAPIConfigUpdate}
      />

      {/* Main Metrics Grid */}
      <div className="metrics-container">
        {/* Portfolio Overview */}
        <div className="metric-card large">
          <div className="card-header">
            <h3>Portfolio Overview</h3>
            <FaChartPie className="card-icon cyber-icon" />
          </div>
          <div className="card-content">
            <div className="main-balance">
              <span className="balance-label">Total Value</span>
              <span className="balance-value">{formatCurrency(totalBalance)}</span>
            </div>
            <div className="performance-metrics">
              <div className="stat-row">
                <span className="stat-label">Total Positions</span>
                <span className="stat-value">{formatCurrency(totalPositionsValue)}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Win Rate</span>
                {formatPercent(winRate)}
              </div>
              <div className="stat-row">
                <span className="stat-label">Max Drawdown</span>
                <span className="stat-value negative">{maxDrawdown.toFixed(2)}%</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Total Trades</span>
                <span className="stat-value">{formatNumber(totalTrades, 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Assets List */}
        <div className="metric-card assets-section">
          <div className="card-header">
            <div className="header-title-group">
              <h3>Assets</h3>
              <span className="card-subtitle">
                {filteredAndSortedAssets.length} of {assets.length} assets
              </span>
            </div>
            <div className="assets-controls">
              <div className="sort-controls">
                <span className="control-label">Sort:</span>
                <button
                  className={`sort-btn ${assetSortBy === 'value' ? 'active' : ''}`}
                  onClick={() => setAssetSortBy('value')}
                  title="Sort by value"
                >
                  Value
                </button>
                <button
                  className={`sort-btn ${assetSortBy === 'network' ? 'active' : ''}`}
                  onClick={() => setAssetSortBy('network')}
                  title="Sort by network"
                >
                  Network
                </button>
                <button
                  className={`sort-btn ${assetSortBy === 'asset' ? 'active' : ''}`}
                  onClick={() => setAssetSortBy('asset')}
                  title="Sort by asset"
                >
                  Asset
                </button>
              </div>
            </div>
          </div>
          <div className="card-content">
            <div className="filter-section">
              <div className="filter-group">
                <div className="filter-header">
                  <span className="filter-label">Networks:</span>
                  {selectedNetworks.length > 0 && (
                    <button className="clear-filter-btn" onClick={clearFilters}>
                      Clear All
                    </button>
                  )}
                </div>
                <div className="filter-chips">
                  {uniqueNetworks.map(network => (
                    <button
                      key={network}
                      className={`filter-chip ${selectedNetworks.includes(network) ? 'active' : ''}`}
                      onClick={() => toggleNetworkFilter(network)}
                    >
                      {network}
                    </button>
                  ))}
                </div>
              </div>
              <div className="filter-group">
                <span className="filter-label">Assets:</span>
                <div className="filter-chips">
                  {uniqueAssetSymbols.map(symbol => (
                    <button
                      key={symbol}
                      className={`filter-chip ${selectedAssets.includes(symbol) ? 'active' : ''}`}
                      onClick={() => toggleAssetFilter(symbol)}
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="assets-list-compact">
              {filteredAndSortedAssets.length > 0 ? (
                filteredAndSortedAssets.map((asset, idx) => (
                  <div key={idx} className="asset-item-compact">
                    <div className="asset-header-compact">
                      <span
                        className="chain-indicator"
                        style={{ backgroundColor: asset.color || '#667eea' }}
                      ></span>
                      <span className="asset-name-compact">{asset.token}</span>
                    </div>
                    <div className="asset-details-compact">
                      <span className="asset-chain-compact">{asset.chain}</span>
                      <span className="asset-balance-compact">
                        {asset.balance.toFixed(4)} {asset.symbol}
                      </span>
                    </div>
                    <div className="asset-value-compact">{formatCurrency(asset.usdValue)}</div>
                  </div>
                ))
              ) : (
                <div className="no-assets">No assets match filters</div>
              )}
            </div>
          </div>
        </div>

        {/* Gas Reserves */}
        <div className="metric-card gas-reserves">
          <div className="card-header">
            <h3>Gas Reserves</h3>
            <span className="card-subtitle">Native tokens for fees</span>
          </div>
          <div className="card-content">
            <div className="gas-grid-compact">
              {gasReserves.map((reserve) => (
                <div key={reserve.chain} className="gas-item-compact">
                  <div className="gas-header-compact">
                    <span
                      className="chain-indicator"
                      style={{ backgroundColor: reserve.color || '#667eea' }}
                    ></span>
                    <span className="chain-name-compact">{reserve.chain}</span>
                  </div>
                  <div className="gas-balance-compact">
                    {reserve.balance.toFixed(4)} {reserve.symbol}
                  </div>
                  <div className="gas-value-compact">{formatCurrency(reserve.usdValue)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - Recent Trades and Active Strategies */}
      <div className="bottom-section">
        {/* Recent Trades */}
        <div className="trades-section">
          <div className="section-header">
            <h3>Recent Trades</h3>
            <span className="section-subtitle">Last 24 hours</span>
          </div>
          <div className="trades-list">
            {recentTrades.length > 0 ? (
              <table className="trades-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Pair</th>
                    <th>Chain</th>
                    <th>Protocol</th>
                    <th>Token In</th>
                    <th>Token Out</th>
                    <th>Gas Price</th>
                    <th>Block</th>
                    <th>Tx Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.slice(0, 5).map((trade, idx) => (
                    <tr key={idx}>
                      <td>{trade.time}</td>
                      <td>{trade.pair}</td>
                      <td className="trade-chain">{trade.chain}</td>
                      <td className="trade-protocol">{trade.protocol}</td>
                      <td className="token-amount">
                        {formatNumber(trade.tokenIn.amount, 4)} {trade.tokenIn.symbol}
                      </td>
                      <td className="token-amount">
                        {formatNumber(trade.tokenOut.amount, 4)} {trade.tokenOut.symbol}
                      </td>
                      <td className="gas-price">{trade.gasPrice.toFixed(2)} Gwei</td>
                      <td className="trade-block">{trade.blockNumber.toLocaleString()}</td>
                      <td className="trade-hash">
                        <a
                          href={trade.explorerUrl || `#${trade.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tx-link"
                          title={trade.txHash}
                        >
                          {trade.txHash.slice(0, 6)}...{trade.txHash.slice(-4)}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="no-trades">No recent trades</div>
            )}
          </div>
        </div>

        {/* Active Strategies */}
        <div className="strategies-section">
          <div className="section-header">
            <h3>Active Strategies</h3>
            <span className="section-subtitle">{strategies.length} strategies running</span>
          </div>
          <div className="strategies-list-horizontal">
            {strategies.length > 0 ? (
              strategies.map((strategy, idx) => (
                <StrategyCard
                  key={idx}
                  name={strategy.name}
                  status={strategy.status}
                  profit={strategy.profit}
                  runtime={strategy.runtime}
                  tradesExecuted={strategy.tradesExecuted}
                  chain={strategy.chain}
                />
              ))
            ) : (
              <div className="no-strategies">No active strategies</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};