import type { DefiLlamaProtocol, ProtocolInfo } from './types';
import type { Address } from 'viem';
import type { ChainRegistry } from '@evm-explorer/chain-registry';

/**
 * ProtocolDataLoader fetches and processes protocol data from DefiLlama
 * 
 * This class handles:
 * - Fetching protocol lists from DefiLlama API
 * - Processing and normalizing protocol data
 * - Converting chain names to chain IDs using ChainRegistry
 * - Extracting contract addresses across multiple chains
 * - Caching to reduce API calls
 */
export class ProtocolDataLoader {
  /** Base URL for DefiLlama API */
  private readonly API_BASE = 'https://api.llama.fi';
  
  /** Cache for raw protocol data */
  private protocolsCache: DefiLlamaProtocol[] | null = null;
  
  /** Timestamp of last fetch */
  private lastFetch: Date | null = null;
  
  /** Cache expiry duration in milliseconds */
  private cacheExpiry: number;
  
  /** Chain registry for name to ID mapping */
  private chainRegistry: ChainRegistry;
  
  /** Cache for chain name mappings */
  private chainNameCache: Map<string, number> = new Map();

  /**
   * Creates a new ProtocolDataLoader instance
   * @param chainRegistry - Chain registry instance for chain name resolution
   * @param cacheExpiry - How long to cache data (default: 6 hours)
   */
  constructor(
    chainRegistry: ChainRegistry,
    cacheExpiry = 6 * 60 * 60 * 1000 // 6 hours default
  ) {
    this.chainRegistry = chainRegistry;
    this.cacheExpiry = cacheExpiry;
  }

  /**
   * Fetches all protocols from DefiLlama
   * Results are cached to avoid excessive API calls
   * 
   * @returns Array of DefiLlama protocol data
   * @throws Error if the API request fails
   */
  async fetchProtocols(): Promise<DefiLlamaProtocol[]> {
    // Check cache validity
    if (this.protocolsCache && this.lastFetch) {
      const cacheAge = Date.now() - this.lastFetch.getTime();
      if (cacheAge < this.cacheExpiry) {
        return this.protocolsCache;
      }
    }

    try {
      console.log('Fetching protocols from DefiLlama...');
      const response = await fetch(`${this.API_BASE}/protocols`);
      
      if (!response.ok) {
        throw new Error(`DefiLlama API error: ${response.statusText}`);
      }

      const protocols: DefiLlamaProtocol[] = await response.json();
      
      // Cache the results
      this.protocolsCache = protocols;
      this.lastFetch = new Date();
      
      console.log(`Fetched ${protocols.length} protocols from DefiLlama`);
      return protocols;
    } catch (error) {
      console.error('Failed to fetch protocols from DefiLlama:', error);
      
      // Return cached data if available, even if expired
      if (this.protocolsCache) {
        console.warn('Using expired cache due to fetch failure');
        return this.protocolsCache;
      }
      
      throw new Error('Unable to fetch protocol data');
    }
  }

  /**
   * Processes DefiLlama protocols into our simplified format
   * Extracts addresses for each chain and creates ProtocolInfo entries
   * 
   * @param protocols - Raw DefiLlama protocol data
   * @returns Processed protocol information
   */
  processProtocols(protocols: DefiLlamaProtocol[]): ProtocolInfo[] {
    const processedProtocols: ProtocolInfo[] = [];

    for (const protocol of protocols) {
      // Extract addresses based on the format
      const addressesByChain = this.extractAddresses(protocol);

      // If protocol has addresses, process them
      if (Object.keys(addressesByChain).length > 0) {
        // Create a ProtocolInfo entry for each chain/address combination
        for (const [chainName, addresses] of Object.entries(addressesByChain)) {
          const chainId = this.resolveChainId(chainName);
          if (!chainId) {
            // Skip unknown chains
            continue;
          }

          for (const address of addresses) {
            processedProtocols.push({
              name: protocol.name,
              category: protocol.category || 'DeFi',
              chainId,
              address: address as Address,
              logo: this.extractLogoName(protocol.logo),
              tvl: protocol.chainTvls?.[chainName],
              metadata: {
                symbol: protocol.symbol,
                website: protocol.url,
                twitter: protocol.twitter,
              },
            });
          }
        }
      } else if (protocol.chains && protocol.chains.length > 0) {
        // For protocols without addresses but with chain information,
        // create entries with a placeholder address (for indexing/tracking purposes)
        for (const chainName of protocol.chains) {
          const chainId = this.resolveChainId(chainName);
          if (!chainId) {
            // Skip unknown chains
            continue;
          }

          processedProtocols.push({
            name: protocol.name,
            category: protocol.category || 'DeFi',
            chainId,
            address: '0x0000000000000000000000000000000000000000' as Address,
            logo: this.extractLogoName(protocol.logo),
            tvl: protocol.chainTvls?.[chainName],
            metadata: {
              symbol: protocol.symbol,
              website: protocol.url,
              twitter: protocol.twitter,
            },
          });
        }
      }
    }

    return processedProtocols;
  }

