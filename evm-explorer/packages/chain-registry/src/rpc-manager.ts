import { createPublicClient, http, webSocket, type PublicClient } from 'viem';
import type { RpcEndpoint, HealthCheckResult, MultiRpcOptions } from './types';
import { ChainDataLoader } from './chains';

/**
 * RPCManager handles the complexities of connecting to blockchain RPC endpoints.
 * 
 * Key features:
 * - Health checking of RPC endpoints with caching
 * - Automatic failover to healthy endpoints
 * - Support for multiple simultaneous connections (for mempool aggregation)
 * - Reliability scoring based on success/failure rates
 * - Provider diversity for comprehensive mempool coverage
 * 
 * For mempool monitoring, it's important to query multiple RPC providers because:
 * 1. Different nodes may have different pending transactions
 * 2. Geographic distribution affects which transactions are seen first
 * 3. Some providers may filter or prioritize certain types of transactions
 */
export class RPCManager {
  private chainLoader: ChainDataLoader;
  
  /** Cache of health check results keyed by "chainId:url" */
  private healthCache: Map<string, HealthCheckResult & { timestamp: number }> = new Map();
  
  /** Maximum number of endpoints to check per chain */
  private maxEndpointsPerChain: number;
  
  /** Timeout for health check requests in milliseconds */
  private healthCheckTimeout: number;
  
  /** Cache duration for healthy endpoints (5 minutes) */
  private readonly HEALTH_CACHE_DURATION = 5 * 60 * 1000;
  
  /** Cache duration for unhealthy endpoints (1 minute) */
  private readonly UNHEALTHY_CACHE_DURATION = 60 * 1000;

  constructor(
    chainLoader: ChainDataLoader,
    options: {
      maxEndpointsPerChain?: number;
      healthCheckTimeout?: number;
    } = {}
  ) {
    this.chainLoader = chainLoader;
    this.maxEndpointsPerChain = options.maxEndpointsPerChain || 5;
    this.healthCheckTimeout = options.healthCheckTimeout || 5000;
  }

  /**
   * Gets multiple healthy endpoints for a chain, prioritizing diversity
   * This is crucial for mempool aggregation to get different perspectives
   * 
   * @param chainId - The chain to get endpoints for
   * @param count - Number of endpoints to return (default: 1)
   * @returns Array of healthy RPC endpoints
   * @throws Error if no healthy endpoints are found
   */
  async getHealthyEndpoints(chainId: number, count = 1): Promise<RpcEndpoint[]> {
    const allEndpoints = this.chainLoader.getRpcEndpoints(chainId);
    if (allEndpoints.length === 0) {
      throw new Error(`No RPC endpoints found for chain ${chainId}`);
    }

    // Filter to only HTTP endpoints for now (WebSocket health checks are more complex)
    const httpEndpoints = allEndpoints.filter(e => !e.isWebSocket);
    
    // Check health of endpoints in parallel (limited to maxEndpointsPerChain)
    const healthChecks = await Promise.allSettled(
      httpEndpoints.slice(0, this.maxEndpointsPerChain).map(async (endpoint) => {
        const health = await this.checkEndpointHealth(endpoint.url, chainId);
        return { endpoint, health };
      })
    );

    // Filter to only healthy endpoints and sort by latency
    const healthyEndpoints = healthChecks
      .filter((result): result is PromiseFulfilledResult<{ endpoint: RpcEndpoint; health: HealthCheckResult }> => 
        result.status === 'fulfilled' && result.value.health.healthy
      )
      .map(result => result.value)
      .sort((a, b) => (a.health.latency || Infinity) - (b.health.latency || Infinity))
      .slice(0, count)
      .map(({ endpoint }) => endpoint);

    if (healthyEndpoints.length === 0) {
      throw new Error(`No healthy RPC endpoints found for chain ${chainId}`);
    }

    return healthyEndpoints;
  }

  /**
   * Gets a single healthy endpoint for a chain
   * @param chainId - The chain to get an endpoint for
   * @returns URL of a healthy endpoint
   * @throws Error if no healthy endpoints are found
   */
  async getHealthyEndpoint(chainId: number): Promise<string> {
    const endpoints = await this.getHealthyEndpoints(chainId, 1);
    return endpoints[0].url;
  }

