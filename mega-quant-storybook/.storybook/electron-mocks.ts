/**
 * Mock Electron APIs for Storybook
 * Allows UI components to run in browser without Electron
 */

export const mockElectronAPIs = {
  // Mock IPC renderer
  electronAPI: {
    // Wallet operations
    connectWallet: async (privateKey: string) => {
      console.log('[Mock] Connect wallet called');
      return { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' };
    },

    getBalance: async (chain: string) => {
      console.log('[Mock] Get balance for chain:', chain);
      return {
        native: '1.5',
        tokens: [
          { symbol: 'USDC', balance: '1000.0', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
          { symbol: 'WETH', balance: '0.5', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
        ],
      };
    },

    // Trading operations
    getPrice: async (tokenA: string, tokenB: string, dex: string) => {
      console.log(`[Mock] Get price ${tokenA}/${tokenB} on ${dex}`);
      return { price: 1800.50, liquidity: 5000000 };
    },

    executeTrade: async (params: any) => {
      console.log('[Mock] Execute trade:', params);
      return {
        txHash: '0x' + Math.random().toString(16).substr(2, 64),
        status: 'pending',
      };
    },

    // Strategy operations
    runStrategy: async (code: string, name: string) => {
      console.log('[Mock] Running strategy:', name);
      return { strategyId: 'strategy_' + Date.now() };
    },

    stopStrategy: async (strategyId: string) => {
      console.log('[Mock] Stopping strategy:', strategyId);
      return { success: true };
    },

    // Data feeds
    subscribeToMempool: async (chain: string) => {
      console.log('[Mock] Subscribe to mempool:', chain);
      // Simulate mempool data
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('mempool-tx', {
          detail: {
            hash: '0x' + Math.random().toString(16).substr(2, 64),
            from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
            to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            value: '1000000000000000000',
            gasPrice: '50000000000',
          },
        }));
      }, 2000);
      return { subscriptionId: 'sub_' + Date.now() };
    },

    // File operations
    saveStrategy: async (name: string, code: string) => {
      console.log('[Mock] Save strategy:', name);
      localStorage.setItem(`strategy_${name}`, code);
      return { success: true };
    },

    loadStrategy: async (name: string) => {
      console.log('[Mock] Load strategy:', name);
      return localStorage.getItem(`strategy_${name}`) || '';
    },

    // Settings
    getSettings: async () => {
      return {
        theme: 'dark',
        autoSave: true,
        defaultGasPrice: 'medium',
        slippageTolerance: 0.5,
      };
    },

    saveSettings: async (settings: any) => {
      console.log('[Mock] Save settings:', settings);
      localStorage.setItem('settings', JSON.stringify(settings));
      return { success: true };
    },
  },

  // Mock chain data
  chains: [
    { id: 1, name: 'Ethereum', symbol: 'ETH', color: '#627EEA' },
    { id: 137, name: 'Polygon', symbol: 'MATIC', color: '#8247E5' },
    { id: 56, name: 'BSC', symbol: 'BNB', color: '#F0B90B' },
    { id: 42161, name: 'Arbitrum', symbol: 'ETH', color: '#28A0F0' },
    { id: 10, name: 'Optimism', symbol: 'ETH', color: '#FF0420' },
    { id: 8453, name: 'Base', symbol: 'ETH', color: '#0052FF' },
  ],

  // Mock DEX list
  dexList: [
    { name: 'Uniswap V3', id: 'uniswap-v3', chains: [1, 137, 42161, 10, 8453] },
    { name: 'Uniswap V2', id: 'uniswap-v2', chains: [1] },
    { name: 'SushiSwap', id: 'sushiswap', chains: [1, 137, 42161] },
    { name: 'PancakeSwap', id: 'pancakeswap', chains: [56, 1] },
    { name: '1inch', id: '1inch', chains: [1, 137, 56, 42161, 10] },
  ],
};

// Mock Worker API for strategies
export class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;

  constructor(scriptURL: string) {
    console.log('[Mock] Worker created:', scriptURL);
  }

  postMessage(data: any) {
    console.log('[Mock] Worker received:', data);
    // Simulate worker response
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage(new MessageEvent('message', {
          data: { type: 'log', message: 'Strategy running...' },
        }));
      }
    }, 100);
  }

  terminate() {
    console.log('[Mock] Worker terminated');
  }
}

// Replace Worker in browser environment
if (typeof window !== 'undefined' && !window.Worker) {
  (window as any).Worker = MockWorker;
}