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

  // Optimism
  {
    id: 10,
    name: 'optimism',
    displayName: 'Optimism',
    symbol: 'ETH',
    rpcUrl: 'https://mainnet.optimism.io',
    explorerUrl: 'https://optimistic.etherscan.io',
    color: '#FF0420',
    icon: '🔴',
    logoUrl: '/logos/optimism.svg',
  },
  {
    id: 11155420,
    name: 'optimism-sepolia',
    displayName: 'Optimism Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://sepolia.optimism.io',
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    color: '#FF0420',
    icon: '🔴',
    logoUrl: '/logos/optimism.svg',
    testnet: true,
  },

  // BNB Chain
  {
    id: 56,
    name: 'bsc',
    displayName: 'BNB Chain',
    symbol: 'BNB',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    explorerUrl: 'https://bscscan.com',
    color: '#F0B90B',
    icon: '⚡',
    logoUrl: '/logos/bnb.svg',
  },
  {
    id: 97,
    name: 'bsc-testnet',
    displayName: 'BNB Chain Testnet',
    symbol: 'BNB',
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    explorerUrl: 'https://testnet.bscscan.com',
    color: '#F0B90B',
    icon: '⚡',
    logoUrl: '/logos/bnb.svg',
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

  // Avalanche
  {
    id: 43114,
    name: 'avalanche',
    displayName: 'Avalanche C-Chain',
    symbol: 'AVAX',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    explorerUrl: 'https://snowtrace.io',
    color: '#E84142',
    icon: '🔺',
    logoUrl: '/logos/avalanche.svg',
  },
  {
    id: 43113,
    name: 'avalanche-fuji',
    displayName: 'Avalanche Fuji',
    symbol: 'AVAX',
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    explorerUrl: 'https://testnet.snowtrace.io',
    color: '#E84142',
    icon: '🔺',
    logoUrl: '/logos/avalanche.svg',
    testnet: true,
  },

  // Arbitrum
  {
    id: 42161,
    name: 'arbitrum',
    displayName: 'Arbitrum One',
    symbol: 'ETH',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    color: '#28A0F0',
    icon: '🔷',
    logoUrl: '/logos/arbitrum.svg',
  },
  {
    id: 421614,
    name: 'arbitrum-sepolia',
    displayName: 'Arbitrum Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorerUrl: 'https://sepolia.arbiscan.io',
    color: '#28A0F0',
    icon: '🔷',
    logoUrl: '/logos/arbitrum.svg',
    testnet: true,
  },

  // Unichain
  {
    id: 1301,
    name: 'unichain',
    displayName: 'Unichain',
    symbol: 'ETH',
    rpcUrl: 'https://mainnet.unichain.org',
    explorerUrl: 'https://uniscan.xyz',
    color: '#FF007A',
    icon: '🦄',
    logoUrl: '/logos/unichain.svg',
  },
  {
    id: 1301337,  // Unichain Sepolia testnet chain ID
    name: 'unichain-sepolia',
    displayName: 'Unichain Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://sepolia.unichain.org',
    explorerUrl: 'https://sepolia.uniscan.xyz',
    color: '#FF007A',
    icon: '🦄',
    logoUrl: '/logos/unichain.svg',
    testnet: true,
  },

  // Linea
  {
    id: 59144,
    name: 'linea',
    displayName: 'Linea',
    symbol: 'ETH',
    rpcUrl: 'https://rpc.linea.build',
    explorerUrl: 'https://lineascan.build',
    color: '#121212',
    icon: '📏',
    logoUrl: '/logos/linea.svg',
  },
  {
    id: 59141,
    name: 'linea-sepolia',
    displayName: 'Linea Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://rpc.sepolia.linea.build',
    explorerUrl: 'https://sepolia.lineascan.build',
    color: '#121212',
    icon: '📏',
    logoUrl: '/logos/linea.svg',
    testnet: true,
  },

  // zkSync
  {
    id: 324,
    name: 'zksync',
    displayName: 'zkSync Era',
    symbol: 'ETH',
    rpcUrl: 'https://mainnet.era.zksync.io',
    explorerUrl: 'https://era.zksync.network',
    color: '#8C8DFC',
    icon: '⚡',
    logoUrl: '/logos/zksync.svg',
  },
  {
    id: 300,
    name: 'zksync-sepolia',
    displayName: 'zkSync Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://sepolia.era.zksync.dev',
    explorerUrl: 'https://sepolia.era.zksync.network',
    color: '#8C8DFC',
    icon: '⚡',
    logoUrl: '/logos/zksync.svg',
    testnet: true,
  },

  // HyperEVM
  {
    id: 998,  // Note: Chain ID needs to be verified
    name: 'hyperevm',
    displayName: 'HyperEVM',
    symbol: 'HYP',
    rpcUrl: 'https://rpc.hyperevm.com',
    explorerUrl: 'https://explorer.hyperevm.com',
    color: '#00D4AA',
    icon: '⚡',
    logoUrl: '/logos/hyperliquid.svg',
  },
  {
    id: 999,  // Note: Testnet chain ID needs to be verified
    name: 'hyperevm-testnet',
    displayName: 'HyperEVM Testnet',
    symbol: 'HYP',
    rpcUrl: 'https://testnet-rpc.hyperevm.com',
    explorerUrl: 'https://testnet-explorer.hyperevm.com',
    color: '#00D4AA',
    icon: '⚡',
    logoUrl: '/logos/hyperliquid.svg',
    testnet: true,
  },

  // Legacy networks (keeping for backward compatibility)
  {
    id: 137,
    name: 'polygon',
    displayName: 'Polygon',
    symbol: 'POL',
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    color: '#8247E5',
    icon: '🟣',
    logoUrl: '/logos/polygon.svg',
  },
  {
    id: 80002,
    name: 'polygon-amoy',
    displayName: 'Polygon Amoy',
    symbol: 'POL',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    explorerUrl: 'https://amoy.polygonscan.com',
    color: '#8247E5',
    icon: '🟣',
    logoUrl: '/logos/polygon.svg',
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
