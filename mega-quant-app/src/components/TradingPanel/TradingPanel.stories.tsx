import type { Meta, StoryObj } from '@storybook/react';
import { TradingPanel } from './TradingPanel';

const meta = {
  title: 'MEGA Quant/TradingPanel',
  component: TradingPanel,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0a0015' },
      ],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    initialNetwork: {
      control: 'number',
      description: 'Initial network ID (e.g., 1 for Ethereum)',
    },
    initialProtocol: {
      control: 'text',
      description: 'Initial protocol ID (e.g., "uniswap-v3")',
    },
    initialPair: {
      control: 'text',
      description: 'Initial trading pair (e.g., "ETH/USDC")',
    },
  },
} satisfies Meta<typeof TradingPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Empty trading panel with selectors for network, protocol, and trading pair.',
      },
    },
  },
};

export const EthereumSpotDex: Story = {
  args: {
    initialNetwork: 1, // Ethereum
    initialProtocol: 'uniswap-v3',
    initialPair: 'ETH/USDC',
  },
  parameters: {
    docs: {
      description: {
        story: 'Trading panel configured for Ethereum with Uniswap V3 (spot DEX). Shows swap ratio and recent trades.',
      },
    },
  },
};

export const HyperEVMPerpetual: Story = {
  args: {
    initialNetwork: 998, // HyperEVM
    initialProtocol: 'hyperevm',
    initialPair: 'BTC/USDT',
  },
  parameters: {
    docs: {
      description: {
        story: 'Trading panel configured for HyperEVM perpetual DEX. Shows candlestick chart, order book, and trades.',
      },
    },
  },
};

export const ArbitrumWithGMX: Story = {
  args: {
    initialNetwork: 42161, // Arbitrum
    initialProtocol: 'gmx',
    initialPair: 'ETH/USDC',
  },
  parameters: {
    docs: {
      description: {
        story: 'Trading panel configured for Arbitrum with GMX perpetual DEX.',
      },
    },
  },
};

export const WithoutRemoveButton: Story = {
  args: {
    initialNetwork: 1,
    initialProtocol: 'uniswap-v3',
    initialPair: 'ETH/USDC',
    onRemove: undefined,
  },
  parameters: {
    docs: {
      description: {
        story: 'Trading panel without the remove button (when it\'s the only panel in a container).',
      },
    },
  },
};
