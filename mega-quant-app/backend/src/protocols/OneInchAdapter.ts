/**
 * 1inch Protocol Adapter (Stub)
 *
 * TODO: Implement full 1inch support
 * 1inch uses aggregation router with multiple swap methods
 */

import { ethers } from 'ethers'
import { IProtocolAdapter, DecodedSwap } from './IProtocolAdapter.js'

export class OneInchAdapter implements IProtocolAdapter {
  readonly name = '1inch'
  readonly protocolId = '1inch'

  // 1inch V5 AggregationRouterV5 addresses
  private routers: Record<number, string[]> = {
    1: ['0x1111111254EEB25477B68fb85Ed929f73A960582'], // V5 Router
    11155111: ['0x1111111254EEB25477B68fb85Ed929f73A960582'], // Sepolia
    8453: ['0x1111111254EEB25477B68fb85Ed929f73A960582'], // Base
  }

  getRouterAddresses(networkId: number): string[] {
    return (this.routers[networkId] || []).map(addr => addr.toLowerCase())
  }

  decodeTransaction(tx: ethers.TransactionResponse): DecodedSwap | null {
    // TODO: Implement 1inch swap decoding
    // 1inch uses swap(), unoswap(), uniswapV3Swap(), etc.
    return null
  }

  matchesPair(decoded: DecodedSwap, tokenA: string, tokenB: string): boolean {
    const tokenInLower = decoded.tokenIn.toLowerCase()
    const tokenOutLower = decoded.tokenOut.toLowerCase()
    const tokenALower = tokenA.toLowerCase()
    const tokenBLower = tokenB.toLowerCase()

    return (
      (tokenInLower === tokenALower && tokenOutLower === tokenBLower) ||
      (tokenInLower === tokenBLower && tokenOutLower === tokenALower)
    )
  }

  detectTransactionType(
    tx: ethers.TransactionResponse,
    decoded: DecodedSwap,
    baseToken: string
  ): 'buy' | 'sell' | 'transfer' {
    const baseTokenLower = baseToken.toLowerCase()
    const tokenOutLower = decoded.tokenOut.toLowerCase()

    return tokenOutLower === baseTokenLower ? 'buy' : 'sell'
  }
}
