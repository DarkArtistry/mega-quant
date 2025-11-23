import type { Meta, StoryObj } from '@storybook/react';
import { StrategyStatsDisplay } from './StrategyStatsDisplay';

const meta = {
  title: 'MEGA Quant/StrategyStatsDisplay',
  component: StrategyStatsDisplay,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#0a0015' }],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    profit: {
      control: 'number',
      description: 'Total profit or loss in USD',
    },
    tradesExecuted: {
      control: 'number',
      description: 'Number of trades executed',
    },
    runtime: {
      control: 'text',
      description: 'Formatted runtime string (e.g., "2d 14h 23m")',
    },
    layout: {
      control: 'select',
      options: ['horizontal', 'vertical'],
      description: 'Display layout orientation',
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
      description: 'Component size variant',
    },
    showLabels: {
      control: 'boolean',
      description: 'Show stat labels (P&L, Trades, Runtime)',
    },
  },
} satisfies Meta<typeof StrategyStatsDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

// Profit variants
export const PositiveProfit: Story = {
  args: {
    profit: 2450.5,
    tradesExecuted: 147,
    runtime: '2d 14h 23m',
  },
  parameters: {
    docs: {
      description: {
        story: 'Strategy with positive profit displayed in green with glow effect.',
      },
    },
  },
};

export const NegativeProfit: Story = {
  args: {
    profit: -325.75,
    tradesExecuted: 45,
    runtime: '0d 8h 42m',
  },
  parameters: {
    docs: {
      description: {
        story: 'Strategy with negative profit (loss) displayed in red with glow effect.',
      },
    },
  },
};

export const ZeroProfit: Story = {
  args: {
    profit: 0,
    tradesExecuted: 12,
    runtime: '0d 2h 15m',
  },
  parameters: {
    docs: {
      description: {
        story: 'Strategy with zero profit displayed in neutral color.',
      },
    },
  },
};

export const HighProfit: Story = {
  args: {
    profit: 15750.8,
    tradesExecuted: 2341,
    runtime: '15d 8h 42m',
  },
  parameters: {
    docs: {
      description: {
        story: 'High-performance strategy with substantial profit and many trades.',
      },
    },
  },
};

export const LargeLoss: Story = {
  args: {
    profit: -5420.25,
    tradesExecuted: 234,
    runtime: '5d 12h 18m',
  },
  parameters: {
    docs: {
      description: {
        story: 'Strategy with significant loss.',
      },
    },
  },
};

// Trade count variants
export const NoTrades: Story = {
  args: {
    profit: 0,
    tradesExecuted: 0,
    runtime: '0d 0h 0m',
  },
  parameters: {
    docs: {
      description: {
        story: 'Newly initialized strategy with no trades yet.',
      },
    },
  },
};

export const FewTrades: Story = {
  args: {
    profit: 125.5,
    tradesExecuted: 3,
    runtime: '0d 1h 12m',
  },
  parameters: {
    docs: {
      description: {
        story: 'Strategy just starting out with only a few trades.',
      },
    },
  },
};

export const ManyTrades: Story = {
  args: {
    profit: 8750.0,
    tradesExecuted: 5234,
    runtime: '30d 6h 45m',
  },
  parameters: {
    docs: {
      description: {
        story: 'Long-running strategy with thousands of trades.',
      },
    },
  },
};

// Runtime variants
export const ShortRuntime: Story = {
  args: {
    profit: 45.25,
    tradesExecuted: 8,
    runtime: '0d 0h 15m',
  },
  parameters: {
    docs: {
      description: {
        story: 'Strategy running for just 15 minutes.',
      },
    },
  },
};

export const MediumRuntime: Story = {
  args: {
    profit: 1250.0,
    tradesExecuted: 234,
    runtime: '7d 14h 32m',
  },
  parameters: {
    docs: {
      description: {
        story: 'Strategy running for about a week.',
      },
    },
  },
};

export const LongRuntime: Story = {
  args: {
    profit: 24500.75,
    tradesExecuted: 12450,
    runtime: '90d 18h 24m',
  },
  parameters: {
    docs: {
      description: {
        story: 'Long-running strategy active for 3 months.',
      },
    },
  },
};

// Layout variants
export const HorizontalLayout: Story = {
  args: {
    profit: 2450.5,
    tradesExecuted: 147,
    runtime: '2d 14h 23m',
    layout: 'horizontal',
  },
  parameters: {
    docs: {
      description: {
        story: 'Default horizontal layout with stats side by side.',
      },
    },
  },
};

