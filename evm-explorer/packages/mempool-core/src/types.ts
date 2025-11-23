/**
 * Shared TypeScript contracts for the mempool core package.
 */

import type { Address, Hash, Hex } from 'viem';
import type { ProtocolLookupResult } from '@evm-explorer/protocol-registry';

/** Canonical representation of a pending transaction. */
export interface MempoolTransaction {
  chainId: number;
  hash: Hash;
  from: Address;
  to: Address | null;
  value: bigint;
  gasPrice?: bigint | null;
  maxFeePerGas?: bigint | null;
  maxPriorityFeePerGas?: bigint | null;
  gas?: bigint | null;
  nonce: number;
  input: Hex;
  blockNumber?: bigint | null;
  timestamp?: number;
  type?: string;
}

/** Pending transaction after protocol lookup & ABI decoding. */
export interface DecodedTransaction extends MempoolTransaction {
  method: string | null;
  functionSignature: string | null;
  rawMethodSignature: string | null;
  args: readonly unknown[] | null;
  abiName?: string | null;
  protocol: ProtocolLookupResult | null;
}

/** Decoded transaction augmented with UI/analytics metadata. */
export interface EnrichedTransaction extends DecodedTransaction {
  summary: string | null;
  labels: string[];
  metadata: Record<string, unknown>;
}

/** Runtime filter applied before emitting enriched transactions. */
export interface TransactionFilter {
  addresses?: Address[];
  protocols?: string[];
  categories?: string[];
  methods?: string[];
  minValueWei?: bigint;
  maxValueWei?: bigint;
}

/** Optional callbacks supplied by the consumer for subscription events. */
export interface SubscriptionHandlers {
  onTransactions?: (transactions: EnrichedTransaction[]) => void;
  onError?: (error: unknown) => void;
  onStatusChange?: (status: SubscriptionStatus) => void;
}

/** Parameters for creating a mempool subscription. */
export interface SubscriptionOptions extends SubscriptionHandlers {
  chainId: number;
  transport?: 'auto' | 'websocket' | 'http';
  clientCount?: number;
  filter?: TransactionFilter;
}

export type SubscriptionStatus = 'connecting' | 'active' | 'fallback' | 'closed';

/** Global tuning knobs for the mempool client. */
export interface MempoolClientOptions {
  clientCount?: number;
  pollingIntervalMs?: number;
  dedupeTtlMs?: number;
  includeWebSocket?: boolean;
  preferDiverse?: boolean;
}

/** Basic counters for emitted vs deduped transactions. */
export interface SubscriptionStats {
  received: number;
  dropped: number;
  lastActivityAt?: number;
}

/** Handle returned to consumers when subscribing to the mempool. */
export interface MempoolSubscription {
  id: string;
  chainId: number;
  status: SubscriptionStatus;
  unsubscribe: () => void;
  onStatus: (handler: (status: SubscriptionStatus) => void) => void;
  getStats: () => SubscriptionStats;
}
