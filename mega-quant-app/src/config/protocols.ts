export interface Protocol {
  id: string;
  name: string;
  displayName: string;
  type: 'spot' | 'perpetual';
  supportedNetworks: number[]; // Network IDs
  color: string;
  icon: string;
}

export const SUPPORTED_PROTOCOLS: Protocol[] = [
  {
    id: 'uniswap-v3',
    name: 'uniswap-v3',
    displayName: 'Uniswap V3',
    type: 'spot',
    supportedNetworks: [1, 11155111, 8453, 84532],
    color: '#FF007A',
    icon: '🦄',
  },
  {
    id: 'uniswap-v4',
    name: 'uniswap-v4',
    displayName: 'Uniswap V4',
    type: 'spot',
    supportedNetworks: [
      1,        // Ethereum Mainnet
      10,       // Optimism
      56,       // BNB Chain
      137,      // Polygon
      8453,     // Base
      42161,    // Arbitrum
      43114,    // Avalanche
      11155111, // Sepolia
      84532,    // Base Sepolia
    ],
    color: '#FF007A',
    icon: '🦄',
  },
  {
    id: '1inch',
    name: '1inch',
    displayName: '1inch',
    type: 'spot',
    supportedNetworks: [1, 11155111, 8453],
    color: '#1B314F',
    icon: '🦄',
  },
];

export const getProtocolById = (id: string): Protocol | undefined => {
  return SUPPORTED_PROTOCOLS.find(protocol => protocol.id === id);
};

export const getProtocolsByNetwork = (networkId: number): Protocol[] => {
  return SUPPORTED_PROTOCOLS.filter(protocol =>
    protocol.supportedNetworks.includes(networkId)
  );
};

export const getProtocolsByType = (type: 'spot' | 'perpetual' | 'all'): Protocol[] => {
  if (type === 'all') return SUPPORTED_PROTOCOLS;
  return SUPPORTED_PROTOCOLS.filter(protocol => protocol.type === type);
};

export const getSpotProtocols = (): Protocol[] => {
  return getProtocolsByType('spot');
};

export const getPerpetualProtocols = (): Protocol[] => {
  return getProtocolsByType('perpetual');
};

// Common trading pairs by network/protocol (WETH/USDC only)
export interface TradingPair {
  symbol: string;
  baseToken: string;
  quoteToken: string;
  address?: string;
}

export const COMMON_TRADING_PAIRS: Record<string, TradingPair[]> = {
  ethereum: [
    { symbol: 'ETH/USDC', baseToken: 'ETH', quoteToken: 'USDC' },
    { symbol: 'WETH/USDC', baseToken: 'WETH', quoteToken: 'USDC' },
  ],
  sepolia: [
    { symbol: 'WETH/USDC', baseToken: 'WETH', quoteToken: 'USDC', address: '0x9799b5edc1aa7d3fad350309b08df3f64914e244' },
  ],
  base: [
    { symbol: 'ETH/USDC', baseToken: 'ETH', quoteToken: 'USDC' },
    { symbol: 'WETH/USDC', baseToken: 'WETH', quoteToken: 'USDC' },
  ],
  'base-sepolia': [
    { symbol: 'WETH/USDC', baseToken: 'WETH', quoteToken: 'USDC' },
  ],
};

export const getTradingPairsByNetwork = (networkName: string): TradingPair[] => {
  return COMMON_TRADING_PAIRS[networkName] || [];
};
