import type { Abi } from 'viem';
import { ManualAbiRegistry } from './manual-abis';

/**
 * AbiLoader manages fetching and caching contract ABIs from multiple sources
 * 
 * Sources in priority order:
 * 1. Manual curated ABIs (highest confidence)
 * 2. Etherscan API (verified contracts)
 * 3. 4byte function signature database (fallback)
 * 4. Sourcify (decentralized contract verification)
 * 
 * This enables transaction decoding for mempool analysis
 */
export class AbiLoader {
  /** Cache for ABIs by chain:address */
  private abiCache: Map<string, Abi | null> = new Map();
  
  /** Cache for function signatures by selector */
  private signatureCache: Map<string, string> = new Map();

  /** Etherscan API key (v2 supports 60+ chains) */
  private etherscanApiKey: string | undefined;

  /**
   * Creates a new AbiLoader instance
   * @param _chainRegistry - Chain registry for network information (reserved for future use)
   * @param etherscanApiKey - Etherscan API key (v2 supports 60+ chains)
   */
  constructor(_chainRegistry: any, etherscanApiKey?: string) {
    // _chainRegistry reserved for future use
    this.etherscanApiKey = etherscanApiKey;
  }

  /**
   * Fetches ABI for a contract from all available sources
   * @param address - Contract address
   * @param chainId - Chain ID where contract is deployed
   * @returns Contract ABI or null if not found
   */
  async getAbi(address: string, chainId: number): Promise<Abi | null> {
    const key = `${chainId}:${address.toLowerCase()}`;
    
    // Check cache first
    if (this.abiCache.has(key)) {
      return this.abiCache.get(key)!;
    }

    // Try sources in order of preference
    let abi: Abi | null = null;

    // 1. Try manual ABIs first
    abi = await this.getManualAbi(address, chainId);
    
    // 2. Try Etherscan
    if (!abi) {
      abi = await this.getEtherscanAbi(address, chainId);
    }
    
    // 3. Try Sourcify
    if (!abi) {
      abi = await this.getSourcifyAbi(address, chainId);
    }

    // Cache result (including null)
    this.abiCache.set(key, abi);
    return abi;
  }

  /**
   * Gets manually curated ABIs for high-value protocols
   * @param address - Contract address
   * @param chainId - Chain ID
   * @returns ABI or null
   */
  private async getManualAbi(address: string, chainId: number): Promise<Abi | null> {
    return ManualAbiRegistry.getAbi(address, chainId);
  }

  /**
   * Fetches ABI from Etherscan API v2
   * Etherscan v2 supports 60+ chains with a single API key
   * @param address - Contract address  
   * @param chainId - Chain ID
   * @returns ABI or null if not verified
   */
  private async getEtherscanAbi(address: string, chainId: number): Promise<Abi | null> {
    if (!this.etherscanApiKey) {
      return null;
    }

    try {
      // Etherscan API v2 endpoint that supports multiple chains
      const url = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=contract&action=getabi&address=${address}&apikey=${this.etherscanApiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === '1' && data.result) {
        return JSON.parse(data.result) as Abi;
      }
    } catch (error) {
      console.warn(`Failed to fetch ABI from Etherscan v2 for ${address} on chain ${chainId}:`, error);
    }

    return null;
  }

  /**
   * Fetches ABI from Sourcify (decentralized verification)
   * @param address - Contract address
   * @param chainId - Chain ID
   * @returns ABI or null if not found
   */
  private async getSourcifyAbi(address: string, chainId: number): Promise<Abi | null> {
    try {
      // Try full match first
      const fullUrl = `https://repo.sourcify.dev/contracts/full_match/${chainId}/${address}/metadata.json`;
      let response = await fetch(fullUrl);
      
      if (!response.ok) {
        // Try partial match
        const partialUrl = `https://repo.sourcify.dev/contracts/partial_match/${chainId}/${address}/metadata.json`;
        response = await fetch(partialUrl);
      }
      
      if (response.ok) {
        const metadata = await response.json();
        return metadata.output?.abi as Abi;
      }
    } catch (error) {
      console.warn(`Failed to fetch ABI from Sourcify for ${address} on chain ${chainId}:`, error);
    }

    return null;
  }

  /**
   * Gets function signature for a 4-byte selector
   * Uses 4byte.directory as fallback when ABI is not available
   * @param selector - 4-byte function selector (0x12345678)
   * @returns Function signature or null
   */
  async getFunctionSignature(selector: string): Promise<string | null> {
    // Check cache
    if (this.signatureCache.has(selector)) {
      return this.signatureCache.get(selector)!;
    }

    try {
      const response = await fetch(`https://api.openchain.xyz/signature-database/v1/lookup?function=${selector}`);
      if (response.ok) {
        const data = await response.json();
        if (data.result && data.result.function && data.result.function[selector]) {
          const signatures = data.result.function[selector];
          if (signatures.length > 0) {
            const signature = signatures[0].name;
            this.signatureCache.set(selector, signature);
            return signature;
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch function signature for ${selector}:`, error);
    }

    return null;
  }

  /**
   * Clears all caches
   */
  clearCache(): void {
    this.abiCache.clear();
    this.signatureCache.clear();
  }
}