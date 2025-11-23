/**
 * Represents the native currency of a blockchain network
 * Used for displaying token information and calculating gas costs
 */
export interface NativeCurrency {
  /** Full name of the native currency (e.g., "Ether") */
  name: string;
  /** Symbol of the native currency (e.g., "ETH") */
  symbol: string;
  /** Number of decimal places the currency uses (typically 18 for ETH) */
  decimals: number;
}

/**
 * Blockchain explorer information for a specific chain
 * Used to generate links to transactions, addresses, and blocks
 */
export interface Explorer {
  /** Name of the explorer service (e.g., "Etherscan") */
  name: string;
  /** Base URL of the explorer */
  url: string;
  /** Standard the explorer follows (e.g., "EIP3091") */
  standard?: string;
  /** URL to the explorer's icon/logo */
  icon?: string;
}

/**
 * Complete information about an EVM-compatible blockchain
 * This data is loaded from Chainlist and used throughout the application
 */
export interface ChainInfo {
  /** Unique identifier for the chain (e.g., 1 for Ethereum Mainnet) */
  chainId: number;
  /** Human-readable name of the chain */
  name: string;
  /** Chain type (usually "ETH" for Ethereum-based chains) */
  chain: string;
  /** Network name (e.g., "mainnet", "testnet") */
  network?: string;
  /** Legacy network ID (often same as chainId) */
  networkId?: number;
  /** Information about the chain's native currency */
  nativeCurrency: NativeCurrency;
  /** List of blockchain explorers for this chain */
  explorers?: Explorer[];
  /** URL to more information about the chain */
  infoURL?: string;
  /** Short abbreviation for the chain */
  shortName?: string;
  /** URL to the chain's icon */
  icon?: string;
  /** Special features supported by this chain */
  features?: Array<{ name: string }>;
}

/**
 * Represents an RPC endpoint for connecting to a blockchain
 * Includes metadata for health checking and reliability scoring
 */
export interface RpcEndpoint {
  /** The RPC endpoint URL (http://, https://, ws://, or wss://) */
  url: string;
  /** Provider name extracted from URL (e.g., "LlamaNodes", "Ankr") */
  tracking?: string;
  /** Whether this is a WebSocket endpoint (ws:// or wss://) */
  isWebSocket?: boolean;
  /** Reliability score (0-1), updated based on successful/failed connections */
  reliability?: number;
  /** Timestamp of the last health check */
  lastChecked?: Date;
}

/**
 * Result of checking an RPC endpoint's health
 * Used to determine which endpoints to use for queries
 */
export interface HealthCheckResult {
  /** Whether the endpoint is currently responsive */
  healthy: boolean;
  /** Response time in milliseconds */
  latency?: number;
  /** Latest block number reported by the endpoint */
  blockNumber?: bigint;
  /** Error message if the health check failed */
  error?: string;
}

/**
 * Configuration options for the ChainRegistry
 * Controls behavior of RPC endpoint management and caching
 */
export interface ChainRegistryOptions {
  /** Maximum number of RPC endpoints to check per chain (default: 5) */
  maxEndpointsPerChain?: number;
  /** How often to re-check endpoint health in milliseconds */
  healthCheckInterval?: number;
  /** Timeout for individual health checks in milliseconds (default: 5000) */
  healthCheckTimeout?: number;
  /** How long to cache chain data in milliseconds (default: 24 hours) */
  cacheExpiry?: number;
}

/**
 * Options for creating multiple RPC clients for mempool aggregation
 * Used when we need to query multiple nodes for comprehensive mempool data
 */
export interface MultiRpcOptions {
  /** Number of different RPC endpoints to query (default: 3) */
  clientCount?: number;
  /** Whether to include WebSocket endpoints (default: false) */
  includeWebSocket?: boolean;
  /** Minimum reliability score required (0-1, default: 0.3) */
  minReliability?: number;
  /** Whether to prefer geographically diverse endpoints */
  preferDiverse?: boolean;
}