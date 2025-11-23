import type { Meta, StoryObj } from '@storybook/react';
import { ActiveStrategiesContainer } from './ActiveStrategiesContainer';
import { Strategy } from '../../types/strategy';

const meta = {
  title: 'MEGA Quant/ActiveStrategiesContainer',
  component: ActiveStrategiesContainer,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    strategies: {
      control: 'object',
      description: 'Array of strategy objects to display',
    },
    onDeployStrategy: { action: 'deployStrategy' },
    onStartStrategy: { action: 'startStrategy' },
    onStopStrategy: { action: 'stopStrategy' },
    onEditStrategy: { action: 'editStrategy' },
    onDeleteStrategy: { action: 'deleteStrategy' },
    onViewStrategy: { action: 'viewStrategy' },
  },
} satisfies Meta<typeof ActiveStrategiesContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default empty state - shown when no strategies are deployed
 */
export const Default: Story = {
  args: {
    strategies: [],
  },
};

/**
 * Single strategy running on one blockchain (Ethereum)
 */
export const SingleChainStrategy: Story = {
  args: {
    strategies: [
      {
        id: '1',
        name: 'Arbitrage Bot ETH',
        status: 'running',
        chains: {
          1: {
            chainId: 1,
            privateKey: '0x' + '1'.repeat(64),
            address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
            tokens: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'], // WETH
            tradeCount: 50,
            totalProfit: 1234.56,
            isActive: true,
            lastTradeTimestamp: Date.now() - 300000, // 5 minutes ago
          },
        },
        code: '// Strategy code here',
        createdAt: Date.now() - 7200000, // 2 hours ago
        updatedAt: Date.now() - 300000,
        runtime: 7200000, // 2 hours
        totalProfit: 1234.56,
        totalTrades: 50,
        description: 'Simple arbitrage strategy on Ethereum mainnet',
        tags: ['arbitrage', 'ethereum'],
      },
    ],
  },
};

/**
 * Single strategy running across multiple blockchains
 */
export const MultiChainStrategy: Story = {
  args: {
    strategies: [
      {
        id: '2',
        name: 'Multi-Chain DCA Bot',
        status: 'running',
        chains: {
          1: {
            chainId: 1,
            privateKey: '0x' + '2'.repeat(64),
            address: '0x8765432109876543210987654321098765432109',
            tokens: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
            tradeCount: 75,
            totalProfit: 2345.67,
            isActive: true,
            lastTradeTimestamp: Date.now() - 120000,
          },
          42161: {
            chainId: 42161,
            privateKey: '0x' + '3'.repeat(64),
            address: '0x9876543210987654321098765432109876543210',
            tokens: ['0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'],
            tradeCount: 42,
            totalProfit: 1567.89,
            isActive: true,
            lastTradeTimestamp: Date.now() - 180000,
          },
          137: {
            chainId: 137,
            privateKey: '0x' + '4'.repeat(64),
            address: '0xabcdef1234567890abcdef1234567890abcdef12',
            tokens: ['0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'],
            tradeCount: 38,
            totalProfit: 1764.32,
            isActive: true,
            lastTradeTimestamp: Date.now() - 240000,
          },
        },
        code: '// Multi-chain DCA strategy code',
        createdAt: Date.now() - 18000000, // 5 hours ago
        updatedAt: Date.now() - 120000,
        runtime: 18000000, // 5 hours
        totalProfit: 5677.88,
        totalTrades: 155,
        description: 'Dollar-cost averaging across Ethereum, Arbitrum, and Polygon',
        tags: ['dca', 'multi-chain'],
      },
    ],
  },
};

/**
 * Multiple strategies with different states and chain configurations
 */