  /**
   * Gets multiple diverse endpoints for mempool aggregation
   * Prioritizes getting endpoints from different providers to maximize
   * the diversity of mempool data collected
   * 
   * @param chainId - The chain to get endpoints for
   * @param options - Options for endpoint selection
   * @returns Array of diverse healthy endpoints
   */
  async getDiverseHealthyEndpoints(
    chainId: number, 
    options: MultiRpcOptions = {}
  ): Promise<RpcEndpoint[]> {
    const {
      clientCount = 3,
      includeWebSocket = false,
      minReliability = 0.3,
      preferDiverse = true
    } = options;

    const endpointsByProvider = this.chainLoader.getRpcEndpointsByProvider(chainId);
    const selectedEndpoints: RpcEndpoint[] = [];
    const usedProviders = new Set<string>();

    // First pass: try to get one endpoint from each provider
    if (preferDiverse) {
      for (const [provider, endpoints] of endpointsByProvider) {
        if (selectedEndpoints.length >= clientCount) break;
        
        const validEndpoints = endpoints.filter(e => 
          (includeWebSocket || !e.isWebSocket) &&
          (e.reliability || 0.5) >= minReliability
        );

        if (validEndpoints.length > 0) {
          // Check health of the first valid endpoint from this provider
          try {
            const endpoint = validEndpoints[0];
            const health = await this.checkEndpointHealth(endpoint.url, chainId);
            if (health.healthy) {
              selectedEndpoints.push(endpoint);
              usedProviders.add(provider);
            }
          } catch {
            // Skip unhealthy endpoints
          }
        }
      }
    }

    // Second pass: fill remaining slots with any healthy endpoints
    if (selectedEndpoints.length < clientCount) {
      const allEndpoints = this.chainLoader.getRpcEndpoints(chainId)
        .filter(e => 
          (includeWebSocket || !e.isWebSocket) &&
          (e.reliability || 0.5) >= minReliability &&
          !usedProviders.has(e.tracking || 'Unknown')
        );

      const additionalChecks = await Promise.allSettled(
        allEndpoints.map(async (endpoint) => {
          const health = await this.checkEndpointHealth(endpoint.url, chainId);
          return { endpoint, health };
        })
      );

      const additionalHealthy = additionalChecks
        .filter((result): result is PromiseFulfilledResult<{ endpoint: RpcEndpoint; health: HealthCheckResult }> => 
          result.status === 'fulfilled' && result.value.health.healthy
        )
        .map(result => result.value.endpoint)
        .slice(0, clientCount - selectedEndpoints.length);

      selectedEndpoints.push(...additionalHealthy);
    }

    if (selectedEndpoints.length === 0) {
      throw new Error(`No healthy RPC endpoints found for chain ${chainId}`);
    }

    return selectedEndpoints;
  }