  /**
   * Extracts addresses from various DefiLlama format
   * Handles both string and object address formats
   * 
   * @param protocol - DefiLlama protocol data
   * @returns Map of chain name to addresses
   */
  private extractAddresses(protocol: DefiLlamaProtocol): Record<string, string[]> {
    const addressesByChain: Record<string, string[]> = {};

    if (!protocol.address) return addressesByChain;

    // Handle simple string address (usually on Ethereum)
    if (typeof protocol.address === 'string') {
      // Default to Ethereum if chains array is empty or contains Ethereum
      if (!protocol.chains.length || protocol.chains.includes('Ethereum')) {
        addressesByChain['Ethereum'] = [protocol.address.toLowerCase()];
      }
      
      // For single address, assume it's deployed on all listed chains with same address
      // This is common for protocols using CREATE2 for deterministic addresses
      for (const chain of protocol.chains) {
        if (chain !== 'Ethereum') {
          addressesByChain[chain] = [protocol.address.toLowerCase()];
        }
      }
    } 
    // Handle object format with chain-specific addresses
    else if (typeof protocol.address === 'object') {
      for (const [chain, addr] of Object.entries(protocol.address)) {
        if (typeof addr === 'string') {
          addressesByChain[chain] = [addr.toLowerCase()];
        } else if (Array.isArray(addr)) {
          addressesByChain[chain] = addr.map(a => a.toLowerCase());
        }
      }
    }

    return addressesByChain;
  }

  /**
   * Extracts a simple logo name from a URL
   * Used for consistent logo references
   * 
   * @param logoUrl - Full URL to logo image
   * @returns Simplified logo name or undefined
   */
  private extractLogoName(logoUrl?: string): string | undefined {
    if (!logoUrl) return undefined;
    
    try {
      // Extract filename without extension
      const parts = logoUrl.split('/');
      const filename = parts[parts.length - 1];
      return filename.split('.')[0].toLowerCase();
    } catch {
      return undefined;
    }
  }

  /**
   * Gets protocol statistics
   * @returns Statistics about the loaded protocols
   */
  getStats(protocols: ProtocolInfo[]): {
    totalProtocols: number;
    uniqueNames: number;
    byCategory: Record<string, number>;
    byChain: Record<number, number>;
  } {
    const uniqueNames = new Set(protocols.map(p => p.name));
    const byCategory: Record<string, number> = {};
    const byChain: Record<number, number> = {};

    for (const protocol of protocols) {
      // Count by category
      byCategory[protocol.category] = (byCategory[protocol.category] || 0) + 1;
      
      // Count by chain
      byChain[protocol.chainId] = (byChain[protocol.chainId] || 0) + 1;
    }

    return {
      totalProtocols: protocols.length,
      uniqueNames: uniqueNames.size,
      byCategory,
      byChain,
    };
  }

  /**
   * Checks if cached data is stale
   * @returns true if data should be refreshed
   */
  isDataStale(): boolean {
    if (!this.lastFetch) return true;
    return Date.now() - this.lastFetch.getTime() >= this.cacheExpiry;
  }

  /**
   * Clears the cache, forcing a fresh fetch on next request
   */
  clearCache(): void {
    this.protocolsCache = null;
    this.lastFetch = null;
    this.chainNameCache.clear();
  }

