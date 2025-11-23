import type { ProtocolInfo } from './types';
import type { Address } from 'viem';

/**
 * ManualProtocolRegistry contains high-confidence protocol addresses
 * that we manually verify and maintain.
 * 
 * These are used to:
 * - Override DefiLlama data when we have more accurate information
 * - Add protocols that might be missing from DefiLlama
 * - Ensure critical protocols are always correctly identified
 * - Handle special cases like proxy contracts or router addresses
 */
export class ManualProtocolRegistry {
  /**
   * High-confidence protocol addresses manually verified
   * These take precedence over DefiLlama data
   */
  private static readonly MANUAL_PROTOCOLS: ProtocolInfo[] = [
    // ============ Ethereum Mainnet (Chain ID: 1) ============
    {
      name: 'Uniswap V2',
      category: 'DEX',
      chainId: 1,
      address: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d' as Address,
      logo: 'uniswap',
      metadata: {
        symbol: 'UNI-V2',
        website: 'https://app.uniswap.org',
      },
    },
    {
      name: 'Uniswap V3',
      category: 'DEX',
      chainId: 1,
      address: '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45' as Address,
      logo: 'uniswap',
      metadata: {
        symbol: 'UNI-V3',
        website: 'https://app.uniswap.org',
      },
    },
    {
      name: 'Uniswap Universal Router',
      category: 'DEX',
      chainId: 1,
      address: '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad' as Address,
      logo: 'uniswap',
      metadata: {
        symbol: 'UNI-UR',
        website: 'https://app.uniswap.org',
      },
    },
    {
      name: '1inch V5',
      category: 'Aggregator',
      chainId: 1,
      address: '0x1111111254eeb25477b68fb85ed929f73a960582' as Address,
      logo: '1inch',
      metadata: {
        symbol: '1INCH',
        website: 'https://1inch.io',
      },
    },
    {
      name: 'CowSwap',
      category: 'DEX',
      chainId: 1,
      address: '0x9008d19f58aabd9ed0d60971565aa8510560ab41' as Address,
      logo: 'cowswap',
      metadata: {
        symbol: 'COW',
        website: 'https://cowswap.exchange',
      },
    },
    {
      name: 'OpenSea Seaport',
      category: 'NFT',
      chainId: 1,
      address: '0x00000000000000adc04c56bf30ac9d3c0aaf14dc' as Address,
      logo: 'opensea',
      metadata: {
        symbol: 'OPENSEA',
        website: 'https://opensea.io',
      },
    },
    {
      name: 'Blur Marketplace',
      category: 'NFT',
      chainId: 1,
      address: '0x39da41747a83aee658334415666f3ef92dd0d541' as Address,
      logo: 'blur',
      metadata: {
        symbol: 'BLUR',
        website: 'https://blur.io',
      },
    },
    {
      name: 'Aave V3 Pool',
      category: 'Lending',
      chainId: 1,
      address: '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2' as Address,
      logo: 'aave',
      metadata: {
        symbol: 'AAVE',
        website: 'https://aave.com',
      },
    },

    // ============ Arbitrum One (Chain ID: 42161) ============
    {
      name: 'Uniswap V3',
      category: 'DEX',
      chainId: 42161,
      address: '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45' as Address,
      logo: 'uniswap',
      metadata: {
        symbol: 'UNI-V3',
        website: 'https://app.uniswap.org',
      },
    },
    {
      name: 'GMX Router',
      category: 'Derivatives',
      chainId: 42161,
      address: '0xabbc5f99639c9b6bcb58544ddf04efa6802f4064' as Address,
      logo: 'gmx',
      metadata: {
        symbol: 'GMX',
        website: 'https://gmx.io',
      },
    },
    {
      name: 'Camelot V2',
      category: 'DEX',
      chainId: 42161,
      address: '0xc873fecbd354f5a56e00e710b90ef4201db2448d' as Address,
      logo: 'camelot',
      metadata: {
        symbol: 'GRAIL',
        website: 'https://camelot.exchange',
      },
    },

    // ============ Base (Chain ID: 8453) ============
    {
      name: 'Uniswap V3',
      category: 'DEX',
      chainId: 8453,
      address: '0x2626664c2603336e57b271c5c0b26f421741e481' as Address,
      logo: 'uniswap',
      metadata: {
        symbol: 'UNI-V3',
        website: 'https://app.uniswap.org',
      },
    },
    {
      name: 'Aerodrome Router',
      category: 'DEX',
      chainId: 8453,
      address: '0xcf77a3ba9a5ca399b7c97c74d54e5b1beb874e43' as Address,
      logo: 'aerodrome',
      metadata: {
        symbol: 'AERO',
        website: 'https://aerodrome.finance',
      },
    },

    // ============ Optimism (Chain ID: 10) ============
    {
      name: 'Velodrome V2 Router',
      category: 'DEX',
      chainId: 10,
      address: '0xa062ae8a9c5e11aaa026fc2670b0d65ccc8b2858' as Address,
      logo: 'velodrome',
      metadata: {
        symbol: 'VELO',
        website: 'https://velodrome.finance',
      },
    },
    {
      name: 'Synthetix',
      category: 'Derivatives',
      chainId: 10,
      address: '0x8700daec35af8ff88c16bdf0418774cb3d7599b4' as Address,
      logo: 'synthetix',
      metadata: {
        symbol: 'SNX',
        website: 'https://synthetix.io',
      },
    },

    // ============ Polygon (Chain ID: 137) ============
    {
      name: 'QuickSwap V3',
      category: 'DEX',
      chainId: 137,
      address: '0xf5b509bb0909a69b1c207e495f687a596c168e96' as Address,
      logo: 'quickswap',
      metadata: {
        symbol: 'QUICK',
        website: 'https://quickswap.exchange',
      },
    },
  ];

