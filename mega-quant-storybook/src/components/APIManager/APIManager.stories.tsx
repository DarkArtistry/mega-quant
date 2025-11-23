import type { Meta, StoryObj } from '@storybook/react';
import { APIManager } from './APIManager';
import { useState } from 'react';

const meta = {
  title: 'MEGA Quant/APIManager',
  component: APIManager,
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
} satisfies Meta<typeof APIManager>;

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive wrapper component for the modal
const APIManagerWrapper = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [config, setConfig] = useState({
    rpcProvider: 'alchemy',
    appId: '',
    apiKey: '',
    etherscanApiKey: '',
    coinMarketCapApiKey: '',
  });

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          padding: '12px 24px',
          background: 'linear-gradient(135deg, #00ffff 0%, #00b4ff 100%)',
          border: '2px solid #00ffff',
          borderRadius: '4px',
          color: '#000',
          fontSize: '13px',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          cursor: 'pointer',
          boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
          fontFamily: 'Orbitron, sans-serif',
        }}
      >
        [ API CONFIG ]
      </button>
      <APIManager
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        config={config}
        onConfigUpdate={setConfig}
      />
    </>
  );
};

export const Default: Story = {
  render: () => <APIManagerWrapper />,
  parameters: {
    docs: {
      description: {
        story: 'Cyberpunk-styled API configuration modal. Allows users to configure their RPC provider (Alchemy), API keys for Etherscan and CoinMarketCap.',
      },
    },
  },
};

export const WithExistingConfig: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true);
    const [config, setConfig] = useState({
      rpcProvider: 'alchemy',
      appId: 'my-alchemy-app',
      apiKey: 'abc123def456',
      etherscanApiKey: 'ETHERSCAN_KEY_12345',
      coinMarketCapApiKey: 'CMC_KEY_67890',
    });

    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #00ffff 0%, #00b4ff 100%)',
            border: '2px solid #00ffff',
            borderRadius: '4px',
            color: '#000',
            fontSize: '13px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
            fontFamily: 'Orbitron, sans-serif',
          }}
        >
          [ API CONFIG (WITH KEYS) ]
        </button>
        <APIManager
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          config={config}
          onConfigUpdate={setConfig}
        />
      </>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'API configuration manager with pre-configured API keys.',
      },
    },
  },
};
