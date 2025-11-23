import type { PublicClient } from 'viem';
import { ChainDataLoader } from './chains';
import { RPCManager } from './rpc-manager';
import type { ChainInfo, ChainRegistryOptions, RpcEndpoint, MultiRpcOptions } from './types';

/**
 * ChainRegistry is the main entry point for managing blockchain connections.
 * It orchestrates the chain data loader and RPC manager to provide a simple
 * interface for connecting to any EVM-compatible blockchain.
 * 
 * Key features:
 * - Automatic chain data loading from Chainlist
 * - RPC endpoint health management
 * - Public client creation with automatic failover
 * - Multi-client support for mempool aggregation
 * - Chain search and discovery
 * 
 * Usage example:
 * ```typescript
 * const registry = new ChainRegistry();
 * await registry.initialize();
 * 
 * // Single client for general use
 * const client = await registry.getPublicClient(1);
 * 
 * // Multiple clients for mempool aggregation
 * const clients = await registry.getMultiplePublicClients(1, { clientCount: 3 });
 * ```
 */
export class ChainRegistry {
  /** Manages chain metadata and RPC endpoint data */
  private chainLoader: ChainDataLoader;
  
  /** Handles RPC endpoint health checking and client creation */
  private rpcManager: RPCManager;
  
  /** Whether the registry has been initialized */
  private initialized = false;
  
  /** Cache of created public clients for reuse */
  private publicClients: Map<number, PublicClient> = new Map();

  /**
   * Creates a new ChainRegistry instance
   * @param options - Configuration options for the registry
   */
  constructor(options: ChainRegistryOptions = {}) {
    this.chainLoader = new ChainDataLoader(options.cacheExpiry);
    this.rpcManager = new RPCManager(this.chainLoader, {
      maxEndpointsPerChain: options.maxEndpointsPerChain,
      healthCheckTimeout: options.healthCheckTimeout,
    });
  }

  /**
   * Initializes the registry by loading chain data from Chainlist
   * Must be called before using any other methods
   * 
   * @throws Error if unable to load chain data
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    await this.chainLoader.loadFromChainlist();
    this.initialized = true;
  }

  /**
   * Ensures the registry has been initialized before allowing operations
   * @throws Error if not initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('ChainRegistry not initialized. Call initialize() first.');
    }
  }

  // ==================== Chain Information Methods ====================

  /**
   * Gets detailed information about a specific chain
   * @param chainId - The chain ID to look up
   * @returns Chain information or null if not found
   */
  getChain(chainId: number): ChainInfo | null {
    this.ensureInitialized();
    return this.chainLoader.getChain(chainId);
  }

  /**
   * Gets information about all supported chains
   * @returns Array of all chain information
   */
  getAllChains(): ChainInfo[] {
    this.ensureInitialized();
    return this.chainLoader.getChains();
  }

  /**
   * Gets a list of all supported chain IDs
   * @returns Array of chain IDs
   */
  getSupportedChainIds(): number[] {
    this.ensureInitialized();
    return this.chainLoader.getAllSupportedChainIds();
  }

  /**
   * Searches for chains matching a query
   * Searches in: chain name, chain ID, native currency symbol, short name
   * 
   * @param query - Search query string
   * @returns Array of matching chains
   */
  searchChains(query: string): ChainInfo[] {
    this.ensureInitialized();
    return this.chainLoader.searchChains(query);
  }

  // ==================== RPC Endpoint Methods ====================

  /**
   * Gets a single healthy RPC URL for a chain
   * The URL is guaranteed to be responsive at the time of return
   * 
   * @param chainId - The chain to get an RPC URL for
   * @returns A healthy RPC endpoint URL
   * @throws Error if no healthy endpoints are found
   */
  async getHealthyRpcUrl(chainId: number): Promise<string> {
    this.ensureInitialized();
    return this.rpcManager.getHealthyEndpoint(chainId);
  }

  /**
   * Gets multiple healthy RPC URLs for a chain
   * Useful for redundancy or load balancing
   * 
   * @param chainId - The chain to get RPC URLs for
   * @param count - Number of URLs to return (default: 3)
   * @returns Array of healthy RPC endpoint URLs
   * @throws Error if not enough healthy endpoints are found
   */
  async getHealthyRpcUrls(chainId: number, count = 3): Promise<string[]> {
    this.ensureInitialized();
    const endpoints = await this.rpcManager.getHealthyEndpoints(chainId, count);
    return endpoints.map(e => e.url);
  }

