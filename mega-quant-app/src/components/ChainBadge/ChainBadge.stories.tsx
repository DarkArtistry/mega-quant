import type { Meta, StoryObj } from '@storybook/react';
import { ChainBadge } from './ChainBadge';

const meta = {
  title: 'MEGA Quant/ChainBadge',
  component: ChainBadge,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#0a0015' }],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    chainId: {
      control: 'select',
      options: [1, 10, 56, 8453, 43114, 42161, 1301, 59144, 324, 998, 137],
      description: 'Blockchain network chain ID',
    },
    isActive: {
      control: 'boolean',
      description: 'Whether the chain is actively trading',
    },
    showStats: {
      control: 'boolean',
      description: 'Show trade count and profit/loss stats',
    },
    compact: {
      control: 'boolean',
      description: 'Compact view (icon only)',
    },
    tradeCount: {
      control: 'number',
      description: 'Number of trades executed on this chain',
    },
    profit: {
      control: 'number',
      description: 'Profit/loss on this chain in USD',
    },
    onClick: { action: 'clicked' },
  },
} satisfies Meta<typeof ChainBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic variants
export const EthereumActive: Story = {
  args: {
    chainId: 1,
    isActive: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Ethereum mainnet chain badge in active state with pulsing indicator.',
      },
    },
  },
};

export const EthereumInactive: Story = {
  args: {
    chainId: 1,
    isActive: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Ethereum mainnet chain badge in inactive state.',
      },
    },
  },
};

export const OptimismActive: Story = {
  args: {
    chainId: 10,
    isActive: true,
  },
};

export const BNBChainActive: Story = {
  args: {
    chainId: 56,
    isActive: true,
  },
};

export const BaseActive: Story = {
  args: {
    chainId: 8453,
    isActive: true,
  },
};

export const ArbitrumActive: Story = {
  args: {
    chainId: 42161,
    isActive: true,
  },
};

export const UnichainActive: Story = {
  args: {
    chainId: 1301,
    isActive: true,
  },
};

export const HyperEVMActive: Story = {
  args: {
    chainId: 998,
    isActive: true,
  },
};

export const PolygonActive: Story = {
  args: {
    chainId: 137,
    isActive: true,
  },
};

// With stats
export const EthereumWithStats: Story = {
  args: {
    chainId: 1,
    isActive: true,
    showStats: true,
    tradeCount: 147,
    profit: 2450.5,
  },
  parameters: {
    docs: {
      description: {
        story: 'Ethereum badge showing trade count and positive profit.',
      },
    },
  },
};

export const OptimismWithLoss: Story = {
  args: {
    chainId: 10,
    isActive: true,
    showStats: true,
    tradeCount: 23,
    profit: -125.75,
  },
  parameters: {
    docs: {
      description: {
        story: 'Optimism badge showing trade count and negative profit (loss).',
      },
    },
  },
};

export const BaseHighPerformance: Story = {
  args: {
    chainId: 8453,
    isActive: true,
    showStats: true,
    tradeCount: 512,
    profit: 5200.25,
  },
  parameters: {
    docs: {
      description: {
        story: 'Base chain badge with high trade count and profit.',
      },
    },
  },
};

export const ArbitrumZeroTrades: Story = {
  args: {
    chainId: 42161,
    isActive: false,
    showStats: true,
    tradeCount: 0,
    profit: 0,
  },
  parameters: {
    docs: {
      description: {
        story: 'Arbitrum badge with no trades executed yet.',
      },
    },
  },
};

// Compact variants
export const EthereumCompact: Story = {
  args: {
    chainId: 1,
    isActive: true,
    compact: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact variant showing only icon and status indicator.',
      },
    },
  },
};

export const MultipleCompact: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <ChainBadge chainId={1} isActive={true} compact={true} />
      <ChainBadge chainId={10} isActive={true} compact={true} />
      <ChainBadge chainId={56} isActive={false} compact={true} />
      <ChainBadge chainId={8453} isActive={true} compact={true} />
      <ChainBadge chainId={42161} isActive={false} compact={true} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Multiple compact chain badges displayed together.',
      },
    },
  },
};

// Interactive
export const Clickable: Story = {
  args: {
    chainId: 1,
    isActive: true,
    showStats: true,
    tradeCount: 147,
    profit: 2450.5,
    onClick: () => console.log('Chain badge clicked'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Clickable chain badge with hover effects.',
      },
    },
  },
};

// Unknown chain
export const UnknownChain: Story = {
  args: {
    chainId: 99999,
    isActive: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Fallback display for unsupported chain IDs.',
      },
    },
  },
};

// All chains comparison
export const AllSupportedChains: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <ChainBadge chainId={1} isActive={true} />
        <ChainBadge chainId={10} isActive={true} />
        <ChainBadge chainId={56} isActive={true} />
        <ChainBadge chainId={8453} isActive={true} />
      </div>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <ChainBadge chainId={43114} isActive={true} />
        <ChainBadge chainId={42161} isActive={true} />
        <ChainBadge chainId={1301} isActive={true} />
        <ChainBadge chainId={59144} isActive={true} />
      </div>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <ChainBadge chainId={324} isActive={true} />
        <ChainBadge chainId={998} isActive={true} />
        <ChainBadge chainId={137} isActive={true} />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All supported blockchain networks displayed as badges.',
      },
    },
  },
};

// Mixed states
export const MixedStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <ChainBadge
        chainId={1}
        isActive={true}
        showStats={true}
        tradeCount={250}
        profit={3500.75}
      />
      <ChainBadge
        chainId={10}
        isActive={false}
        showStats={true}
        tradeCount={0}
        profit={0}
      />
      <ChainBadge
        chainId={42161}
        isActive={true}
        showStats={true}
        tradeCount={89}
        profit={-420.5}
      />
      <ChainBadge
        chainId={8453}
        isActive={true}
        showStats={true}
        tradeCount={512}
        profit={8750.25}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Chain badges with various states: active with profit, inactive, active with loss, high performance.',
      },
    },
  },
};
