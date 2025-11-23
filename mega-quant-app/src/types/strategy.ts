/**
 * Strategy Type Definitions
 * Core interfaces for multi-chain trading strategies
 */

/**
 * Possible states for a trading strategy
 */
export type StrategyStatus =
  | 'initialized'  // Strategy created but not started
  | 'running'      // Strategy actively executing
  | 'paused'       // Strategy temporarily stopped, can resume
  | 'stopped'      // Strategy stopped, can restart
  | 'error'        // Strategy encountered an error
  | 'deleted';     // Strategy marked for deletion

/**
 * Configuration for a single blockchain in a strategy
 */
export interface StrategyChainConfig {
  chainId: number;           // Network chain ID (e.g., 1 for Ethereum)
  privateKey: string;        // Private key for this chain (encrypted in storage)
  address: string;           // Derived address from private key
  rpcEndpoint?: string;      // Custom RPC endpoint (optional, uses default if not set)
  tokens: string[];          // Token addresses to track on this chain
  tradeCount: number;        // Number of trades executed on this chain
  totalProfit: number;       // Total profit/loss on this chain (in USD)
  isActive: boolean;         // Whether trading is active on this chain
  lastTradeTimestamp?: number; // Unix timestamp of last trade
}

/**
 * Trading view panel configuration for a strategy
 */
export interface TradingViewPanel {
  id: string;
  networkId?: number;
  protocolId?: string;
  pairSymbol?: string;
}

/**
 * Console log entry
 */
export interface ConsoleLog {
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: number;
}

/**
 * Main strategy interface
 */
export interface Strategy {
  id: string;                // Unique identifier (UUID)
  name: string;              // User-defined strategy name
  status: StrategyStatus;    // Current strategy state
  chains: {
    [chainId: number]: StrategyChainConfig;  // Chain-specific configurations
  };
  code: string;              // JavaScript strategy code
  createdAt: number;         // Unix timestamp of creation
  updatedAt: number;         // Unix timestamp of last update
  runtime: number;           // Total runtime in milliseconds
  totalProfit: number;       // Aggregated profit across all chains (in USD)
  totalTrades: number;       // Aggregated trade count across all chains
  description?: string;      // Optional strategy description
  tags?: string[];           // Optional tags for categorization
  tradingViews?: TradingViewPanel[];  // Trading view panels for this strategy
  consoleLogs?: ConsoleLog[];  // Console output logs for this strategy
}

/**
 * Strategy deployment configuration (before creation)
 */
export interface StrategyDeploymentConfig {
  name: string;
  chains: Array<{
    chainId: number;
    privateKey: string;
    rpcEndpoint?: string;
    tokens: string[];
  }>;
  code?: string;  // Optional initial code
  description?: string;
  tags?: string[];
}

/**
 * Strategy execution context (passed to strategy code)
 */
export interface StrategyExecutionContext {
  strategyId: string;
  strategyName: string;
  chains: number[];  // Available chain IDs
  getAPI: (chainId: number) => any;  // Get TradingAPI for specific chain
  log: (...args: any[]) => void;     // Console logging
  emit: (event: string, data: any) => void;  // Event emission
}

/**
 * Strategy statistics for display
 */
export interface StrategyStats {
  totalProfit: number;
  totalTrades: number;
  runtime: string;  // Formatted runtime (e.g., "2d 14h 23m")
  avgProfitPerTrade: number;
  successRate: number;  // Percentage of profitable trades
  activeChains: number;
}

/**
 * Chain-specific statistics
 */
export interface ChainStats {
  chainId: number;
  profit: number;
  trades: number;
  lastTrade?: number;  // Unix timestamp
  isActive: boolean;
}

/**
 * Strategy filter/sort options
 */
export interface StrategyFilters {
  status?: StrategyStatus[];
  chains?: number[];
  minProfit?: number;
  maxProfit?: number;
  sortBy?: 'name' | 'profit' | 'trades' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}