  /**
   * Gets diverse healthy RPC URLs for mempool aggregation
   * Prioritizes endpoints from different providers to get different
   * perspectives on the mempool
   * 
   * @param chainId - The chain to get RPC URLs for
   * @param options - Options for endpoint selection
   * @returns Array of diverse healthy RPC endpoint URLs
   */
  async getDiverseHealthyRpcUrls(
    chainId: number, 
    options: MultiRpcOptions = {}
  ): Promise<string[]> {
    this.ensureInitialized();
    const endpoints = await this.rpcManager.getDiverseHealthyEndpoints(chainId, options);
    return endpoints.map(e => e.url);
  }

  /**
   * Gets all RPC endpoints for a chain (without health checking)
   * @param chainId - The chain to get endpoints for
   * @returns Array of all RPC endpoints
   */
  getRpcEndpoints(chainId: number): RpcEndpoint[] {
    this.ensureInitialized();
    return this.chainLoader.getRpcEndpoints(chainId);
  }

  /**
   * Gets RPC endpoints grouped by provider
   * Useful for analyzing provider diversity
   * 
   * @param chainId - The chain to get endpoints for
   * @returns Map of provider name to endpoints
   */
  getRpcEndpointsByProvider(chainId: number): Map<string, RpcEndpoint[]> {
    this.ensureInitialized();
    return this.chainLoader.getRpcEndpointsByProvider(chainId);
  }

  // ==================== Public Client Management ====================

  /**
   * Gets or creates a Viem public client for a chain
   * Clients are cached and reused for efficiency
   * 
   * @param chainId - The chain to get a client for
   * @returns Configured PublicClient instance
   * @throws Error if unable to create a client
   */
  async getPublicClient(chainId: number): Promise<PublicClient> {
    this.ensureInitialized();
    
    // Check if we already have a client for this chain
    const existing = this.publicClients.get(chainId);
    if (existing) {
      return existing;
    }

    // Create a new client
    const client = await this.rpcManager.createPublicClient(chainId);
    this.publicClients.set(chainId, client);
    return client;
  }

  /**
   * Creates multiple public clients for mempool aggregation
   * Each client connects to a different RPC provider when possible
   * This is crucial for getting a comprehensive view of the mempool
   * 
   * @param chainId - The chain to create clients for
   * @param options - Options for client creation
   * @returns Array of configured PublicClient instances
   */
  async getMultiplePublicClients(
    chainId: number,
    options: MultiRpcOptions = {}
  ): Promise<PublicClient[]> {
    this.ensureInitialized();
    return this.rpcManager.createMultiplePublicClients(chainId, options);
  }

  /**
   * Disconnects a client for a specific chain
   * Closes WebSocket connections if applicable and removes from cache
   * 
   * @param chainId - The chain to disconnect
   */
  disconnectChain(chainId: number): void {
    const client = this.publicClients.get(chainId);
    if (client && client.transport && 'socket' in client.transport) {
      // Close WebSocket connection if applicable
      (client.transport as any).socket?.close();
    }
    this.publicClients.delete(chainId);
  }

  /**
   * Disconnects all clients
   * Useful for cleanup when shutting down
   */
  disconnectAll(): void {
    for (const chainId of this.publicClients.keys()) {
      this.disconnectChain(chainId);
    }
  }

  // ==================== Utility Methods ====================

  /**
   * Refreshes chain data and clears health cache
   * Useful when you want to force a refresh of all data
   */
  async refresh(): Promise<void> {
    await this.chainLoader.loadFromChainlist();
    this.rpcManager.clearHealthCache();
  }

  /**
   * Gets the current health status of all endpoints for a chain
   * @param chainId - The chain to get health status for
   * @returns Map of endpoint URL to health status
   */
  getHealthStatus(chainId: number): Map<string, any> {
    this.ensureInitialized();
    return this.rpcManager.getHealthStatus(chainId);
  }

  /**
   * Gets reliability scores for all endpoints of a chain
   * @param chainId - The chain to get reliability scores for
   * @returns Map of endpoint URL to reliability score (0-1)
   */
  getReliabilityScores(chainId: number): Map<string, number> {
    this.ensureInitialized();
    return this.rpcManager.getReliabilityScores(chainId);
  }

  /**
   * Checks if a chain is supported
   * @param chainId - The chain ID to check
   * @returns true if the chain is supported
   */
  isChainSupported(chainId: number): boolean {
    this.ensureInitialized();
    return this.chainLoader.getChain(chainId) !== null;
  }

  /**
   * Checks if chain data needs to be refreshed
   * @returns true if data is stale and should be refreshed
   */
  isDataStale(): boolean {
    return this.chainLoader.isDataStale();
  }
}