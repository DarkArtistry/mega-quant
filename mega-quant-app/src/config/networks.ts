export interface Network {
  id: number;
  name: string;
  displayName: string;
  symbol: string;
  rpcUrl: string;
  explorerUrl: string;
  color: string;
  icon: string; // Emoji fallback
  logoUrl?: string; // URL to logo image (SVG or PNG)
  testnet?: boolean;
}

export const SUPPORTED_NETWORKS: Network[] = [
  // Ethereum
  {
    id: 1,
    name: 'ethereum',
    displayName: 'Ethereum',
    symbol: 'ETH',
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    color: '#627EEA',
    icon: '⟠',
    logoUrl: '/logos/ethereum.svg',
  },
  {
    id: 11155111,
    name: 'sepolia',
    displayName: 'Ethereum Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
    explorerUrl: 'https://sepolia.etherscan.io',
    color: '#627EEA',
    icon: '⟠',
    logoUrl: '/logos/ethereum.svg',
    testnet: true,
  },

  // Base
  {
    id: 8453,
    name: 'base',
    displayName: 'Base',
    symbol: 'ETH',
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    color: '#0052FF',
    icon: '🔵',
    logoUrl: '/logos/base.svg',
  },
  {
    id: 84532,
    name: 'base-sepolia',
    displayName: 'Base Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://sepolia.base.org',
    explorerUrl: 'https://sepolia.basescan.org',
    color: '#0052FF',
    icon: '🔵',
    logoUrl: '/logos/base.svg',
    testnet: true,
  },
];

export const getNetworkById = (id: number): Network | undefined => {
  return SUPPORTED_NETWORKS.find(network => network.id === id);
};

export const getNetworkByName = (name: string): Network | undefined => {
  return SUPPORTED_NETWORKS.find(network => network.name === name);
};

export const getMainnetNetworks = (): Network[] => {
  return SUPPORTED_NETWORKS.filter(network => !network.testnet);
};

export const getTestnetNetworks = (): Network[] => {
  return SUPPORTED_NETWORKS.filter(network => network.testnet);
};

export const getNetworksByType = (type: 'mainnet' | 'testnet' | 'all'): Network[] => {
  if (type === 'mainnet') return getMainnetNetworks();
  if (type === 'testnet') return getTestnetNetworks();
  return SUPPORTED_NETWORKS;
};
