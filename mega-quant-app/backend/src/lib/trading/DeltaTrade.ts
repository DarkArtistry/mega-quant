// DeltaTrade - Main class for delta-neutral trading
// Based on trading-class.md

import { ChainProxy } from './ChainProxy.js'
import axios from 'axios'

export interface TokenBalance {
  chainId: number
  chainName: string
  tokenAddress: string
  tokenSymbol: string
  balance: string
  balanceUsd?: number
}

export interface ExecutionResult {
  executionId: string
  status: string
  startingInventory: TokenBalance[]
  endingInventory: TokenBalance[]
  totalPnl: number
  totalGasCost: number
  netPnl: number
}

export class DeltaTrade {
  public readonly executionId: string
  public readonly strategyId: string
  public readonly executionType: string
  private readonly chainPrivateKeys: Record<string, string> // Per-chain private keys

  private startingInventory: TokenBalance[] = []
  private endingInventory: TokenBalance[] = []
  private trades: any[] = []
  private apiBaseUrl: string

  // Chain proxies (only Ethereum, Sepolia, Base, Base Sepolia)
  public readonly ethereum?: ChainProxy
  public readonly base?: ChainProxy
  public readonly sepolia?: ChainProxy
  public readonly 'base-sepolia'?: ChainProxy

  constructor(
    executionId: string,
    strategyId: string,
    executionType: string,
    chainPrivateKeys: Record<string, string> // chainName -> privateKey mapping
  ) {
    this.executionId = executionId
    this.strategyId = strategyId
    this.executionType = executionType
    this.chainPrivateKeys = chainPrivateKeys
    this.apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001'

    console.log(`[DeltaTrade] Created execution ${executionId} for strategy ${strategyId}`)
    console.log(`[DeltaTrade] Execution type: ${executionType}`)

    // Initialize chain proxies for configured chains
    const chains = Object.keys(chainPrivateKeys)
    console.log(`[DeltaTrade] Initializing ${chains.length} chains with per-chain accounts`)

    for (const chainName of chains) {
      try {
        const privateKey = chainPrivateKeys[chainName]
        const proxy = new ChainProxy(chainName, privateKey, this)
        ;(this as any)[chainName] = proxy
        console.log(`[DeltaTrade] Initialized ${chainName} proxy`)
      } catch (error: any) {
        console.warn(`[DeltaTrade] Could not initialize ${chainName}: ${error.message}`)
      }
    }
  }

  // Capture starting inventory across all chains
  async initialize(): Promise<void> {
    console.log('[DeltaTrade] Capturing starting inventory...')
    this.startingInventory = await this.captureInventory()
    console.log(`[DeltaTrade] Starting inventory captured: ${this.startingInventory.length} balances`)

    // Update execution in database
    try {
      await axios.patch(
        `${this.apiBaseUrl}/api/executions/${this.executionId}/inventory`,
        { starting_inventory: this.startingInventory }
      )
    } catch (error: any) {
      console.error('[DeltaTrade] Failed to update starting inventory:', error.message)
    }
  }

