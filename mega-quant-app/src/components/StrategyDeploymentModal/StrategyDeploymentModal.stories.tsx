import type { Meta, StoryObj } from '@storybook/react';
import { StrategyDeploymentModal } from './StrategyDeploymentModal';
import { Account } from '../AccountManager/AccountManager';
import { useState } from 'react';

// Mock accounts for stories
const mockAccounts: Account[] = [
  {
    id: 'acc-1',
    name: 'Trading Account 1',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    privateKey: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  },
  {
    id: 'acc-2',
    name: 'Arbitrage Bot',
    address: '0x1234567890abcdef1234567890abcdef12345678',
    privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  },
  {
    id: 'acc-3',
    name: 'Market Maker',
    address: '0xfedcba0987654321fedcba0987654321fedcba09',
    privateKey: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
  },
];

const meta = {
  title: 'MEGA Quant/StrategyDeploymentModal',
  component: StrategyDeploymentModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Controls whether the modal is visible',
    },
    onClose: { action: 'close' },
    onDeploy: { action: 'deploy' },
  },
} satisfies Meta<typeof StrategyDeploymentModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default modal state - empty form ready for user input with available accounts
 */
export const Default: Story = {
  args: {
    isOpen: true,
    accounts: mockAccounts,
    onClose: () => console.log('Modal closed'),
    onDeploy: (config) => console.log('Deploy config:', config),
  },
};

/**
 * Modal with Ethereum network pre-selected
 * Demonstrates single network configuration
 */
export const SingleNetworkSelected: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
    onDeploy: (config) => console.log('Deploy config:', config),
  },
  render: (args) => {
    const [isOpen, setIsOpen] = useState(args.isOpen);

    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          style={{
            padding: '12px 24px',
            background: '#9945ff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          Open Modal (Single Network)
        </button>
        <StrategyDeploymentModal
          isOpen={isOpen}
          accounts={mockAccounts}
          onClose={() => {
            setIsOpen(false);
            args.onClose();
          }}
          onDeploy={(config) => {
            console.log('Deploy config:', config);
            args.onDeploy(config);
            setIsOpen(false);
          }}
        />
        <p style={{ marginTop: '16px', color: '#666', fontSize: '12px' }}>
          Note: Click on Ethereum network after opening the modal
        </p>
      </>
    );
  },
};

/**
 * Modal demonstrating multi-network configuration
 * User can configure 3+ networks with different private keys
 */
export const MultiNetworkSelected: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
    onDeploy: (config) => console.log('Deploy config:', config),
  },
  render: (args) => {
    const [isOpen, setIsOpen] = useState(args.isOpen);

    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          style={{
            padding: '12px 24px',
            background: '#9945ff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          Open Modal (Multi Network)
        </button>
        <StrategyDeploymentModal
          isOpen={isOpen}
          accounts={mockAccounts}
          onClose={() => {
            setIsOpen(false);
            args.onClose();
          }}
          onDeploy={(config) => {
            console.log('Deploy config:', config);
            args.onDeploy(config);
            setIsOpen(false);
          }}
        />
        <p style={{ marginTop: '16px', color: '#666', fontSize: '12px' }}>
          Note: Click "Mainnets" button after opening to select all mainnets
        </p>
      </>
    );
  },
};

/**
 * Demonstrates custom RPC endpoint configuration
 * Shows how users can override default RPC endpoints per chain
 */
export const WithCustomRPC: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
    onDeploy: (config) => console.log('Deploy config:', config),
  },
  render: (args) => {
    const [isOpen, setIsOpen] = useState(args.isOpen);

    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          style={{
            padding: '12px 24px',
            background: '#9945ff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          Open Modal (Custom RPC)
        </button>
        <StrategyDeploymentModal
          isOpen={isOpen}
          accounts={mockAccounts}
          onClose={() => {
            setIsOpen(false);
            args.onClose();
          }}
          onDeploy={(config) => {
            console.log('Deploy config:', config);
            args.onDeploy(config);
            setIsOpen(false);
          }}
        />
        <p style={{ marginTop: '16px', color: '#666', fontSize: '12px' }}>
          Note: Select a network, then toggle "Custom" RPC button to configure custom endpoint
        </p>
      </>
    );
  },
};

/**
 * Filled configuration ready to deploy
 * Demonstrates a complete multi-chain strategy configuration
 */
