import { describe, it, expect } from 'vitest';
import { ManualAbiRegistry } from '../src/manual-abis';

describe('ManualAbiRegistry', () => {
  describe('getAbi', () => {
    it('should return Uniswap V2 Router ABI', () => {
      const abi = ManualAbiRegistry.getAbi('0x7a250d5630b4cf539739df2c5dacb4c659f2488d', 1);
      
      expect(abi).not.toBeNull();
      expect(abi).toBe(ManualAbiRegistry.UNISWAP_V2_ROUTER_ABI);
      expect(abi).toContainEqual(
        expect.objectContaining({
          name: 'swapExactETHForTokens',
          type: 'function',
        })
      );
    });

    it('should return Uniswap V3 Router ABI', () => {
      const abi = ManualAbiRegistry.getAbi('0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45', 1);
      
      expect(abi).not.toBeNull();
      expect(abi).toBe(ManualAbiRegistry.UNISWAP_V3_ROUTER_ABI);
      expect(abi).toContainEqual(
        expect.objectContaining({
          name: 'exactInputSingle',
          type: 'function',
        })
      );
    });

    it('should return 1inch V5 Router ABI', () => {
      const abi = ManualAbiRegistry.getAbi('0x1111111254eeb25477b68fb85ed929f73a960582', 1);
      
      expect(abi).not.toBeNull();
      expect(abi).toBe(ManualAbiRegistry.ONEINCH_V5_ROUTER_ABI);
      expect(abi).toContainEqual(
        expect.objectContaining({
          name: 'swap',
          type: 'function',
        })
      );
    });

    it('should return OpenSea Seaport ABI', () => {
      const abi = ManualAbiRegistry.getAbi('0x00000000000000adc04c56bf30ac9d3c0aaf14dc', 1);
      
      expect(abi).not.toBeNull();
      expect(abi).toBe(ManualAbiRegistry.OPENSEA_SEAPORT_ABI);
      expect(abi).toContainEqual(
        expect.objectContaining({
          name: 'fulfillBasicOrder',
          type: 'function',
        })
      );
    });

    it('should be case-insensitive for addresses', () => {
      const abi1 = ManualAbiRegistry.getAbi('0x7A250D5630B4CF539739DF2C5DACB4C659F2488D', 1);
      const abi2 = ManualAbiRegistry.getAbi('0x7a250d5630b4cf539739df2c5dacb4c659f2488d', 1);
      
      expect(abi1).toBe(abi2);
      expect(abi1).not.toBeNull();
    });

    it('should return null for unknown address', () => {
      const abi = ManualAbiRegistry.getAbi('0x0000000000000000000000000000000000000000', 1);
      expect(abi).toBeNull();
    });

    it('should return null for wrong chain', () => {
      // Uniswap V2 Router address but on wrong chain (999)
      const abi = ManualAbiRegistry.getAbi('0x7a250d5630b4cf539739df2c5dacb4c659f2488d', 999);
      expect(abi).toBeNull();
    });

    it('should handle multi-chain protocols', () => {
      // Uniswap V3 Router is on multiple chains
      const eth = ManualAbiRegistry.getAbi('0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45', 1);
      const polygon = ManualAbiRegistry.getAbi('0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45', 137);
      const arbitrum = ManualAbiRegistry.getAbi('0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45', 42161);
      
      expect(eth).not.toBeNull();
      expect(polygon).not.toBeNull();
      expect(arbitrum).not.toBeNull();
      expect(eth).toBe(polygon); // Same ABI reference
      expect(eth).toBe(arbitrum);
    });
  });

  describe('hasAbi', () => {
    it('should return true for known protocols', () => {
      expect(ManualAbiRegistry.hasAbi('0x7a250d5630b4cf539739df2c5dacb4c659f2488d', 1)).toBe(true);
      expect(ManualAbiRegistry.hasAbi('0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45', 1)).toBe(true);
      expect(ManualAbiRegistry.hasAbi('0x1111111254eeb25477b68fb85ed929f73a960582', 1)).toBe(true);
    });

    it('should return false for unknown protocols', () => {
      expect(ManualAbiRegistry.hasAbi('0x0000000000000000000000000000000000000000', 1)).toBe(false);
      expect(ManualAbiRegistry.hasAbi('0x7a250d5630b4cf539739df2c5dacb4c659f2488d', 999)).toBe(false);
    });
  });

  describe('getAllProtocolsWithAbis', () => {
    it('should return all protocols with manual ABIs', () => {
      const protocols = ManualAbiRegistry.getAllProtocolsWithAbis();
      
      expect(Array.isArray(protocols)).toBe(true);
      expect(protocols.length).toBeGreaterThan(0);
      
      // Check structure
      const first = protocols[0];
      expect(first).toHaveProperty('chainId');
      expect(first).toHaveProperty('address');
      expect(typeof first.chainId).toBe('number');
      expect(typeof first.address).toBe('string');
      
      // Check some known protocols are included
      const uniswapV2 = protocols.find(
        p => p.address === '0x7a250d5630b4cf539739df2c5dacb4c659f2488d' && p.chainId === 1
      );
      expect(uniswapV2).toBeDefined();
    });
  });

  describe('static ABI constants', () => {
    it('should have valid ERC20 ABI', () => {
      const abi = ManualAbiRegistry.ERC20_ABI;
      expect(abi).toBeDefined();
      
      const functions = abi.filter(item => item.type === 'function');
      const functionNames = functions.map(f => f.name);
      
      expect(functionNames).toContain('transfer');
      expect(functionNames).toContain('transferFrom');
      expect(functionNames).toContain('approve');
      expect(functionNames).toContain('balanceOf');
    });

    it('should have valid Uniswap V2 Router ABI', () => {
      const abi = ManualAbiRegistry.UNISWAP_V2_ROUTER_ABI;
      expect(abi).toBeDefined();
      
      const functions = abi.filter(item => item.type === 'function');
      const functionNames = functions.map(f => f.name);
      
      expect(functionNames).toContain('swapExactETHForTokens');
      expect(functionNames).toContain('swapExactTokensForTokens');
      expect(functionNames).toContain('addLiquidity');
    });

    it('should have valid Uniswap V3 Router ABI', () => {
      const abi = ManualAbiRegistry.UNISWAP_V3_ROUTER_ABI;
      expect(abi).toBeDefined();
      
      const functions = abi.filter(item => item.type === 'function');
      const functionNames = functions.map(f => f.name);
      
      expect(functionNames).toContain('exactInputSingle');
      expect(functionNames).toContain('multicall');
    });
  });
});