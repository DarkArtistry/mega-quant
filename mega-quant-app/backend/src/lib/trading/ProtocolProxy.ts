// Base class for all protocol implementations
// Based on trading-class.md

import { Contract, Wallet } from 'ethers'
import axios from 'axios'

export interface SwapParams {
  tokenIn: string
  tokenOut: string
  amountIn: string
  slippage?: number  // percentage, default 0.5%
  deadline?: number  // seconds from now, default 300 (5 min)
}

export interface SwapResult {
  success: boolean
  transactionHash: string
  blockNumber: number
  amountIn: string
  amountOut: string
  gasUsed: number
  gasCostUsd: number
  timestamp: number
  explorerUrl: string  // Block explorer URL for this transaction
}

export interface QuoteParams {
  tokenIn: string   // Token symbol (e.g., 'WETH')
  tokenOut: string  // Token symbol (e.g., 'USDC')
  amountIn: string  // Amount in token units (e.g., '1.5')
}

export interface QuoteResult {
  amountOut: string           // Expected output amount
  amountOutMin: string        // Min output with default slippage
  priceImpact: number         // Price impact percentage
  exchangeRate: number        // TokenOut per TokenIn
  gasCostUsd?: number         // Estimated gas cost in USD
}

export abstract class ProtocolProxy {
  protected chainName: string
  protected chainId: number
  protected wallet: Wallet
  protected protocol: string
  protected executionId: string
  protected strategyId: string
  protected apiBaseUrl: string

  constructor(
    chainName: string,
    chainId: number,
    wallet: Wallet,
    protocol: string,
    executionId: string,
    strategyId: string
  ) {
    this.chainName = chainName
    this.chainId = chainId
    this.wallet = wallet
    this.protocol = protocol
    this.executionId = executionId
    this.strategyId = strategyId
    this.apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001'
  }

  // Abstract methods that must be implemented by protocol-specific classes
  abstract swap(params: SwapParams): Promise<SwapResult>
  abstract getQuote(params: QuoteParams): Promise<QuoteResult>

  // Helper method to record trade in database (to be called by implementations)
  protected async recordTrade(tradeData: {
    tx_hash: string
    block_number: number
    token_in_address: string
    token_in_symbol: string
    token_in_amount: string
    token_out_address: string
    token_out_symbol: string
    token_out_amount: string
    gas_used: number
    gas_price_gwei: string
    gas_cost_usd?: number
  }): Promise<void> {
    try {
      // Get token prices in USD
      let token_in_price_usd: number | undefined
      let token_out_price_usd: number | undefined

      try {
        const { priceService } = await import('./services/PriceService.js')

        // Get prices for both tokens
        const [priceIn, priceOut] = await Promise.all([
          priceService.getTokenPriceUSD(tradeData.token_in_symbol).catch(() => 0),
          priceService.getTokenPriceUSD(tradeData.token_out_symbol).catch(() => 0)
        ])

        if (priceIn > 0) token_in_price_usd = priceIn
        if (priceOut > 0) token_out_price_usd = priceOut

        console.log(`[ProtocolProxy] Token prices: ${tradeData.token_in_symbol}=$${priceIn.toFixed(2)}, ${tradeData.token_out_symbol}=$${priceOut.toFixed(2)}`)
      } catch (error: any) {
        console.warn(`[ProtocolProxy] Could not fetch token prices:`, error.message)
      }

      const payload = {
        execution_id: this.executionId,
        strategy_id: this.strategyId,
        wallet_address: this.wallet.address,
        chain_id: this.chainId,
        protocol: this.protocol,
        token_in_price_usd,
        token_out_price_usd,
        ...tradeData
      }

      console.log(`[ProtocolProxy] Recording trade: ${tradeData.tx_hash}`)

      const response = await axios.post(
        `${this.apiBaseUrl}/api/trades`,
        payload,
        { timeout: 5000 }
      )

      if (response.data.success) {
        console.log(`[ProtocolProxy] ✅ Trade recorded: ID ${response.data.trade_id || 'unknown'}`)

        // Broadcast trade execution via WebSocket
        try {
          const { liveDataService } = await import('../../services/live-data.js')
          liveDataService.broadcastTradeExecution({
            executionId: this.executionId,
            strategyId: this.strategyId,
            chainId: this.chainId,
            protocol: this.protocol,
            txHash: tradeData.tx_hash,
            tokenIn: tradeData.token_in_symbol,
            tokenInAmount: tradeData.token_in_amount,
            tokenOut: tradeData.token_out_symbol,
            tokenOutAmount: tradeData.token_out_amount,
            timestamp: Date.now()
          })
        } catch (error: any) {
          console.warn(`[ProtocolProxy] Failed to broadcast trade execution:`, error.message)
        }
      } else {
        console.error(`[ProtocolProxy] ❌ Failed to record trade:`, response.data.error)
      }
    } catch (error: any) {
      // Don't fail the swap if recording fails
      console.error(`[ProtocolProxy] ❌ Error recording trade:`, error.message)
    }
  }
}
