// ChainProxy - Provides access to protocols on a specific chain
// Based on trading-class.md

import { JsonRpcProvider, Wallet } from 'ethers'
import { getChainConfig } from './config/chains.js'
import { TOKEN_ADDRESSES, type TokenInfo } from './config/tokens.js'
import { UniswapV3Protocol } from './protocols/UniswapV3Protocol.js'
import { UniswapV4Protocol } from './protocols/UniswapV4Protocol.js'
import { OneInchProtocol } from './protocols/OneInchProtocol.js'
import type { DeltaTrade } from './DeltaTrade.js'

export class ChainProxy {
  public readonly chainName: string
  public readonly chainId: number
  public readonly provider: JsonRpcProvider
  public readonly wallet: Wallet
  public readonly deltaTrade: DeltaTrade

  // Token addresses for easy access
  public readonly tokens: Record<string, TokenInfo>

  // Protocol proxies
  public readonly uniswapV3?: UniswapV3Protocol
  public readonly uniswapV4?: UniswapV4Protocol
  public readonly oneInch?: OneInchProtocol

  constructor(chainName: string, privateKey: string, deltaTrade: DeltaTrade) {
    this.chainName = chainName
    this.deltaTrade = deltaTrade

    // Get chain configuration
    const chainConfig = getChainConfig(chainName)
    this.chainId = chainConfig.chainId

    // Load token addresses for this chain
    this.tokens = TOKEN_ADDRESSES[chainName] || {}

    // Set up provider and wallet
    this.provider = new JsonRpcProvider(chainConfig.rpcUrl)
    this.wallet = new Wallet(privateKey, this.provider)

    console.log(`[ChainProxy] Initialized ${chainName} (Chain ID: ${this.chainId})`)
    console.log(`[ChainProxy] Wallet address: ${this.wallet.address}`)

    // Initialize protocol proxies
    if (chainConfig.uniswapV3) {
      this.uniswapV3 = new UniswapV3Protocol(
        chainName,
        this.chainId,
        this.wallet,
        deltaTrade.executionId,
        deltaTrade.strategyId
      )
      console.log('[ChainProxy] Uniswap V3 protocol initialized')
    }

    if (chainConfig.uniswapV4) {
      this.uniswapV4 = new UniswapV4Protocol(
        chainName,
        this.chainId,
        this.wallet,
        deltaTrade.executionId,
        deltaTrade.strategyId
      )
      console.log('[ChainProxy] Uniswap V4 protocol initialized')
    }

    // Initialize 1inch (available on all supported chains)
    try {
      this.oneInch = new OneInchProtocol(
        chainName,
        this.chainId,
        this.wallet,
        deltaTrade.executionId,
        deltaTrade.strategyId
      )
      console.log('[ChainProxy] 1inch protocol initialized')
    } catch (error: any) {
      console.warn(`[ChainProxy] Could not initialize 1inch: ${error.message}`)
    }

    // TODO: Add more protocols
    // this.sushiswap = new SushiswapProtocol(...)
    // this.gmx = new GMXProtocol(...)
  }

  // Helper to get native token balance (ETH, MATIC, BNB, etc.)
  async getNativeBalance(): Promise<bigint> {
    return await this.provider.getBalance(this.wallet.address)
  }

  // Helper to get ERC20 token balance
  async getTokenBalance(tokenAddress: string): Promise<bigint> {
    const { Contract } = await import('ethers')
    const ERC20_ABI = ['function balanceOf(address) view returns (uint256)']
    const contract = new Contract(tokenAddress, ERC20_ABI, this.provider)
    return await contract.balanceOf(this.wallet.address)
  }

  // Helper to get current gas price (returns bigint for compatibility)
  async getGasPrice(): Promise<bigint> {
    const feeData = await this.provider.getFeeData()
    return feeData.gasPrice || 0n
  }

  // Get block explorer URL for this chain
  getExplorerUrl(txHash?: string): string {
    const chainConfig = getChainConfig(this.chainName)
    if (txHash) {
      return `${chainConfig.blockExplorer}/tx/${txHash}`
    }
    return chainConfig.blockExplorer
  }

  /**
   * Get detailed gas price information
   * @returns Gas price in gwei and estimated USD cost per transaction
   */
  async getGasPriceInfo(): Promise<{
    gasPrice: bigint
    gasPriceGwei: string
    estimatedSwapGasCostUsd?: number
  }> {
    const { formatUnits } = await import('ethers')
    const feeData = await this.provider.getFeeData()
    const gasPrice = feeData.gasPrice || 0n
    const gasPriceGwei = formatUnits(gasPrice, 'gwei')

    // Estimate typical swap gas cost (200k gas for Uniswap V3 swap)
    const typicalSwapGas = 200000n
    const gasCostWei = gasPrice * typicalSwapGas

    // Get native token price in USD
    let estimatedSwapGasCostUsd: number | undefined
    try {
      const { priceService } = await import('./services/PriceService.js')
      const chainConfig = getChainConfig(this.chainName)
      const nativeTokenSymbol = chainConfig.nativeCurrency.symbol
      const nativeTokenPrice = await priceService.getTokenPriceUSD(nativeTokenSymbol)

      const gasCostEth = Number(formatUnits(gasCostWei, 18))
      estimatedSwapGasCostUsd = gasCostEth * nativeTokenPrice
    } catch (error: any) {
      console.warn(`[ChainProxy] Could not calculate gas cost in USD:`, error.message)
    }

    return {
      gasPrice,
      gasPriceGwei,
      estimatedSwapGasCostUsd
    }
  }

