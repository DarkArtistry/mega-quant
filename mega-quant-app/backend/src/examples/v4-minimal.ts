/**
 * MINIMAL Uniswap V4 Example - Just copy and paste this!
 *
 * 1. Update STRATEGY_ID and CHAIN
 * 2. Make sure app is unlocked
 * 3. Run: npm run example:v4-minimal
 */

import { createDeltaTrade } from '../lib/trading/DeltaTrade.js'

async function main() {
  // ========== CONFIGURATION - CHANGE THESE ==========
  const STRATEGY_ID = 'my-v4-strategy'  // Your strategy ID
  const CHAIN = 'base-sepolia'          // ethereum | base | sepolia | base-sepolia
  const AMOUNT = '0.01'                 // Amount to swap
  // ==================================================

  console.log('\n🦄 Uniswap V4 Quick Example\n')

  // Create execution (auto-loads your accounts)
  const dt = await createDeltaTrade('v4-example', STRATEGY_ID)
  const chain = (dt as any)[CHAIN]

  // Get quote
  console.log('Getting quote...')
  const quote = await chain.uniswapV4.getQuote({
    tokenIn: 'WETH',
    tokenOut: 'USDC',
    amountIn: AMOUNT
  })
  console.log(`Quote: ${AMOUNT} WETH → ${quote.amountOut} USDC`)
  console.log(`Rate: ${quote.exchangeRate.toFixed(2)} USDC per WETH\n`)

  // Execute swap
  console.log('Executing swap...')
  const result = await chain.uniswapV4.swap({
    tokenIn: 'WETH',
    tokenOut: 'USDC',
    amountIn: AMOUNT,
    slippage: 1.0
  })
  console.log(`✅ Swap complete!`)
  console.log(`TX: ${result.transactionHash}`)
  console.log(`Got: ${result.amountOut} USDC\n`)

  // Close and show P&L
  const final = await dt.close()
  console.log(`Net P&L: $${final.netPnl.toFixed(4)}`)
  console.log(`Gas: $${final.totalGasCost.toFixed(4)}\n`)
}

main().catch(console.error)
