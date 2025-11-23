import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AbiLoader } from '../src/abi-loader';
import { ManualAbiRegistry } from '../src/manual-abis';
import type { ChainRegistry } from '@evm-explorer/chain-registry';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('AbiLoader', () => {
  let loader: AbiLoader;
  let mockChainRegistry: ChainRegistry;
  let consoleWarnSpy: any;

  beforeEach(() => {
    // Mock chain registry
    mockChainRegistry = {
      getAllChains: vi.fn().mockReturnValue([]),
      getChain: vi.fn().mockReturnValue(null),
    } as any;

    loader = new AbiLoader(mockChainRegistry);
    mockFetch.mockClear();
    
    // Suppress console warnings during tests
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleWarnSpy.mockRestore();
  });

  describe('getAbi', () => {
    it('should return manual ABI if available', async () => {
      // Uniswap V2 Router has manual ABI
      const abi = await loader.getAbi('0x7a250d5630b4cf539739df2c5dacb4c659f2488d', 1);
      
      expect(abi).not.toBeNull();
      expect(abi).toBe(ManualAbiRegistry.UNISWAP_V2_ROUTER_ABI);
      expect(mockFetch).not.toHaveBeenCalled(); // Should not fetch from external sources
    });

    it('should try Etherscan v2 API if no manual ABI', async () => {
      loader = new AbiLoader(mockChainRegistry, 'test-api-key');
      
      const mockAbi = [{ type: 'function', name: 'test' }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: '1',
          result: JSON.stringify(mockAbi),
        }),
      });

      const abi = await loader.getAbi('0x1234567890123456789012345678901234567890', 1);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.etherscan.io/v2/api?chainid=1')
      );
      expect(abi).toEqual(mockAbi);
    });

    it('should try Sourcify if Etherscan fails', async () => {
      const mockAbi = [{ type: 'function', name: 'sourcify' }];
      
      // First call for Sourcify full match
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          output: { abi: mockAbi },
        }),
      });

      const abi = await loader.getAbi('0x1234567890123456789012345678901234567890', 1);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('repo.sourcify.dev')
      );
      expect(abi).toEqual(mockAbi);
    });

    it('should cache ABI results', async () => {
      const abi1 = await loader.getAbi('0x7a250d5630b4cf539739df2c5dacb4c659f2488d', 1);
      const abi2 = await loader.getAbi('0x7a250d5630b4cf539739df2c5dacb4c659f2488d', 1);
      
      expect(abi1).toBe(abi2); // Same reference
      expect(mockFetch).not.toHaveBeenCalled(); // Manual ABI, no fetch
    });

    it('should return null if ABI not found', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
      });

      const abi = await loader.getAbi('0x0000000000000000000000000000000000000000', 1);
      expect(abi).toBeNull();
    });
  });

  describe('getFunctionSignature', () => {
    it('should fetch function signature from 4byte directory', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            function: {
              '0x38ed1739': [
                { name: 'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)' }
              ],
            },
          },
        }),
      });

      const signature = await loader.getFunctionSignature('0x38ed1739');
      
      expect(signature).toBe('swapExactTokensForTokens(uint256,uint256,address[],address,uint256)');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.openchain.xyz')
      );
    });

    it('should cache function signatures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            function: {
              '0x12345678': [{ name: 'testFunction()' }],
            },
          },
        }),
      });

      const sig1 = await loader.getFunctionSignature('0x12345678');
      const sig2 = await loader.getFunctionSignature('0x12345678');
      
      expect(sig1).toBe('testFunction()');
      expect(sig2).toBe('testFunction()');
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only one fetch
    });

    it('should return null if signature not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const signature = await loader.getFunctionSignature('0xdeadbeef');
      expect(signature).toBeNull();
    });
  });

  describe('clearCache', () => {
    it('should clear all caches', async () => {
      // Get an ABI and signature to populate caches
      await loader.getAbi('0x7a250d5630b4cf539739df2c5dacb4c659f2488d', 1);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            function: {
              '0x12345678': [{ name: 'test()' }],
            },
          },
        }),
      });
      await loader.getFunctionSignature('0x12345678');
      
      // Clear caches
      loader.clearCache();
      
      // Getting the same ABI should still use manual (not cached)
      const abi = await loader.getAbi('0x7a250d5630b4cf539739df2c5dacb4c659f2488d', 1);
      expect(abi).not.toBeNull();
      
      // Getting the same signature should fetch again
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            function: {
              '0x12345678': [{ name: 'test()' }],
            },
          },
        }),
      });
      await loader.getFunctionSignature('0x12345678');
      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + after cache clear
    });
  });
});