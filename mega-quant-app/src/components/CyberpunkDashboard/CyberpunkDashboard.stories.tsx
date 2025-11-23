import type { Meta, StoryObj } from '@storybook/react';
import { CyberpunkDashboard } from './CyberpunkDashboard';

const meta = {
  title: 'MEGA Quant/CyberpunkDashboard',
  component: CyberpunkDashboard,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'cyberpunk',
      values: [
        { name: 'cyberpunk', value: '#0a0015' },
      ],
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CyberpunkDashboard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Futuristic cyberpunk-themed dashboard with neon effects, animated grid backgrounds, and holographic UI elements. Features a unique aesthetic inspired by sci-fi interfaces.',
      },
    },
  },
};

export const EmptyState: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'The cyberpunk dashboard in its initial empty state, prompting users to "jack in" and connect their quantum-encrypted wallets.',
      },
    },
  },
};

export const TradingWorkspace: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: `Comprehensive trading workspace - the main interface of MEGA Quant platform.

**To access the Trading view:**
1. Click "MANAGE NODES" (or "JACK IN" button)
2. Add your wallet addresses/private keys
3. Select networks (Ethereum, Arbitrum, etc.)
4. Click the "Trading" tab in the navigation

**What you'll see on the Trading page:**

**Top Section - Trading Views (40% height):**
- Multiple trading panels showing market data
- Each panel displays: Network + Protocol + Trading Pair
- **Spot DEX**: Current swap ratio, recent trades (time, buy/sell, token in/out, gas, wallet)
- **Perpetual DEX**: Candlestick chart, bid/ask order book, trades
- **Mempool**: Public pending transactions stream
- Add more panels with "Add Trading View" button

**Bottom Left - Strategy Editor (60% width):**
- Full JavaScript code editor
- Write custom trading strategies
- Compile button (validates syntax)
- Run button (executes strategy)
- Console output with timestamps and log types
- Reset button to restore template

**Bottom Right - Active Strategies (40% width):**
- List of running/paused strategies
- Each card shows: name, status, P&L, runtime, trades, chain
- Start/Stop/Edit/Delete controls
- Deploy new strategies button

**Complete Single-Page Interface:**
All components are visible simultaneously - no switching between tabs. Monitor markets, write strategies, and manage active bots all from one screen.`,
      },
    },
  },
};