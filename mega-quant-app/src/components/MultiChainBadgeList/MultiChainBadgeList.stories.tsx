import type { Meta, StoryObj } from '@storybook/react';
import { MultiChainBadgeList } from './MultiChainBadgeList';
import { ChainStats } from '../../types/strategy';

const meta = {
  title: 'MEGA Quant/MultiChainBadgeList',
  component: MultiChainBadgeList,
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#0a0015' }],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    chains: {
      control: 'object',
      description: 'Array of chain statistics',
    },
    compact: {
      control: 'boolean',
      description: 'Compact view with icons only',
    },
    showStats: {
      control: 'boolean',
      description: 'Show trade count and profit/loss for each chain',
    },
    maxVisible: {
      control: 'number',
      description: 'Maximum number of visible chains (shows +N more for overflow)',
    },
    onChainClick: { action: 'chain-clicked' },
  },
} satisfies Meta<typeof MultiChainBadgeList>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock data
const singleChain: ChainStats[] = [
  { chainId: 1, profit: 2450.5, trades: 147, isActive: true },
];

const twoChains: ChainStats[] = [
  { chainId: 1, profit: 2450.5, trades: 147, isActive: true },
  { chainId: 10, profit: 850.0, trades: 63, isActive: true },
];

const threeChains: ChainStats[] = [
  { chainId: 1, profit: 2450.5, trades: 147, isActive: true },
  { chainId: 10, profit: 850.0, trades: 63, isActive: true },
  { chainId: 42161, profit: -125.75, trades: 23, isActive: true },
];

const fiveChains: ChainStats[] = [
  { chainId: 1, profit: 2450.5, trades: 147, isActive: true },
  { chainId: 10, profit: 850.0, trades: 63, isActive: true },
  { chainId: 42161, profit: -125.75, trades: 23, isActive: true },
  { chainId: 8453, profit: 5200.25, trades: 512, isActive: true },
  { chainId: 137, profit: 320.0, trades: 45, isActive: false },
];

const manyChains: ChainStats[] = [
  { chainId: 1, profit: 2450.5, trades: 147, isActive: true },
  { chainId: 10, profit: 850.0, trades: 63, isActive: true },
  { chainId: 56, profit: 1200.0, trades: 98, isActive: true },
  { chainId: 8453, profit: 5200.25, trades: 512, isActive: true },
  { chainId: 43114, profit: 420.5, trades: 34, isActive: false },
  { chainId: 42161, profit: -125.75, trades: 23, isActive: true },
  { chainId: 1301, profit: 680.0, trades: 56, isActive: true },
  { chainId: 59144, profit: 290.0, trades: 12, isActive: false },
  { chainId: 324, profit: 1450.0, trades: 189, isActive: true },
  { chainId: 998, profit: 3100.0, trades: 234, isActive: true },
  { chainId: 137, profit: 320.0, trades: 45, isActive: false },
];

const mixedStatusChains: ChainStats[] = [
  { chainId: 1, profit: 2450.5, trades: 147, isActive: true },
  { chainId: 10, profit: 0, trades: 0, isActive: false },
  { chainId: 42161, profit: -125.75, trades: 23, isActive: true },
  { chainId: 8453, profit: 5200.25, trades: 512, isActive: true },
];

// Basic variants
export const SingleChain: Story = {
  args: {
    chains: singleChain,
  },
  parameters: {
    docs: {
      description: {
        story: 'Single chain badge displayed in a list.',
      },
    },
  },
};

export const TwoChains: Story = {
  args: {
    chains: twoChains,
  },
  parameters: {
    docs: {
      description: {
        story: 'Two chain badges displayed side by side.',
      },
    },
  },
};

export const ThreeChains: Story = {
  args: {
    chains: threeChains,
  },
  parameters: {
    docs: {
      description: {
        story: 'Three chain badges showing Ethereum, Optimism, and Arbitrum.',
      },
    },
  },
};

export const FiveChains: Story = {
  args: {
    chains: fiveChains,
  },
  parameters: {
    docs: {
      description: {
        story: 'Five chain badges with mixed active/inactive states.',
      },
    },
  },
};

