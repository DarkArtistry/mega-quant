import type { 
  ProtocolInfo, 
  ProtocolRegistryOptions, 
  ProtocolLookupResult, 
  RegistryStats 
} from './types';
import { ProtocolDataLoader } from './loader';
import { ManualProtocolRegistry } from './manual-registry';
import { AbiLoader } from './abi-loader';
import type { ChainRegistry } from '@evm-explorer/chain-registry';
import type { Abi } from 'viem';

/**
 * ProtocolRegistry is the main class for protocol identification and management.
 * 
 * It combines data from multiple sources:
 * 1. High-confidence manual registry for critical protocols
 * 2. DefiLlama API for comprehensive protocol coverage
 * 3. Optional custom protocols added at runtime
 * 
 * The registry is optimized for fast lookups during transaction processing
 * and provides confidence scores to indicate data reliability.
 * 
 * @example
 * ```typescript
 * const chainRegistry = new ChainRegistry();
 * await chainRegistry.initialize();
 * 
 * const registry = new ProtocolRegistry(chainRegistry);
 * await registry.initialize();
 * 
 * // Lookup a protocol by address
 * const result = registry.lookup('0x7a250d5630b4cf539739df2c5dacb4c659f2488d', 1);
 * if (result) {
 *   console.log(`Found ${result.protocol.name} (${result.confidence} confidence)`);
 * }
 * ```
 */
export class ProtocolRegistry {
  /** Data loader for fetching from DefiLlama */
  private loader: ProtocolDataLoader;
  
  /** ABI loader for fetching contract ABIs */
  private abiLoader: AbiLoader;
  
  /** Chain registry for chain information */
  private chainRegistry: ChainRegistry;
  
  /** Map for fast address lookups: chainId:address -> ProtocolInfo */
  private protocolMap: Map<string, ProtocolInfo> = new Map();
  
  /** Whether the registry has been initialized */
  private initialized = false;
  
  /** Registry configuration options */
  private options: {
    cacheExpiry: number;
    batchSize: number;
    includeTvl: boolean;
    etherscanApiKey: string | undefined;
  };
  
  /** Statistics about the registry */
  private stats: RegistryStats = {
    totalProtocols: 0,
    totalAddresses: 0,
    byCategory: {},
    byChain: {},
    lastUpdated: new Date(),
  };

  /**
   * Creates a new ProtocolRegistry instance
   * @param chainRegistry - Chain registry instance for chain information
   * @param options - Configuration options
   */
  constructor(chainRegistry: ChainRegistry, options: ProtocolRegistryOptions = {}) {
    this.chainRegistry = chainRegistry;
    this.options = {
      cacheExpiry: options.cacheExpiry ?? 6 * 60 * 60 * 1000, // 6 hours
      batchSize: options.batchSize ?? 1000,
      includeTvl: options.includeTvl ?? false,
      etherscanApiKey: options.etherscanApiKey ?? undefined,
    };

    this.loader = new ProtocolDataLoader(
      this.chainRegistry,
      this.options.cacheExpiry
    );
    
    this.abiLoader = new AbiLoader(
      this.chainRegistry,
      this.options.etherscanApiKey
    );
  }

  /**
   * Initializes the registry by loading protocol data
   * Must be called before using lookup methods
   * 
   * @throws Error if unable to load protocol data
   */
  async initialize(): Promise<void> {
    if (this.initialized && !this.loader.isDataStale()) {
      return;
    }

    console.log('Initializing protocol registry...');
    
    try {
      // Clear existing data
      this.protocolMap.clear();
      
      // Load manual protocols first (highest priority)
      const manualProtocols = ManualProtocolRegistry.getAll();
      for (const protocol of manualProtocols) {
        this.addToMap(protocol);
      }
      console.log(`Loaded ${manualProtocols.length} manual protocols`);

      // Load protocols from DefiLlama
      const defiLlamaProtocols = await this.loader.fetchProtocols();
      const processedProtocols = this.loader.processProtocols(defiLlamaProtocols);
      
      // Add DefiLlama protocols (skip if address already exists from manual registry)
      let addedCount = 0;
      for (const protocol of processedProtocols) {
        if (this.addToMap(protocol, true)) {
          addedCount++;
        }
      }
      console.log(`Loaded ${addedCount} protocols from DefiLlama`);

      // Update statistics
      this.updateStats();
      
      this.initialized = true;
      console.log(`Protocol registry initialized with ${this.stats.totalProtocols} protocols`);
    } catch (error) {
      console.error('Failed to initialize protocol registry:', error);
      
      // If we have some data (manual protocols), continue with partial data
      if (this.protocolMap.size > 0) {
        console.warn('Continuing with partial protocol data');
        this.updateStats();
        this.initialized = true;
      } else {
        throw new Error('Unable to initialize protocol registry');
      }
    }
  }

