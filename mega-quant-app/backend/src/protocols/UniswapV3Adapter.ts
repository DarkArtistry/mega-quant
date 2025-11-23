/**
 * Uniswap V3 Protocol Adapter
 *
 * Handles transaction decoding and filtering for Uniswap V3 protocol.
 */

import { ethers } from 'ethers'
import { IProtocolAdapter, DecodedSwap } from './IProtocolAdapter.js'

/**
 * Uniswap V3 SwapRouter ABI
 * Includes all major swap functions
 */
const UNISWAP_V3_ROUTER_ABI = [
  // Single-hop swaps
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)',
  'function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountIn)',

  // Multi-hop swaps
  'function exactInput((bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params) external payable returns (uint256 amountOut)',
  'function exactOutput((bytes path, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum) params) external payable returns (uint256 amountIn)',

  // Multicall (batch multiple swaps)
  'function multicall(bytes[] data) external payable returns (bytes[] results)',
]

/**
 * Method signatures for Uniswap V3
 * Used for quick transaction type detection
 */
const METHOD_SIGNATURES = {
  exactInputSingle: '0x414bf389',
  exactOutputSingle: '0x5023b4df',
  exactInput: '0xdb3e2198', // formerly c04b8d59
  exactOutput: '0x09b81346', // formerly f28c0498
  multicall: '0xac9650d8',
} as const

/**
 * Uniswap V3 Adapter
 */
export class UniswapV3Adapter implements IProtocolAdapter {
  readonly name = 'Uniswap V3'
  readonly protocolId = 'uniswap-v3'

  private routerInterface: ethers.Interface

  /**
   * Uniswap V3 Router addresses by network
   */
  private routers: Record<number, string[]> = {
    1: [
      '0xE592427A0AEce92De3Edee1F18E0157C05861564', // SwapRouter
      '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', // SwapRouter02
    ],
    11155111: [
      '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E', // SwapRouter02 (Sepolia)
    ],
    8453: [
      '0x2626664c2603336E57B271c5C0b26F421741e481', // SwapRouter02 (Base)
    ],
    84532: [
      '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4', // SwapRouter02 (Base Sepolia)
    ],
  }

  constructor() {
    this.routerInterface = new ethers.Interface(UNISWAP_V3_ROUTER_ABI)
  }

  getRouterAddresses(networkId: number): string[] {
    return (this.routers[networkId] || []).map(addr => addr.toLowerCase())
  }

  decodeTransaction(tx: ethers.TransactionResponse): DecodedSwap | null {
    try {
      const decoded = this.routerInterface.parseTransaction({
        data: tx.data,
        value: tx.value,
      })

      if (!decoded) return null

      // Handle exactInputSingle
      if (decoded.name === 'exactInputSingle') {
        const params = decoded.args.params
        return {
          tokenIn: params.tokenIn,
          tokenOut: params.tokenOut,
          amountIn: params.amountIn.toString(),
          recipient: params.recipient,
          metadata: {
            fee: params.fee.toString(),
            deadline: params.deadline.toString(),
          },
        }
      }

      // Handle exactOutputSingle
      if (decoded.name === 'exactOutputSingle') {
        const params = decoded.args.params
        return {
          tokenIn: params.tokenIn,
          tokenOut: params.tokenOut,
          amountOut: params.amountOut.toString(),
          recipient: params.recipient,
          metadata: {
            fee: params.fee.toString(),
            deadline: params.deadline.toString(),
          },
        }
      }

      // Handle exactInput (multi-hop)
      if (decoded.name === 'exactInput') {
        const params = decoded.args.params
        const path = this.decodePath(params.path)

        if (path.length < 2) return null

        return {
          tokenIn: path[0],
          tokenOut: path[path.length - 1],
          amountIn: params.amountIn.toString(),
          recipient: params.recipient,
          path,
          metadata: {
            deadline: params.deadline.toString(),
          },
        }
      }

      // Handle exactOutput (multi-hop)
      if (decoded.name === 'exactOutput') {
        const params = decoded.args.params
        const path = this.decodePath(params.path)

        if (path.length < 2) return null

        return {
          tokenIn: path[0],
          tokenOut: path[path.length - 1],
          amountOut: params.amountOut.toString(),
          recipient: params.recipient,
          path,
          metadata: {
            deadline: params.deadline.toString(),
          },
        }
      }

      // Handle multicall (batch swaps)
      if (decoded.name === 'multicall') {
        // For multicall, try to decode the first call
        const calls = decoded.args.data
        if (calls.length > 0) {
          try {
            const firstCall = this.routerInterface.parseTransaction({
              data: calls[0],
            })
            if (firstCall) {
              // Recursively decode the first call
              return this.decodeTransaction({ ...tx, data: calls[0] } as any)
            }
          } catch (e) {
            // Ignore multicall decoding errors
          }
        }
      }

      return null
    } catch (error) {
      // Not a Uniswap V3 swap transaction
      return null
    }
  }

  /**
   * Decode Uniswap V3 path encoding
   *
   * Path format: [token0, fee, token1, fee, token2, ...]
   * Encoded as: token0 (20 bytes) | fee (3 bytes) | token1 (20 bytes) | fee (3 bytes) | token2 (20 bytes)
   */
  private decodePath(pathBytes: string): string[] {
    // Remove 0x prefix
    const path = pathBytes.startsWith('0x') ? pathBytes.slice(2) : pathBytes

    const tokens: string[] = []
    let offset = 0

    while (offset < path.length) {
      // Extract token address (20 bytes = 40 hex chars)
      const tokenHex = path.slice(offset, offset + 40)
      tokens.push('0x' + tokenHex)
      offset += 40

      // Skip fee (3 bytes = 6 hex chars)
      if (offset + 6 <= path.length) {
        offset += 6
      } else {
        break
      }
    }

    return tokens
  }

  matchesPair(decoded: DecodedSwap, tokenA: string, tokenB: string): boolean {
    const tokenInLower = decoded.tokenIn.toLowerCase()
    const tokenOutLower = decoded.tokenOut.toLowerCase()
    const tokenALower = tokenA.toLowerCase()
    const tokenBLower = tokenB.toLowerCase()

    // Check if tokenIn and tokenOut match tokenA and tokenB (in either direction)
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
    const tokenInLower = decoded.tokenIn.toLowerCase()
    const tokenOutLower = decoded.tokenOut.toLowerCase()

    // Buy: Buying the base token (tokenOut === baseToken)
    // Sell: Selling the base token (tokenIn === baseToken)

    if (tokenOutLower === baseTokenLower) {
      return 'buy' // Buying base token
    } else if (tokenInLower === baseTokenLower) {
      return 'sell' // Selling base token
    }

    return 'transfer'
  }
}
