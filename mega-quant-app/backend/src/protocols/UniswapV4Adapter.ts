/**
 * Uniswap V4 Protocol Adapter
 *
 * Handles transaction decoding and filtering for Uniswap V4 protocol.
 * V4 uses Universal Router with command-based execution.
 */

import { ethers } from 'ethers'
import { IProtocolAdapter, DecodedSwap } from './IProtocolAdapter.js'

/**
 * Uniswap V4 Universal Router ABI
 * V4 uses execute() with encoded commands instead of direct swap functions
 */
const UNISWAP_V4_UNIVERSAL_ROUTER_ABI = [
  // Main execution function - takes commands and inputs
  'function execute(bytes commands, bytes[] inputs, uint256 deadline) external payable',

  // Alternative execute functions
  'function execute(bytes commands, bytes[] inputs) external payable',

  // Token approval with Permit2
  'function approveTokenWithPermit2(address token, uint160 amount, uint48 expiration) external',
]

/**
 * V4 Command Types (first byte of commands)
 * Reference: https://github.com/Uniswap/universal-router
 */
const V4_COMMANDS = {
  V4_SWAP_EXACT_IN: '0x10',
  V4_SWAP_EXACT_IN_SINGLE: '0x11',
  V4_SWAP_EXACT_OUT: '0x12',
  V4_SWAP_EXACT_OUT_SINGLE: '0x13',
  SETTLE_ALL: '0x17',
  TAKE_ALL: '0x18',
} as const

/**
 * Uniswap V4 Adapter
 */
export class UniswapV4Adapter implements IProtocolAdapter {
  readonly name = 'Uniswap V4'
  readonly protocolId = 'uniswap-v4'

  private routerInterface: ethers.Interface

  /**
   * Uniswap V4 Universal Router addresses by network
   * Source: https://docs.uniswap.org/contracts/v4/deployments
   */
  private routers: Record<number, string[]> = {
    // Mainnets
    1: ['0x66a9893cc07d91d95644aedd05d03f95e1dba8af'], // Ethereum
    10: ['0x851116d9223fabed8e56c0e6b8ad0c31d98b3507'], // Optimism
    56: ['0x1906c1d672b88cd1b9ac7593301ca990f94eae07'], // BNB Chain
    137: ['0x1095692a6237d83c6a72f3f5efedb9a670c49223'], // Polygon
    8453: ['0x6ff5693b99212da76ad316178a184ab56d299b43'], // Base
    42161: ['0xa51afafe0263b40edaef0df8781ea9aa03e381a3'], // Arbitrum
    43114: ['0x94b75331ae8d42c1b61065089b7d48fe14aa73b7'], // Avalanche

    // Testnets
    11155111: ['0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b'], // Sepolia
    84532: ['0x492e6456d9528771018deb9e87ef7750ef184104'], // Base Sepolia
    421614: ['0xefd1d4bd4cf1e86da286bb4cb1b8bced9c10ba47'], // Arbitrum Sepolia
  }

  /**
   * Uniswap V4 PoolManager addresses (for reference)
   * Note: Swaps go through Universal Router, not PoolManager directly
   */
  private poolManagers: Record<number, string> = {
    1: '0x000000000004444c5dc75cB358380D2e3dE08A90', // Ethereum
    10: '0x9a13f98cb987694c9f086b1f5eb990eea8264ec3', // Optimism
    56: '0x28e2ea090877bf75740558f6bfb36a5ffee9e9df', // BNB Chain
    137: '0x67366782805870060151383f4bbff9dab53e5cd6', // Polygon
    8453: '0x498581ff718922c3f8e6a244956af099b2652b2b', // Base
    42161: '0x360e68faccca8ca495c1b759fd9eee466db9fb32', // Arbitrum
    43114: '0x06380c0e0912312b5150364b9dc4542ba0dbbc85', // Avalanche
    11155111: '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543', // Sepolia
    84532: '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408', // Base Sepolia
    421614: '0xFB3e0C6F74eB1a21CC1Da29aeC80D2Dfe6C9a317', // Arbitrum Sepolia
  }