export const VerticalLayout: Story = {
  args: {
    profit: 2450.5,
    tradesExecuted: 147,
    runtime: '2d 14h 23m',
    layout: 'vertical',
  },
  parameters: {
    docs: {
      description: {
        story: 'Vertical layout with stats stacked.',
      },
    },
  },
};

// Size variants
export const SmallSize: Story = {
  args: {
    profit: 2450.5,
    tradesExecuted: 147,
    runtime: '2d 14h 23m',
    size: 'small',
  },
  parameters: {
    docs: {
      description: {
        story: 'Small size variant for compact displays.',
      },
    },
  },
};

export const MediumSize: Story = {
  args: {
    profit: 2450.5,
    tradesExecuted: 147,
    runtime: '2d 14h 23m',
    size: 'medium',
  },
  parameters: {
    docs: {
      description: {
        story: 'Default medium size variant.',
      },
    },
  },
};

export const LargeSize: Story = {
  args: {
    profit: 2450.5,
    tradesExecuted: 147,
    runtime: '2d 14h 23m',
    size: 'large',
  },
  parameters: {
    docs: {
      description: {
        story: 'Large size variant for prominent display.',
      },
    },
  },
};

// Label variants
export const WithLabels: Story = {
  args: {
    profit: 2450.5,
    tradesExecuted: 147,
    runtime: '2d 14h 23m',
    showLabels: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Default view with labels shown.',
      },
    },
  },
};

export const WithoutLabels: Story = {
  args: {
    profit: 2450.5,
    tradesExecuted: 147,
    runtime: '2d 14h 23m',
    showLabels: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact view without labels - values only.',
      },
    },
  },
};

// Combined variants
export const SmallVertical: Story = {
  args: {
    profit: 850.0,
    tradesExecuted: 63,
    runtime: '1d 3h 45m',
    layout: 'vertical',
    size: 'small',
  },
  parameters: {
    docs: {
      description: {
        story: 'Small vertical layout - space-efficient for sidebars.',
      },
    },
  },
};

export const LargeHorizontal: Story = {
  args: {
    profit: 15750.8,
    tradesExecuted: 2341,
    runtime: '15d 8h 42m',
    layout: 'horizontal',
    size: 'large',
  },
  parameters: {
    docs: {
      description: {
        story: 'Large horizontal layout - prominent display for dashboards.',
      },
    },
  },
};

export const CompactNoLabels: Story = {
  args: {
    profit: 1250.0,
    tradesExecuted: 89,
    runtime: '3d 6h 12m',
    size: 'small',
    showLabels: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Ultra-compact variant with small size and no labels.',
      },
    },
  },
};

// Comparison
export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '20px' }}>
      <div>
        <h3 style={{ color: '#fff', fontFamily: 'Rajdhani', marginBottom: '12px' }}>Small</h3>
        <StrategyStatsDisplay
          profit={2450.5}
          tradesExecuted={147}
          runtime="2d 14h 23m"
          size="small"
        />
      </div>
      <div>
        <h3 style={{ color: '#fff', fontFamily: 'Rajdhani', marginBottom: '12px' }}>Medium</h3>
        <StrategyStatsDisplay
          profit={2450.5}
          tradesExecuted={147}
          runtime="2d 14h 23m"
          size="medium"
        />
      </div>
      <div>
        <h3 style={{ color: '#fff', fontFamily: 'Rajdhani', marginBottom: '12px' }}>Large</h3>
        <StrategyStatsDisplay
          profit={2450.5}
          tradesExecuted={147}
          runtime="2d 14h 23m"
          size="large"
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Comparison of all three size variants.',
      },
    },
  },
};

export const AllLayouts: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '40px', padding: '20px' }}>
      <div>
        <h3 style={{ color: '#fff', fontFamily: 'Rajdhani', marginBottom: '12px' }}>Horizontal</h3>
        <StrategyStatsDisplay
          profit={2450.5}
          tradesExecuted={147}
          runtime="2d 14h 23m"
          layout="horizontal"
        />
      </div>
      <div>
        <h3 style={{ color: '#fff', fontFamily: 'Rajdhani', marginBottom: '12px' }}>Vertical</h3>
        <StrategyStatsDisplay
          profit={2450.5}
          tradesExecuted={147}
          runtime="2d 14h 23m"
          layout="vertical"
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Comparison of horizontal and vertical layouts.',
      },
    },
  },
};
