import type { Meta, StoryObj } from '@storybook/react';
import { StrategyCard } from './StrategyCard';
import { ChainStats } from '../../types/strategy';

const meta = {
  title: 'MEGA Quant/StrategyCard',
  component: StrategyCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['running', 'stopped', 'error', 'paused'],
    },
    onStart: { action: 'started' },
    onStop: { action: 'stopped' },
    onEdit: { action: 'edited' },
    onDelete: { action: 'deleted' },
    onChainClick: { action: 'chainClicked' },
  },
} satisfies Meta<typeof StrategyCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Running: Story = {
  args: {
    name: 'ETH-USDC Arbitrage Bot',
    status: 'running',
    profit: 2450.50,
    runtime: '2d 14h 23m',
    tradesExecuted: 147,
    chain: 'Ethereum',
  },
};

export const Stopped: Story = {
  args: {
    name: 'Multi-DEX Scanner',
    status: 'stopped',
    profit: -125.75,
    runtime: '0d 0h 0m',
    tradesExecuted: 0,
    chain: 'Polygon',
  },
};

export const Error: Story = {
  args: {
    name: 'Cross-Chain Arbitrage',
    status: 'error',
    profit: 850.00,
    runtime: '1d 3h 45m',
    tradesExecuted: 63,
    chain: 'Arbitrum',
  },
};

export const Paused: Story = {
  args: {
    name: 'Grid Trading Bot',
    status: 'paused',
    profit: 5200.25,
    runtime: '7d 12h 15m',
    tradesExecuted: 512,
    chain: 'Base',
  },
};

export const HighPerformance: Story = {
  args: {
    name: 'MEV Sandwich Bot',
    status: 'running',
    profit: 15750.80,
    runtime: '15d 8h 42m',
    tradesExecuted: 2341,
    chain: 'Ethereum',
  },
};

export const NewStrategy: Story = {
  args: {
    name: 'Untitled Strategy',
    status: 'stopped',
    profit: 0,
    runtime: '0d 0h 0m',
    tradesExecuted: 0,
    chain: 'Optimism',
  },
};

// ===== MULTI-CHAIN EXAMPLES =====

/**
 * Multi-chain strategy running on 2 blockchains
 * Shows aggregated metrics and chain badges
 */
export const MultiChainRunning: Story = {
  args: {
    name: 'Cross-Chain Arbitrage',
    status: 'running',
    profit: 8456.78,
    runtime: '3d 8h 15m',
    tradesExecuted: 234,
    chains: [
      {
        chainId: 1, // Ethereum
        profit: 4567.89,
        trades: 128,
        isActive: true,
        lastTrade: Date.now() - 120000, // 2 minutes ago
      },
      {
        chainId: 42161, // Arbitrum
        profit: 3888.89,
        trades: 106,
        isActive: true,
        lastTrade: Date.now() - 180000, // 3 minutes ago
      },
    ] as ChainStats[],
  },
};

/**
 * Multi-chain strategy with one chain in error state
 * Demonstrates mixed chain states
 */
export const MultiChainError: Story = {
  args: {
    name: 'DCA Strategy',
    status: 'error',
    profit: 1234.56,
    runtime: '1d 12h 30m',
    tradesExecuted: 89,
    chains: [
      {
        chainId: 137, // Polygon
        profit: 2345.67,
        trades: 67,
        isActive: false,
        lastTrade: Date.now() - 1800000, // 30 minutes ago
      },
      {
        chainId: 56, // BSC
        profit: -1111.11,
        trades: 22,
        isActive: false,
        lastTrade: Date.now() - 3600000, // 1 hour ago
      },
    ] as ChainStats[],
  },
};

/**
 * Multi-chain strategy across 3 major networks
 * Shows compact badge display with maxVisible limit
 */
export const ThreeChainStrategy: Story = {
  args: {
    name: 'Multi-DEX Liquidity Bot',
    status: 'running',
    profit: 12567.34,
    runtime: '5d 18h 42m',
    tradesExecuted: 456,
    chains: [
      {
        chainId: 1, // Ethereum
        profit: 6234.12,
        trades: 198,
        isActive: true,
        lastTrade: Date.now() - 90000,
      },
      {
        chainId: 10, // Optimism
        profit: 3456.78,
        trades: 143,
        isActive: true,
        lastTrade: Date.now() - 150000,
      },
      {
        chainId: 8453, // Base
        profit: 2876.44,
        trades: 115,
        isActive: true,
        lastTrade: Date.now() - 200000,
      },
    ] as ChainStats[],
  },
};

/**
 * Multi-chain strategy across 4+ networks
 * Shows "+N more" indicator when chains exceed maxVisible
 */
export const FourChainStrategy: Story = {
  args: {
    name: 'Global Arbitrage Network',
    status: 'running',
    profit: 24789.56,
    runtime: '12d 6h 18m',
    tradesExecuted: 1247,
    chains: [
      {
        chainId: 1, // Ethereum
        profit: 9876.54,
        trades: 432,
        isActive: true,
        lastTrade: Date.now() - 60000,
      },
      {
        chainId: 42161, // Arbitrum
        profit: 7654.32,
        trades: 378,
        isActive: true,
        lastTrade: Date.now() - 75000,
      },
      {
        chainId: 137, // Polygon
        profit: 4567.89,
        trades: 289,
        isActive: true,
        lastTrade: Date.now() - 120000,
      },
      {
        chainId: 10, // Optimism
        profit: 2690.81,
        trades: 148,
        isActive: true,
        lastTrade: Date.now() - 180000,
      },
    ] as ChainStats[],
  },
};

/**
 * Paused multi-chain strategy with partial activity
 */
export const MultiChainPaused: Story = {
  args: {
    name: 'Trend Following Bot',
    status: 'paused',
    profit: 3456.78,
    runtime: '2d 4h 30m',
    tradesExecuted: 167,
    chains: [
      {
        chainId: 43114, // Avalanche
        profit: 2345.67,
        trades: 98,
        isActive: false,
        lastTrade: Date.now() - 7200000, // 2 hours ago
      },
      {
        chainId: 8453, // Base
        profit: 1111.11,
        trades: 69,
        isActive: false,
        lastTrade: Date.now() - 5400000, // 1.5 hours ago
      },
    ] as ChainStats[],
  },
};

/**
 * Multi-chain strategy with mixed profit/loss across chains
 */
export const MultiChainMixedProfits: Story = {
  args: {
    name: 'Experimental Strategy',
    status: 'running',
    profit: 456.78,
    runtime: '4d 12h 0m',
    tradesExecuted: 234,
    chains: [
      {
        chainId: 1, // Ethereum - profitable
        profit: 3456.78,
        trades: 156,
        isActive: true,
        lastTrade: Date.now() - 300000,
      },
      {
        chainId: 324, // zkSync - loss
        profit: -2500.00,
        trades: 45,
        isActive: true,
        lastTrade: Date.now() - 600000,
      },
      {
        chainId: 59144, // Linea - small profit
        profit: -500.00,
        trades: 33,
        isActive: true,
        lastTrade: Date.now() - 450000,
      },
    ] as ChainStats[],
  },
};