  constructor() {
    this.routerInterface = new ethers.Interface(UNISWAP_V4_UNIVERSAL_ROUTER_ABI)
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

      // V4 uses execute() function with commands and inputs
      if (decoded.name === 'execute') {
        const commands = decoded.args.commands as string
        const inputs = decoded.args.inputs as string[]

        // Parse commands to find swap operations
        return this.decodeExecuteCommand(commands, inputs)
      }

      return null
    } catch (error) {
      // Not a Uniswap V4 transaction
      return null
    }
  }

  /**
   * Decode V4 execute() command and inputs
   * V4 uses a command pattern where commands is a bytes string with command IDs
   * and inputs is an array of encoded parameters for each command
   */
  private decodeExecuteCommand(commands: string, inputs: string[]): DecodedSwap | null {
    try {
      // Remove 0x prefix and parse commands
      const commandsHex = commands.startsWith('0x') ? commands.slice(2) : commands
      const commandBytes = []

      // Each command is 1 byte (2 hex chars)
      for (let i = 0; i < commandsHex.length; i += 2) {
        commandBytes.push('0x' + commandsHex.slice(i, i + 2))
      }

      // Find the first swap command
      for (let i = 0; i < commandBytes.length; i++) {
        const cmd = commandBytes[i].toLowerCase()

        // Check if it's a swap command
        if (
          cmd === V4_COMMANDS.V4_SWAP_EXACT_IN_SINGLE.toLowerCase() ||
          cmd === V4_COMMANDS.V4_SWAP_EXACT_OUT_SINGLE.toLowerCase()
        ) {
          // Decode the corresponding input
          if (i < inputs.length) {
            return this.decodeSwapInput(inputs[i], cmd)
          }
        }
      }

      return null
    } catch (error) {
      return null
    }
  }

  /**
   * Decode swap input data
   * V4 swap inputs contain PoolKey and swap parameters
   */
  private decodeSwapInput(input: string, commandType: string): DecodedSwap | null {
    try {
      // V4 swap input structure:
      // - PoolKey: (currency0, currency1, fee, tickSpacing, hooks)
      // - bool zeroForOne
      // - uint128 amount
      // - uint128 amountLimit
      // - bytes hookData

      // Decode the input as a tuple
      const abiCoder = ethers.AbiCoder.defaultAbiCoder()

      // PoolKey struct
      const poolKeyTypes = ['address', 'address', 'uint24', 'int24', 'address']
      const swapTypes = [
        'tuple(address,address,uint24,int24,address)', // PoolKey
        'bool', // zeroForOne
        'uint128', // amount
        'uint128', // amountLimit
        'bytes', // hookData
      ]

      const decodedParams = abiCoder.decode(swapTypes, input)

      // Extract PoolKey
      const poolKey = decodedParams[0]
      const currency0 = poolKey[0]
      const currency1 = poolKey[1]
      const zeroForOne = decodedParams[1]

      // Determine tokenIn and tokenOut based on zeroForOne
      const tokenIn = zeroForOne ? currency0 : currency1
      const tokenOut = zeroForOne ? currency1 : currency0

      // Handle native ETH (address(0) in V4)
      const NATIVE_ETH = '0x0000000000000000000000000000000000000000'
      const isTokenInNative = tokenIn.toLowerCase() === NATIVE_ETH
      const isTokenOutNative = tokenOut.toLowerCase() === NATIVE_ETH

      // For now, skip native ETH swaps (need to map to WETH)
      if (isTokenInNative || isTokenOutNative) {
        return null
      }

      const amount = decodedParams[2]

      return {
        tokenIn,
        tokenOut,
        amountIn: commandType === V4_COMMANDS.V4_SWAP_EXACT_IN_SINGLE.toLowerCase() ? amount.toString() : undefined,
        amountOut: commandType === V4_COMMANDS.V4_SWAP_EXACT_OUT_SINGLE.toLowerCase() ? amount.toString() : undefined,
        recipient: '0x0000000000000000000000000000000000000000', // V4 uses msg.sender by default
        metadata: {
          poolKey: {
            currency0,
            currency1,
            fee: poolKey[2].toString(),
            tickSpacing: poolKey[3].toString(),
            hooks: poolKey[4],
          },
          zeroForOne,
        },
      }
    } catch (error) {
      console.warn('[UniswapV4Adapter] Error decoding swap input:', error)
      return null
    }
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
