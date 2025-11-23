/**
 * Uniswap V4 Trading Example
 *
 * This example shows how to:
 * 1. Get quotes from V4 pools
 * 2. Execute swaps via Universal Router
 * 3. Use hooks for custom pool behavior
 * 4. Track P&L automatically
 *
 * IMPORTANT: Make sure your strategy accounts are configured before running!
 */

import { createDeltaTrade } from '../lib/trading/DeltaTrade.js'

async function main() {
  console.log('='.repeat(80))
  console.log('🦄 UNISWAP V4 TRADING EXAMPLE')
  console.log('='.repeat(80))
  console.log('')

  try {
    // ============================================================================
    // STEP 1: Create Execution (Auto-loads your configured accounts)
    // ============================================================================

    console.log('📝 Creating execution...')

    const STRATEGY_ID = 'my-v4-strategy' // Replace with your strategy ID
    const dt = await createDeltaTrade('uniswap-v4-trading', STRATEGY_ID)

    console.log('✅ Execution created!')
    console.log(`   Execution ID: ${dt.executionId}`)
    console.log('')

    // ============================================================================
    // STEP 2: Choose which chain to use
    // ============================================================================

    // Available chains: 'ethereum', 'base', 'sepolia', 'base-sepolia'
    const CHAIN = 'base-sepolia' // Change this to your preferred network

    const chain = (dt as any)[CHAIN]
    if (!chain) {
      throw new Error(`Chain ${CHAIN} not configured in your strategy accounts`)
    }

    if (!chain.uniswapV4) {
      throw new Error(`Uniswap V4 not available on ${CHAIN}`)
    }

    console.log(`📍 Using chain: ${CHAIN.toUpperCase()}`)
    console.log('')

    // ============================================================================
    // STEP 3: Get V4 Quote (Read-only, no gas cost)
    // ============================================================================

    console.log('─'.repeat(80))
    console.log('GETTING QUOTE: WETH → USDC')
    console.log('─'.repeat(80))
    console.log('')

    const AMOUNT_IN = '0.01' // Amount of WETH to swap

    console.log(`Getting quote for ${AMOUNT_IN} WETH...`)

    const quote = await chain.uniswapV4.getQuote({
      tokenIn: 'WETH',
      tokenOut: 'USDC',
      amountIn: AMOUNT_IN
    })

    console.log('✅ Quote received:')
    console.log(`   Expected output: ${quote.amountOut} USDC`)
    console.log(`   Min output (0.5% slippage): ${quote.amountOutMin} USDC`)
    console.log(`   Exchange rate: ${quote.exchangeRate.toFixed(2)} USDC per WETH`)
    console.log(`   Price impact: ${quote.priceImpact.toFixed(4)}%`)
    if (quote.gasCostUsd) {
      console.log(`   Est. gas cost: $${quote.gasCostUsd.toFixed(4)}`)
    }
    console.log('')

    // ============================================================================
    // STEP 4: Execute V4 Swap (Uses real gas!)
    // ============================================================================

    console.log('─'.repeat(80))
    console.log('EXECUTING SWAP: WETH → USDC')
    console.log('─'.repeat(80))
    console.log('')

    // Check balance before swap
    const { getTokenInfo } = await import('../lib/trading/config/tokens.js')
    const { formatUnits } = await import('ethers')

    const wethInfo = getTokenInfo(CHAIN, 'WETH')
    const wethBalance = await chain.getTokenBalance(wethInfo.address)
    const wethBalanceFormatted = formatUnits(wethBalance, wethInfo.decimals)

    console.log(`Current WETH balance: ${wethBalanceFormatted}`)
    console.log('')

    if (parseFloat(wethBalanceFormatted) < parseFloat(AMOUNT_IN)) {
      console.log('⚠️  Insufficient WETH balance for swap')
      console.log(`   Need: ${AMOUNT_IN} WETH`)
      console.log(`   Have: ${wethBalanceFormatted} WETH`)
      console.log('')
      console.log('Skipping swap execution...')
      console.log('')
    } else {
      console.log(`Executing swap: ${AMOUNT_IN} WETH → USDC`)
      console.log('⚠️  This will use real gas and tokens!')
      console.log('')

      const swapResult = await chain.uniswapV4.swap({
        tokenIn: 'WETH',
        tokenOut: 'USDC',
        amountIn: AMOUNT_IN,
        slippage: 1.0 // 1% slippage tolerance (higher for testnets)
      })

      console.log('✅ Swap successful!')
      console.log(`   Transaction: ${swapResult.transactionHash}`)
      console.log(`   Block: ${swapResult.blockNumber}`)
      console.log(`   Amount in: ${swapResult.amountIn} WETH`)
      console.log(`   Amount out: ${swapResult.amountOut} USDC`)
      console.log(`   Gas used: ${swapResult.gasUsed.toLocaleString()}`)
      console.log(`   Gas cost: $${swapResult.gasCostUsd.toFixed(4)}`)
      console.log('')
    }

    // ============================================================================
    // STEP 5: Using Hooks (Advanced)
    // ============================================================================

    console.log('─'.repeat(80))
    console.log('UNISWAP V4 HOOKS SUPPORT')
    console.log('─'.repeat(80))
    console.log('')

    console.log('Hooks allow custom pool behavior:')
    console.log('  • Dynamic fees')
    console.log('  • Custom validations')
    console.log('  • MEV protection')
    console.log('  • Limit orders')
    console.log('  • TWAMM (time-weighted average market maker)')
    console.log('')

    console.log('Example 1: Swap with a specific hook contract')
    console.log('```typescript')
    console.log('const swapWithHook = await chain.uniswapV4.swapWithHooks({')
    console.log('  tokenIn: "WETH",')
    console.log('  tokenOut: "USDC",')
    console.log('  amountIn: "0.01",')
    console.log('  slippage: 1.0')
    console.log('}, "0xYourHookContractAddress")')
    console.log('```')
    console.log('')

    console.log('Example 2: Create custom pool key with hooks')
    console.log('```typescript')
    console.log('const customPoolKey = chain.uniswapV4.createCustomPoolKey(')
    console.log('  wethAddress,')
    console.log('  usdcAddress,')
    console.log('  3000,  // fee (0.3%)')
    console.log('  60,    // tick spacing')
    console.log('  "0xYourHookContractAddress"')
    console.log(')')
    console.log('')
    console.log('const swap = await chain.uniswapV4.swap({')
    console.log('  tokenIn: "WETH",')
    console.log('  tokenOut: "USDC",')
    console.log('  amountIn: "0.01",')
    console.log('  poolKey: customPoolKey,')
    console.log('  hookData: "0x..."  // Custom data for your hook')
    console.log('})')
    console.log('```')
    console.log('')

    console.log('Example 3: Get quote considering hooks')
    console.log('```typescript')
    console.log('const quoteWithHooks = await chain.uniswapV4.getQuoteWithHooks({')
    console.log('  tokenIn: "WETH",')
    console.log('  tokenOut: "USDC",')
    console.log('  amountIn: "0.01"')
    console.log('}, "0xYourHookContractAddress")')
    console.log('```')
    console.log('')

    // ============================================================================
    // STEP 6: Close Execution and Show P&L
    // ============================================================================

    console.log('─'.repeat(80))
    console.log('CLOSING EXECUTION')
    console.log('─'.repeat(80))
    console.log('')

    const result = await dt.close()

    console.log('✅ Execution closed')
    console.log(`   Starting inventory: ${result.startingInventory.length} balances`)
    console.log(`   Ending inventory: ${result.endingInventory.length} balances`)
    console.log(`   Total P&L: $${result.totalPnl.toFixed(4)}`)
    console.log(`   Gas costs: $${result.totalGasCost.toFixed(4)}`)
    console.log(`   Net P&L: $${result.netPnl.toFixed(4)}`)
    console.log('')

    // Show inventory details
    if (result.endingInventory.length > 0) {
      console.log('Final Inventory:')
      for (const balance of result.endingInventory) {
        const decimals = balance.tokenSymbol === 'USDC' ? 6 : 18
        const amount = formatUnits(balance.balance, decimals)
        console.log(`  ${balance.chainName}: ${amount} ${balance.tokenSymbol}`)
      }
      console.log('')
    }

    console.log('='.repeat(80))
    console.log('✅ UNISWAP V4 EXAMPLE COMPLETE')
    console.log('='.repeat(80))
    console.log('')
    console.log('Key Features:')
    console.log('  ✓ Quotes work immediately without any setup')
    console.log('  ✓ Swaps use Universal Router with Permit2 approvals')
    console.log('  ✓ Hooks support for custom pool behavior')
    console.log('  ✓ Automatic trade recording in database')
    console.log('  ✓ Automatic P&L calculation')
    console.log('')

  } catch (error: any) {
    console.error('')
    console.error('='.repeat(80))
    console.error('❌ ERROR')
    console.error('='.repeat(80))
    console.error('')
    console.error('Error:', error.message)

    if (error.message.includes('No accounts configured')) {
      console.error('')
      console.error('💡 Solution: Configure accounts for your strategy')
      console.error('   1. Create your strategy in the UI')
      console.error('   2. Configure which account each network should use')
      console.error('   3. Use the strategy ID in this script')
      console.error('')
    } else if (error.message.includes('App is locked')) {
      console.error('')
      console.error('💡 Solution: Unlock the app first')
      console.error('   The app must be unlocked to access private keys')
      console.error('')
    } else if (error.message.includes('insufficient')) {
      console.error('')
      console.error('💡 Solution: Add tokens to your wallet')
      console.error('   You need WETH to execute swaps')
      console.error('')
    } else if (error.message.includes('Pool') || error.message.includes('revert')) {
      console.error('')
      console.error('💡 Possible causes:')
      console.error('   • V4 pool may not exist for this token pair')
      console.error('   • Pool may not have enough liquidity')
      console.error('   • Try using Uniswap V3 instead')
      console.error('')
    }

    if (error.stack) {
      console.error('')
      console.error('Stack trace:')
      console.error(error.stack)
    }

    console.error('')
    process.exit(1)
  }
}

// Run the example
main()
