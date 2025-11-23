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
  // Spot DEXs
  {
    id: 'uniswap-v3',
    name: 'uniswap-v3',
    displayName: 'Uniswap V3',
    type: 'spot',
    supportedNetworks: [1, 10, 42161, 8453, 137, 11155111],
    color: '#FF007A',
    icon: '🦄',
  },
  {
    id: 'uniswap-v2',
    name: 'uniswap-v2',
    displayName: 'Uniswap V2',
    type: 'spot',
    supportedNetworks: [1, 11155111],
    color: '#FF007A',
    icon: '🦄',
  },
  {
    id: 'pancakeswap',
    name: 'pancakeswap',
    displayName: 'PancakeSwap',
    type: 'spot',
    supportedNetworks: [56, 97],
    color: '#F0B90B',
    icon: '🥞',
  },
  {
    id: 'sushiswap',
    name: 'sushiswap',
    displayName: 'SushiSwap',
    type: 'spot',
    supportedNetworks: [1, 10, 42161, 137, 56],
    color: '#FA52A0',
    icon: '🍣',
  },
  {
    id: 'curve',
    name: 'curve',
    displayName: 'Curve Finance',
    type: 'spot',
    supportedNetworks: [1, 10, 42161, 137],
    color: '#40649F',
    icon: '🌊',
  },
  {
    id: 'balancer',
    name: 'balancer',
    displayName: 'Balancer',
    type: 'spot',
    supportedNetworks: [1, 10, 42161, 137],
    color: '#1E1E1E',
    icon: '⚖️',
  },

  // Perpetual DEXs
  {
    id: 'hyperevm',
    name: 'hyperevm',
    displayName: 'HyperEVM',
    type: 'perpetual',
    supportedNetworks: [998, 999],
    color: '#00D4AA',
    icon: '⚡',
  },
  {
    id: 'gmx',
    name: 'gmx',
    displayName: 'GMX',
    type: 'perpetual',
    supportedNetworks: [42161, 43114],
    color: '#2D42FC',
    icon: '📈',
  },
  {
    id: 'dydx',
    name: 'dydx',
    displayName: 'dYdX',
    type: 'perpetual',
    supportedNetworks: [1],
    color: '#6966FF',
    icon: '📊',
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

// Common trading pairs by network/protocol
export interface TradingPair {
  symbol: string;
  baseToken: string;
  quoteToken: string;
  address?: string;
}

export const COMMON_TRADING_PAIRS: Record<string, TradingPair[]> = {
  ethereum: [
    { symbol: 'ETH/USDC', baseToken: 'ETH', quoteToken: 'USDC' },
    { symbol: 'ETH/USDT', baseToken: 'ETH', quoteToken: 'USDT' },
    { symbol: 'WBTC/ETH', baseToken: 'WBTC', quoteToken: 'ETH' },
    { symbol: 'DAI/USDC', baseToken: 'DAI', quoteToken: 'USDC' },
    { symbol: 'UNI/ETH', baseToken: 'UNI', quoteToken: 'ETH' },
  ],
  optimism: [
    { symbol: 'ETH/USDC', baseToken: 'ETH', quoteToken: 'USDC' },
    { symbol: 'ETH/USDT', baseToken: 'ETH', quoteToken: 'USDT' },
    { symbol: 'OP/ETH', baseToken: 'OP', quoteToken: 'ETH' },
  ],
  arbitrum: [
    { symbol: 'ETH/USDC', baseToken: 'ETH', quoteToken: 'USDC' },
    { symbol: 'ETH/USDT', baseToken: 'ETH', quoteToken: 'USDT' },
    { symbol: 'ARB/ETH', baseToken: 'ARB', quoteToken: 'ETH' },
    { symbol: 'GMX/ETH', baseToken: 'GMX', quoteToken: 'ETH' },
  ],
  bsc: [
    { symbol: 'BNB/USDT', baseToken: 'BNB', quoteToken: 'USDT' },
    { symbol: 'BNB/BUSD', baseToken: 'BNB', quoteToken: 'BUSD' },
    { symbol: 'CAKE/BNB', baseToken: 'CAKE', quoteToken: 'BNB' },
  ],
  polygon: [
    { symbol: 'MATIC/USDC', baseToken: 'MATIC', quoteToken: 'USDC' },
    { symbol: 'MATIC/USDT', baseToken: 'MATIC', quoteToken: 'USDT' },
    { symbol: 'WETH/USDC', baseToken: 'WETH', quoteToken: 'USDC' },
  ],
  base: [
    { symbol: 'ETH/USDC', baseToken: 'ETH', quoteToken: 'USDC' },
    { symbol: 'ETH/USDbC', baseToken: 'ETH', quoteToken: 'USDbC' },
  ],
  hyperevm: [
    { symbol: 'HYP/USDT', baseToken: 'HYP', quoteToken: 'USDT' },
    { symbol: 'BTC/USDT', baseToken: 'BTC', quoteToken: 'USDT' },
    { symbol: 'ETH/USDT', baseToken: 'ETH', quoteToken: 'USDT' },
  ],
};

export const getTradingPairsByNetwork = (networkName: string): TradingPair[] => {
  return COMMON_TRADING_PAIRS[networkName] || [];
};
