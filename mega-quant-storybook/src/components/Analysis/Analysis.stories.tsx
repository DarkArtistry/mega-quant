import type { Meta, StoryObj } from '@storybook/react';
import { Analysis } from './Analysis';

const meta = {
  title: 'MEGA Quant/Analysis',
  component: Analysis,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0a0a0a' },
      ],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    totalBalance: {
      control: 'number',
      description: 'Total portfolio value in USD',
    },
    activeStrategies: {
      control: 'number',
      description: 'Number of currently running strategies',
    },
  },
} satisfies Meta<typeof Analysis>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockRecentTrades = [
  {
    time: '14:32:15',
    pair: 'ETH/USDC',
    chain: 'Ethereum',
    protocol: 'Uniswap V3',
    tokenIn: {
      symbol: 'USDC',
      amount: 912.75,
    },
    tokenOut: {
      symbol: 'ETH',
      amount: 0.5,
    },
    gasPrice: 25.3,
    blockNumber: 18542301,
    txHash: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890',
    explorerUrl: 'https://etherscan.io/tx/0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890'
  },
  {
    time: '14:28:43',
    pair: 'WBTC/USDT',
    chain: 'Arbitrum',
    protocol: 'Camelot',
    tokenIn: {
      symbol: 'WBTC',
      amount: 0.025,
    },
    tokenOut: {
      symbol: 'USDT',
      amount: 885.50,
    },
    gasPrice: 18.2,
    blockNumber: 145823401,
    txHash: '0x9876543210fedcba0987654321fedcba0987654321fedcba0987654321fedcba',
    explorerUrl: 'https://arbiscan.io/tx/0x9876543210fedcba0987654321fedcba0987654321fedcba0987654321fedcba'
  },
  {
    time: '14:25:12',
    pair: 'MATIC/USDC',
    chain: 'Polygon',
    protocol: 'Quickswap',
    tokenIn: {
      symbol: 'USDC',
      amount: 820,
    },
    tokenOut: {
      symbol: 'MATIC',
      amount: 1000,
    },
    gasPrice: 35.5,
    blockNumber: 51234567,
    txHash: '0xabcd1234ef567890abcd1234ef567890abcd1234ef567890abcd1234ef567890',
    explorerUrl: 'https://polygonscan.com/tx/0xabcd1234ef567890abcd1234ef567890abcd1234ef567890abcd1234ef567890'
  },
  {
    time: '14:22:33',
    pair: 'ARB/ETH',
    chain: 'Arbitrum',
    protocol: 'Uniswap V3',
    tokenIn: {
      symbol: 'ARB',
      amount: 500,
    },
    tokenOut: {
      symbol: 'ETH',
      amount: 0.3,
    },
    gasPrice: 20.1,
    blockNumber: 145823280,
    txHash: '0x5555aaaa1111bbbb2222cccc3333dddd4444eeee5555ffff6666aaaa7777bbbb',
    explorerUrl: 'https://arbiscan.io/tx/0x5555aaaa1111bbbb2222cccc3333dddd4444eeee5555ffff6666aaaa7777bbbb'
  },
  {
    time: '14:19:55',
    pair: 'LINK/USDC',
    chain: 'Base',
    protocol: 'Aerodrome',
    tokenIn: {
      symbol: 'USDC',
      amount: 712.50,
    },
    tokenOut: {
      symbol: 'LINK',
      amount: 50,
    },
    gasPrice: 22.8,
    blockNumber: 8234567,
    txHash: '0xdeadbeef1234567890deadbeef1234567890deadbeef1234567890deadbeef12',
    explorerUrl: 'https://basescan.org/tx/0xdeadbeef1234567890deadbeef1234567890deadbeef1234567890deadbeef12'
  },
];

const gasReserves = [
  { chain: 'Ethereum', symbol: 'ETH', balance: 0.5, usdValue: 912.50, color: '#627EEA' },
  { chain: 'Polygon', symbol: 'MATIC', balance: 100, usdValue: 82.00, color: '#8247E5' },
  { chain: 'Arbitrum', symbol: 'ETH', balance: 0.2, usdValue: 365.00, color: '#28A0F0' },
  { chain: 'Base', symbol: 'ETH', balance: 0.15, usdValue: 273.75, color: '#0052FF' },
  { chain: 'BSC', symbol: 'BNB', balance: 0.5, usdValue: 155.00, color: '#F0B90B' },
  { chain: 'Optimism', symbol: 'ETH', balance: 0.1, usdValue: 182.50, color: '#FF0420' },
  { chain: 'Avalanche', symbol: 'AVAX', balance: 5.0, usdValue: 175.00, color: '#E84142' },
  { chain: 'zkSync', symbol: 'ETH', balance: 0.08, usdValue: 146.00, color: '#4E529A' },
  { chain: 'Linea', symbol: 'ETH', balance: 0.12, usdValue: 219.00, color: '#61DFFF' },
  { chain: 'Scroll', symbol: 'ETH', balance: 0.06, usdValue: 109.50, color: '#FFEEDA' },
  { chain: 'Mantle', symbol: 'MNT', balance: 200, usdValue: 140.00, color: '#000000' },
  { chain: 'Blast', symbol: 'ETH', balance: 0.09, usdValue: 164.25, color: '#FCFC03' },
  { chain: 'Unichain', symbol: 'ETH', balance: 0.07, usdValue: 127.75, color: '#FF007A' },
  { chain: 'Hyperliquid', symbol: 'HYPE', balance: 50, usdValue: 95.00, color: '#00D4AA' },
];

