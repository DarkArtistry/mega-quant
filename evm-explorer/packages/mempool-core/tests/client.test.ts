import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { encodeFunctionData, parseAbi, type Address } from 'viem';
import { MempoolClient } from '../src/client';
import type { ChainRegistry } from '../../chain-registry/src';
import type { ProtocolRegistry } from '../../protocol-registry/src';
import type { SubscriptionStatus } from '../src/types';
import { mockTransaction } from '../../test-utils/src';

/**
 * MempoolClient Test Suite
 *
 * Tests the core functionality of the MempoolClient which is responsible for:
 * - Subscribing to pending transactions across multiple RPC providers
 * - Deduplicating transactions from different sources
 * - Decoding and enriching transaction data with protocol information
 * - Filtering transactions based on user-defined criteria
 * - Handling WebSocket and HTTP polling transports
 * - Managing subscription lifecycle and statistics
 */

// Test ABI for a simple swap function used in DEX protocols
const abi = parseAbi(['function swap(uint256 amount)']);
const protocolAddress = mockTransaction().to! as Address;

// Mock protocol lookup result that simulates what the protocol registry would return
const protocolLookupResult = {
  protocol: {
    name: 'TestDex',
    category: 'Dex',
    chainId: 1,
    address: protocolAddress,
  },
  confidence: 'high' as const,
  source: 'manual' as const,
};

