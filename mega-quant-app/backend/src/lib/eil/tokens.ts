/**
 * Token Configuration for Cross-Chain Transfers
 * Supports ETH and USDC on Ethereum and Base
 */

export interface TokenConfig {
  symbol: string
  name: string
  decimals: number
  addresses: Record<number, string> // chainId => address
  isNative: boolean
}

/**
 * Native ETH (address 0x0 for native transfers)
 */
export const ETH: TokenConfig = {
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  addresses: {
    1: '0x0000000000000000000000000000000000000000', // Ethereum - native
    8453: '0x0000000000000000000000000000000000000000' // Base - native
  },
  isNative: true
}

/**
 * USDC (ERC20)
 */
export const USDC: TokenConfig = {
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  addresses: {
    1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum Mainnet
    8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // Base Mainnet
  },
  isNative: false
}

/**
 * All supported tokens
 */
export const SUPPORTED_TOKENS: Record<string, TokenConfig> = {
  ETH,
  USDC
}

/**
 * Supported chains
 */
export const SUPPORTED_CHAINS = {
  ETHEREUM: 1,
  BASE: 8453
} as const

export const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  8453: 'Base'
}

/**
 * Get token address for a specific chain
 */
export function getTokenAddress(symbol: string, chainId: number): string {
  const token = SUPPORTED_TOKENS[symbol.toUpperCase()]
  if (!token) {
    throw new Error(`Unsupported token: ${symbol}`)
  }

  const address = token.addresses[chainId]
  if (!address) {
    throw new Error(`Token ${symbol} not supported on chain ${chainId}`)
  }

  return address
}

/**
 * Get token config by symbol
 */
export function getTokenConfig(symbol: string): TokenConfig {
  const token = SUPPORTED_TOKENS[symbol.toUpperCase()]
  if (!token) {
    throw new Error(`Unsupported token: ${symbol}`)
  }
  return token
}

/**
 * Validate chain ID
 */
export function isChainSupported(chainId: number): boolean {
  return chainId === SUPPORTED_CHAINS.ETHEREUM || chainId === SUPPORTED_CHAINS.BASE
}
