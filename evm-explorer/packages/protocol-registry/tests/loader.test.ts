import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ProtocolDataLoader } from '../src/loader';
import type { DefiLlamaProtocol, ProtocolInfo } from '../src/types';
import type { ChainRegistry } from '@evm-explorer/chain-registry';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('ProtocolDataLoader', () => {
  let loader: ProtocolDataLoader;
  let mockChainRegistry: ChainRegistry;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  const mockProtocolsResponse: DefiLlamaProtocol[] = [
    {
      id: 'uniswap',
      name: 'Uniswap',
      address: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
      chains: ['Ethereum', 'Polygon', 'Arbitrum'],
      category: 'Dexes',
      symbol: 'UNI',
      url: 'https://app.uniswap.org',
      logo: 'https://icons.llama.fi/uniswap.png',
      tvl: 5000000000,
    },
    {
      id: 'aave-v3',
      name: 'Aave V3',
      address: {
        'Ethereum': '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2',
        'Polygon': '0x794a61358d6845594f94dc1db02a252b5b4814ad',
        'Arbitrum': ['0x794a61358d6845594f94dc1db02a252b5b4814ad', '0x8145edddf43f50276641b55bd3ad95944510021e'],
      },
      chains: ['Ethereum', 'Polygon', 'Arbitrum'],
      category: 'Lending',
      chainTvls: {
        'Ethereum': 3000000000,
        'Polygon': 500000000,
        'Arbitrum': 1000000000,
      },
    },
    {
      id: 'compound-v3',
      name: 'Compound V3',
      address: '0xc3d688b66703497daa19211eedff47f25384cdc3',
      chains: ['Ethereum'],
      category: 'Lending',
      twitter: 'compoundfinance',
    },
  ];

  beforeEach(() => {
    // Mock chain registry
    mockChainRegistry = {
      getAllChains: vi.fn().mockReturnValue([
        { chainId: 1, name: 'Ethereum', nativeCurrency: { symbol: 'ETH' } },
        { chainId: 137, name: 'Polygon', nativeCurrency: { symbol: 'MATIC' } },
        { chainId: 42161, name: 'Arbitrum', nativeCurrency: { symbol: 'ETH' } },
      ]),
      getChain: vi.fn().mockImplementation((chainId) => {
        const chains = {
          1: { chainId: 1, name: 'Ethereum', nativeCurrency: { symbol: 'ETH' } },
          137: { chainId: 137, name: 'Polygon', nativeCurrency: { symbol: 'MATIC' } },
          42161: { chainId: 42161, name: 'Arbitrum', nativeCurrency: { symbol: 'ETH' } },
        };
        return chains[chainId] || null;
      }),
    } as any;

    loader = new ProtocolDataLoader(mockChainRegistry);
    mockFetch.mockClear();
    
    // Suppress console output during tests
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('fetchProtocols', () => {
    it('should fetch protocols from DefiLlama API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProtocolsResponse,
      });

      const protocols = await loader.fetchProtocols();

      expect(mockFetch).toHaveBeenCalledWith('https://api.llama.fi/protocols');
      expect(protocols).toEqual(mockProtocolsResponse);
    });

    it('should cache fetched protocols', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockProtocolsResponse,
      });

      // First call
      await loader.fetchProtocols();
      
      // Second call should use cache
      await loader.fetchProtocols();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should refetch when cache expires', async () => {
      // Create loader with 1ms cache expiry
      loader = new ProtocolDataLoader(mockChainRegistry, 1);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockProtocolsResponse,
      });

      // First call
      await loader.fetchProtocols();
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Second call should refetch
      await loader.fetchProtocols();

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      await expect(loader.fetchProtocols()).rejects.toThrow('Unable to fetch protocol data');
    });

    it('should use expired cache on fetch failure', async () => {
      // Create a loader with very short cache expiry
      const shortCacheLoader = new ProtocolDataLoader(mockChainRegistry, 1); // 1ms expiry

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProtocolsResponse,
      });

      // First successful fetch
      await shortCacheLoader.fetchProtocols();

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 5));

      // Second fetch fails after cache expires
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const protocols = await shortCacheLoader.fetchProtocols();
      expect(protocols).toEqual(mockProtocolsResponse);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Using expired cache due to fetch failure');
    });
  });

  describe('processProtocols', () => {
    it('should process protocols with string addresses', () => {
      const processed = loader.processProtocols([mockProtocolsResponse[0]]);

      // Should create entries for each chain
      expect(processed).toHaveLength(3); // Ethereum, Polygon, Arbitrum
      
      const ethereumEntry = processed.find(p => p.chainId === 1);
      expect(ethereumEntry).toMatchObject({
        name: 'Uniswap',
        category: 'Dexes',
        chainId: 1,
        address: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
        logo: 'uniswap',
        metadata: {
          symbol: 'UNI',
          website: 'https://app.uniswap.org',
        },
      });
    });

    it('should process protocols with object addresses', () => {
      const processed = loader.processProtocols([mockProtocolsResponse[1]]);

      // Should handle different address formats
      const arbitrumEntries = processed.filter(p => p.chainId === 42161);
      expect(arbitrumEntries).toHaveLength(2); // Array of addresses on Arbitrum

      // Should include TVL data
      const ethereumEntry = processed.find(p => p.chainId === 1);
      expect(ethereumEntry?.tvl).toBe(3000000000);
    });

    it('should handle protocols without addresses by using placeholder', () => {
      const protocolWithoutAddress: DefiLlamaProtocol = {
        id: 'no-address',
        name: 'No Address Protocol',
        chains: ['Ethereum'],
      };

      const processed = loader.processProtocols([protocolWithoutAddress]);
      expect(processed).toHaveLength(1);
      expect(processed[0].address).toBe('0x0000000000000000000000000000000000000000');
      expect(processed[0].name).toBe('No Address Protocol');
      expect(processed[0].chainId).toBe(1);
    });

    it('should skip unknown chains', () => {
      const protocolWithUnknownChain: DefiLlamaProtocol = {
        id: 'unknown-chain',
        name: 'Unknown Chain Protocol',
        address: '0x123',
        chains: ['UnknownChain'],
      };

      const processed = loader.processProtocols([protocolWithUnknownChain]);
      expect(processed).toHaveLength(0);
    });

    it('should normalize addresses to lowercase', () => {
      const protocolWithMixedCase: DefiLlamaProtocol = {
        id: 'mixed-case',
        name: 'Mixed Case',
        address: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12',
        chains: ['Ethereum'],
      };

      const processed = loader.processProtocols([protocolWithMixedCase]);
      expect(processed[0].address).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
    });

    it('should handle unknown chains gracefully', () => {
      const protocolWithUnknownChain: DefiLlamaProtocol = {
        id: 'unknown-chain',
        name: 'Unknown Chain Protocol',
        address: '0x123',
        chains: ['UnknownChainName'],
      };

      const processed = loader.processProtocols([protocolWithUnknownChain]);
      expect(processed).toHaveLength(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Unknown chain name in DefiLlama data: UnknownChainName');
    });
  });

  describe('getStats', () => {
    it('should calculate protocol statistics', () => {
      const protocols: ProtocolInfo[] = [
        { name: 'Protocol A', category: 'DEX', chainId: 1, address: '0x123' as any },
        { name: 'Protocol A', category: 'DEX', chainId: 137, address: '0x123' as any },
        { name: 'Protocol B', category: 'Lending', chainId: 1, address: '0x456' as any },
      ];

      const stats = loader.getStats(protocols);

      expect(stats.totalProtocols).toBe(3);
      expect(stats.uniqueNames).toBe(2);
      expect(stats.byCategory).toEqual({ DEX: 2, Lending: 1 });
      expect(stats.byChain).toEqual({ 1: 2, 137: 1 });
    });
  });

  describe('cache management', () => {
    it('should correctly identify stale data', () => {
      expect(loader.isDataStale()).toBe(true);

      // Fetch to populate cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProtocolsResponse,
      });
      
      loader.fetchProtocols().then(() => {
        expect(loader.isDataStale()).toBe(false);
      });
    });

    it('should clear cache', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockProtocolsResponse,
      });

      await loader.fetchProtocols();
      expect(loader.isDataStale()).toBe(false);

      loader.clearCache();
      expect(loader.isDataStale()).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should extract logo name correctly', () => {
      const protocols: DefiLlamaProtocol[] = [
        {
          id: 'test1',
          name: 'Test 1',
          address: '0x123',
          chains: ['Ethereum'],
          logo: 'https://icons.llama.fi/uniswap.png',
        },
        {
          id: 'test2',
          name: 'Test 2',
          address: '0x456',
          chains: ['Ethereum'],
          logo: 'invalid-url',
        },
        {
          id: 'test3',
          name: 'Test 3',
          address: '0x789',
          chains: ['Ethereum'],
          // No logo
        },
      ];

      const processed = loader.processProtocols(protocols);

      expect(processed[0].logo).toBe('uniswap');
      expect(processed[1].logo).toBe('invalid-url');
      expect(processed[2].logo).toBeUndefined();
    });

    it('should handle protocols with minimal data', () => {
      const minimalProtocol: DefiLlamaProtocol = {
        id: 'minimal',
        name: 'Minimal Protocol',
        address: '0x123',
        chains: ['Ethereum'],
      };

      const processed = loader.processProtocols([minimalProtocol]);

      expect(processed[0]).toMatchObject({
        name: 'Minimal Protocol',
        category: 'DeFi', // Default category
        chainId: 1,
        address: '0x123' as any,
      });
      expect(processed[0].tvl).toBeUndefined();
      expect(processed[0].logo).toBeUndefined();
    });
  });
});