  /**
   * Get all manually registered protocols
   * @returns Array of high-confidence protocol information
   */
  static getAll(): ProtocolInfo[] {
    return [...this.MANUAL_PROTOCOLS];
  }

  /**
   * Get protocols for a specific chain
   * @param chainId - The chain ID to filter by
   * @returns Protocols deployed on the specified chain
   */
  static getByChain(chainId: number): ProtocolInfo[] {
    return this.MANUAL_PROTOCOLS.filter(p => p.chainId === chainId);
  }

  /**
   * Lookup a protocol by address and chain
   * @param address - Contract address to lookup
   * @param chainId - Chain ID where the contract is deployed
   * @returns Protocol info or null if not found
   */
  static lookup(address: string, chainId: number): ProtocolInfo | null {
    const normalizedAddress = address.toLowerCase();
    return this.MANUAL_PROTOCOLS.find(
      p => p.address.toLowerCase() === normalizedAddress && p.chainId === chainId
    ) || null;
  }

  /**
   * Check if an address is a known protocol
   * @param address - Contract address to check
   * @param chainId - Chain ID where the contract is deployed
   * @returns true if the address is a known protocol
   */
  static isKnownProtocol(address: string, chainId: number): boolean {
    return this.lookup(address, chainId) !== null;
  }

  /**
   * Get all unique protocol names
   * @returns Array of protocol names
   */
  static getProtocolNames(): string[] {
    const names = new Set(this.MANUAL_PROTOCOLS.map(p => p.name));
    return Array.from(names).sort();
  }

  /**
   * Get statistics about manual registry
   * @returns Registry statistics
   */
  static getStats(): {
    total: number;
    byChain: Record<number, number>;
    byCategory: Record<string, number>;
  } {
    const byChain: Record<number, number> = {};
    const byCategory: Record<string, number> = {};

    for (const protocol of this.MANUAL_PROTOCOLS) {
      byChain[protocol.chainId] = (byChain[protocol.chainId] || 0) + 1;
      byCategory[protocol.category] = (byCategory[protocol.category] || 0) + 1;
    }

    return {
      total: this.MANUAL_PROTOCOLS.length,
      byChain,
      byCategory,
    };
  }
}