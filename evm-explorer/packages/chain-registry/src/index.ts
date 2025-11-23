/**
 * @packageDocumentation
 * Chain Registry Module - Dynamic EVM Chain and RPC Management
 * 
 * This module provides a comprehensive solution for managing connections to
 * EVM-compatible blockchains. It dynamically loads chain data from Chainlist
 * and manages RPC endpoints with health checking and automatic failover.
 * 
 * Key features:
 * - 300+ EVM chains supported via Chainlist
 * - Automatic RPC endpoint health checking
 * - Multi-RPC support for mempool aggregation
 * - Provider diversity for comprehensive coverage
 * - No hardcoded endpoints - everything is dynamic
 * 
 * @example Basic usage:
 * ```typescript
 * import { ChainRegistry } from '@evm-explorer/chain-registry';
 * 
 * const registry = new ChainRegistry();
 * await registry.initialize();
 * 
 * // Get chain info
 * const ethereum = registry.getChain(1);
 * console.log(ethereum.name); // "Ethereum Mainnet"
 * 
 * // Get a healthy RPC client
 * const client = await registry.getPublicClient(1);
 * const blockNumber = await client.getBlockNumber();
 * ```
 * 
 * @example Mempool aggregation with multiple RPCs:
 * ```typescript
 * // Get multiple diverse clients for comprehensive mempool coverage
 * const clients = await registry.getMultiplePublicClients(1, {
 *   clientCount: 3,
 *   preferDiverse: true,
 *   minReliability: 0.5
 * });
 * 
 * // Query each client for pending transactions
 * const mempoolData = await Promise.all(
 *   clients.map(client => client.getBlock({ blockTag: 'pending' }))
 * );
 * ```
 */

// Export all types for external use
export * from './types';

// Export main registry class
export { ChainRegistry } from './registry';

// Export individual components for advanced use cases
export { ChainDataLoader } from './chains';
export { RPCManager } from './rpc-manager';