// Utility to wait for async operations to complete
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('MempoolClient', () => {
  const chainRegistry = {
    isChainSupported: vi.fn(),
    getMultiplePublicClients: vi.fn(),
  } as unknown as ChainRegistry;

  const protocolRegistry = {
    lookup: vi.fn(),
    getProtocolAbi: vi.fn(),
    getFunctionSignature: vi.fn(),
  } as unknown as ProtocolRegistry;

  beforeEach(() => {
    vi.clearAllMocks();
    (chainRegistry.isChainSupported as any).mockReturnValue(true);
    (protocolRegistry.lookup as any).mockReturnValue(protocolLookupResult);
    (protocolRegistry.getProtocolAbi as any).mockResolvedValue(abi);
    (protocolRegistry.getFunctionSignature as any).mockResolvedValue('swap(uint256)');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Test: WebSocket Subscription with Transaction Enrichment
   *
   * Verifies that the client can:
   * 1. Establish WebSocket connections to watch pending transactions
   * 2. Decode transaction calldata using protocol ABIs
   * 3. Enrich transactions with protocol metadata (name, category)
   * 4. Emit enriched transactions to the subscription callback
   * 5. Track subscription statistics (received count)
   */
  it('emits enriched transactions via WebSocket subscriptions', async () => {
    const listeners: Array<(payload: unknown[]) => void> = [];

    (chainRegistry.getMultiplePublicClients as any).mockResolvedValue([
      {
        watchPendingTransactions: ({ onTransactions }: any) => {
          listeners.push(onTransactions);
          return () => undefined;
        },
      },
    ]);

    const client = new MempoolClient(chainRegistry, protocolRegistry);
    const onTransactions = vi.fn();
    const subscription = client.subscribe({
      chainId: 1,
      onTransactions,
    });

    await flushPromises();

    expect(listeners).toHaveLength(1);

    const input = encodeFunctionData({
      abi,
      functionName: 'swap',
      args: [123n],
    });

    const raw = {
      ...mockTransaction({ input, to: protocolAddress }),
    };

    listeners[0]([raw]);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onTransactions).toHaveBeenCalledTimes(1);
    const [transactions] = onTransactions.mock.calls[0];
    expect(transactions[0].summary).toBe('TestDex • swap');
    expect(subscription.getStats().received).toBe(1);
  });

  /**
   * Test: Transaction Deduplication
   *
   * Ensures that duplicate transactions are filtered out when:
   * - Multiple RPC providers emit the same transaction
   * - The same transaction is received within the deduplication window
   *
   * This is critical for multi-RPC setups where the same transaction
   * might be seen from different providers, preventing duplicate processing.
   */
  it('deduplicates transactions by hash', async () => {
    const listeners: Array<(payload: unknown[]) => void> = [];

    (chainRegistry.getMultiplePublicClients as any).mockResolvedValue([
      {
        watchPendingTransactions: ({ onTransactions }: any) => {
          listeners.push(onTransactions);
          return () => undefined;
        },
      },
    ]);

    const client = new MempoolClient(chainRegistry, protocolRegistry, { dedupeTtlMs: 10_000 });
    const onTransactions = vi.fn();

    const subscription = client.subscribe({
      chainId: 1,
      onTransactions,
    });

    await flushPromises();

    const raw = {
      ...mockTransaction({
        input: encodeFunctionData({ abi, functionName: 'swap', args: [1n] }),
        to: protocolAddress,
      }),
    };

    listeners[0]([raw]);
    listeners[0]([raw]);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onTransactions).toHaveBeenCalledTimes(1);
    expect(subscription.getStats().received).toBe(1);
    expect(subscription.getStats().dropped).toBeGreaterThanOrEqual(1);
  });

  /**
   * Test: Transaction Filtering
   *
   * Validates that the filter mechanism works correctly by:
   * - Setting up a filter for specific protocols
   * - Sending transactions that don't match the filter criteria
   * - Verifying filtered transactions are not emitted to subscribers
   *
   * Filters can include: protocols, addresses, methods, value ranges, etc.
   */
  it('applies transaction filters before emitting', async () => {
    const listeners: Array<(payload: unknown[]) => void> = [];

    (chainRegistry.getMultiplePublicClients as any).mockResolvedValue([
      {
        watchPendingTransactions: ({ onTransactions }: any) => {
          listeners.push(onTransactions);
          return () => undefined;
        },
      },
    ]);

    const client = new MempoolClient(chainRegistry, protocolRegistry);
    const onTransactions = vi.fn();

    client.subscribe({
      chainId: 1,
      onTransactions,
      filter: {
        protocols: ['OtherProtocol'],
      },
    });

    await flushPromises();

    listeners[0]([
      mockTransaction({
        input: encodeFunctionData({ abi, functionName: 'swap', args: [1n] }),
        to: protocolAddress,
      }),
    ]);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onTransactions).not.toHaveBeenCalled();
  });

  /**
   * Test: HTTP Polling Fallback
   *
   * Tests the graceful degradation when WebSocket connections fail:
   * 1. Attempts WebSocket connection first
   * 2. When WebSocket fails, automatically switches to HTTP polling
   * 3. Sets status to 'fallback' to inform subscribers
   * 4. Continues to receive transactions via polling
   *
   * This ensures the client works on all chains, even those without WebSocket support.
   */
  it('falls back to HTTP polling when WebSocket unavailable', async () => {
    const httpClient = {
      watchPendingTransactions: ({ onTransactions, poll }: any) => {
        expect(poll).toBe(true);
        setTimeout(() => {
          onTransactions([
            mockTransaction({
              input: encodeFunctionData({ abi, functionName: 'swap', args: [42n] }),
              to: protocolAddress,
            }),
          ]);
        }, 0);
        return () => undefined;
      },
    };

    (chainRegistry.getMultiplePublicClients as any).mockImplementation((_chainId: number, opts: any) => {
      if (opts.includeWebSocket) {
        return Promise.resolve([
          {
            watchPendingTransactions: () => {
              throw new Error('ws not supported');
            },
          },
        ]);
      }

      return Promise.resolve([httpClient]);
    });

    const client = new MempoolClient(chainRegistry, protocolRegistry, { pollingIntervalMs: 50 });
    const onTransactions = vi.fn();
    const statusChanges: SubscriptionStatus[] = [];

    const subscription = client.subscribe({
      chainId: 1,
      onTransactions,
      onStatusChange: (status) => statusChanges.push(status),
    });

    await flushPromises();
    await flushPromises();

    expect(onTransactions).toHaveBeenCalled();
    expect(statusChanges).toContain('fallback');
    expect(subscription.getStats().received).toBe(1);

    subscription.unsubscribe();
  });
});