  /**
   * Adds a protocol to the internal map
   * @param protocol - Protocol to add
   * @param skipIfExists - Skip if address already exists (for lower priority sources)
   * @returns true if protocol was added, false if skipped
   */
  private addToMap(protocol: ProtocolInfo, skipIfExists = false): boolean {
    const key = this.makeKey(protocol.chainId, protocol.address);
    
    if (skipIfExists && this.protocolMap.has(key)) {
      return false;
    }
    
    this.protocolMap.set(key, protocol);
    return true;
  }

  /**
   * Creates a lookup key from chain ID and address
   * @param chainId - Chain ID
   * @param address - Contract address
   * @returns Normalized lookup key
   */
  private makeKey(chainId: number, address: string): string {
    return `${chainId}:${address.toLowerCase()}`;
  }

  /**
   * Updates registry statistics
   */
  private updateStats(): void {
    const byCategory: Record<string, number> = {};
    const byChain: Record<number, number> = {};
    const uniqueAddresses = new Set<string>();

    for (const protocol of this.protocolMap.values()) {
      // Count by category
      byCategory[protocol.category] = (byCategory[protocol.category] || 0) + 1;
      
      // Count by chain
      byChain[protocol.chainId] = (byChain[protocol.chainId] || 0) + 1;
      
      // Track unique addresses
      uniqueAddresses.add(protocol.address.toLowerCase());
    }

    this.stats = {
      totalProtocols: this.protocolMap.size,
      totalAddresses: uniqueAddresses.size,
      byCategory,
      byChain,
      lastUpdated: new Date(),
    };
  }

  /**
   * Ensures the registry is initialized
   * @throws Error if not initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('ProtocolRegistry not initialized. Call initialize() first.');
    }
  }

  /**
   * Looks up a protocol by address and chain
   * Returns detailed information including confidence score
   * 
   * @param address - Contract address to lookup
   * @param chainId - Chain ID where the contract is deployed
   * @returns Protocol information with confidence score, or null if not found
   */
  lookup(address: string, chainId: number): ProtocolLookupResult | null {
    this.ensureInitialized();
    
    const key = this.makeKey(chainId, address);
    const protocol = this.protocolMap.get(key);
    
    if (!protocol) {
      return null;
    }

    // Determine confidence and source based on manual registry presence
    const isManual = ManualProtocolRegistry.isKnownProtocol(address, chainId);
    
    return {
      protocol,
      confidence: isManual ? 'high' : 'medium',
      source: isManual ? 'manual' : 'defiLlama',
    };
  }

  /**
   * Quick lookup that just returns the protocol info
   * Use this for performance-critical paths where confidence isn't needed
   * 
   * @param address - Contract address to lookup
   * @param chainId - Chain ID where the contract is deployed
   * @returns Protocol info or null if not found
   */
  quickLookup(address: string, chainId: number): ProtocolInfo | null {
    this.ensureInitialized();
    
    const key = this.makeKey(chainId, address);
    return this.protocolMap.get(key) || null;
  }

  /**
   * Batch lookup for multiple addresses
   * Optimized for processing many transactions at once
   *
   * @param lookups - Array of {address, chainId} to lookup
   * @returns Map of address -> lookup result
   */
  batchLookup(
    lookups: Array<{ address: string; chainId: number }>
  ): Map<string, ProtocolLookupResult | null> {
    this.ensureInitialized();

    const results = new Map<string, ProtocolLookupResult | null>();

    for (const { address, chainId } of lookups) {
      // Use lowercase address as key for consistency
      results.set(address.toLowerCase(), this.lookup(address, chainId));
    }

    return results;
  }

  /**
   * Gets all protocols for a specific chain
   * @param chainId - Chain ID to filter by
   * @returns Array of protocols on that chain
   */
  getProtocolsByChain(chainId: number): ProtocolInfo[] {
    this.ensureInitialized();
    
    const protocols: ProtocolInfo[] = [];
    
    for (const protocol of this.protocolMap.values()) {
      if (protocol.chainId === chainId) {
        protocols.push(protocol);
      }
    }
    
    return protocols;
  }

