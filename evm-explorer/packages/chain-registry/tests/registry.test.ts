import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChainRegistry } from '../src/registry';
import { chainListResponse } from '@evm-explorer/test-utils';

// Mock fetch
global.fetch = vi.fn();

// Mock viem
vi.mock('viem', () => ({
  createPublicClient: vi.fn(() => ({
    getBlockNumber: vi.fn(() => Promise.resolve(1234567n)),
  })),
  http: vi.fn((url) => ({ url, type: 'http' })),
  webSocket: vi.fn((url) => ({ url, type: 'webSocket' })),
}));

describe('ChainRegistry', () => {
  let registry: ChainRegistry;

  beforeEach(() => {
    registry = new ChainRegistry();
    vi.clearAllMocks();
    
    // Mock successful chainlist response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => chainListResponse.chains,
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await registry.initialize();
      
      expect(global.fetch).toHaveBeenCalledWith('https://chainid.network/chains.json');
    });

    it('should only initialize once', async () => {
      await registry.initialize();
      await registry.initialize();
      
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('chain information methods', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should get chain by ID', () => {
      const chain = registry.getChain(1);
      expect(chain).toBeTruthy();
      expect(chain?.name).toBe('Ethereum Mainnet');
    });

    it('should get all chains', () => {
      const chains = registry.getAllChains();
      expect(chains.length).toBeGreaterThan(0);
      expect(chains.some(c => c.chainId === 1)).toBe(true);
    });

    it('should get supported chain IDs', () => {
      const chainIds = registry.getSupportedChainIds();
      expect(chainIds).toContain(1);
      expect(chainIds).toContain(42161);
    });

    it('should search chains', () => {
      const results = registry.searchChains('ethereum');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name.toLowerCase()).toContain('ethereum');
    });

    it('should check if chain is supported', () => {
      expect(registry.isChainSupported(1)).toBe(true);
      expect(registry.isChainSupported(99999)).toBe(false);
    });
  });

  describe('RPC methods', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should get healthy RPC URL', async () => {
      const url = await registry.getHealthyRpcUrl(1);
      expect(url).toBeTruthy();
      expect(url.startsWith('http')).toBe(true);
    });

    it('should get multiple healthy RPC URLs', async () => {
      const urls = await registry.getHealthyRpcUrls(1, 2);
      expect(urls).toHaveLength(2);
      expect(urls.every(url => url.startsWith('http'))).toBe(true);
    });

    it('should get all RPC endpoints for a chain', () => {
      const endpoints = registry.getRpcEndpoints(1);
      expect(endpoints.length).toBeGreaterThan(0);
      expect(endpoints[0].url).toBeTruthy();
    });
  });

  describe('public client management', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should create and cache public client', async () => {
      const client1 = await registry.getPublicClient(1);
      const client2 = await registry.getPublicClient(1);
      
      expect(client1).toBe(client2); // Should return cached instance
      expect(client1.getBlockNumber).toBeDefined();
    });

    it('should disconnect specific chain', async () => {
      const client = await registry.getPublicClient(1);
      registry.disconnectChain(1);
      
      const newClient = await registry.getPublicClient(1);
      expect(newClient).not.toBe(client); // Should create new instance
    });

    it('should disconnect all chains', async () => {
      await registry.getPublicClient(1);
      await registry.getPublicClient(42161);
      
      registry.disconnectAll();
      
      // Getting clients again should create new instances
      const client1 = await registry.getPublicClient(1);
      expect(client1).toBeTruthy();
    });
  });

  describe('error handling', () => {
    it('should throw error if not initialized', () => {
      const newRegistry = new ChainRegistry();
      
      expect(() => newRegistry.getChain(1)).toThrow('ChainRegistry not initialized');
      expect(() => newRegistry.getAllChains()).toThrow('ChainRegistry not initialized');
    });

    it('should handle chain not found', async () => {
      await registry.initialize();
      
      const chain = registry.getChain(99999);
      expect(chain).toBeNull();
      
      await expect(registry.getHealthyRpcUrl(99999)).rejects.toThrow();
    });
  });
});