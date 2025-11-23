import { describe, it, expect, beforeEach, vi } from 'vitest';
import { encodeFunctionData, parseAbi, type Address } from 'viem';
import type { ProtocolRegistry } from '../../protocol-registry/src';
import { TransactionEnricher } from '../src/enricher';
import { TransactionDecoder } from '../src/decoder';
import { mockTransaction } from '../../test-utils/src';

/**
 * TransactionEnricher Test Suite
 *
 * Tests the enrichment layer that transforms decoded transactions into
 * user-friendly data for UI display. The enricher:
 *
 * - Creates human-readable summaries (e.g., "Uniswap • swap")
 * - Generates categorization labels for filtering and grouping
 * - Extracts key metadata for analytics and visualization
 * - Handles edge cases gracefully with fallback descriptions
 *
 * This layer is critical for making raw blockchain data accessible
 * and understandable in the UI, enabling features like:
 * - Protocol-based filtering
 * - Transaction categorization
 * - Activity summaries
 * - Quick identification of transaction types
 */

describe('TransactionEnricher', () => {
  const protocolRegistry = {
    lookup: vi.fn(),
    getProtocolAbi: vi.fn(),
    getFunctionSignature: vi.fn(),
  } as unknown as ProtocolRegistry;

  let enricher: TransactionEnricher;

  beforeEach(() => {
    vi.clearAllMocks();
    const decoder = new TransactionDecoder(protocolRegistry);
    enricher = new TransactionEnricher(decoder);
    (protocolRegistry.getFunctionSignature as any).mockResolvedValue('swap(uint256)');
  });

  /**
   * Test: Protocol Transaction Enrichment
   *
   * Verifies that transactions to known protocols are enriched with:
   * 1. A formatted summary combining protocol name and method
   * 2. Labels for categorization (protocol name, category)
   * 3. Metadata including all decoded information
   *
   * Example output:
   * - Summary: "Uniswap • swap"
   * - Labels: ["protocol:Uniswap", "category:Dex", "method:swap"]
   * - Metadata: { protocolName, methodName, category, etc. }
   *
   * This enables the UI to show meaningful transaction descriptions.
   */
  it('creates summary and labels for known protocol calls', async () => {
    const abi = parseAbi(['function swap(uint256 amount)']);
    const protocolAddress = mockTransaction().to! as Address;

    (protocolRegistry.lookup as any).mockReturnValue({
      protocol: {
        name: 'TestDex',
        category: 'Dex',
        chainId: 1,
        address: protocolAddress,
      },
      confidence: 'high',
      source: 'manual',
    });
    (protocolRegistry.getProtocolAbi as any).mockResolvedValue(abi);

    const input = encodeFunctionData({
      abi,
      functionName: 'swap',
      args: [1000n],
    });

    const transaction = {
      ...mockTransaction({ input, to: protocolAddress }),
      chainId: 1,
    };

    const enriched = await enricher.enrich(transaction as any);

    expect(enriched.summary).toBe('TestDex • swap');
    expect(enriched.labels).toEqual(expect.arrayContaining(['protocol:TestDex', 'category:Dex']));
    expect(enriched.metadata.protocolName).toBe('TestDex');
    expect(enriched.metadata.rawMethodSignature).toBe('swap(uint256)');
  });

  /**
   * Test: Fallback Enrichment for Unknown Transactions
   *
   * Tests graceful handling when transaction cannot be fully decoded:
   * - Unknown contract (not in protocol registry)
   * - No ABI available
   * - Empty calldata (native transfer)
   *
   * The enricher should still provide:
   * - A generic but meaningful summary
   * - Basic labels for categorization
   * - Available metadata (to, from, value, etc.)
   *
   * This ensures all transactions are displayable, even without full decoding.
   */
  it('falls back to transfer summary when method unknown', async () => {
    (protocolRegistry.lookup as any).mockReturnValue(null);

    const transaction = {
      ...mockTransaction({
        input: '0x',
        value: 2_000_000_000_000_000_000n,
      }),
      chainId: 1,
    };

    const enriched = await enricher.enrich(transaction as any);

    expect(enriched.summary).toMatch(/Transfer/);
    expect(enriched.labels).toContain('transfer');
  });
});
