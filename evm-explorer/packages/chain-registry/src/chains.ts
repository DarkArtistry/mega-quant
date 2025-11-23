import type { ChainInfo, RpcEndpoint } from './types';

/**
 * ChainDataLoader is responsible for fetching and managing blockchain chain data from Chainlist.
 * It provides a cached, searchable registry of all EVM-compatible chains and their RPC endpoints.
 * 
 * Key responsibilities:
 * - Fetching chain data from Chainlist.org's public API
 * - Caching data to reduce API calls
 * - Extracting and categorizing RPC endpoints
 * - Providing search and query functionality for chains
 */
export class ChainDataLoader {
  /** Map of chainId -> ChainInfo for quick lookups */
  private chains: Map<number, ChainInfo> = new Map();
  
  /** Map of chainId -> RpcEndpoint[] for managing RPC endpoints per chain */
  private rpcEndpoints: Map<number, RpcEndpoint[]> = new Map();
  
  /** Timestamp of last successful data fetch from Chainlist */
  private lastFetch: Date | null = null;
  
  /** How long to cache chain data before refreshing (in milliseconds) */
  private cacheExpiry: number;

  /**
   * Creates a new ChainDataLoader instance
   * @param cacheExpiry - How long to cache data in milliseconds (default: 24 hours)
   */
  constructor(cacheExpiry = 24 * 60 * 60 * 1000) { // 24 hours default
    this.cacheExpiry = cacheExpiry;
  }

  /**
   * Loads chain data from Chainlist.org
   * This method fetches all EVM chain configurations including:
   * - Chain metadata (name, ID, native currency)
   * - RPC endpoints (filtered to remove template/private endpoints)
   * - Block explorers and other chain-specific data
   * 
   * The data is cached to avoid excessive API calls.
   * @throws Error if the fetch fails or Chainlist is unavailable
   */
  async loadFromChainlist(): Promise<void> {
    // Check if cached data is still valid
    if (this.lastFetch && Date.now() - this.lastFetch.getTime() < this.cacheExpiry) {
      return;
    }

    try {
      const response = await fetch('https://chainid.network/chains.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch chains: ${response.statusText}`);
      }

      const chains: ChainInfo[] = await response.json();
      
      // Clear existing data before loading new data
      this.chains.clear();
      this.rpcEndpoints.clear();

      // Process each chain from the response
      for (const chain of chains) {
        this.chains.set(chain.chainId, chain);
        
        // Extract RPC endpoints from the chain data
        // Note: Chainlist includes RPC URLs in an 'rpc' field not defined in ChainInfo type
        if ('rpc' in chain && Array.isArray((chain as any).rpc)) {
          const endpoints: RpcEndpoint[] = (chain as any).rpc
            // Filter out template URLs (containing ${...}) and API_KEY placeholders
            .filter((url: string) => url && !url.includes('${') && !url.includes('API_KEY'))
            .map((url: string) => ({
              url,
              isWebSocket: url.startsWith('ws://') || url.startsWith('wss://'),
              reliability: 0.5, // Start with neutral reliability score
              tracking: this.extractTracking(url),
            }));
          
          if (endpoints.length > 0) {
            this.rpcEndpoints.set(chain.chainId, endpoints);
          }
        }
      }

      this.lastFetch = new Date();
    } catch (error) {
      console.error('Failed to load chains from Chainlist:', error);
      throw new Error('Unable to initialize chain registry');
    }
  }

  /**
   * Extracts the RPC provider name from an endpoint URL
   * This helps identify which service is providing the RPC endpoint,
   * useful for analytics and choosing diverse providers for mempool aggregation
   * 
   * @param url - The RPC endpoint URL
   * @returns Provider name or 'Unknown' if not recognized
   */
  private extractTracking(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      
      // Common RPC providers - add more as discovered
      if (hostname.includes('llamarpc')) return 'LlamaNodes';
      if (hostname.includes('ankr')) return 'Ankr';
      if (hostname.includes('alchemy')) return 'Alchemy';
      if (hostname.includes('infura')) return 'Infura';
      if (hostname.includes('quicknode')) return 'QuickNode';
      if (hostname.includes('publicnode')) return 'PublicNode';
      if (hostname.includes('pokt')) return 'Pocket';
      if (hostname.includes('chainstack')) return 'Chainstack';
      if (hostname.includes('blastapi')) return 'BlastAPI';
      if (hostname.includes('gateway.tenderly')) return 'Tenderly';
      if (hostname.includes('rpc.xdaichain')) return 'xDai';
      if (hostname.includes('cloudflare-eth')) return 'Cloudflare';
      
      return 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Retrieves chain information by chain ID
   * @param chainId - The chain ID to look up
   * @returns ChainInfo object or null if chain not found
   */
  getChain(chainId: number): ChainInfo | null {
    return this.chains.get(chainId) || null;
  }

  /**
   * Gets all loaded chains
   * @returns Array of all ChainInfo objects
   */
  getChains(): ChainInfo[] {
    return Array.from(this.chains.values());
  }

  /**
   * Gets all RPC endpoints for a specific chain
   * @param chainId - The chain ID to get endpoints for
   * @returns Array of RPC endpoints, empty array if none found
   */
  getRpcEndpoints(chainId: number): RpcEndpoint[] {
    return this.rpcEndpoints.get(chainId) || [];
  }

  /**
   * Gets all chain IDs that have been loaded
   * @returns Array of chain IDs
   */
  getAllSupportedChainIds(): number[] {
    return Array.from(this.chains.keys());
  }

  /**
   * Searches for chains matching a query string
   * Searches across chain name, ID, native currency symbol, and short name
   * 
   * @param query - Search query (case-insensitive)
   * @returns Array of matching ChainInfo objects
   */
  searchChains(query: string): ChainInfo[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.chains.values()).filter(chain => 
      chain.name.toLowerCase().includes(lowerQuery) ||
      chain.chainId.toString().includes(lowerQuery) ||
      chain.nativeCurrency.symbol.toLowerCase().includes(lowerQuery) ||
      chain.shortName?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Gets RPC endpoints grouped by provider for diversity
   * Useful for mempool aggregation to query different node operators
   * 
   * @param chainId - The chain ID to get endpoints for
   * @returns Map of provider name to endpoints
   */
  getRpcEndpointsByProvider(chainId: number): Map<string, RpcEndpoint[]> {
    const endpoints = this.getRpcEndpoints(chainId);
    const grouped = new Map<string, RpcEndpoint[]>();
    
    for (const endpoint of endpoints) {
      const provider = endpoint.tracking || 'Unknown';
      const existing = grouped.get(provider) || [];
      existing.push(endpoint);
      grouped.set(provider, existing);
    }
    
    return grouped;
  }

  /**
   * Checks if data needs to be refreshed based on cache expiry
   * @returns true if data is stale and should be refreshed
   */
  isDataStale(): boolean {
    if (!this.lastFetch) return true;
    return Date.now() - this.lastFetch.getTime() >= this.cacheExpiry;
  }
}