// Mock strategy data
const mockStrategies = [
  { name: 'Arbitrage Bot Alpha', status: 'running' as const, profit: 2450.50, runtime: '12h 34m', tradesExecuted: 145, chain: 'Ethereum' },
  { name: 'Market Maker Pro', status: 'running' as const, profit: 1820.30, runtime: '8h 12m', tradesExecuted: 234, chain: 'Polygon' },
  { name: 'Trend Following V2', status: 'running' as const, profit: -320.10, runtime: '6h 45m', tradesExecuted: 67, chain: 'Arbitrum' },
  { name: 'Grid Trading Bot', status: 'paused' as const, profit: 540.80, runtime: '15h 20m', tradesExecuted: 189, chain: 'Base' },
  { name: 'Scalping Strategy', status: 'stopped' as const, profit: 125.60, runtime: '2h 10m', tradesExecuted: 45, chain: 'BSC' },
];

// Mock assets data
const mockAssets = [
  { chain: 'Ethereum', token: 'USDC', symbol: 'USDC', balance: 25000, usdValue: 25000, color: '#2775CA' },
  { chain: 'Ethereum', token: 'WETH', symbol: 'WETH', balance: 5.5, usdValue: 10037.50, color: '#627EEA' },
  { chain: 'Polygon', token: 'USDT', symbol: 'USDT', balance: 15000, usdValue: 15000, color: '#26A17B' },
  { chain: 'Arbitrum', token: 'ARB', symbol: 'ARB', balance: 10000, usdValue: 8500, color: '#28A0F0' },
  { chain: 'Base', token: 'USDC', symbol: 'USDC', balance: 8000, usdValue: 8000, color: '#0052FF' },
  { chain: 'Optimism', token: 'OP', symbol: 'OP', balance: 5000, usdValue: 9500, color: '#FF0420' },
  { chain: 'Polygon', token: 'WMATIC', symbol: 'WMATIC', balance: 12000, usdValue: 9840, color: '#8247E5' },
  { chain: 'Ethereum', token: 'LINK', symbol: 'LINK', balance: 500, usdValue: 7125, color: '#375BD2' },
];

export const Default: Story = {
  args: {
    totalBalance: 125000,
    activeStrategies: 5,
    winRate: 68.5,
    totalPositionsValue: 93002.5,
    maxDrawdown: 12.3,
    totalTrades: 1247,
    gasReserves,
    assets: mockAssets,
    recentTrades: mockRecentTrades,
    strategies: mockStrategies,
  },
};

export const NegativePerformance: Story = {
  args: {
    totalBalance: 45000,
    activeStrategies: 2,
    winRate: 32.5,
    totalPositionsValue: 50037.5,
    maxDrawdown: 28.5,
    totalTrades: 543,
    gasReserves: [
      { chain: 'Ethereum', symbol: 'ETH', balance: 0.05, usdValue: 91.25, color: '#627EEA' },
      { chain: 'Polygon', symbol: 'MATIC', balance: 10, usdValue: 8.20, color: '#8247E5' },
    ],
    assets: mockAssets.slice(0, 3),
    recentTrades: mockRecentTrades,
    strategies: mockStrategies.slice(0, 2).map(s => ({ ...s, profit: -Math.abs(s.profit), status: 'error' as const })),
  },
};

export const HighPerformance: Story = {
  args: {
    totalBalance: 1500000,
    activeStrategies: 12,
    winRate: 78.2,
    totalPositionsValue: 465012.5,
    maxDrawdown: 5.8,
    totalTrades: 8542,
    gasReserves: gasReserves.map(g => ({ ...g, balance: g.balance * 10, usdValue: g.usdValue * 10 })),
    assets: mockAssets.map(a => ({ ...a, balance: a.balance * 5, usdValue: a.usdValue * 5 })),
    recentTrades: mockRecentTrades.map(t => ({
      ...t,
      tokenIn: { ...t.tokenIn, amount: t.tokenIn.amount * 10 },
      tokenOut: { ...t.tokenOut, amount: t.tokenOut.amount * 10 },
      gasPrice: t.gasPrice * 1.5
    })),
    strategies: [...mockStrategies, ...mockStrategies.map((s, i) => ({ ...s, name: `${s.name} ${i + 6}`, profit: s.profit * 2 }))],
  },
};

export const MinimalActivity: Story = {
  args: {
    totalBalance: 10000,
    activeStrategies: 0,
    winRate: 0,
    totalPositionsValue: 35037.5,
    maxDrawdown: 0,
    totalTrades: 0,
    gasReserves: [
      { chain: 'Ethereum', symbol: 'ETH', balance: 0.1, usdValue: 182.50, color: '#627EEA' },
    ],
    assets: mockAssets.slice(0, 2),
    recentTrades: [],
    strategies: [],
  },
};

export const MediumPortfolio: Story = {
  args: {
    totalBalance: 50000,
    activeStrategies: 3,
    winRate: 55.3,
    totalPositionsValue: 56500,
    maxDrawdown: 15.5,
    totalTrades: 423,
    gasReserves: gasReserves.slice(0, 3),
    assets: mockAssets.slice(0, 5),
    recentTrades: mockRecentTrades.slice(0, 3),
    strategies: mockStrategies.slice(0, 3),
  },
};