import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChainDataLoader } from '../src/chains';
import { chainListResponse } from '@evm-explorer/test-utils';

// Mock fetch
global.fetch = vi.fn();

describe('ChainDataLoader', () => {
  let loader: ChainDataLoader;
  let consoleErrorSpy: any;

  beforeEach(() => {
    loader = new ChainDataLoader();
    vi.clearAllMocks();
    // Suppress console.error during tests
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('loadFromChainlist', () => {
    it('should load chains from Chainlist API', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => chainListResponse.chains,
      });

      await loader.loadFromChainlist();

      expect(global.fetch).toHaveBeenCalledWith('https://chainid.network/chains.json');
      expect(loader.getChain(1)).toBeTruthy();
      expect(loader.getChain(42161)).toBeTruthy();
    });

    it('should handle fetch errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(loader.loadFromChainlist()).rejects.toThrow('Unable to initialize chain registry');
    });

    it('should cache data and not refetch within cache period', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => chainListResponse.chains,
      });

      await loader.loadFromChainlist();
      await loader.loadFromChainlist(); // Second call should use cache

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getChain', () => {
    beforeEach(async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => chainListResponse.chains,
      });
      await loader.loadFromChainlist();
    });

    it('should return chain info for valid chain ID', () => {
      const chain = loader.getChain(1);
      expect(chain).toBeTruthy();
      expect(chain?.name).toBe('Ethereum Mainnet');
      expect(chain?.nativeCurrency.symbol).toBe('ETH');
    });

    it('should return null for invalid chain ID', () => {
      const chain = loader.getChain(99999);
      expect(chain).toBeNull();
    });
  });

  describe('getRpcEndpoints', () => {
    beforeEach(async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => chainListResponse.chains,
      });
      await loader.loadFromChainlist();
    });

    it('should return RPC endpoints for a chain', () => {
      const endpoints = loader.getRpcEndpoints(1);
      expect(endpoints).toHaveLength(3);
      expect(endpoints[0].url).toBe('https://eth.llamarpc.com');
      expect(endpoints[0].tracking).toBe('LlamaNodes');
    });

    it('should identify WebSocket endpoints', () => {
      const endpoints = loader.getRpcEndpoints(1);
      const wsEndpoint = endpoints.find(e => e.url.startsWith('wss://'));
      if (wsEndpoint) {
        expect(wsEndpoint.isWebSocket).toBe(true);
      }
    });
  });

  describe('searchChains', () => {
    beforeEach(async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => chainListResponse.chains,
      });
      await loader.loadFromChainlist();
    });

    it('should search chains by name', () => {
      const results = loader.searchChains('ethereum');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('Ethereum');
    });

    it('should search chains by chain ID', () => {
      const results = loader.searchChains('1');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(c => c.chainId === 1)).toBe(true);
    });

    it('should search chains by native currency symbol', () => {
      const results = loader.searchChains('ETH');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(c => c.nativeCurrency.symbol.includes('ETH'))).toBe(true);
    });
  });
});