  /**
   * Checks the health of an RPC endpoint
   * Health is determined by ability to fetch the latest block number
   * Results are cached to avoid excessive health checks
   * 
   * @param url - The RPC endpoint URL to check
   * @param chainId - The chain ID (used for caching)
   * @returns Health check result with latency and block number
   */
  async checkEndpointHealth(url: string, chainId: number): Promise<HealthCheckResult> {
    // Check cache first
    const cacheKey = `${chainId}:${url}`;
    const cached = this.healthCache.get(cacheKey);
    
    if (cached) {
      const cacheAge = Date.now() - cached.timestamp;
      const maxAge = cached.healthy ? this.HEALTH_CACHE_DURATION : this.UNHEALTHY_CACHE_DURATION;
      
      if (cacheAge < maxAge) {
        // Return cached result without timestamp
        const { timestamp, ...result } = cached;
        return result;
      }
    }

    const startTime = Date.now();
    
    try {
      const client = createPublicClient({
        transport: http(url, {
          timeout: this.healthCheckTimeout,
        }),
      });

      // Simple health check - get latest block number
      // This verifies the endpoint is responsive and synced
      const blockNumber = await client.getBlockNumber();
      
      const result: HealthCheckResult = {
        healthy: true,
        latency: Date.now() - startTime,
        blockNumber,
      };

      // Cache the result with timestamp
      this.healthCache.set(cacheKey, { ...result, timestamp: Date.now() });

      // Update endpoint reliability score
      this.updateReliabilityScore(url, chainId, true);

      return result;
    } catch (error) {
      const result: HealthCheckResult = {
        healthy: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      // Cache failed results for shorter duration
      this.healthCache.set(cacheKey, { ...result, timestamp: Date.now() });

      // Update endpoint reliability score
      this.updateReliabilityScore(url, chainId, false);

      return result;
    }
  }

  /**
   * Updates the reliability score of an endpoint based on health check results
   * This helps prioritize more reliable endpoints over time
   * 
   * @param url - The endpoint URL
   * @param chainId - The chain ID
   * @param success - Whether the health check succeeded
   */
  private updateReliabilityScore(url: string, chainId: number, success: boolean): void {
    const endpoints = this.chainLoader.getRpcEndpoints(chainId);
    const endpoint = endpoints.find(e => e.url === url);
    
    if (endpoint) {
      // Simple exponential moving average
      const currentScore = endpoint.reliability || 0.5;
      const factor = 0.1; // Adjust how quickly the score changes
      endpoint.reliability = success 
        ? currentScore + (1 - currentScore) * factor
        : currentScore * (1 - factor);
      
      // Clamp between 0 and 1
      endpoint.reliability = Math.max(0, Math.min(1, endpoint.reliability));
    }
  }

  /**
   * Creates a Viem public client for interacting with the blockchain
   * Automatically selects a healthy endpoint and handles WebSocket vs HTTP
   * 
   * @param chainId - The chain to create a client for
   * @returns Configured PublicClient instance
   */
  async createPublicClient(chainId: number): Promise<PublicClient> {
    const endpoint = await this.getHealthyEndpoint(chainId);
    const isWs = endpoint.startsWith('ws://') || endpoint.startsWith('wss://');

    return createPublicClient({
      transport: isWs ? webSocket(endpoint) : http(endpoint),
      batch: {
        multicall: true,
      },
    }) as unknown as PublicClient;
  }

  /**
   * Creates multiple public clients for mempool aggregation
   * Each client connects to a different RPC provider when possible
   * 
   * @param chainId - The chain to create clients for
   * @param options - Options for client creation
   * @returns Array of configured PublicClient instances
   */
  async createMultiplePublicClients(
    chainId: number,
    options: MultiRpcOptions = {}
  ): Promise<PublicClient[]> {
    const endpoints = await this.getDiverseHealthyEndpoints(chainId, options);
    
    return Promise.all(
      endpoints.map(endpoint => {
        const isWs = endpoint.isWebSocket || false;
        return createPublicClient({
          transport: isWs ? webSocket(endpoint.url) : http(endpoint.url),
          batch: {
            multicall: true,
          },
        }) as unknown as PublicClient;
      })
    );
  }

  /**
   * Clears the health check cache
   * Useful when you want to force re-checking of all endpoints
   */
  clearHealthCache(): void {
    this.healthCache.clear();
  }

  /**
   * Gets the current health status of all endpoints for a chain
   * Useful for debugging and monitoring
   * 
   * @param chainId - The chain to get health status for
   * @returns Map of endpoint URL to health status
   */
  getHealthStatus(chainId: number): Map<string, HealthCheckResult> {
    const status = new Map<string, HealthCheckResult>();
    const prefix = `${chainId}:`;
    
    for (const [key, value] of this.healthCache.entries()) {
      if (key.startsWith(prefix)) {
        const url = key.substring(prefix.length);
        const { timestamp, ...health } = value;
        status.set(url, health);
      }
    }
    
    return status;
  }

  /**
   * Gets reliability scores for all endpoints of a chain
   * @param chainId - The chain to get reliability scores for
   * @returns Map of endpoint URL to reliability score
   */
  getReliabilityScores(chainId: number): Map<string, number> {
    const endpoints = this.chainLoader.getRpcEndpoints(chainId);
    const scores = new Map<string, number>();
    
    for (const endpoint of endpoints) {
      scores.set(endpoint.url, endpoint.reliability || 0.5);
    }
    
    return scores;
  }
}