/**
 * CowSwap Protocol Adapter (Stub)
 *
 * TODO: Implement full CowSwap support
 * CowSwap uses off-chain order book with GPv2Settlement contract
 */

import { ethers } from 'ethers'
import { IProtocolAdapter, DecodedSwap } from './IProtocolAdapter.js'

export class CowSwapAdapter implements IProtocolAdapter {
  readonly name = 'CowSwap'
  readonly protocolId = 'cowswap'

  // CowSwap GPv2Settlement contract addresses
  private settlementContracts: Record<number, string[]> = {
    1: ['0x9008D19f58AAbD9eD0D60971565AA8510560ab41'], // Mainnet
    100: ['0x9008D19f58AAbD9eD0D60971565AA8510560ab41'], // Gnosis Chain
  }

  getRouterAddresses(networkId: number): string[] {
    return (this.settlementContracts[networkId] || []).map(addr => addr.toLowerCase())
  }

  decodeTransaction(tx: ethers.TransactionResponse): DecodedSwap | null {
    // TODO: Implement CowSwap settlement decoding
    // CowSwap uses settle() function with complex order data
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
