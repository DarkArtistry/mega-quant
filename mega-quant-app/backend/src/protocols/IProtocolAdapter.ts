/**
 * Protocol Adapter Interface
 *
 * Provides a generic interface for all DEX protocols (Uniswap V3, V4, CowSwap, 1inch, etc.)
 * Each protocol implements this interface to provide protocol-specific decoding and filtering.
 */

import { ethers } from 'ethers'

/**
 * Decoded swap transaction data
 */
export interface DecodedSwap {
  /** Input token address */
  tokenIn: string

  /** Output token address */
  tokenOut: string

  /** Input amount (optional, for exactInput swaps) */
  amountIn?: string

  /** Output amount (optional, for exactOutput swaps) */
  amountOut?: string

  /** Recipient address */
  recipient: string

  /** Swap path (for multi-hop swaps) */
  path?: string[]

  /** Additional protocol-specific data */
  metadata?: Record<string, any>
}

/**
 * Protocol Adapter Interface
 *
 * All protocol adapters must implement this interface to enable:
 * - Router address filtering
 * - Transaction decoding
 * - Pair-specific filtering
 * - Transaction type detection
 */
export interface IProtocolAdapter {
  /**
   * Protocol name (e.g., "Uniswap V3", "CowSwap")
   */
  readonly name: string

  /**
   * Protocol ID (e.g., "uniswap-v3", "cowswap")
   * Must match the protocolId in frontend config
   */
  readonly protocolId: string

  /**
   * Get router/contract addresses for this protocol on a specific network
   *
   * @param networkId - Chain ID (1 = Mainnet, 11155111 = Sepolia, etc.)
   * @returns Array of router addresses (lowercase)
   */
  getRouterAddresses(networkId: number): string[]

  /**
   * Decode a transaction to extract swap details
   *
   * @param tx - Ethereum transaction
   * @returns Decoded swap data, or null if not a swap transaction
   */
  decodeTransaction(tx: ethers.TransactionResponse): DecodedSwap | null

  /**
   * Check if a decoded swap matches a specific trading pair
   *
   * @param decoded - Decoded swap data
   * @param tokenA - First token address
   * @param tokenB - Second token address
   * @returns true if the swap involves both tokens (in either direction)
   */
  matchesPair(decoded: DecodedSwap, tokenA: string, tokenB: string): boolean

  /**
   * Detect transaction type (buy/sell/transfer)
   *
   * @param tx - Ethereum transaction
   * @param decoded - Decoded swap data
   * @param baseToken - Base token address (e.g., WETH in WETH/USDC)
   * @returns Transaction type
   */
  detectTransactionType(
    tx: ethers.TransactionResponse,
    decoded: DecodedSwap,
    baseToken: string
  ): 'buy' | 'sell' | 'transfer'
}
