import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ProtocolRegistry } from '../src/registry';
import { ManualProtocolRegistry } from '../src/manual-registry';
import { ProtocolDataLoader } from '../src/loader';
import type { ProtocolInfo, DefiLlamaProtocol } from '../src/types';
import type { ChainRegistry } from '@evm-explorer/chain-registry';

// Mock the loader module
vi.mock('../src/loader');

describe('ProtocolRegistry', () => {
  let registry: ProtocolRegistry;
  let mockChainRegistry: ChainRegistry;
  let mockFetchProtocols: ReturnType<typeof vi.fn>;
  let mockProcessProtocols: ReturnType<typeof vi.fn>;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  // Sample test data
  const mockDefiLlamaProtocols: DefiLlamaProtocol[] = [
    {
      id: 'aave',
      name: 'Aave',
      address: {
        'Ethereum': '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
        'Polygon': '0x7fb69e8fb1525ceec03783ffd8a317bafbdfd394'
      },
      chains: ['Ethereum', 'Polygon'],
      category: 'Lending',
      tvl: 10000000,
    },
    {
      id: 'curve',
      name: 'Curve',
      address: '0xd533a949740bb3306d119cc777fa900ba034cd52',
      chains: ['Ethereum'],
      category: 'DEX',
    },
  ];

  const mockProcessedProtocols: ProtocolInfo[] = [
    {
      name: 'Aave',
      category: 'Lending',
      chainId: 1,
      address: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9' as any,
    },
    {
      name: 'Aave',
      category: 'Lending', 
      chainId: 137,
      address: '0x7fb69e8fb1525ceec03783ffd8a317bafbdfd394' as any,
    },
    {
      name: 'Curve',
      category: 'DEX',
      chainId: 1,
      address: '0xd533a949740bb3306d119cc777fa900ba034cd52' as any,
    },
  ];

  beforeEach(() => {
    // Reset mocks to ensure ManualProtocolRegistry is not mocked
    vi.restoreAllMocks();

    // Mock chain registry
    mockChainRegistry = {
      getAllChains: vi.fn().mockReturnValue([
        { chainId: 1, name: 'Ethereum', nativeCurrency: { symbol: 'ETH' } },
        { chainId: 137, name: 'Polygon', nativeCurrency: { symbol: 'MATIC' } },
      ]),
      getChain: vi.fn().mockImplementation((chainId) => {
        const chains = {
          1: { chainId: 1, name: 'Ethereum', nativeCurrency: { symbol: 'ETH' } },
          137: { chainId: 137, name: 'Polygon', nativeCurrency: { symbol: 'MATIC' } },
        };
        return chains[chainId] || null;
      }),
    } as any;

    // Setup mocks
    mockFetchProtocols = vi.fn().mockResolvedValue(mockDefiLlamaProtocols);
    mockProcessProtocols = vi.fn().mockReturnValue(mockProcessedProtocols);
    
    const MockedProtocolDataLoader = ProtocolDataLoader as any;
    MockedProtocolDataLoader.mockImplementation(() => ({
      fetchProtocols: mockFetchProtocols,
      processProtocols: mockProcessProtocols,
      isDataStale: vi.fn().mockReturnValue(false),
      clearCache: vi.fn(),
    }));

    // Suppress console output during tests
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    registry = new ProtocolRegistry(mockChainRegistry);
  });

  afterEach(() => {
    // Restore all mocks to ensure clean state between tests
    vi.restoreAllMocks();
    vi.clearAllMocks();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('initialization', () => {
    it('should initialize successfully with both manual and DefiLlama data', async () => {
      await registry.initialize();

      expect(mockFetchProtocols).toHaveBeenCalled();
      expect(mockProcessProtocols).toHaveBeenCalledWith(mockDefiLlamaProtocols);
      
      // Should have manual protocols + processed protocols
      const stats = registry.getStats();
      expect(stats.totalProtocols).toBeGreaterThan(0);
      
      // Check that manual protocols are loaded
      const manualProtocolsCount = ManualProtocolRegistry.getAll().length;
      expect(stats.totalProtocols).toBeGreaterThanOrEqual(manualProtocolsCount);
    });

    it('should not reinitialize if data is not stale', async () => {
      await registry.initialize();
      await registry.initialize();

      expect(mockFetchProtocols).toHaveBeenCalledTimes(1);
    });

    it('should continue with manual data if DefiLlama fetch fails', async () => {
      mockFetchProtocols.mockRejectedValue(new Error('API Error'));

      await registry.initialize();

      // Should still have manual protocols
      const stats = registry.getStats();
      expect(stats.totalProtocols).toBeGreaterThan(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Continuing with partial protocol data');
    });

    it('should throw error if no data is available', async () => {
      mockFetchProtocols.mockRejectedValue(new Error('API Error'));
      // Mock ManualProtocolRegistry to return empty array
      const manualRegistrySpy = vi.spyOn(ManualProtocolRegistry, 'getAll').mockReturnValue([]);

      await expect(registry.initialize()).rejects.toThrow('Unable to initialize protocol registry');

      // Restore the spy immediately after use
      manualRegistrySpy.mockRestore();
    });

    it('should log manual protocols loading', async () => {
      await registry.initialize();
      
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Loaded \d+ manual protocols/));
    });
  });

  describe('lookup', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should lookup protocol by address and chain', () => {
      // Test with Uniswap V2 Router (manual protocol)
      const result = registry.lookup('0x7a250d5630b4cf539739df2c5dacb4c659f2488d', 1);

      expect(result).not.toBeNull();
      expect(result?.protocol.name).toBe('Uniswap V2');
      expect(result?.confidence).toBe('high'); // Manual registry = high confidence
      expect(result?.source).toBe('manual');
    });

    it('should lookup DefiLlama protocol', () => {
      // Test with Curve (DefiLlama protocol from mock)
      const result = registry.lookup('0xd533a949740bb3306d119cc777fa900ba034cd52', 1);
      
      expect(result).not.toBeNull();
      expect(result?.protocol.name).toBe('Curve');
      expect(result?.confidence).toBe('medium');
      expect(result?.source).toBe('defiLlama');
    });

    it('should return null for unknown protocol', () => {
      const result = registry.lookup('0x0000000000000000000000000000000000000000', 1);
      expect(result).toBeNull();
    });

    it('should be case-insensitive for addresses', () => {
      const result1 = registry.lookup('0x7A250D5630B4CF539739DF2C5DACB4C659F2488D', 1);
      const result2 = registry.lookup('0x7a250d5630b4cf539739df2c5dacb4c659f2488d', 1);
      
      expect(result1?.protocol.name).toBe(result2?.protocol.name);
    });

    it('should return medium confidence for DefiLlama-only protocols', () => {
      const result = registry.lookup('0xd533a949740bb3306d119cc777fa900ba034cd52', 1);
      
      expect(result).not.toBeNull();
      expect(result?.protocol.name).toBe('Curve');
      expect(result?.confidence).toBe('medium');
      expect(result?.source).toBe('defiLlama');
    });
  });

  describe('quickLookup', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should return protocol info without confidence score', () => {
      const result = registry.quickLookup('0x7a250d5630b4cf539739df2c5dacb4c659f2488d', 1);
      
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Uniswap V2');
      expect(result?.category).toBe('DEX');
    });
  });

  describe('batchLookup', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should lookup multiple addresses efficiently', () => {
      const lookups = [
        { address: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', chainId: 1 },
        { address: '0xd533a949740bb3306d119cc777fa900ba034cd52', chainId: 1 },
        { address: '0x0000000000000000000000000000000000000000', chainId: 1 },
      ];

      const results = registry.batchLookup(lookups);

      expect(results.size).toBe(3);
      // Map keys are normalized to lowercase
      expect(results.get('0x7a250d5630b4cf539739df2c5dacb4c659f2488d'.toLowerCase())?.protocol.name).toBe('Uniswap V2');
      expect(results.get('0xd533a949740bb3306d119cc777fa900ba034cd52'.toLowerCase())?.protocol.name).toBe('Curve');
      expect(results.get('0x0000000000000000000000000000000000000000'.toLowerCase())).toBeNull();
    });
  });

  describe('getProtocolsByChain', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should return all protocols for a specific chain', () => {
      const ethereumProtocols = registry.getProtocolsByChain(1);
      
      expect(ethereumProtocols.length).toBeGreaterThan(0);
      expect(ethereumProtocols.every(p => p.chainId === 1)).toBe(true);
    });

    it('should return empty array for chain with no protocols', () => {
      const protocols = registry.getProtocolsByChain(999999);
      expect(protocols).toEqual([]);
    });
  });

  describe('getProtocolsByCategory', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should return all protocols in a category', () => {
      const dexProtocols = registry.getProtocolsByCategory('DEX');
      
      expect(dexProtocols.length).toBeGreaterThan(0);
      expect(dexProtocols.every(p => p.category === 'DEX')).toBe(true);
    });
  });

  describe('searchByName', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should find protocols by name (case-insensitive)', () => {
      const results = registry.searchByName('uniswap');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(p => p.name.toLowerCase().includes('uniswap'))).toBe(true);
    });

    it('should deduplicate results by name and chain', () => {
      const results = registry.searchByName('Uniswap');
      
      // Check that we don't have duplicate (name, chainId) pairs
      const seen = new Set<string>();
      for (const protocol of results) {
        const key = `${protocol.name}-${protocol.chainId}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    });
  });

  describe('addCustomProtocol', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should add a custom protocol', () => {
      const customProtocol: ProtocolInfo = {
        name: 'Test Protocol',
        category: 'Testing',
        chainId: 1,
        address: '0x1234567890123456789012345678901234567890' as any,
      };

      registry.addCustomProtocol(customProtocol);

      const result = registry.lookup('0x1234567890123456789012345678901234567890', 1);
      expect(result?.protocol.name).toBe('Test Protocol');
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should return registry statistics', () => {
      const stats = registry.getStats();
      
      expect(stats.totalProtocols).toBeGreaterThan(0);
      expect(stats.totalAddresses).toBeGreaterThan(0);
      expect(stats.byCategory).toHaveProperty('DEX');
      expect(stats.byChain).toHaveProperty('1');
      expect(stats.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('refresh', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should refresh data when forced', async () => {
      await registry.refresh(true);
      
      expect(mockFetchProtocols).toHaveBeenCalledTimes(2); // Initial + refresh
    });

    it('should not refresh if data is not stale', async () => {
      await registry.refresh(false);
      
      expect(mockFetchProtocols).toHaveBeenCalledTimes(1); // Only initial
    });
  });

  describe('getProtocolNames', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should return sorted unique protocol names', () => {
      const names = registry.getProtocolNames();
      
      expect(names.length).toBeGreaterThan(0);
      expect(names).toEqual([...new Set(names)].sort()); // Should be unique and sorted
    });
  });

  describe('getCategories', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should return sorted unique categories', () => {
      const categories = registry.getCategories();
      
      expect(categories.length).toBeGreaterThan(0);
      expect(categories).toEqual([...new Set(categories)].sort());
      expect(categories).toContain('DEX');
    });
  });

  describe('exportAll', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should export all protocol data', () => {
      const allProtocols = registry.exportAll();
      
      expect(Array.isArray(allProtocols)).toBe(true);
      expect(allProtocols.length).toBeGreaterThan(0);
      expect(allProtocols[0]).toHaveProperty('name');
      expect(allProtocols[0]).toHaveProperty('chainId');
      expect(allProtocols[0]).toHaveProperty('address');
    });
  });

  describe('error handling', () => {
    it('should throw error when using lookup before initialization', () => {
      expect(() => registry.lookup('0x123', 1)).toThrow('ProtocolRegistry not initialized');
    });

    it('should throw error when using other methods before initialization', () => {
      expect(() => registry.quickLookup('0x123', 1)).toThrow('ProtocolRegistry not initialized');
      expect(() => registry.getProtocolsByChain(1)).toThrow('ProtocolRegistry not initialized');
      expect(() => registry.getStats()).toThrow('ProtocolRegistry not initialized');
    });
  });
});