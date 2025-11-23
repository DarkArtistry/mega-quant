import type { Meta, StoryObj } from '@storybook/react';
import { TradingViewContainer } from './TradingViewContainer';

const meta = {
  title: 'MEGA Quant/TradingViewContainer',
  component: TradingViewContainer,
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
    initialPanels: {
      control: 'object',
      description: 'Initial configuration for trading panels',
    },
  },
} satisfies Meta<typeof TradingViewContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Trading view container with a single empty panel. Users can add more panels by clicking the "Add Trading View" button.',
      },
    },
  },
};

export const MultiplePreConfigured: Story = {
  args: {
    initialPanels: [
      {
        id: '1',
        networkId: 1,
        protocolId: 'uniswap-v3',
        pairSymbol: 'ETH/USDC',
      },
      {
        id: '2',
        networkId: 998,
        protocolId: 'hyperevm',
        pairSymbol: 'BTC/USDT',
      },
      {
        id: '3',
        networkId: 42161,
        protocolId: 'gmx',
        pairSymbol: 'ETH/USDC',
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Trading view container with three pre-configured panels showing different networks and protocols. Demonstrates the scrollable multi-panel view.',
      },
    },
  },
};

export const TwoPanels: Story = {
  args: {
    initialPanels: [
      {
        id: '1',
        networkId: 1,
        protocolId: 'uniswap-v3',
        pairSymbol: 'ETH/USDC',
      },
      {
        id: '2',
        networkId: 56,
        protocolId: 'pancakeswap',
        pairSymbol: 'BNB/USDT',
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Two trading panels side by side - Ethereum Uniswap and BNB Chain PancakeSwap.',
      },
    },
  },
};