  /**
   * Get token price in USD
   * @param symbol Token symbol (e.g., 'WETH', 'USDC')
   * @returns Price in USD
   */
  async getTokenPriceUSD(symbol: string): Promise<number> {
    const { priceService } = await import('./services/PriceService.js')
    return await priceService.getTokenPriceUSD(symbol)
  }

  /**
   * Get token pair price ratio (how much tokenOut per 1 tokenIn)
   * @param tokenInSymbol Input token symbol
   * @param tokenOutSymbol Output token symbol
   * @returns Exchange rate (tokenOut per 1 tokenIn)
   */
  async getTokenPairRatio(tokenInSymbol: string, tokenOutSymbol: string): Promise<number> {
    const { priceService } = await import('./services/PriceService.js')
    const [priceIn, priceOut] = await Promise.all([
      priceService.getTokenPriceUSD(tokenInSymbol),
      priceService.getTokenPriceUSD(tokenOutSymbol)
    ])

    if (priceOut === 0) {
      throw new Error(`Cannot calculate ratio: ${tokenOutSymbol} price is 0`)
    }

    return priceIn / priceOut
  }

  /**
   * Get swap quote from Uniswap V3
   * @param tokenInSymbol Input token symbol
   * @param tokenOutSymbol Output token symbol
   * @param amountIn Amount to swap (in token units, e.g., "1.5" for 1.5 WETH)
   * @returns Quote information including expected output and price impact
   */
  async getSwapQuote(
    tokenInSymbol: string,
    tokenOutSymbol: string,
    amountIn: string
  ): Promise<{
    amountOut: string
    amountOutMin: string // with 0.5% slippage
    priceImpact: number // percentage
    exchangeRate: number // tokenOut per tokenIn
    gasCostUsd?: number
  }> {
    if (!this.uniswapV3) {
      throw new Error(`Uniswap V3 not available on ${this.chainName}`)
    }

    return await this.uniswapV3.getQuote({
      tokenIn: tokenInSymbol,
      tokenOut: tokenOutSymbol,
      amountIn
    })
  }

  /**
   * Estimate total swap cost including gas
   * @param tokenInSymbol Input token symbol
   * @param tokenOutSymbol Output token symbol
   * @param amountIn Amount to swap
   * @returns Cost breakdown
   */
  async estimateTotalSwapCost(
    tokenInSymbol: string,
    tokenOutSymbol: string,
    amountIn: string
  ): Promise<{
    amountOut: string
    amountOutUsd: number
    gasCostUsd: number
    totalCostUsd: number
    netAmountOutUsd: number
    profitable: boolean
  }> {
    // Get quote
    const quote = await this.getSwapQuote(tokenInSymbol, tokenOutSymbol, amountIn)

    // Get token prices
    const { priceService } = await import('./services/PriceService.js')
    const tokenOutPrice = await priceService.getTokenPriceUSD(tokenOutSymbol)

    // Calculate output value in USD
    const amountOutUsd = Number(quote.amountOut) * tokenOutPrice

    // Get gas cost
    const gasCostUsd = quote.gasCostUsd || 0

    // Calculate net profit
    const totalCostUsd = gasCostUsd
    const netAmountOutUsd = amountOutUsd - gasCostUsd

    return {
      amountOut: quote.amountOut,
      amountOutUsd,
      gasCostUsd,
      totalCostUsd,
      netAmountOutUsd,
      profitable: netAmountOutUsd > 0
    }
  }

  /**
   * Execute a swap on Uniswap V3
   * Convenience method - delegates to uniswapV3.swap()
   * @param tokenInSymbol Input token symbol
   * @param tokenOutSymbol Output token symbol
   * @param amountIn Amount to swap (in token units)
   * @param slippage Slippage tolerance (percentage, default 0.5%)
   * @returns Swap result with transaction details
   */
  async swap(
    tokenInSymbol: string,
    tokenOutSymbol: string,
    amountIn: string,
    slippage?: number
  ): Promise<{
    success: boolean
    transactionHash: string
    blockNumber: number
    amountIn: string
    amountOut: string
    gasUsed: number
    gasCostUsd: number
    timestamp: number
  }> {
    if (!this.uniswapV3) {
      throw new Error(`Uniswap V3 not available on ${this.chainName}`)
    }

    return await this.uniswapV3.swap({
      tokenIn: tokenInSymbol,
      tokenOut: tokenOutSymbol,
      amountIn,
      slippage
    })
  }
}
