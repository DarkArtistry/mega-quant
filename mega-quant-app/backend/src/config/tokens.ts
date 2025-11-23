/**
 * Token Address Configuration
 *
 * Centralized token address registry for all supported networks.
 * Used for pair-specific mempool filtering.
 */

export interface TokenInfo {
  symbol: string
  address: string
  decimals: number
  name: string
}

/**
 * Token addresses by network ID
 *
 * Networks:
 * - 1: Ethereum Mainnet
 * - 11155111: Sepolia Testnet
 * - 8453: Base Mainnet
 * - 84532: Base Sepolia Testnet
 */
export const TOKEN_ADDRESSES: Record<number, Record<string, TokenInfo>> = {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🔹 ETHEREUM MAINNET (Chain ID: 1)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1: {
    WETH: {
      symbol: 'WETH',
      name: 'Wrapped Ether',
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      decimals: 18
    },
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      decimals: 6
    },
    USDT: {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      decimals: 6
    },
    DAI: {
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      decimals: 18
    },
    WBTC: {
      symbol: 'WBTC',
      name: 'Wrapped Bitcoin',
      address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      decimals: 8
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🔹 SEPOLIA TESTNET (Chain ID: 11155111)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  11155111: {
    WETH: {
      symbol: 'WETH',
      name: 'Wrapped Ether',
      address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
      decimals: 18
    },
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      decimals: 6
    },
    EURC: {
      symbol: 'EURC',
      name: 'Euro Coin',
      address: '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4',
      decimals: 6
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🔹 BASE MAINNET (Chain ID: 8453)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  8453: {
    WETH: {
      symbol: 'WETH',
      name: 'Wrapped Ether',
      address: '0x4200000000000000000000000000000000000006',
      decimals: 18
    },
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      decimals: 6
    },
    EURC: {
      symbol: 'EURC',
      name: 'Euro Coin',
      address: '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42',
      decimals: 6
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🔹 BASE SEPOLIA TESTNET (Chain ID: 84532)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  84532: {
    WETH: {
      symbol: 'WETH',
      name: 'Wrapped Ether',
      address: '0x4200000000000000000000000000000000000006',
      decimals: 18
    },
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      decimals: 6
    },
  },
}

/**
 * Get token info by symbol and network
 */
export function getTokenInfo(networkId: number, symbol: string): TokenInfo | null {
  return TOKEN_ADDRESSES[networkId]?.[symbol] || null
}

/**
 * Get token addresses for a trading pair (e.g., "WETH/USDC")
 */
export function getTokensForPair(
  networkId: number,
  pairSymbol: string
): { token0: TokenInfo; token1: TokenInfo } | null {
  const [symbol0, symbol1] = pairSymbol.split('/')

  const token0 = getTokenInfo(networkId, symbol0)
  const token1 = getTokenInfo(networkId, symbol1)

  if (!token0 || !token1) {
    return null
  }

  return { token0, token1 }
}

/**
 * Check if an address matches one of the tokens in a pair
 */
export function isTokenInPair(
  networkId: number,
  pairSymbol: string,
  address: string
): boolean {
  const tokens = getTokensForPair(networkId, pairSymbol)
  if (!tokens) return false

  const addrLower = address.toLowerCase()
  return (
    addrLower === tokens.token0.address.toLowerCase() ||
    addrLower === tokens.token1.address.toLowerCase()
  )
}