  /**
   * Gets all protocols in a specific category
   * @param category - Category to filter by (e.g., "DEX", "Lending")
   * @returns Array of protocols in that category
   */
  getProtocolsByCategory(category: string): ProtocolInfo[] {
    this.ensureInitialized();
    
    const protocols: ProtocolInfo[] = [];
    
    for (const protocol of this.protocolMap.values()) {
      if (protocol.category === category) {
        protocols.push(protocol);
      }
    }
    
    return protocols;
  }

  /**
   * Searches for protocols by name
   * @param query - Search query (case-insensitive)
   * @returns Array of matching protocols
   */
  searchByName(query: string): ProtocolInfo[] {
    this.ensureInitialized();
    
    const lowerQuery = query.toLowerCase();
    const results: ProtocolInfo[] = [];
    const seen = new Set<string>();
    
    for (const protocol of this.protocolMap.values()) {
      if (protocol.name.toLowerCase().includes(lowerQuery)) {
        // Deduplicate by name (protocols can have multiple addresses)
        const key = `${protocol.name}-${protocol.chainId}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push(protocol);
        }
      }
    }
    
    return results;
  }

  /**
   * Adds a custom protocol at runtime
   * Useful for testing or adding protocols not in DefiLlama
   * 
   * @param protocol - Protocol information to add
   */
  addCustomProtocol(protocol: ProtocolInfo): void {
    this.ensureInitialized();
    
    this.addToMap(protocol);
    this.updateStats();
  }

  /**
   * Gets registry statistics
   * @returns Current statistics about the registry
   */
  getStats(): RegistryStats {
    this.ensureInitialized();
    return { ...this.stats };
  }

  /**
   * Refreshes protocol data from external sources
   * @param force - Force refresh even if cache is not expired
   */
  async refresh(force = false): Promise<void> {
    if (!force && !this.loader.isDataStale()) {
      return;
    }

    // Clear cache and reinitialize
    this.loader.clearCache();
    this.initialized = false;
    await this.initialize();
  }

  /**
   * Gets all unique protocol names
   * @returns Sorted array of protocol names
   */
  getProtocolNames(): string[] {
    this.ensureInitialized();
    
    const names = new Set<string>();
    for (const protocol of this.protocolMap.values()) {
      names.add(protocol.name);
    }
    
    return Array.from(names).sort();
  }

  /**
   * Gets all unique categories
   * @returns Sorted array of categories
   */
  getCategories(): string[] {
    this.ensureInitialized();
    
    const categories = new Set<string>();
    for (const protocol of this.protocolMap.values()) {
      categories.add(protocol.category);
    }
    
    return Array.from(categories).sort();
  }

  /**
   * Exports all protocol data
   * Useful for debugging or generating static datasets
   * 
   * @returns Array of all protocols
   */
  exportAll(): ProtocolInfo[] {
    this.ensureInitialized();
    return Array.from(this.protocolMap.values());
  }

  /**
   * Gets ABI for a protocol address
   * Fetches from multiple sources: manual, Etherscan, Sourcify
   * 
   * @param address - Protocol contract address
   * @param chainId - Chain ID where the protocol is deployed
   * @returns Contract ABI or null if not found
   */
  async getProtocolAbi(address: string, chainId: number): Promise<Abi | null> {
    // No need to check if initialized for ABI fetching
    return this.abiLoader.getAbi(address, chainId);
  }

  /**
   * Gets function signature for a 4-byte selector
   * Useful as fallback when full ABI is not available
   * 
   * @param selector - 4-byte function selector (e.g., "0x12345678")
   * @returns Function signature or null
   */
  async getFunctionSignature(selector: string): Promise<string | null> {
    return this.abiLoader.getFunctionSignature(selector);
  }

  /**
   * Batch fetch ABIs for multiple protocols
   * Useful when processing many transactions
   * 
   * @param protocols - Array of {address, chainId} to fetch ABIs for
   * @returns Map of "chainId:address" -> ABI
   */
  async batchGetAbis(
    protocols: Array<{ address: string; chainId: number }>
  ): Promise<Map<string, Abi | null>> {
    const results = new Map<string, Abi | null>();
    
    // Use Promise.all for concurrent fetching
    await Promise.all(
      protocols.map(async ({ address, chainId }) => {
        const key = `${chainId}:${address.toLowerCase()}`;
        const abi = await this.getProtocolAbi(address, chainId);
        results.set(key, abi);
      })
    );
    
    return results;
  }

  /**
   * Clears all caches including ABI cache
   */
  clearAllCaches(): void {
    this.loader.clearCache();
    this.abiLoader.clearCache();
  }
}