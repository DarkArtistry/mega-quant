import type { Meta, StoryObj } from '@storybook/react';
import { AccountManager, NetworkRPCConfig, Account } from './AccountManager';
import { useState } from 'react';

const meta = {
  title: 'MEGA Quant/AccountManager',
  component: AccountManager,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0a0015' },
      ],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Modal open state',
    },
  },
} satisfies Meta<typeof AccountManager>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default empty state - configure network RPC settings from scratch
 */
export const Default: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true);
    const [networkConfigs, setNetworkConfigs] = useState<NetworkRPCConfig[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);

    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #00ffff 0%, #ff00ff 100%)',
            border: 'none',
            borderRadius: '10px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
          }}
        >
          ⚙ CONFIGURE NETWORK RPC & ACCOUNTS
        </button>
        <AccountManager
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          networkConfigs={networkConfigs}
          onConfigsUpdate={(configs) => {
            console.log('Network configs updated:', configs);
            setNetworkConfigs(configs);
          }}
          accounts={accounts}
          onAccountsUpdate={(accs) => {
            console.log('Accounts updated:', accs);
            setAccounts(accs);
          }}
        />
      </>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Network RPC configuration modal. Configure which RPC provider to use for each blockchain network (Default, Alchemy, or Custom).',
      },
    },
  },
};

/**
 * With existing network configurations
 */
export const WithExistingConfigs: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true);
    const [networkConfigs, setNetworkConfigs] = useState<NetworkRPCConfig[]>([
      {
        networkId: 1, // Ethereum
        rpcProvider: 'alchemy',
      },
      {
        networkId: 137, // Polygon
        rpcProvider: 'default',
      },
      {
        networkId: 42161, // Arbitrum
        rpcProvider: 'custom',
        customRpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
      },
    ]);

    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #00ff88 0%, #00ffff 100%)',
            border: 'none',
            borderRadius: '10px',
            color: '#000',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(0, 255, 136, 0.5)',
          }}
        >
          ⚙ MANAGE NETWORK RPC (3 CONFIGURED)
        </button>
        <AccountManager
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          networkConfigs={networkConfigs}
          onConfigsUpdate={(configs) => {
            console.log('Network configs updated:', configs);
            setNetworkConfigs(configs);
          }}
        />
      </>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Network RPC manager with pre-configured networks: Ethereum (Alchemy), Polygon (Default), Arbitrum (Custom).',
      },
    },
  },
};

/**
 * All mainnets configured with Alchemy
 */
export const AllMainnetsAlchemy: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true);
    const [networkConfigs, setNetworkConfigs] = useState<NetworkRPCConfig[]>([
      { networkId: 1, rpcProvider: 'alchemy' },      // Ethereum
      { networkId: 10, rpcProvider: 'alchemy' },     // Optimism
      { networkId: 56, rpcProvider: 'alchemy' },     // BSC
      { networkId: 8453, rpcProvider: 'alchemy' },   // Base
      { networkId: 43114, rpcProvider: 'alchemy' },  // Avalanche
      { networkId: 42161, rpcProvider: 'alchemy' },  // Arbitrum
      { networkId: 137, rpcProvider: 'alchemy' },    // Polygon
    ]);

    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #9945ff 0%, #ff00ff 100%)',
            border: 'none',
            borderRadius: '10px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(153, 69, 255, 0.5)',
          }}
        >
          ⚙ ALL MAINNETS (ALCHEMY)
        </button>
        <AccountManager
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          networkConfigs={networkConfigs}
          onConfigsUpdate={(configs) => {
            console.log('Network configs updated:', configs);
            setNetworkConfigs(configs);
          }}
        />
      </>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'All mainnet networks configured to use Alchemy RPC provider.',
      },
    },
  },
};

/**
 * Mixed RPC providers across networks
 */
export const MixedProviders: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true);
    const [networkConfigs, setNetworkConfigs] = useState<NetworkRPCConfig[]>([
      { networkId: 1, rpcProvider: 'alchemy' },      // Ethereum - Alchemy
      { networkId: 10, rpcProvider: 'default' },     // Optimism - Default
      { networkId: 56, rpcProvider: 'custom', customRpcUrl: 'https://bsc-dataseed1.binance.org' }, // BSC - Custom
      { networkId: 137, rpcProvider: 'alchemy' },    // Polygon - Alchemy
      { networkId: 42161, rpcProvider: 'default' },  // Arbitrum - Default
    ]);

    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #ffff00 0%, #ff8800 100%)',
            border: 'none',
            borderRadius: '10px',
            color: '#000',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(255, 255, 0, 0.5)',
          }}
        >
          ⚙ MIXED RPC PROVIDERS
        </button>
        <AccountManager
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          networkConfigs={networkConfigs}
          onConfigsUpdate={(configs) => {
            console.log('Network configs updated:', configs);
            setNetworkConfigs(configs);
          }}
        />
      </>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates mixed RPC providers: some using Alchemy, some using default, and some with custom URLs.',
      },
    },
  },
};

/**
 * Testnets only configuration
 */
export const TestnetsOnly: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true);
    const [networkConfigs, setNetworkConfigs] = useState<NetworkRPCConfig[]>([
      { networkId: 11155111, rpcProvider: 'alchemy' }, // Sepolia
      { networkId: 97, rpcProvider: 'default' },       // BSC Testnet
      { networkId: 84532, rpcProvider: 'default' },    // Base Sepolia
      { networkId: 80002, rpcProvider: 'alchemy' },    // Polygon Amoy
    ]);

    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #ff0055 0%, #ff00ff 100%)',
            border: 'none',
            borderRadius: '10px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(255, 0, 85, 0.5)',
          }}
        >
          ⚙ TESTNETS CONFIGURATION
        </button>
        <AccountManager
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          networkConfigs={networkConfigs}
          onConfigsUpdate={(configs) => {
            console.log('Network configs updated:', configs);
            setNetworkConfigs(configs);
          }}
        />
      </>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Testnets-only configuration for safe development and testing.',
      },
    },
  },
};

/**
 * Closed state with trigger button
 */
export const Closed: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    const [networkConfigs, setNetworkConfigs] = useState<NetworkRPCConfig[]>([]);

    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <button
          onClick={() => setIsOpen(true)}
          style={{
            padding: '16px 32px',
            background: 'linear-gradient(135deg, #00ffff 0%, #ff00ff 100%)',
            border: '2px solid #00ffff',
            borderRadius: '8px',
            color: 'white',
            fontSize: '16px',
            fontWeight: '700',
            cursor: 'pointer',
            fontFamily: 'Orbitron, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            boxShadow: '0 0 30px rgba(0, 255, 255, 0.6)',
            transition: 'all 0.3s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 255, 255, 1)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 255, 255, 0.6)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          ⚙ Configure Network RPC
        </button>
        <AccountManager
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          networkConfigs={networkConfigs}
          onConfigsUpdate={(configs) => {
            console.log('Network configs updated:', configs);
            setNetworkConfigs(configs);
            setIsOpen(false);
          }}
        />
        <p style={{ marginTop: '24px', color: '#a0b3cc', fontSize: '14px' }}>
          Click the button to open the network RPC configuration modal
        </p>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates how to trigger the modal from a button click.',
      },
    },
  },
};
