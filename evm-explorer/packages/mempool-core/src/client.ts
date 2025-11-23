/**
 * Mempool client orchestration utilities.
 *
 * This module coordinates RPC subscriptions across multiple providers so we can
 * observe the pending mempool in near real-time. It handles WebSocket vs HTTP
 * transports, failover, deduplication and optional transaction filtering before
 * surfacing enriched events to downstream consumers.
 */

import type { Address, Hash, Hex, PublicClient } from 'viem';
import type { ChainRegistry } from '@evm-explorer/chain-registry';
import type { ProtocolRegistry } from '@evm-explorer/protocol-registry';
import { TransactionDecoder } from './decoder';
import { TransactionEnricher } from './enricher';
import type {
  EnrichedTransaction,
  MempoolClientOptions,
  MempoolSubscription,
  MempoolTransaction,
  SubscriptionHandlers,
  SubscriptionOptions,
  SubscriptionStatus,
  SubscriptionStats,
  TransactionFilter,
} from './types';

interface InternalSubscription extends SubscriptionHandlers {
  id: string;
  chainId: number;
  status: SubscriptionStatus;
  filter?: TransactionFilter;
  transport: 'websocket' | 'http' | 'auto';
  seen: Map<string, number>;
  unsubscribers: Array<() => void>;
  stats: SubscriptionStats;
  listeners: Set<(status: SubscriptionStatus) => void>;
}

const DEFAULT_OPTIONS: Required<MempoolClientOptions> = {
  clientCount: 3,
  pollingIntervalMs: 3000,
  dedupeTtlMs: 60_000,
  includeWebSocket: true,
  preferDiverse: true,
};

/**
 * High-level controller for live mempool subscriptions.
 *
 * The client coordinates multiple Viem public clients sourced from the chain
 * registry. It automatically falls back between WebSocket and HTTP transports,
 * deduplicates transactions across providers, and enriches each transaction
 * with protocol metadata before handing it to the caller.
 */
export class MempoolClient {
  private readonly decoder: TransactionDecoder;
  private readonly enricher: TransactionEnricher;
  private readonly subscriptions = new Map<string, InternalSubscription>();
  private readonly options: Required<MempoolClientOptions>;
  private subscriptionCounter = 0;