export const FilledConfiguration: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
    onDeploy: (config) => console.log('Deploy config:', config),
  },
  render: (args) => {
    const [isOpen, setIsOpen] = useState(args.isOpen);

    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          style={{
            padding: '12px 24px',
            background: '#9945ff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          Open Modal (Filled Form)
        </button>
        <StrategyDeploymentModal
          isOpen={isOpen}
          accounts={mockAccounts}
          onClose={() => {
            setIsOpen(false);
            args.onClose();
          }}
          onDeploy={(config) => {
            console.log('Deploy config:', config);
            args.onDeploy(config);
            setIsOpen(false);
          }}
        />
        <div style={{ marginTop: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '12px' }}>Example Configuration:</p>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '11px', color: '#666' }}>
            <li>Strategy Name: "Multi-Chain Arbitrage Bot"</li>
            <li>Description: "Cross-chain arbitrage strategy"</li>
            <li>Networks: Ethereum, Arbitrum, Polygon</li>
            <li>Private Keys: Different key per network</li>
            <li>Tokens: WETH, USDC on each chain</li>
          </ul>
        </div>
      </>
    );
  },
};

/**
 * Demonstrates validation errors
 * Shows error states for invalid inputs
 */
export const ValidationErrors: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
    onDeploy: (config) => console.log('Deploy config:', config),
  },
  render: (args) => {
    const [isOpen, setIsOpen] = useState(args.isOpen);

    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          style={{
            padding: '12px 24px',
            background: '#9945ff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          Open Modal (Validation Errors)
        </button>
        <StrategyDeploymentModal
          isOpen={isOpen}
          accounts={mockAccounts}
          onClose={() => {
            setIsOpen(false);
            args.onClose();
          }}
          onDeploy={(config) => {
            console.log('Deploy config:', config);
            args.onDeploy(config);
            setIsOpen(false);
          }}
        />
        <div style={{ marginTop: '16px', padding: '12px', background: '#fff3cd', borderRadius: '4px', borderLeft: '4px solid #ff0055' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '12px', color: '#ff0055' }}>
            To trigger validation errors:
          </p>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '11px', color: '#666' }}>
            <li>Try deploying without entering a strategy name</li>
            <li>Try deploying without selecting any networks</li>
            <li>Try deploying without entering private keys</li>
            <li>Enter an invalid private key (not 64 hex characters)</li>
            <li>Enter invalid token addresses</li>
          </ul>
        </div>
      </>
    );
  },
};

/**
 * Modal closed state
 * Demonstrates how to trigger the modal from a button
 */
export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: () => console.log('Modal closed'),
    onDeploy: (config) => console.log('Deploy config:', config),
  },
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <button
          onClick={() => setIsOpen(true)}
          style={{
            padding: '16px 32px',
            background: 'linear-gradient(135deg, #9945ff 0%, #ff00ff 100%)',
            color: 'white',
            border: '2px solid #9945ff',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            fontFamily: 'Orbitron, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            boxShadow: '0 0 20px rgba(153, 69, 255, 0.5)',
            transition: 'all 0.3s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.boxShadow = '0 0 30px rgba(153, 69, 255, 1)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.boxShadow = '0 0 20px rgba(153, 69, 255, 0.5)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          ⚡ Deploy Strategy
        </button>
        <StrategyDeploymentModal
          isOpen={isOpen}
          accounts={mockAccounts}
          onClose={() => {
            setIsOpen(false);
            args.onClose();
          }}
          onDeploy={(config) => {
            console.log('Deploy config:', config);
            args.onDeploy(config);
            setIsOpen(false);
          }}
        />
        <p style={{ marginTop: '24px', color: '#666', fontSize: '14px' }}>
          Click the button above to open the deployment modal
        </p>
      </div>
    );
  },
};

/**
 * Testnet-only configuration
 * Demonstrates deploying strategies on testnets for development
 */
export const TestnetConfiguration: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
    onDeploy: (config) => console.log('Deploy config:', config),
  },
  render: (args) => {
    const [isOpen, setIsOpen] = useState(args.isOpen);

    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          style={{
            padding: '12px 24px',
            background: '#ffff00',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          Open Modal (Testnets)
        </button>
        <StrategyDeploymentModal
          isOpen={isOpen}
          accounts={mockAccounts}
          onClose={() => {
            setIsOpen(false);
            args.onClose();
          }}
          onDeploy={(config) => {
            console.log('Deploy config:', config);
            args.onDeploy(config);
            setIsOpen(false);
          }}
        />
        <p style={{ marginTop: '16px', color: '#666', fontSize: '12px' }}>
          Note: Click "Testnets" button to select all testnet networks for safe development
        </p>
      </>
    );
  },
};
