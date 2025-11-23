/**
 * Trading API Routes
 * Handles DeltaTrade execution via Web Worker proxy
 *
 * All operations use in-memory DeltaTrade instances for fast execution
 */

import express from 'express'
import { tradingExecutionManager, ChainConfig } from '../lib/TradingExecutionManager.js'

const router = express.Router()

/**
 * Initialize a new trading execution
 * POST /api/trading/init
 */
router.post('/init', async (req, res) => {
  try {
    const { executionType, strategyId, chainConfigs } = req.body

    if (!executionType || !strategyId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: executionType, strategyId'
      })
    }

    if (!chainConfigs || !Array.isArray(chainConfigs) || chainConfigs.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'chainConfigs must be a non-empty array'
      })
    }

    // Validate chain configs
    for (const config of chainConfigs) {
      if (!config.chainName || !config.accountId) {
        return res.status(400).json({
          success: false,
          error: 'Each chainConfig must have chainName and accountId'
        })
      }
    }

    console.log(`[Trading API] Initializing execution for strategy: ${strategyId}`)
    console.log(`[Trading API] Chains: ${chainConfigs.map((c: ChainConfig) => c.chainName).join(', ')}`)

    // Import createDeltaTrade to use strategy account mappings
    const { createDeltaTrade } = await import('../lib/trading/DeltaTrade.js')

    // Create DeltaTrade instance using strategy account mappings
    const dt = await createDeltaTrade(executionType, strategyId)
    const executionId = dt.executionId

    // Store in execution manager for later access
    tradingExecutionManager['executions'] = tradingExecutionManager['executions'] || new Map()
    tradingExecutionManager['executions'].set(executionId, {
      executionId,
      strategyId,
      deltaTrade: dt,
      chainConfigs, // Use chainConfigs from req.body
      createdAt: Date.now()
    })

    res.json({
      success: true,
      executionId,
      message: 'Trading execution initialized'
    })
  } catch (error: any) {
    console.error('[Trading API] Init error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to initialize trading execution'
    })
  }
})

/**
 * Execute a swap
 * POST /api/trading/:executionId/swap
 */
router.post('/:executionId/swap', async (req, res) => {
  try {
    const { executionId } = req.params
    const { chain, protocol, tokenIn, tokenOut, amountIn, slippage, deadline, fee, tickSpacing } = req.body

    if (!chain || !protocol) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: chain, protocol'
      })
    }

    const execution = tradingExecutionManager.getExecution(executionId)
    if (!execution) {
      return res.status(404).json({
        success: false,
        error: `Execution not found: ${executionId}`
      })
    }

    console.log(`[Trading API] Executing ${protocol} swap on ${chain}`)
    console.log(`[Trading API] ${amountIn} ${tokenIn} → ${tokenOut}`)

    // Get chain proxy
    const chainProxy = (execution.deltaTrade as any)[chain]
    if (!chainProxy) {
      return res.status(400).json({
        success: false,
        error: `Chain not initialized: ${chain}`
      })
    }

    // Get protocol proxy and execute swap
    let result
    if (protocol === 'uniswapV3') {
      result = await chainProxy.uniswapV3.swap({
        tokenIn,
        tokenOut,
        amountIn,
        slippage,
        deadline
      })
    } else if (protocol === 'uniswapV4') {
      result = await chainProxy.uniswapV4.swap({
        tokenIn,
        tokenOut,
        amountIn,
        slippage,
        deadline,
        fee,
        tickSpacing
      })
    } else if (protocol === 'oneInch') {
      if (!chainProxy.oneInch) {
        return res.status(400).json({
          success: false,
          error: `1inch not available on ${chain}`
        })
      }
      result = await chainProxy.oneInch.swap({
        tokenIn,
        tokenOut,
        amountIn,
        slippage
      })
    } else {
      return res.status(400).json({
        success: false,
        error: `Protocol not supported: ${protocol}`
      })
    }

    res.json({
      success: true,
      result
    })
  } catch (error: any) {
    console.error('[Trading API] Swap error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Swap failed'
    })
  }
})

/**
 * Get a quote for a swap
 * POST /api/trading/:executionId/quote
 */
