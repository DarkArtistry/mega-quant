import { describe, it, expect, beforeAll, vi } from 'vitest';
import { ProtocolDataLoader } from '../src/loader';
import type { ChainRegistry } from '@evm-explorer/chain-registry';

/**
 * Integration tests for ProtocolDataLoader with real DefiLlama API
 *
 * These tests make actual API calls to DefiLlama to ensure:
 * - The API format hasn't changed
 * - Protocol data is correctly parsed
 * - Chain name resolution works properly
 *
 * Run with: pnpm test loader.integration.test.ts
 */
describe('ProtocolDataLoader Integration Tests', () => {
  let loader: ProtocolDataLoader;
  let mockChainRegistry: ChainRegistry;

  beforeAll(() => {
    // Create a mock chain registry with common chains
    const chainList = [
      { chainId: 1, name: 'Ethereum', nativeCurrency: { symbol: 'ETH' } },
      { chainId: 137, name: 'Polygon', nativeCurrency: { symbol: 'MATIC' } },
      { chainId: 56, name: 'BSC', nativeCurrency: { symbol: 'BNB' } },
      { chainId: 42161, name: 'Arbitrum', nativeCurrency: { symbol: 'ETH' } },
      { chainId: 10, name: 'Optimism', nativeCurrency: { symbol: 'ETH' } },
      { chainId: 8453, name: 'Base', nativeCurrency: { symbol: 'ETH' } },
      { chainId: 43114, name: 'Avalanche', nativeCurrency: { symbol: 'AVAX' } },
      { chainId: 250, name: 'Fantom', nativeCurrency: { symbol: 'FTM' } },
      { chainId: 100, name: 'xDai', nativeCurrency: { symbol: 'xDAI' } },
      { chainId: 42220, name: 'Celo', nativeCurrency: { symbol: 'CELO' } },
      { chainId: 1284, name: 'Moonbeam', nativeCurrency: { symbol: 'GLMR' } },
      { chainId: 1285, name: 'Moonriver', nativeCurrency: { symbol: 'MOVR' } },
      { chainId: 25, name: 'Cronos', nativeCurrency: { symbol: 'CRO' } },
      { chainId: 1666600000, name: 'Harmony', nativeCurrency: { symbol: 'ONE' } },
      { chainId: 1313161554, name: 'Aurora', nativeCurrency: { symbol: 'ETH' } },
      { chainId: 1088, name: 'Metis', nativeCurrency: { symbol: 'METIS' } },
      { chainId: 288, name: 'Boba', nativeCurrency: { symbol: 'ETH' } },
      { chainId: 534352, name: 'Scroll', nativeCurrency: { symbol: 'ETH' } },
      { chainId: 59144, name: 'Linea', nativeCurrency: { symbol: 'ETH' } },
      { chainId: 5000, name: 'Mantle', nativeCurrency: { symbol: 'MNT' } },
      { chainId: 34443, name: 'Mode', nativeCurrency: { symbol: 'ETH' } },
      { chainId: 81457, name: 'Blast', nativeCurrency: { symbol: 'ETH' } },
      { chainId: 7777777, name: 'Zora', nativeCurrency: { symbol: 'ETH' } },
      { chainId: 252, name: 'Fraxtal', nativeCurrency: { symbol: 'frxETH' } },
      { chainId: 167000, name: 'Taiko', nativeCurrency: { symbol: 'ETH' } },
      { chainId: 324, name: 'zkSync Era', nativeCurrency: { symbol: 'ETH' } },
      { chainId: 1101, name: 'Polygon zkEVM', nativeCurrency: { symbol: 'ETH' } },
      { chainId: 169, name: 'Manta', nativeCurrency: { symbol: 'ETH' } },
      { chainId: 196, name: 'X Layer', nativeCurrency: { symbol: 'OKB' } },
    ];

    mockChainRegistry = {
      getAllChains: () => chainList,
      getChain: (chainId: number) => {
        return chainList.find(c => c.chainId === chainId) || null;
      },
      getChainByName: (name: string) => {
        // First try exact match
        let chain = chainList.find(c => c.name === name);
        if (chain) return chain;

        // Handle aliases
        const aliases: Record<string, string> = {
          'Binance': 'BSC',
          'BNB Chain': 'BSC',
          'Gnosis': 'xDai',
          'Avalanche C-Chain': 'Avalanche',
          'Arbitrum One': 'Arbitrum',
          'OP Mainnet': 'Optimism',
          'zkSync': 'zkSync Era',
          'Polygon PoS': 'Polygon',
          'Manta Pacific': 'Manta',
          'OKX X Layer': 'X Layer',
        };
        const mappedName = aliases[name];
        if (mappedName) {
          chain = chainList.find(c => c.name === mappedName);
          if (chain) return chain;
        }

        return null;
      },
    } as any;

    loader = new ProtocolDataLoader(mockChainRegistry);
  });

  describe('Real DefiLlama API', () => {
    it('should fetch and parse protocols from DefiLlama API', async () => {
      const protocols = await loader.fetchProtocols();

      // Basic sanity checks
      expect(Array.isArray(protocols)).toBe(true);
      expect(protocols.length).toBeGreaterThan(100); // DefiLlama has 1000+ protocols

      // Check first protocol has expected structure
      const firstProtocol = protocols[0];
      expect(firstProtocol).toHaveProperty('id');
      expect(firstProtocol).toHaveProperty('name');
      expect(firstProtocol).toHaveProperty('chains');
      expect(Array.isArray(firstProtocol.chains)).toBe(true);
    }, 30000); // 30 second timeout for API call

    it('should find well-known protocols', async () => {
      const protocols = await loader.fetchProtocols();

      // Check for major protocols that should always exist (with flexible name matching)
      const protocolNames = protocols.map(p => p.name.toLowerCase());

      // Check for protocols containing these names
      expect(protocolNames.some(name => name.includes('uniswap'))).toBe(true);
      expect(protocolNames.some(name => name.includes('aave'))).toBe(true);
      expect(protocolNames.some(name => name.includes('curve'))).toBe(true);
      expect(protocolNames.some(name => name.includes('compound'))).toBe(true);

      // Find any Uniswap-related protocol
      const uniswap = protocols.find(p => p.name.toLowerCase().includes('uniswap'));
      expect(uniswap).toBeDefined();
      if (uniswap?.chains) {
        expect(uniswap.chains.length).toBeGreaterThan(0);
      }
    }, 30000);

    it('should correctly process protocol addresses', async () => {
      const protocols = await loader.fetchProtocols();
      const processed = loader.processProtocols(protocols.slice(0, 100)); // Process first 100 for speed

      expect(Array.isArray(processed)).toBe(true);
      expect(processed.length).toBeGreaterThan(0);

      // Check processed protocol structure
      const firstProcessed = processed[0];
      expect(firstProcessed).toHaveProperty('name');
      expect(firstProcessed).toHaveProperty('category');
      expect(firstProcessed).toHaveProperty('chainId');
      expect(firstProcessed).toHaveProperty('address');
      expect(typeof firstProcessed.chainId).toBe('number');
    }, 30000);

    it('should handle protocols with different address formats', async () => {
      const protocols = await loader.fetchProtocols();

      // Find protocols with different address formats
      const withStringAddress = protocols.find(p => typeof p.address === 'string');
      const withObjectAddress = protocols.find(p => typeof p.address === 'object' && p.address !== null);
      const withoutAddress = protocols.find(p => !p.address);

      // At least one format should exist
      expect(withStringAddress).toBeDefined();
      expect(withoutAddress).toBeDefined();

      // Object address format is less common, so it might not exist
      // Log for debugging but don't fail the test
      if (!withObjectAddress) {
        console.log('Note: No protocols with object address format found in current DefiLlama data');
      }

      // Process available protocols without errors
      const testProtocols = [
        withStringAddress,
        withObjectAddress,
        withoutAddress
      ].filter(Boolean);

      const processed = loader.processProtocols(testProtocols as any);
      expect(Array.isArray(processed)).toBe(true);

      // Ensure at least some protocols were processed
      expect(processed.length).toBeGreaterThan(0);
    }, 30000);

    it('should handle chain name variations', async () => {
      const protocols = await loader.fetchProtocols();

      // Find protocols on different chains
      const ethereumProtocol = protocols.find(p => p.chains.includes('Ethereum'));
      const bscProtocol = protocols.find(p =>
        p.chains.includes('BSC') ||
        p.chains.includes('Binance') ||
        p.chains.includes('BNB Chain')
      );
      const polygonProtocol = protocols.find(p => p.chains.includes('Polygon'));

      expect(ethereumProtocol).toBeDefined();
      expect(bscProtocol).toBeDefined();
      expect(polygonProtocol).toBeDefined();

      // Process and verify chain IDs are resolved correctly
      const processed = loader.processProtocols([
        ethereumProtocol!,
        bscProtocol!,
        polygonProtocol!
      ]);

      const chainIds = [...new Set(processed.map(p => p.chainId))];
      expect(chainIds).toContain(1);   // Ethereum
      expect(chainIds).toContain(56);  // BSC
      expect(chainIds).toContain(137); // Polygon
    }, 30000);

    it('should cache responses correctly', async () => {
      // First call - should hit API
      const startTime1 = Date.now();
      const protocols1 = await loader.fetchProtocols();
      const duration1 = Date.now() - startTime1;

      // Second call - should use cache (much faster)
      const startTime2 = Date.now();
      const protocols2 = await loader.fetchProtocols();
      const duration2 = Date.now() - startTime2;

      expect(protocols1).toEqual(protocols2);

      // Cache should be faster, but handle edge cases where the first call is also very fast
      // If first call took less than 10ms, just check that cache was also fast
      if (duration1 > 10) {
        expect(duration2).toBeLessThan(duration1);
      } else {
        expect(duration2).toBeLessThanOrEqual(10);
      }

      // Verify data is not stale immediately
      expect(loader.isDataStale()).toBe(false);
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Create a loader with an invalid URL
      const badLoader = new ProtocolDataLoader(mockChainRegistry);

      // Mock fetch to simulate network error
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      try {
        await expect(badLoader.fetchProtocols()).rejects.toThrow();
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should handle malformed response gracefully', async () => {
      const badLoader = new ProtocolDataLoader(mockChainRegistry);

      // Mock fetch to return invalid JSON
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ invalid: 'response' })
      } as any);

      try {
        const result = await badLoader.fetchProtocols();
        expect(Array.isArray(result)).toBe(false);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});