  // Close execution and calculate P&L
  async close(): Promise<ExecutionResult> {
    console.log('[DeltaTrade] Closing execution and calculating P&L...')

    // Capture ending inventory
    this.endingInventory = await this.captureInventory()
    console.log(`[DeltaTrade] Ending inventory captured: ${this.endingInventory.length} balances`)

    // Calculate P&L
    const pnl = await this.calculatePnL()
    const totalPnl = pnl?.totalPnl ?? 0
    const totalGasCost = pnl?.totalGasCost ?? 0
    const netPnl = pnl?.netPnl ?? 0

    console.log(`[DeltaTrade] Total P&L: $${totalPnl.toFixed(2)}`)
    console.log(`[DeltaTrade] Total Gas Cost: $${totalGasCost.toFixed(2)}`)
    console.log(`[DeltaTrade] Net P&L: $${netPnl.toFixed(2)}`)

    // Update execution in database
    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/api/executions/${this.executionId}/close`,
        {
          ending_inventory: this.endingInventory,
          pnl_components: {
            total_pnl_usd: totalPnl,
            total_gas_cost_usd: totalGasCost
          }
        }
      )

      return {
        executionId: this.executionId,
        status: 'closed',
        startingInventory: this.startingInventory,
        endingInventory: this.endingInventory,
        totalPnl,
        totalGasCost,
        netPnl
      }
    } catch (error: any) {
      console.warn('[DeltaTrade] Failed to update execution in database:', error.message)
      console.warn('[DeltaTrade] Continuing with local results...')

      // Return results even if database update fails
      return {
        executionId: this.executionId,
        status: 'closed',
        startingInventory: this.startingInventory,
        endingInventory: this.endingInventory,
        totalPnl,
        totalGasCost,
        netPnl
      }
    }
  }

  // Capture current inventory across all chains
  private async captureInventory(): Promise<TokenBalance[]> {
    const inventory: TokenBalance[] = []
    const chainProxies = this.getAllChainProxies()
    const { TOKEN_ADDRESSES } = await import('./config/tokens.js')

    for (const [chainName, proxy] of Object.entries(chainProxies)) {
      try {
        // Get native token balance
        const nativeBalance = await proxy.getNativeBalance()
        if (nativeBalance > 0n) {
          const chainConfig = (await import('./config/chains.js')).getChainConfig(chainName)
          inventory.push({
            chainId: proxy.chainId,
            chainName: proxy.chainName,
            tokenAddress: '0x0000000000000000000000000000000000000000',
            tokenSymbol: chainConfig.nativeCurrency.symbol,
            balance: nativeBalance.toString()
          })
        }

        // Get ERC20 token balances (WETH and USDC)
        const tokens = TOKEN_ADDRESSES[chainName.toLowerCase()]
        if (tokens) {
          // Track WETH and USDC balances
          for (const [symbol, tokenInfo] of Object.entries(tokens)) {
            if (symbol === 'WETH' || symbol === 'USDC') {
              try {
                const balance = await proxy.getTokenBalance(tokenInfo.address)
                if (balance > 0n) {
                  inventory.push({
                    chainId: proxy.chainId,
                    chainName: proxy.chainName,
                    tokenAddress: tokenInfo.address,
                    tokenSymbol: symbol,
                    balance: balance.toString()
                  })
                }
              } catch (error: any) {
                console.warn(`[DeltaTrade] Failed to get ${symbol} balance on ${chainName}:`, error.message)
              }
            }
          }
        }
      } catch (error: any) {
        console.warn(`[DeltaTrade] Failed to get inventory for ${chainName}:`, error.message)
      }
    }

    return inventory
  }

  // Calculate P&L from inventory change
  private async calculatePnL(): Promise<{ totalPnl: number; totalGasCost: number; netPnl: number }> {
    const { priceService } = await import('./services/PriceService.js')
    const { formatUnits } = await import('ethers')
    const { TOKEN_ADDRESSES } = await import('./config/tokens.js')

    // Calculate starting inventory value
    let startingValue = 0
    const startingPrices: Record<string, number> = {}

    for (const balance of this.startingInventory) {
      try {
        const symbol = balance.tokenSymbol
        if (!startingPrices[symbol]) {
          startingPrices[symbol] = await priceService.getTokenPriceUSD(symbol)
        }

        // Get token decimals
        const decimals = this.getTokenDecimals(balance.tokenSymbol, balance.chainName)
        const amount = Number(formatUnits(balance.balance, decimals))
        const value = amount * startingPrices[symbol]

        startingValue += value
      } catch (error: any) {
        console.warn(`[DeltaTrade] Error calculating starting value for ${balance.tokenSymbol}:`, error.message)
      }
    }

    // Calculate ending inventory value
    let endingValue = 0
    const endingPrices: Record<string, number> = {}

    for (const balance of this.endingInventory) {
      try {
        const symbol = balance.tokenSymbol
        if (!endingPrices[symbol]) {
          endingPrices[symbol] = await priceService.getTokenPriceUSD(symbol)
        }

        // Get token decimals
        const decimals = this.getTokenDecimals(balance.tokenSymbol, balance.chainName)
        const amount = Number(formatUnits(balance.balance, decimals))
        const value = amount * endingPrices[symbol]

        endingValue += value
      } catch (error: any) {
        console.warn(`[DeltaTrade] Error calculating ending value for ${balance.tokenSymbol}:`, error.message)
      }
    }

    // Calculate total gas cost from recorded trades
    let totalGasCost = 0
    try {
      const response = await axios.get(`${this.apiBaseUrl}/api/trades`, {
        params: { execution_id: this.executionId }
      })

      if (response.data.success && response.data.trades) {
        totalGasCost = response.data.trades.reduce((sum: number, trade: any) => {
          return sum + (trade.gas_cost_usd || 0)
        }, 0)
        console.log(`[DeltaTrade] Total gas cost from ${response.data.trades.length} trades: $${totalGasCost.toFixed(4)}`)
      }
    } catch (error: any) {
      console.warn(`[DeltaTrade] Could not fetch gas costs:`, error.message)
    }

    const totalPnl = endingValue - startingValue

    console.log(`[DeltaTrade] P&L Calculation:`)
    console.log(`  Starting value: $${startingValue.toFixed(2)}`)
    console.log(`  Ending value: $${endingValue.toFixed(2)}`)
    console.log(`  Total P&L: $${totalPnl.toFixed(2)}`)
    console.log(`  Gas costs: $${totalGasCost.toFixed(2)}`)

    return {
      totalPnl,
      totalGasCost,
      netPnl: totalPnl - totalGasCost
    }
  }

  // Helper to get token decimals
  private getTokenDecimals(symbol: string, chainName: string): number {
    const decimalsMap: Record<string, number> = {
      'ETH': 18,
      'WETH': 18,
      'USDC': 6,
      'USDT': 6,
      'DAI': 18
    }

    return decimalsMap[symbol.toUpperCase()] || 18
  }

  // Get all initialized chain proxies
  private getAllChainProxies(): Record<string, ChainProxy> {
    const proxies: Record<string, ChainProxy> = {}
    const chainNames = ['ethereum', 'base', 'sepolia', 'base-sepolia']

    for (const chainName of chainNames) {
      const proxy = (this as any)[chainName]
      if (proxy instanceof ChainProxy) {
        proxies[chainName] = proxy
      }
    }

    return proxies
  }
}

/**
 * Factory function to create and initialize a DeltaTrade instance
 *
 * Automatically loads the accounts configured for the strategy from memory.
 * No passwords or private keys needed in code!
 *
 * IMPORTANT: App must be unlocked before calling this function.
 *
 * @param executionType - Type of execution (e.g., 'arbitrage', 'hedging')
 * @param strategyId - ID of the strategy (must have accounts configured)
 * @returns Initialized DeltaTrade instance
 */
export async function createDeltaTrade(
  executionType: string,
  strategyId: string
): Promise<DeltaTrade> {
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001'

  // Load strategy accounts from memory (populated at unlock)
  const { loadStrategyAccounts } = await import('../../services/strategy-accounts.js')
  const chainPrivateKeys = loadStrategyAccounts(strategyId)

  if (Object.keys(chainPrivateKeys).length === 0) {
    throw new Error(
      `No accounts configured for strategy ${strategyId}. ` +
      'Please configure accounts in the Account Manager before running the strategy.'
    )
  }

  // Create execution in database
  const response = await axios.post(`${apiBaseUrl}/api/executions`, {
    strategy_id: strategyId,
    execution_type: executionType
  })

  if (!response.data.success) {
    throw new Error('Failed to create execution')
  }

  const executionId = response.data.execution.id
  console.log(`[createDeltaTrade] Created execution: ${executionId}`)
  console.log(`[createDeltaTrade] Loaded accounts for ${Object.keys(chainPrivateKeys).length} networks`)

  // Create DeltaTrade instance
  const dt = new DeltaTrade(executionId, strategyId, executionType, chainPrivateKeys)

  // Initialize (capture starting inventory)
  await dt.initialize()

  return dt
}
