import type { Address } from 'viem';

/**
 * Represents a DeFi protocol as returned by DefiLlama API
 * Contains comprehensive information about the protocol across chains
 */
export interface DefiLlamaProtocol {
  /** Unique identifier for the protocol */
  id: string;
  /** Display name of the protocol */
  name: string;
  /** Contract addresses - can be string or object mapping chain to addresses */
  address?: string | Record<string, string | string[]>;
  /** Protocol symbol/ticker */
  symbol?: string;
  /** URL to the protocol's website */
  url?: string;
  /** Brief description of the protocol */
  description?: string;
  /** Array of chain names where the protocol is deployed */
  chains: string[];
  /** URL to the protocol's logo */
  logo?: string;
  /** Twitter/X handle */
  twitter?: string;
  /** Primary category (e.g., "Dexes", "Lending", "Yield") */
  category?: string;
  /** Total Value Locked in USD */
  tvl?: number;
  /** Chain-specific TVL data */
  chainTvls?: Record<string, number>;
  /** Unique user count */
  users?: number;
  /** Protocol token information */
  tokens?: Array<{
    symbol: string;
    address: string;
    chain: string;
  }>;
  /** When the protocol was added to DefiLlama */
  listedAt?: number;
}

/**
 * Simplified protocol information stored in our registry
 * Optimized for quick lookups and transaction enrichment
 */
export interface ProtocolInfo {
  /** Protocol name */
  name: string;
  /** Protocol category (DEX, Lending, etc.) */
  category: string;
  /** Chain ID where this specific contract is deployed */
  chainId: number;
  /** Contract address on this chain */
  address: Address;
  /** Logo identifier for UI display */
  logo?: string;
  /** TVL on this specific chain */
  tvl?: number;
  /** Additional metadata */
  metadata?: {
    symbol?: string;
    website?: string;
    twitter?: string;
  };
}

// Chain name mapping will be provided dynamically from chain-registry

/**
 * Configuration options for the Protocol Registry
 */
export interface ProtocolRegistryOptions {
  /** How long to cache protocol data in milliseconds (default: 6 hours) */
  cacheExpiry?: number;
  /** Maximum number of protocols to fetch in one batch */
  batchSize?: number;
  /** Whether to include TVL data (requires additional API calls) */
  includeTvl?: boolean;
  /** Etherscan API key (v2 supports 60+ chains) */
  etherscanApiKey?: string;
}

/**
 * Protocol lookup result with enriched information
 */
export interface ProtocolLookupResult {
  /** The protocol information */
  protocol: ProtocolInfo;
  /** Whether this is a verified/high-confidence match */
  confidence: 'high' | 'medium' | 'low';
  /** Source of the protocol data */
  source: 'defiLlama' | 'manual' | 'community';
}

/**
 * Statistics about the protocol registry
 */
export interface RegistryStats {
  /** Total number of protocols */
  totalProtocols: number;
  /** Number of unique addresses tracked */
  totalAddresses: number;
  /** Breakdown by category */
  byCategory: Record<string, number>;
  /** Breakdown by chain */
  byChain: Record<number, number>;
  /** Last update timestamp */
  lastUpdated: Date;
}