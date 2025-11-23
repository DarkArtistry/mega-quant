/**
 * Protocol Registry Module
 * 
 * This module provides protocol identification and enrichment capabilities
 * for EVM transactions. It combines data from multiple sources to identify
 * which DeFi protocols are being interacted with in mempool transactions.
 * 
 * Main exports:
 * - ProtocolRegistry: Main class for protocol lookups and ABI fetching
 * - ProtocolDataLoader: Fetches data from DefiLlama API
 * - ManualProtocolRegistry: High-confidence manual protocol data
 * - AbiLoader: Fetches contract ABIs from multiple sources
 * - ManualAbiRegistry: Curated ABIs for critical protocols
 * - Types: TypeScript interfaces for protocol data
 */

export { ProtocolRegistry } from './registry';
export { ProtocolDataLoader } from './loader';
export { ManualProtocolRegistry } from './manual-registry';
export { AbiLoader } from './abi-loader';
export { ManualAbiRegistry } from './manual-abis';

export type {
  ProtocolInfo,
  DefiLlamaProtocol,
  ProtocolRegistryOptions,
  ProtocolLookupResult,
  RegistryStats,
} from './types';