import { describe, it, expect } from 'vitest';
import { ManualProtocolRegistry } from '../src/manual-registry';

describe('ManualProtocolRegistry', () => {
  describe('getAll', () => {
    it('should return all manual protocols', () => {
      const protocols = ManualProtocolRegistry.getAll();
      
      expect(Array.isArray(protocols)).toBe(true);
      expect(protocols.length).toBeGreaterThan(0);
      
      // Check structure of first protocol
      const firstProtocol = protocols[0];
      expect(firstProtocol).toHaveProperty('name');
      expect(firstProtocol).toHaveProperty('category');
      expect(firstProtocol).toHaveProperty('chainId');
      expect(firstProtocol).toHaveProperty('address');
    });

    it('should return a copy of the protocols array', () => {
      const protocols1 = ManualProtocolRegistry.getAll();
      const protocols2 = ManualProtocolRegistry.getAll();
      
      expect(protocols1).not.toBe(protocols2); // Different array instances
      expect(protocols1).toEqual(protocols2); // Same content
    });
  });

  describe('getByChain', () => {
    it('should return protocols for Ethereum mainnet', () => {
      const ethereumProtocols = ManualProtocolRegistry.getByChain(1);
      
      expect(ethereumProtocols.length).toBeGreaterThan(0);
      expect(ethereumProtocols.every(p => p.chainId === 1)).toBe(true);
    });

    it('should return protocols for Arbitrum', () => {
      const arbitrumProtocols = ManualProtocolRegistry.getByChain(42161);
      
      expect(arbitrumProtocols.length).toBeGreaterThan(0);
      expect(arbitrumProtocols.every(p => p.chainId === 42161)).toBe(true);
    });

    it('should return empty array for chain with no protocols', () => {
      const protocols = ManualProtocolRegistry.getByChain(999999);
      expect(protocols).toEqual([]);
    });
  });

  describe('lookup', () => {
    it('should find protocol by address and chain', () => {
      // Uniswap V2 Router on Ethereum
      const protocol = ManualProtocolRegistry.lookup(
        '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
        1
      );
      
      expect(protocol).not.toBeNull();
      expect(protocol?.name).toBe('Uniswap V2');
      expect(protocol?.category).toBe('DEX');
    });

    it('should be case-insensitive for addresses', () => {
      const upperCase = ManualProtocolRegistry.lookup(
        '0x7A250D5630B4CF539739DF2C5DACB4C659F2488D',
        1
      );
      const lowerCase = ManualProtocolRegistry.lookup(
        '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
        1
      );
      
      expect(upperCase).toEqual(lowerCase);
    });

    it('should return null for unknown address', () => {
      const protocol = ManualProtocolRegistry.lookup(
        '0x0000000000000000000000000000000000000000',
        1
      );
      
      expect(protocol).toBeNull();
    });

    it('should return null for wrong chain', () => {
      // Uniswap V2 Router address but wrong chain
      const protocol = ManualProtocolRegistry.lookup(
        '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
        137 // Polygon instead of Ethereum
      );
      
      expect(protocol).toBeNull();
    });
  });

  describe('isKnownProtocol', () => {
    it('should return true for known protocol', () => {
      const isKnown = ManualProtocolRegistry.isKnownProtocol(
        '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
        1
      );
      
      expect(isKnown).toBe(true);
    });

    it('should return false for unknown protocol', () => {
      const isKnown = ManualProtocolRegistry.isKnownProtocol(
        '0x0000000000000000000000000000000000000000',
        1
      );
      
      expect(isKnown).toBe(false);
    });
  });

  describe('getProtocolNames', () => {
    it('should return unique sorted protocol names', () => {
      const names = ManualProtocolRegistry.getProtocolNames();
      
      expect(Array.isArray(names)).toBe(true);
      expect(names.length).toBeGreaterThan(0);
      
      // Check uniqueness
      const uniqueNames = [...new Set(names)];
      expect(names).toEqual(uniqueNames);
      
      // Check sorting
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
      
      // Check some expected protocols
      expect(names).toContain('Uniswap V2');
      expect(names).toContain('Aave V3 Pool');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const stats = ManualProtocolRegistry.getStats();
      
      expect(stats.total).toBeGreaterThan(0);
      expect(typeof stats.byChain).toBe('object');
      expect(typeof stats.byCategory).toBe('object');
      
      // Check that counts add up
      const totalByChain = Object.values(stats.byChain).reduce((a, b) => a + b, 0);
      expect(totalByChain).toBe(stats.total);
      
      // Check expected chains
      expect(stats.byChain).toHaveProperty('1'); // Ethereum
      expect(stats.byChain).toHaveProperty('42161'); // Arbitrum
      
      // Check expected categories
      expect(stats.byCategory).toHaveProperty('DEX');
      expect(stats.byCategory).toHaveProperty('Lending');
    });
  });

  describe('protocol data integrity', () => {
    it('should have valid addresses for all protocols', () => {
      const protocols = ManualProtocolRegistry.getAll();
      
      for (const protocol of protocols) {
        // Check address format (0x followed by 40 hex characters)
        expect(protocol.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
        
        // Check address is lowercase (for consistency)
        expect(protocol.address).toBe(protocol.address.toLowerCase());
      }
    });

    it('should have valid chain IDs', () => {
      const protocols = ManualProtocolRegistry.getAll();
      const validChainIds = [1, 10, 137, 8453, 42161]; // Main chains we support
      
      for (const protocol of protocols) {
        expect(validChainIds).toContain(protocol.chainId);
      }
    });

    it('should have metadata for all protocols', () => {
      const protocols = ManualProtocolRegistry.getAll();
      
      for (const protocol of protocols) {
        expect(protocol.metadata).toBeDefined();
        expect(protocol.metadata?.symbol).toBeDefined();
        expect(protocol.metadata?.website).toBeDefined();
      }
    });
  });

  describe('specific protocol checks', () => {
    it('should have Uniswap protocols on multiple chains', () => {
      const uniswapProtocols = ManualProtocolRegistry.getAll()
        .filter(p => p.name.includes('Uniswap'));
      
      expect(uniswapProtocols.length).toBeGreaterThan(1);
      
      // Check different chains have Uniswap
      const chains = [...new Set(uniswapProtocols.map(p => p.chainId))];
      expect(chains.length).toBeGreaterThan(1);
    });

    it('should have major DEX protocols', () => {
      const dexProtocols = ManualProtocolRegistry.getAll()
        .filter(p => p.category === 'DEX' || p.category === 'Aggregator');
      
      const dexNames = dexProtocols.map(p => p.name);
      
      // Check for major DEXs
      expect(dexNames).toContain('Uniswap V2');
      expect(dexNames).toContain('Uniswap V3');
      expect(dexNames).toContain('1inch V5');
      expect(dexNames).toContain('CowSwap');
    });

    it('should have NFT marketplaces', () => {
      const nftProtocols = ManualProtocolRegistry.getAll()
        .filter(p => p.category === 'NFT');
      
      const nftNames = nftProtocols.map(p => p.name);
      
      expect(nftNames).toContain('OpenSea Seaport');
      expect(nftNames).toContain('Blur Marketplace');
    });
  });
});