router.post('/:executionId/quote', async (req, res) => {
  try {
    const { executionId } = req.params
    const { chain, protocol, tokenIn, tokenOut, amountIn } = req.body

    if (!chain || !protocol) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: chain, protocol'
      })
    }

    const execution = tradingExecutionManager.getExecution(executionId)
    if (!execution) {
      return res.status(404).json({
        success: false,
        error: `Execution not found: ${executionId}`
      })
    }

    console.log(`[Trading API] Getting ${protocol} quote on ${chain}`)
    console.log(`[Trading API] ${amountIn} ${tokenIn} → ${tokenOut}`)

    // Get chain proxy
    const chainProxy = (execution.deltaTrade as any)[chain]
    if (!chainProxy) {
      return res.status(400).json({
        success: false,
        error: `Chain not initialized: ${chain}`
      })
    }

    // Get quote from protocol
    let quote
    if (protocol === 'uniswapV3') {
      quote = await chainProxy.uniswapV3.getQuote({
        tokenIn,
        tokenOut,
        amountIn
      })
    } else if (protocol === 'uniswapV4') {
      quote = await chainProxy.uniswapV4.getQuote({
        tokenIn,
        tokenOut,
        amountIn
      })
    } else if (protocol === 'oneInch') {
      if (!chainProxy.oneInch) {
        return res.status(400).json({
          success: false,
          error: `1inch not available on ${chain}`
        })
      }
      quote = await chainProxy.oneInch.getQuote({
        tokenIn,
        tokenOut,
        amountIn
      })
    } else {
      return res.status(400).json({
        success: false,
        error: `Protocol not supported: ${protocol}`
      })
    }

    res.json({
      success: true,
      result: quote
    })
  } catch (error: any) {
    console.error('[Trading API] Quote error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Quote failed'
    })
  }
})

/**
 * Close execution and calculate P&L
 * POST /api/trading/:executionId/close
 */
router.post('/:executionId/close', async (req, res) => {
  try {
    const { executionId } = req.params

    console.log(`[Trading API] Closing execution: ${executionId}`)

    const result = await tradingExecutionManager.closeExecution(executionId)

    res.json({
      success: true,
      result,
      message: 'Execution closed successfully'
    })
  } catch (error: any) {
    console.error('[Trading API] Close error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to close execution'
    })
  }
})

/**
 * Get token balance
 * GET /api/trading/:executionId/balance/:chain/:token
 */
router.get('/:executionId/balance/:chain/:token', async (req, res) => {
  try {
    const { executionId, chain, token } = req.params

    const execution = tradingExecutionManager.getExecution(executionId)
    if (!execution) {
      return res.status(404).json({
        success: false,
        error: `Execution not found: ${executionId}`
      })
    }

    const chainProxy = (execution.deltaTrade as any)[chain]
    if (!chainProxy) {
      return res.status(400).json({
        success: false,
        error: `Chain not initialized: ${chain}`
      })
    }

    let balance: bigint
    if (token === 'native') {
      balance = await chainProxy.getNativeBalance()
    } else {
      balance = await chainProxy.getTokenBalance(token)
    }

    res.json({
      success: true,
      balance: balance.toString()
    })
  } catch (error: any) {
    console.error('[Trading API] Balance error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get balance'
    })
  }
})

/**
 * Get gas price
 * GET /api/trading/:executionId/gas-price/:chain
 */
router.get('/:executionId/gas-price/:chain', async (req, res) => {
  try {
    const { executionId, chain } = req.params

    const execution = tradingExecutionManager.getExecution(executionId)
    if (!execution) {
      return res.status(404).json({
        success: false,
        error: `Execution not found: ${executionId}`
      })
    }

    const chainProxy = (execution.deltaTrade as any)[chain]
    if (!chainProxy) {
      return res.status(400).json({
        success: false,
        error: `Chain not initialized: ${chain}`
      })
    }

    const gasPrice = await chainProxy.getGasPrice()

    res.json({
      success: true,
      gasPrice: gasPrice.toString()
    })
  } catch (error: any) {
    console.error('[Trading API] Gas price error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get gas price'
    })
  }
})

/**
 * Get active executions (for debugging)
 * GET /api/trading/executions
 */
router.get('/executions', (req, res) => {
  const activeExecutions = tradingExecutionManager.getActiveExecutions()
  const count = tradingExecutionManager.getExecutionCount()

  res.json({
    success: true,
    count,
    executions: activeExecutions
  })
})

export default router
