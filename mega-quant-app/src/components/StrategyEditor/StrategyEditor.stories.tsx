import type { Meta, StoryObj } from '@storybook/react';
import { StrategyEditor } from './StrategyEditor';

const meta = {
  title: 'MEGA Quant/StrategyEditor',
  component: StrategyEditor,
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
    initialCode: {
      control: 'text',
      description: 'Initial JavaScript code in the editor',
    },
  },
} satisfies Meta<typeof StrategyEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Strategy editor with default template code. Users can write JavaScript trading strategies, compile them, and run them to see output in the console.',
      },
    },
  },
};

export const SimpleStrategy: Story = {
  args: {
    initialCode: `// Simple Price Alert Strategy
async function priceAlert() {
  console.log('📊 Starting price alert strategy...');

  const currentPrice = 2845.67;
  const targetPrice = 3000;

  console.log('Current ETH/USDC price:', currentPrice);
  console.log('Target price:', targetPrice);

  if (currentPrice >= targetPrice) {
    console.log('🎯 TARGET REACHED! Price is above', targetPrice);
  } else {
    const diff = targetPrice - currentPrice;
    console.log('⏳ Waiting... Need', diff.toFixed(2), 'more');
  }
}

priceAlert();`,
  },
  parameters: {
    docs: {
      description: {
        story: 'Simple price alert strategy example.',
      },
    },
  },
};

export const ArbitrageStrategy: Story = {
  args: {
    initialCode: `// Cross-DEX Arbitrage Strategy
async function findArbitrage() {
  console.log('🔍 Searching for arbitrage opportunities...');

  // Mock prices from different DEXs
  const uniswapPrice = 2845.50;
  const sushiswapPrice = 2848.30;
  const curvePrice = 2844.10;

  console.log('Uniswap V3 price:', uniswapPrice);
  console.log('SushiSwap price:', sushiswapPrice);
  console.log('Curve price:', curvePrice);

  const minPrice = Math.min(uniswapPrice, sushiswapPrice, curvePrice);
  const maxPrice = Math.max(uniswapPrice, sushiswapPrice, curvePrice);
  const spread = ((maxPrice - minPrice) / minPrice * 100).toFixed(2);

  console.log('Price spread:', spread + '%');

  if (parseFloat(spread) > 0.1) {
    console.log('✅ ARBITRAGE OPPORTUNITY FOUND!');
    console.log('Buy at', minPrice, '→ Sell at', maxPrice);
    console.log('Potential profit:', spread + '%');
  } else {
    console.log('⏸️ No profitable arbitrage at the moment');
  }
}

findArbitrage();`,
  },
  parameters: {
    docs: {
      description: {
        story: 'Cross-DEX arbitrage strategy that compares prices across multiple exchanges.',
      },
    },
  },
};

export const ErrorExample: Story = {
  args: {
    initialCode: `// This code has intentional errors to demonstrate error handling
async function brokenStrategy() {
  console.log('Starting strategy...');

  // This will cause an error
  const undefinedVariable = nonExistentFunction();

  console.log('This line will not execute');
}

brokenStrategy();`,
  },
  parameters: {
    docs: {
      description: {
        story: 'Example showing how compilation and runtime errors are displayed in the console.',
      },
    },
  },
};
