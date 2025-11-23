export const chainListResponse = {
  chains: [
    {
      chainId: 1,
      name: 'Ethereum Mainnet',
      chain: 'ETH',
      network: 'mainnet',
      rpc: [
        'https://eth.llamarpc.com',
        'https://ethereum.publicnode.com',
        'https://rpc.ankr.com/eth',
      ],
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      },
      explorers: [
        {
          name: 'Etherscan',
          url: 'https://etherscan.io',
          standard: 'EIP3091',
        },
      ],
    },
    {
      chainId: 42161,
      name: 'Arbitrum One',
      chain: 'ETH',
      network: 'arbitrum',
      rpc: [
        'https://arb1.arbitrum.io/rpc',
        'https://arbitrum.llamarpc.com',
      ],
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      },
      explorers: [
        {
          name: 'Arbiscan',
          url: 'https://arbiscan.io',
          standard: 'EIP3091',
        },
      ],
    },
  ],
};

export const defiLlamaProtocolsResponse = [
  {
    id: 'uniswap-v3',
    name: 'Uniswap V3',
    address: '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45',
    symbol: 'UNI-V3',
    chain: 'Ethereum',
    category: 'Dexes',
    chains: ['Ethereum', 'Arbitrum', 'Optimism', 'Polygon', 'Base'],
    logo: 'https://icons.llama.fi/uniswap-v3.png',
    tvl: 5000000000,
  },
  {
    id: '1inch',
    name: '1inch',
    address: {
      ethereum: '0x1111111254eeb25477b68fb85ed929f73a960582',
      arbitrum: '0x1111111254eeb25477b68fb85ed929f73a960582',
    },
    symbol: '1INCH',
    category: 'Dexes',
    chains: ['Ethereum', 'Arbitrum', 'Polygon', 'BSC'],
    logo: 'https://icons.llama.fi/1inch.png',
    tvl: 100000000,
  },
];