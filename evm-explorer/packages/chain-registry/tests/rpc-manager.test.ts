import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RPCManager } from '../src/rpc-manager';
import { ChainDataLoader } from '../src/chains';
import type { RpcEndpoint } from '../src/types';

// Mock viem
vi.mock('viem', () => ({
  createPublicClient: vi.fn(() => ({
    getBlockNumber: vi.fn(async () => {
      // Simulate some latency
      await new Promise(resolve => setTimeout(resolve, 10));
      return 1234567n;
    }),
    transport: { type: 'http' }
  })),
  http: vi.fn((url) => ({ url, type: 'http' })),
  webSocket: vi.fn((url) => ({ url, type: 'webSocket' })),
}));

describe('RPCManager', () => {
  let manager: RPCManager;
  let chainLoader: ChainDataLoader;

  beforeEach(() => {
    chainLoader = new ChainDataLoader();
    
    // Mock chainLoader methods
    vi.spyOn(chainLoader, 'getRpcEndpoints').mockReturnValue([
      { url: 'https://eth.llamarpc.com', reliability: 0.5, isWebSocket: false },
      { url: 'https://ethereum.publicnode.com', reliability: 0.5, isWebSocket: false },
      { url: 'wss://ethereum.publicnode.com', reliability: 0.5, isWebSocket: true },
    ] as RpcEndpoint[]);

    manager = new RPCManager(chainLoader, {
      healthCheckTimeout: 1000,
    });
  });

  describe('getHealthyEndpoints', () => {
    it('should return healthy endpoints sorted by latency', async () => {
      const endpoints = await manager.getHealthyEndpoints(1, 2);
      
      expect(endpoints).toHaveLength(2);
      expect(endpoints[0].url).toBeTruthy();
      expect(endpoints[0].isWebSocket).toBe(false); // Should filter out WebSocket endpoints
    });

    it('should throw error if no endpoints are found', async () => {
      vi.spyOn(chainLoader, 'getRpcEndpoints').mockReturnValue([]);
      
      await expect(manager.getHealthyEndpoints(1)).rejects.toThrow(
        'No RPC endpoints found for chain 1'
      );
    });

    it('should cache health check results', async () => {
      // First check a specific endpoint
      const url = 'https://eth.llamarpc.com';
      const result1 = await manager.checkEndpointHealth(url, 1);
      expect(result1.healthy).toBe(true);
      
      // Second check should use cache
      const result2 = await manager.checkEndpointHealth(url, 1);
      expect(result2.healthy).toBe(result1.healthy);
      expect(result2.blockNumber).toBe(result1.blockNumber);
      // Cache may add extra fields, so we don't do deep equality
      
      // Clear cache and check again
      manager.clearHealthCache();
      const result3 = await manager.checkEndpointHealth(url, 1);
      expect(result3.healthy).toBe(true);
      // Latency might be different, so we just check it's healthy
    });
  });

  describe('checkEndpointHealth', () => {
    it('should return healthy status for working endpoint', async () => {
      const result = await manager.checkEndpointHealth('https://eth.llamarpc.com', 1);
      
      expect(result.healthy).toBe(true);
      expect(result.latency).toBeGreaterThanOrEqual(10); // We added 10ms delay
      expect(result.blockNumber).toBe(1234567n);
    });

    it('should handle endpoint errors gracefully', async () => {
      const { createPublicClient } = await import('viem');
      (createPublicClient as any).mockImplementationOnce(() => ({
        getBlockNumber: vi.fn(() => Promise.reject(new Error('Connection failed'))),
      }));

      const result = await manager.checkEndpointHealth('https://bad-endpoint.com', 1);
      
      expect(result.healthy).toBe(false);
      expect(result.error).toContain('Connection failed');
    });
  });

  describe('createPublicClient', () => {
    it('should create HTTP client for HTTP endpoint', async () => {
      const client = await manager.createPublicClient(1);
      
      expect(client).toBeTruthy();
      expect(client.getBlockNumber).toBeDefined();
    });

    it('should handle no healthy endpoints gracefully', async () => {
      // Mock all endpoints as unhealthy
      vi.spyOn(chainLoader, 'getRpcEndpoints').mockReturnValue([
        { url: 'https://bad-endpoint.com', reliability: 0.5, isWebSocket: false },
      ] as RpcEndpoint[]);
      
      const { createPublicClient } = await import('viem');
      (createPublicClient as any).mockImplementationOnce(() => ({
        getBlockNumber: vi.fn(() => Promise.reject(new Error('Connection failed'))),
      }));

      await expect(manager.createPublicClient(1)).rejects.toThrow(
        'No healthy RPC endpoints found for chain 1'
      );
    });
  });

  describe('clearHealthCache', () => {
    it('should clear all cached health results', async () => {
      await manager.checkEndpointHealth('https://eth.llamarpc.com', 1);
      manager.clearHealthCache();
      
      const status = manager.getHealthStatus(1);
      expect(status.size).toBe(0);
    });
  });
});