  /**
   * Resolves a chain name to its ID using the chain registry
   * Results are cached for performance
   * 
   * @param chainName - Name of the chain (e.g., "Ethereum", "Polygon")
   * @returns Chain ID or null if not found
   */
  private resolveChainId(chainName: string): number | null {
    // Check cache first
    if (this.chainNameCache.has(chainName)) {
      return this.chainNameCache.get(chainName)!;
    }

    // Try to find chain by name in registry
    const chains = this.chainRegistry.getAllChains();

    // First try exact match
    let chain = chains.find(c => c.name === chainName);

    // If not found, try case-insensitive match
    if (!chain) {
      chain = chains.find(c => c.name.toLowerCase() === chainName.toLowerCase());
    }

    // Handle special cases and aliases - expanded mappings for DefiLlama
    if (!chain) {
      // More comprehensive aliases that map DefiLlama names to common chain registry names
      const aliases: Record<string, string[]> = {
        // BSC/BNB variations
        'Binance': ['BSC', 'BNB Chain', 'Binance Smart Chain'],
        'BSC': ['BSC', 'BNB Chain', 'Binance Smart Chain'],
        'Binance Smart Chain': ['BSC', 'BNB Chain'],
        'BNB Chain': ['BSC', 'BNB Chain'],

        // Gnosis variations
        'xDai': ['Gnosis', 'xDai', 'Gnosis Chain'],
        'xDAI': ['Gnosis', 'xDai', 'Gnosis Chain'],
        'Gnosis': ['Gnosis', 'xDai'],

        // Avalanche variations
        'Avalanche': ['Avalanche', 'Avalanche C-Chain', 'AVAX'],
        'Avalanche C-Chain': ['Avalanche', 'Avalanche C-Chain'],

        // Polygon variations
        'Polygon': ['Polygon', 'Polygon PoS', 'Matic'],
        'Polygon PoS': ['Polygon', 'Polygon PoS'],
        'Matic': ['Polygon', 'Polygon PoS'],

        // Arbitrum variations
        'Arbitrum': ['Arbitrum', 'Arbitrum One'],
        'Arbitrum One': ['Arbitrum', 'Arbitrum One'],

        // Optimism variations
        'Optimism': ['Optimism', 'OP Mainnet'],
        'OP Mainnet': ['Optimism', 'OP Mainnet'],

        // zkSync variations
        'zkSync Era': ['zkSync', 'zkSync Era', 'zkSync 2.0'],
        'zkSync': ['zkSync', 'zkSync Era'],

        // Base
        'Base': ['Base'],

        // Other L2s and chains commonly seen in DefiLlama
        'Fantom': ['Fantom', 'Fantom Opera'],
        'Celo': ['Celo'],
        'Moonbeam': ['Moonbeam'],
        'Moonriver': ['Moonriver'],
        'Harmony': ['Harmony', 'Harmony One'],
        'Cronos': ['Cronos'],
        'Aurora': ['Aurora'],
        'Metis': ['Metis', 'Metis Andromeda'],
        'Boba': ['Boba', 'Boba Network'],
        'Scroll': ['Scroll'],
        'Linea': ['Linea'],
        'Mantle': ['Mantle'],
        'Mode': ['Mode'],
        'Blast': ['Blast'],
        'Zora': ['Zora'],
        'Fraxtal': ['Fraxtal'],
        'Taiko': ['Taiko'],
        'Sei': ['Sei'],
        'Manta': ['Manta', 'Manta Pacific'],
        'Polygon zkEVM': ['Polygon zkEVM'],
        'X Layer': ['X Layer', 'OKX X Layer'],
      };

      const possibleNames = aliases[chainName];
      if (possibleNames) {
        // Try each possible name
        for (const name of possibleNames) {
          chain = chains.find(c =>
            c.name === name ||
            c.name.toLowerCase() === name.toLowerCase()
          );
          if (chain) break;
        }
      }
    }

    if (chain) {
      this.chainNameCache.set(chainName, chain.chainId);
      return chain.chainId;
    }

    // Log unknown chains for debugging (but not for non-EVM chains we expect to skip)
    const nonEvmChains = ['Bitcoin', 'Solana', 'Tron', 'Cardano', 'Aptos', 'Sui', 'Near',
                          'Cosmos', 'Terra', 'Algorand', 'Stellar', 'Ripple', 'Doge',
                          'Litecoin', 'Polkadot', 'TON', 'Hedera', 'Injective', 'Stacks',
                          'Tezos', 'EOS', 'VeChain', 'Elrond', 'Radix', 'XPLA', 'Starknet',
                          'Ergo', 'Osmosis', 'Neutron', 'Celestia', 'Theta', 'IoTeX'];

    if (!nonEvmChains.includes(chainName)) {
      console.warn(`Unknown chain name in DefiLlama data: ${chainName}`);
    }

    return null;
  }
}