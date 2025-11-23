import { ethers, JsonRpcProvider, Wallet, Contract, ZeroAddress, parseUnits, formatUnits, parseEther, formatEther } from 'ethers';
import * as ta from 'technicalindicators';
import { SUPPORTED_NETWORKS } from '../config/networks';

export interface ProviderConfig {
  networkId: number;
  rpcUrl: string;
  privateKey?: string;
}

export class TradingAPI {
  private providers: Map<number, JsonRpcProvider> = new Map();
  private wallets: Map<number, Wallet> = new Map();

  constructor(
    private accounts: Array<{ privateKey: string; networks: number[] }>,
    private apiKey: string = ''
  ) {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Initialize providers for each supported network
    SUPPORTED_NETWORKS.forEach((network) => {
      try {
        const rpcUrl = this.getRpcUrl(network.id);
        const provider = new JsonRpcProvider(rpcUrl);
        this.providers.set(network.id, provider);

        // Create wallets for accounts that have this network enabled
        this.accounts.forEach((account) => {
          if (account.networks.includes(network.id)) {
            try {
              const wallet = new Wallet(account.privateKey, provider);
              this.wallets.set(network.id, wallet);
            } catch (error) {
              console.error(`Failed to create wallet for network ${network.id}:`, error);
            }
          }
        });
      } catch (error) {
        console.warn(`Failed to initialize provider for network ${network.id}:`, error);
      }
    });
  }

  private getRpcUrl(networkId: number): string {
    const network = SUPPORTED_NETWORKS.find(n => n.id === networkId);
    if (!network) {
      throw new Error(`Unsupported network: ${networkId}`);
    }

    // Use API key if available, otherwise use public RPC
    if (this.apiKey && network.rpcUrl.includes('{apiKey}')) {
      return network.rpcUrl.replace('{apiKey}', this.apiKey);
    }

    return network.rpcUrl;
  }

  // Get provider for a specific network
  getProvider(networkId: number): JsonRpcProvider {
    const provider = this.providers.get(networkId);
    if (!provider) {
      throw new Error(`Provider not found for network: ${networkId}`);
    }
    return provider;
  }

  // Get wallet (signer) for a specific network
  getWallet(networkId: number): Wallet {
    const wallet = this.wallets.get(networkId);
    if (!wallet) {
      throw new Error(`No wallet configured for network: ${networkId}`);
    }
    return wallet;
  }

  // Get current price from on-chain (simplified example)
  async getPrice(tokenAddress: string, networkId: number): Promise<number> {
    // TODO: Implement actual price fetching from DEX
    // This would query Uniswap/etc price oracles
    return Math.random() * 3000 + 1000; // Mock price for now
  }

  // Get balance of a token
  async getBalance(tokenAddress: string, networkId: number): Promise<string> {
    const wallet = this.getWallet(networkId);

    if (tokenAddress === ZeroAddress || tokenAddress === 'ETH') {
      // Native token balance
      const balance = await wallet.provider?.getBalance(wallet.address);
      return formatEther(balance || 0n);
    } else {
      // ERC20 token balance
      const tokenContract = new Contract(
        tokenAddress,
        ['function balanceOf(address) view returns (uint256)'],
        wallet
      );
      const balance = await tokenContract.balanceOf(wallet.address);
      return formatUnits(balance, 18); // Assumes 18 decimals
    }
  }

  // Execute a swap (simplified - would integrate with Uniswap SDK)
  async swap(params: {
    networkId: number;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    slippage?: number;
  }): Promise<any> {
    const wallet = this.getWallet(params.networkId);

    // TODO: Implement actual swap logic using Uniswap SDK
    // This is a placeholder that shows the structure

    throw new Error('Swap functionality not yet implemented. This is a demo environment.');
  }

  // Get quote for a swap
  async getQuote(params: {
    networkId: number;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
  }): Promise<{ amountOut: string; priceImpact: number }> {
    // TODO: Implement actual quote logic using Uniswap SDK
    return {
      amountOut: '0',
      priceImpact: 0
    };
  }

  // Utility functions (ethers v6 style)
  utils = {
    parseUnits: (value: string, decimals: number = 18) => {
      return parseUnits(value, decimals);
    },
    formatUnits: (value: bigint, decimals: number = 18) => {
      return formatUnits(value, decimals);
    },
    parseEther: (value: string) => {
      return parseEther(value);
    },
    formatEther: (value: bigint) => {
      return formatEther(value);
    }
  };

  // Technical analysis indicators (re-export)
  ta = ta;

  // ethers library access
  ethers = ethers;
}