  /**
   * Creates a new mempool client.
   *
   * @param chainRegistry Chain discovery/connection manager.
   * @param protocolRegistry Protocol lookup & ABI resolution.
   * @param options Optional tuning knobs for subscription behaviour.
   */
  constructor(
    private readonly chainRegistry: ChainRegistry,
    protocolRegistry: ProtocolRegistry,
    options: MempoolClientOptions = {}
  ) {
    this.decoder = new TransactionDecoder(protocolRegistry);
    this.enricher = new TransactionEnricher(this.decoder);
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Starts streaming pending transactions for a chain.
   *
   * @param options Subscription parameters including handlers & filters.
   * @returns A subscription handle for monitoring status / lifecycle control.
   */
  subscribe(options: SubscriptionOptions): MempoolSubscription {
    const chainId = options.chainId;
    if (!this.chainRegistry.isChainSupported(chainId)) {
      throw new Error(`Chain ${chainId} is not supported by the chain registry`);
    }

    const id = this.generateId();
    const internal: InternalSubscription = {
      id,
      chainId,
      status: 'connecting',
      filter: options.filter,
      transport: this.resolveTransport(options.transport),
      seen: new Map(),
      unsubscribers: [],
      stats: { received: 0, dropped: 0 },
      listeners: new Set(),
      onTransactions: options.onTransactions,
      onError: options.onError,
      onStatusChange: options.onStatusChange,
    };

    this.subscriptions.set(id, internal);
    this.emitStatus(internal, 'connecting');
    void this.initializeSubscription(internal, options);

    return {
      id,
      chainId,
      getStats: () => ({ ...internal.stats }),
      get status() {
        return internal.status;
      },
      unsubscribe: () => this.teardown(internal),
      onStatus: (handler) => {
        internal.listeners.add(handler);
        handler(internal.status);
      },
    };
  }

  private resolveTransport(transport: SubscriptionOptions['transport']): 'websocket' | 'http' | 'auto' {
    return transport ?? 'auto';
  }

  private generateId(): string {
    this.subscriptionCounter += 1;
    return `sub-${this.subscriptionCounter}`;
  }

  private async initializeSubscription(
    subscription: InternalSubscription,
    options: SubscriptionOptions
  ): Promise<void> {
    const transportPreference = this.resolveTransport(options.transport);
    const clientCount = options.clientCount ?? this.options.clientCount;

    if (transportPreference === 'websocket' || transportPreference === 'auto') {
      const attached = await this.attachClients(subscription, 'websocket', clientCount);
      if (attached > 0) {
        this.emitStatus(subscription, 'active');
        return;
      }
      if (transportPreference === 'websocket') {
        this.handleError(subscription, new Error('Unable to establish WebSocket subscriptions'));
        this.emitStatus(subscription, 'fallback');
      }
    }

    const fallbackAttached = await this.attachClients(subscription, 'http', clientCount);
    if (fallbackAttached > 0) {
      this.emitStatus(subscription, 'fallback');
      return;
    }

    this.handleError(subscription, new Error('Failed to attach any RPC clients'));
    this.teardown(subscription);
  }

  private async attachClients(
    subscription: InternalSubscription,
    mode: 'websocket' | 'http',
    clientCount: number
  ): Promise<number> {
    try {
      const clients = await this.chainRegistry.getMultiplePublicClients(subscription.chainId, {
        clientCount,
        includeWebSocket: mode === 'websocket' ? this.options.includeWebSocket : false,
        preferDiverse: this.options.preferDiverse,
      });

      let attached = 0;

      for (const client of clients) {
        const unsubscribe = this.attachClient(subscription, client as PublicClient, mode);
        if (unsubscribe) {
          subscription.unsubscribers.push(unsubscribe);
          attached++;
        }
      }

      if (attached > 0) {
        subscription.transport = mode;
      }

      return attached;
    } catch (error) {
      this.handleError(subscription, error);
      return 0;
    }
  }

  private attachClient(
    subscription: InternalSubscription,
    client: PublicClient,
    mode: 'websocket' | 'http'
  ): (() => void) | null {
    const watch = (client as any).watchPendingTransactions;

    if (typeof watch === 'function') {
      try {
        const unwatch = watch({
          onTransactions: (transactions: unknown[]) => {
            void this.processIncomingTransactions(subscription, client, transactions);
          },
          onError: (error: unknown) => this.handleError(subscription, error),
          poll: mode === 'http',
          pollingInterval: this.options.pollingIntervalMs,
        });

        return typeof unwatch === 'function' ? unwatch : null;
      } catch (error) {
        this.handleError(subscription, error);
        return null;
      }
    }

    if (mode === 'http' && typeof (client as any).getBlock === 'function') {
      const interval = setInterval(async () => {
        if (subscription.status === 'closed') {
          return;
        }

        try {
          const block = await (client as any).getBlock({
            blockTag: 'pending',
            includeTransactions: true,
          });

          if (block?.transactions?.length) {
            void this.processIncomingTransactions(
              subscription,
              client,
              block.transactions as unknown[]
            );
          }
        } catch (error) {
          this.handleError(subscription, error);
        }
      }, this.options.pollingIntervalMs);

      return () => clearInterval(interval);
    }

    return null;
  }

  /**
   * Normalises raw RPC payloads, dedupes and emits enriched transactions.
   */
  private async processIncomingTransactions(
    subscription: InternalSubscription,
    client: PublicClient,
    payload: unknown[]
  ): Promise<void> {
    if (subscription.status === 'closed') {
      return;
    }

    try {
      const normalized = await this.normalizeTransactions(subscription, client, payload);
      if (!normalized.length) {
        return;
      }

      const unique = normalized.filter((tx) => this.shouldProcess(subscription, tx.hash));
      if (!unique.length) {
        return;
      }

      const enriched = await Promise.all(unique.map((tx) => this.enricher.enrich(tx)));
      const filtered = enriched.filter((tx) => this.passesFilter(tx, subscription.filter));

      if (!filtered.length) {
        return;
      }

      subscription.stats.received += filtered.length;
      subscription.stats.lastActivityAt = Date.now();
      subscription.onTransactions?.(filtered);
    } catch (error) {
      this.handleError(subscription, error);
    }
  }

  /**
   * Converts various RPC payload shapes into our canonical transaction format.
   */
  private async normalizeTransactions(
    subscription: InternalSubscription,
    client: PublicClient,
    payload: unknown[]
  ): Promise<MempoolTransaction[]> {
    const transactions: MempoolTransaction[] = [];

    for (const entry of payload) {
      if (typeof entry === 'string') {
        const tx = await this.fetchTransaction(client, entry, subscription.chainId);
        if (tx) {
          transactions.push(tx);
        }
        continue;
      }

      const normalized = this.normalize(entry as Record<string, unknown>, subscription.chainId);
      if (normalized) {
        transactions.push(normalized);
      }
    }

    return transactions;
  }

  private async fetchTransaction(
    client: PublicClient,
    hash: string,
    chainId: number
  ): Promise<MempoolTransaction | null> {
    if (typeof (client as any).getTransaction !== 'function') {
      return null;
    }

    try {
      const transaction = await (client as any).getTransaction({ hash });
      return transaction
        ? this.normalize(transaction as Record<string, unknown>, chainId)
        : null;
    } catch (error) {
      // Surface the error but do not fail the entire stream
      console.warn(`Failed to fetch transaction ${hash}:`, error);
      return null;
    }
  }

  /**
   * Converts a single RPC transaction object into the canonical mempool shape.
   */
  private normalize(entry: Record<string, unknown>, chainId: number): MempoolTransaction | null {
    if (!entry.hash || !entry.from) {
      return null;
    }

    const bigintOrNull = (value: unknown) => {
      if (value === null || value === undefined) return null;
      try {
        return typeof value === 'bigint' ? value : BigInt(value as string);
      } catch {
        return null;
      }
    };

    return {
      chainId,
      hash: entry.hash as Hash,
      from: entry.from as Address,
      to: (entry.to as Address) ?? null,
      value: bigintOrNull(entry.value) ?? 0n,
      gasPrice: bigintOrNull(entry.gasPrice),
      maxFeePerGas: bigintOrNull(entry.maxFeePerGas),
      maxPriorityFeePerGas: bigintOrNull(entry.maxPriorityFeePerGas),
      gas: bigintOrNull(entry.gas),
      nonce: typeof entry.nonce === 'number' ? entry.nonce : Number(entry.nonce ?? 0),
      input: ((entry.input as Hex) ?? ('0x' as Hex)),
      blockNumber: bigintOrNull(entry.blockNumber),
      timestamp: typeof entry.timestamp === 'number' ? entry.timestamp : undefined,
      type: (entry.type as string) ?? undefined,
    };
  }

  private shouldProcess(subscription: InternalSubscription, hash: string): boolean {
    const now = Date.now();
    const existing = subscription.seen.get(hash);
    if (existing && now - existing < this.options.dedupeTtlMs) {
      subscription.stats.dropped += 1;
      return false;
    }
    subscription.seen.set(hash, now);
    this.pruneSeen(subscription, now);
    return true;
  }

  private pruneSeen(subscription: InternalSubscription, now: number): void {
    const threshold = now - this.options.dedupeTtlMs;
    for (const [hash, timestamp] of subscription.seen.entries()) {
      if (timestamp < threshold) {
        subscription.seen.delete(hash);
      }
    }
  }

  private passesFilter(transaction: EnrichedTransaction, filter?: TransactionFilter): boolean {
    if (!filter) {
      return true;
    }

    if (filter.addresses?.length) {
      const addresses = filter.addresses.map((a) => a.toLowerCase());
      if (
        !addresses.includes(transaction.to?.toLowerCase() ?? '') &&
        !addresses.includes(transaction.from.toLowerCase())
      ) {
        return false;
      }
    }

    if (filter.protocols?.length) {
      const protocolName = transaction.protocol?.protocol.name ?? '';
      if (!filter.protocols.includes(protocolName)) {
        return false;
      }
    }

    if (filter.categories?.length) {
      const category = transaction.protocol?.protocol.category ?? '';
      if (!filter.categories.includes(category)) {
        return false;
      }
    }

    if (filter.methods?.length && transaction.method) {
      if (!filter.methods.includes(transaction.method)) {
        return false;
      }
    }

    if (filter.minValueWei !== undefined && transaction.value < filter.minValueWei) {
      return false;
    }

    if (filter.maxValueWei !== undefined && transaction.value > filter.maxValueWei) {
      return false;
    }

    return true;
  }

  private emitStatus(subscription: InternalSubscription, status: SubscriptionStatus): void {
    subscription.status = status;
    subscription.onStatusChange?.(status);
    for (const listener of subscription.listeners) {
      listener(status);
    }
  }

  private handleError(subscription: InternalSubscription, error: unknown): void {
    subscription.onError?.(error);
  }

  private teardown(subscription: InternalSubscription): void {
    if (subscription.status === 'closed') {
      return;
    }

    for (const unsubscribe of subscription.unsubscribers) {
      try {
        unsubscribe();
      } catch (error) {
        console.warn('Failed to clean up subscription', error);
      }
    }

    subscription.unsubscribers.length = 0;
    subscription.seen.clear();
    this.emitStatus(subscription, 'closed');
    this.subscriptions.delete(subscription.id);
    subscription.listeners.clear();
  }
}