export const MixedStatusStrategies: Story = {
  args: {
    strategies: [
      {
        id: '3',
        name: 'High Frequency Trader',
        status: 'running',
        chains: {
          1: {
            chainId: 1,
            privateKey: '0x' + 'a'.repeat(64),
            address: '0x1111111111111111111111111111111111111111',
            tokens: ['0xdAC17F958D2ee523a2206206994597C13D831ec7'], // USDT
            tradeCount: 245,
            totalProfit: 8945.23,
            isActive: true,
            lastTradeTimestamp: Date.now() - 60000,
          },
          42161: {
            chainId: 42161,
            privateKey: '0x' + 'b'.repeat(64),
            address: '0x2222222222222222222222222222222222222222',
            tokens: ['0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'], // USDT on Arbitrum
            tradeCount: 198,
            totalProfit: 6723.45,
            isActive: true,
            lastTradeTimestamp: Date.now() - 45000,
          },
        },
        code: '// HFT strategy code',
        createdAt: Date.now() - 28800000, // 8 hours ago
        updatedAt: Date.now() - 45000,
        runtime: 28800000,
        totalProfit: 15668.68,
        totalTrades: 443,
        description: 'High-frequency trading on Ethereum and Arbitrum',
        tags: ['hft', 'multi-chain'],
      },
      {
        id: '4',
        name: 'Liquidity Provider Bot',
        status: 'paused',
        chains: {
          56: {
            chainId: 56,
            privateKey: '0x' + 'c'.repeat(64),
            address: '0x3333333333333333333333333333333333333333',
            tokens: ['0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'], // WBNB
            tradeCount: 28,
            totalProfit: -145.67,
            isActive: false,
            lastTradeTimestamp: Date.now() - 3600000,
          },
        },
        code: '// LP bot code',
        createdAt: Date.now() - 14400000, // 4 hours ago
        updatedAt: Date.now() - 3600000,
        runtime: 10800000, // 3 hours
        totalProfit: -145.67,
        totalTrades: 28,
        description: 'Automated liquidity provision on BSC',
        tags: ['liquidity', 'bsc'],
      },
      {
        id: '5',
        name: 'Mean Reversion Strategy',
        status: 'stopped',
        chains: {
          10: {
            chainId: 10,
            privateKey: '0x' + 'd'.repeat(64),
            address: '0x4444444444444444444444444444444444444444',
            tokens: ['0x4200000000000000000000000000000000000006'], // WETH on Optimism
            tradeCount: 0,
            totalProfit: 0,
            isActive: false,
            lastTradeTimestamp: undefined,
          },
        },
        code: '// Mean reversion strategy code',
        createdAt: Date.now() - 3600000, // 1 hour ago
        updatedAt: Date.now() - 3600000,
        runtime: 0,
        totalProfit: 0,
        totalTrades: 0,
        description: 'Mean reversion trading on Optimism',
        tags: ['mean-reversion', 'optimism'],
      },
      {
        id: '6',
        name: 'Broken Strategy',
        status: 'error',
        chains: {
          8453: {
            chainId: 8453,
            privateKey: '0x' + 'e'.repeat(64),
            address: '0x5555555555555555555555555555555555555555',
            tokens: ['0x4200000000000000000000000000000000000006'], // WETH on Base
            tradeCount: 12,
            totalProfit: -456.78,
            isActive: false,
            lastTradeTimestamp: Date.now() - 1800000,
          },
        },
        code: '// Broken strategy code',
        createdAt: Date.now() - 7200000, // 2 hours ago
        updatedAt: Date.now() - 1800000,
        runtime: 5400000, // 1.5 hours
        totalProfit: -456.78,
        totalTrades: 12,
        description: 'Strategy encountered an error on Base',
        tags: ['error', 'base'],
      },
      {
        id: '7',
        name: 'Cross-Chain Arbitrage',
        status: 'running',
        chains: {
          1: {
            chainId: 1,
            privateKey: '0x' + 'f'.repeat(64),
            address: '0x6666666666666666666666666666666666666666',
            tokens: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'], // USDC
            tradeCount: 89,
            totalProfit: 3421.56,
            isActive: true,
            lastTradeTimestamp: Date.now() - 90000,
          },
          10: {
            chainId: 10,
            privateKey: '0x' + '0'.repeat(64),
            address: '0x7777777777777777777777777777777777777777',
            tokens: ['0x7F5c764cBc14f9669B88837ca1490cCa17c31607'], // USDC on Optimism
            tradeCount: 76,
            totalProfit: 2987.34,
            isActive: true,
            lastTradeTimestamp: Date.now() - 75000,
          },
          42161: {
            chainId: 42161,
            privateKey: '0x' + '1'.repeat(64),
            address: '0x8888888888888888888888888888888888888888',
            tokens: ['0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'], // USDC on Arbitrum
            tradeCount: 82,
            totalProfit: 3156.89,
            isActive: true,
            lastTradeTimestamp: Date.now() - 105000,
          },
          137: {
            chainId: 137,
            privateKey: '0x' + '2'.repeat(64),
            address: '0x9999999999999999999999999999999999999999',
            tokens: ['0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'], // USDC on Polygon
            tradeCount: 71,
            totalProfit: 2734.21,
            isActive: true,
            lastTradeTimestamp: Date.now() - 120000,
          },
        },
        code: '// Cross-chain arbitrage strategy code',
        createdAt: Date.now() - 21600000, // 6 hours ago
        updatedAt: Date.now() - 75000,
        runtime: 21600000,
        totalProfit: 12300.00,
        totalTrades: 318,
        description: 'Arbitrage opportunities across Ethereum, Optimism, Arbitrum, and Polygon',
        tags: ['arbitrage', 'cross-chain', 'multi-chain'],
      },
    ],
  },
};

/**
 * Many strategies to demonstrate grid layout and scrolling
 */
export const ManyStrategies: Story = {
  args: {
    strategies: Array.from({ length: 12 }, (_, i) => ({
      id: `strategy-${i}`,
      name: `Strategy ${i + 1}`,
      status: (['running', 'stopped', 'paused', 'error'] as const)[i % 4],
      chains: {
        [i % 11 === 0 ? 1 : i % 10 === 0 ? 42161 : 137]: {
          chainId: i % 11 === 0 ? 1 : i % 10 === 0 ? 42161 : 137,
          privateKey: '0x' + i.toString().repeat(64).slice(0, 64),
          address: `0x${i.toString().padStart(40, '0')}`,
          tokens: [],
          tradeCount: Math.floor(Math.random() * 200),
          totalProfit: (Math.random() - 0.3) * 10000,
          isActive: i % 4 === 0,
          lastTradeTimestamp: Date.now() - Math.random() * 3600000,
        },
      },
      code: `// Strategy ${i + 1} code`,
      createdAt: Date.now() - Math.random() * 86400000,
      updatedAt: Date.now() - Math.random() * 3600000,
      runtime: Math.random() * 86400000,
      totalProfit: (Math.random() - 0.3) * 10000,
      totalTrades: Math.floor(Math.random() * 200),
      description: `Strategy ${i + 1} description`,
      tags: ['test'],
    })),
  },
};
