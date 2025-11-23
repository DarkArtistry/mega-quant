import { describe, it, expect, beforeEach, vi } from 'vitest';
import { encodeFunctionData, parseAbi, decodeFunctionData, type Address } from 'viem';
import { TransactionDecoder } from '../src/decoder';
import type { ProtocolRegistry } from '../../protocol-registry/src';
import { mockTransaction } from '../../test-utils/src';

/**
 * TransactionDecoder Test Suite
 *
 * Tests the transaction decoding functionality which is crucial for:
 * - Identifying what protocol a transaction interacts with
 * - Decoding transaction calldata to understand the function being called
 * - Extracting function parameters and their values
 * - Handling various fallback scenarios when ABIs are not available
 * - Classifying special transaction types (native transfers, etc.)
 *
 * The decoder uses a multi-layer approach:
 * 1. Try protocol registry for known contract ABIs
 * 2. Fall back to 4-byte function signatures
 * 3. Handle special cases like native ETH transfers
 */

describe('TransactionDecoder', () => {
  const protocolRegistry = {
    lookup: vi.fn(),
    getProtocolAbi: vi.fn(),
    getFunctionSignature: vi.fn(),
  } as unknown as ProtocolRegistry;

  let decoder: TransactionDecoder;

  beforeEach(() => {
    vi.clearAllMocks();
    decoder = new TransactionDecoder(protocolRegistry);
  });

  /**
   * Test: Full ABI Decoding
   *
   * Validates the primary decoding path when a full ABI is available:
   * 1. Looks up protocol information from the registry
   * 2. Fetches the complete ABI for the contract
   * 3. Decodes the calldata to extract function name and parameters
   * 4. Verifies the decoded data matches what was encoded
   *
   * This is the ideal scenario providing the most accurate decoding.
   */
  it('decodes transaction using protocol ABI', async () => {
    const abi = parseAbi(['function swap(uint256 amount)']);
    const protocolAddress = mockTransaction().to as Address;
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
    (protocolRegistry.getFunctionSignature as any).mockResolvedValue('swap(uint256)');

    const input = encodeFunctionData({
      abi,
      functionName: 'swap',
      args: [1000n],
    });

    const transaction = {
      ...mockTransaction({ input, to: protocolAddress }),
      chainId: 1,
    };

    const viemDecoded = decodeFunctionData({ abi, data: input });
    expect(viemDecoded.functionName).toBe('swap');
    expect(viemDecoded.args?.[0]).toBe(1000n);
    expect(transaction.input).toBe(input);

    const decoded = await decoder.decode(transaction as any);

    expect(protocolRegistry.getProtocolAbi).toHaveBeenCalledWith(transaction.to, 1);
    expect(decoded.method).toBe('swap');
    expect(decoded.rawMethodSignature).toBe('swap(uint256)');
  });

  /**
   * Test: 4-Byte Signature Fallback
   *
   * Tests the fallback mechanism when no ABI is available:
   * 1. Protocol registry returns null (unknown contract)
   * 2. No ABI available from any source
   * 3. Falls back to 4-byte function signature database
   * 4. Extracts just the function name and parameter types
   *
   * This provides partial decoding when full ABIs aren't available,
   * which is common for new or unverified contracts.
   */
  it('falls back to function signature when ABI missing', async () => {
    (protocolRegistry.lookup as any).mockReturnValue(null);
    (protocolRegistry.getProtocolAbi as any).mockResolvedValue(null);
    (protocolRegistry.getFunctionSignature as any).mockResolvedValue(
      'swapExactTokensForTokens(uint256,uint256)'
    );

    const transaction = {
      ...mockTransaction({
        input: '0x38ed1739',
      }),
      chainId: 1,
    };

    const decoded = await decoder.decode(transaction as any);

    expect(decoded.method).toBe('swapExactTokensForTokens');
    expect(decoded.functionSignature).toBe('0x38ed1739');
    expect(decoded.rawMethodSignature).toBe('swapExactTokensForTokens(uint256,uint256)');
  });

  /**
   * Test: Native ETH Transfer Detection
   *
   * Verifies special handling for native cryptocurrency transfers:
   * - Detects empty calldata (0x) indicating a simple transfer
   * - Classifies as 'nativeTransfer' instead of trying to decode
   * - Correctly handles transactions with value but no function calls
   *
   * This is important for distinguishing ETH transfers from contract interactions.
   */
  it('classifies native transfers when calldata empty', async () => {
    (protocolRegistry.lookup as any).mockReturnValue(null);
    const transaction = {
      ...mockTransaction({
        input: '0x',
        value: 1_000_000_000_000_000_000n,
      }),
      chainId: 1,
    };

    const decoded = await decoder.decode(transaction as any);

    expect(decoded.method).toBe('nativeTransfer');
    expect(decoded.protocol).toBeNull();
  });
});
