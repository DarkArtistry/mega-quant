import type { Meta, StoryObj } from '@storybook/react';
import { Navbar } from './Navbar';

const meta = {
  title: 'MEGA Quant/Navbar',
  component: Navbar,
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
    activeTab: {
      control: 'select',
      options: ['dashboard', 'analysis'],
      description: 'Currently active tab',
    },
    connectedChains: {
      control: 'number',
      description: 'Number of connected blockchain networks',
    },
  },
} satisfies Meta<typeof Navbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    activeTab: 'dashboard',
    connectedChains: 5,
    tabs: [
      { id: 'dashboard', label: 'Trading' },
      { id: 'analysis', label: 'Analysis' }
    ],
    onTabChange: (tab: string) => console.log('Tab changed to:', tab),
    accounts: [],
    onAccountsUpdate: (accounts) => console.log('Accounts updated:', accounts),
  },
};

export const AnalysisActive: Story = {
  args: {
    activeTab: 'analysis',
    connectedChains: 5,
    tabs: [
      { id: 'dashboard', label: 'Trading' },
      { id: 'analysis', label: 'Analysis' }
    ],
    onTabChange: (tab: string) => console.log('Tab changed to:', tab),
    accounts: [],
    onAccountsUpdate: (accounts) => console.log('Accounts updated:', accounts),
  },
};

export const NoConnections: Story = {
  args: {
    activeTab: 'dashboard',
    connectedChains: 0,
    tabs: [
      { id: 'dashboard', label: 'Trading' },
      { id: 'analysis', label: 'Analysis' }
    ],
    onTabChange: (tab: string) => console.log('Tab changed to:', tab),
    accounts: [],
    onAccountsUpdate: (accounts) => console.log('Accounts updated:', accounts),
  },
};

export const SingleChain: Story = {
  args: {
    activeTab: 'dashboard',
    connectedChains: 1,
    tabs: [
      { id: 'dashboard', label: 'Trading' },
      { id: 'analysis', label: 'Analysis' }
    ],
    onTabChange: (tab: string) => console.log('Tab changed to:', tab),
    accounts: [],
    onAccountsUpdate: (accounts) => console.log('Accounts updated:', accounts),
  },
};

export const ManyChains: Story = {
  args: {
    activeTab: 'analysis',
    connectedChains: 14,
    tabs: [
      { id: 'dashboard', label: 'Trading' },
      { id: 'analysis', label: 'Analysis' }
    ],
    onTabChange: (tab: string) => console.log('Tab changed to:', tab),
    accounts: [],
    onAccountsUpdate: (accounts) => console.log('Accounts updated:', accounts),
  },
};

export const CustomTabs: Story = {
  args: {
    activeTab: 'strategies',
    connectedChains: 3,
    tabs: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'strategies', label: 'Strategies' },
      { id: 'positions', label: 'Positions' },
      { id: 'analytics', label: 'Analytics' },
    ],
    onTabChange: (tab: string) => console.log('Tab changed to:', tab),
    accounts: [],
    onAccountsUpdate: (accounts) => console.log('Accounts updated:', accounts),
  },
};