// With stats
export const SingleChainWithStats: Story = {
  args: {
    chains: singleChain,
    showStats: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Single chain with trade count and P&L displayed.',
      },
    },
  },
};

export const ThreeChainsWithStats: Story = {
  args: {
    chains: threeChains,
    showStats: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Three chains showing detailed statistics including trade counts and profit/loss.',
      },
    },
  },
};

export const FiveChainsWithStats: Story = {
  args: {
    chains: fiveChains,
    showStats: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Five chains with complete statistics - demonstrates how stats wrap nicely.',
      },
    },
  },
};

// Compact variants
export const CompactSingleChain: Story = {
  args: {
    chains: singleChain,
    compact: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact view with icon only.',
      },
    },
  },
};

export const CompactMultipleChains: Story = {
  args: {
    chains: fiveChains,
    compact: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Five chains in compact mode - space-efficient view with icons only.',
      },
    },
  },
};

export const CompactManyChains: Story = {
  args: {
    chains: manyChains,
    compact: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Many chains in compact mode showing how they wrap to multiple rows.',
      },
    },
  },
};

// Max visible
export const MaxVisibleThree: Story = {
  args: {
    chains: manyChains,
    maxVisible: 3,
  },
  parameters: {
    docs: {
      description: {
        story: 'Displays only first 3 chains with "+N more" indicator for remaining chains.',
      },
    },
  },
};

export const MaxVisibleFive: Story = {
  args: {
    chains: manyChains,
    maxVisible: 5,
    showStats: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows 5 chains with stats and overflow indicator.',
      },
    },
  },
};

export const MaxVisibleCompact: Story = {
  args: {
    chains: manyChains,
    maxVisible: 7,
    compact: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact view with maximum visible limit.',
      },
    },
  },
};

// Mixed states
export const MixedStatus: Story = {
  args: {
    chains: mixedStatusChains,
    showStats: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Chains with mixed states: active with profit, inactive with no trades, active with loss, high performance.',
      },
    },
  },
};

// Empty state
export const EmptyList: Story = {
  args: {
    chains: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty state when no chains are configured.',
      },
    },
  },
};

// Interactive
export const Clickable: Story = {
  args: {
    chains: fiveChains,
    showStats: true,
    onChainClick: (chainId: number) => console.log(`Clicked chain ${chainId}`),
  },
  parameters: {
    docs: {
      description: {
        story: 'Clickable chain badges with hover effects. Click any badge to see the action logged.',
      },
    },
  },
};

// Real-world scenarios
export const MultiChainStrategy: Story = {
  args: {
    chains: [
      { chainId: 1, profit: 15750.8, trades: 2341, isActive: true },
      { chainId: 42161, profit: 8420.5, trades: 1456, isActive: true },
      { chainId: 10, profit: 6200.0, trades: 987, isActive: true },
      { chainId: 8453, profit: 4560.25, trades: 723, isActive: true },
    ],
    showStats: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'High-performance multi-chain strategy with substantial activity across 4 chains.',
      },
    },
  },
};

export const PartiallyActive: Story = {
  args: {
    chains: [
      { chainId: 1, profit: 2450.5, trades: 147, isActive: true },
      { chainId: 10, profit: 320.0, trades: 45, isActive: false },
      { chainId: 42161, profit: 850.0, trades: 63, isActive: true },
      { chainId: 8453, profit: 0, trades: 0, isActive: false },
      { chainId: 137, profit: 125.0, trades: 12, isActive: false },
    ],
    showStats: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Strategy with some chains active and others inactive/stopped.',
      },
    },
  },
};

export const AllInactiveWithHistory: Story = {
  args: {
    chains: [
      { chainId: 1, profit: 2450.5, trades: 147, isActive: false },
      { chainId: 10, profit: 850.0, trades: 63, isActive: false },
      { chainId: 42161, profit: -125.75, trades: 23, isActive: false },
    ],
    showStats: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'All chains inactive but showing historical trading data.',
      },
    },
  },
};
