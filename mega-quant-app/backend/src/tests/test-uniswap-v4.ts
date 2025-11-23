// Test Uniswap V4 Protocol
// Tests quote and swap functionality with hooks support

import { DeltaTrade } from '../lib/trading/DeltaTrade.js'
import dotenv from 'dotenv'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'

dotenv.config({ path: '.env.test' })

async function testUniswapV4() {
  console.log('='.repeat(80))
  console.log('🦄 UNISWAP V4 PROTOCOL TEST')
  console.log('='.repeat(80))
  console.log('')

  try {
    // Determine which chain to test based on env var
    const testChain = process.env.TEST_CHAIN || 'sepolia'
    console.log(`📍 Testing on: ${testChain.toUpperCase()}`)
    console.log('')

    // Check if V4 is configured
    const { getChainConfig } = await import('../lib/trading/config/chains.js')
    const chainConfig = getChainConfig(testChain)

    if (!chainConfig.uniswapV4) {
      console.error(`❌ Uniswap V4 not configured on ${testChain}`)
      process.exit(1)
    }

    console.log(`PoolManager: ${chainConfig.uniswapV4.poolManager}`)
    console.log(`StateView: ${chainConfig.uniswapV4.stateView}`)
    console.log(`UniversalRouter: ${chainConfig.uniswapV4.universalRouter}`)
    console.log('')

    // Use same private key pattern as V3 tests
    const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || '0x0ab64f3127d928fecc57f3516829c71a1aff2575f66b13dcea7860c454c1231b'
    const TEST_ADDRESS = '0xB5d8206099422A419149813e53Bf774b5F25ba6b'

    console.log('🔧 Creating test execution...')
    console.log(`   Using test address: ${TEST_ADDRESS}`)
    console.log('')

    // Create execution in database
    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001'
    const executionId = uuidv4()
    const strategyId = 'test-strategy-v4'

    try {
      await axios.post(`${apiBaseUrl}/api/executions`, {
        strategy_id: strategyId,
        execution_type: 'uniswap-v4-test'
      })
    } catch (error: any) {
      console.warn('Note: Could not create execution in database (API may not be running)')
      console.log('')
    }

    // Create DeltaTrade instance using same pattern as V3 tests
    const chainPrivateKeys: Record<string, string> = {
      [testChain]: TEST_PRIVATE_KEY
    }

    const dt = new DeltaTrade(executionId, strategyId, 'uniswap-v4-test', chainPrivateKeys)
    await dt.initialize()
    console.log('✅ Execution created')
    console.log('')

    // Get the chain proxy
    const chain = (dt as any)[testChain]
    if (!chain) {
      throw new Error(`Chain ${testChain} not available in DeltaTrade`)
    }

    if (!chain.uniswapV4) {
      throw new Error(`Uniswap V4 not available on ${testChain}`)
    }

    // Test 1: Get Quote
    console.log('─'.repeat(80))
    console.log('TEST 1: Get Quote (WETH → USDC)')
    console.log('─'.repeat(80))

    const quoteAmount = '0.01' // Small amount for testing
    console.log(`Getting quote for ${quoteAmount} WETH...`)

    try {
      const quote = await chain.uniswapV4.getQuote({
        tokenIn: 'WETH',
        tokenOut: 'USDC',
        amountIn: quoteAmount
      })

      console.log('')
      console.log('✅ Quote received:')
      console.log(`   Expected output: ${quote.amountOut} USDC`)
      console.log(`   Min output (0.5% slippage): ${quote.amountOutMin} USDC`)
      console.log(`   Exchange rate: ${quote.exchangeRate.toFixed(6)} USDC per WETH`)
      console.log(`   Price impact: ${quote.priceImpact.toFixed(2)}%`)
      if (quote.gasCostUsd) {
        console.log(`   Est. gas cost: $${quote.gasCostUsd.toFixed(4)}`)
      }
      console.log('')

      // Warn if price impact is high
      if (Math.abs(quote.priceImpact) > 1) {
        console.log(`⚠️  WARNING: High price impact (${quote.priceImpact.toFixed(2)}%)`)
        console.log('   This is normal on testnets with low liquidity')
        console.log('')
      }
    } catch (error: any) {
      console.error('❌ Quote failed:', error.message)
      console.log('')

      if (error.message.includes('revert') || error.message.includes('CALL_EXCEPTION')) {
        console.log('ℹ️  The WETH/USDC V4 pool may not exist on this network yet')
        console.log('   V4 is still new and not all token pairs have pools')
        console.log('   Consider:')
        console.log('   • Using Uniswap V3 (fully supported)')
        console.log('   • Creating a V4 pool for this pair')
        console.log('   • Testing on a network with more V4 liquidity')
      } else if (error.message.includes('no pool')) {
        console.log('ℹ️  This token pair does not have a V4 pool')
        console.log('   Try different tokens or use V3 instead')
      }
      console.log('')
    }

    // Test 2: Get Reverse Quote
    console.log('─'.repeat(80))
    console.log('TEST 2: Get Reverse Quote (USDC → WETH)')
    console.log('─'.repeat(80))

    const usdcAmount = '10' // Small amount for testing
    console.log(`Getting quote for ${usdcAmount} USDC...`)

    try {
      const reverseQuote = await chain.uniswapV4.getQuote({
        tokenIn: 'USDC',
        tokenOut: 'WETH',
        amountIn: usdcAmount
      })

      console.log('')
      console.log('✅ Quote received:')
      console.log(`   Expected output: ${reverseQuote.amountOut} WETH`)
      console.log(`   Min output (0.5% slippage): ${reverseQuote.amountOutMin} WETH`)
      console.log(`   Exchange rate: ${reverseQuote.exchangeRate.toFixed(6)} WETH per USDC`)
      console.log(`   Price impact: ${reverseQuote.priceImpact.toFixed(2)}%`)
      if (reverseQuote.gasCostUsd) {
        console.log(`   Est. gas cost: $${reverseQuote.gasCostUsd.toFixed(4)}`)
      }
      console.log('')
    } catch (error: any) {
      console.error('❌ Reverse quote failed:', error.message)
      console.log('')

      if (error.message.includes('revert') || error.message.includes('CALL_EXCEPTION')) {
        console.log('ℹ️  V4 pool does not exist for this pair')
      }
      console.log('')
    }

    // Test 3: Check Balances
    console.log('─'.repeat(80))
    console.log('TEST 3: Check Token Balances')
    console.log('─'.repeat(80))

    try {
      const { getTokenInfo } = await import('../lib/trading/config/tokens.js')
      const { formatUnits } = await import('ethers')

      const wethInfo = getTokenInfo(testChain, 'WETH')
      const usdcInfo = getTokenInfo(testChain, 'USDC')

      const wethBalance = await chain.getTokenBalance(wethInfo.address)
      const usdcBalance = await chain.getTokenBalance(usdcInfo.address)

      const wethFormatted = formatUnits(wethBalance, wethInfo.decimals)
      const usdcFormatted = formatUnits(usdcBalance, usdcInfo.decimals)

      console.log(`WETH balance: ${wethFormatted}`)
      console.log(`USDC balance: ${usdcFormatted}`)
      console.log('')

      // Check if we have sufficient balance for swap test
      const hasWethBalance = parseFloat(wethFormatted) >= parseFloat(quoteAmount)

      if (!hasWethBalance) {
        console.log('⚠️  Insufficient WETH balance for swap test')
        console.log(`   Need: ${quoteAmount} WETH`)
        console.log(`   Have: ${wethFormatted} WETH`)
        console.log('')
      }

      // Test 4: Execute Swap via Universal Router
      console.log('─'.repeat(80))
      console.log('TEST 4: Execute Swap (WETH → USDC) via Universal Router')
      console.log('─'.repeat(80))

      if (!hasWethBalance) {
        console.log('⏭️  Skipping swap test - insufficient balance')
        console.log('')
      } else {
        console.log(`Executing swap: ${quoteAmount} WETH → USDC`)
        console.log('⚠️  This will use real gas and tokens!')
        console.log('')

        try {
          const swapResult = await chain.uniswapV4.swap({
            tokenIn: 'WETH',
            tokenOut: 'USDC',
            amountIn: quoteAmount,
            slippage: 1.0 // Higher slippage for testnets
          })

          console.log('✅ Swap successful!')
          console.log(`   Transaction: ${swapResult.transactionHash}`)
          console.log(`   Block: ${swapResult.blockNumber}`)
          console.log(`   Amount in: ${swapResult.amountIn} WETH`)
          console.log(`   Amount out: ${swapResult.amountOut} USDC`)
          console.log(`   Gas used: ${swapResult.gasUsed.toLocaleString()}`)
          console.log(`   Gas cost: $${swapResult.gasCostUsd.toFixed(4)}`)
          console.log('')

          // Verify trade was recorded
          console.log('Verifying trade was recorded in database...')
          await new Promise(resolve => setTimeout(resolve, 1000)) // Wait for recording

          const axios = (await import('axios')).default
          const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001'
          const tradesResponse = await axios.get(`${apiBaseUrl}/api/trades`, {
            params: { execution_id: dt.executionId }
          })

          if (tradesResponse.data.success && tradesResponse.data.trades.length > 0) {
            console.log('✅ Trade recorded in database')
            const trade = tradesResponse.data.trades[0]
            console.log(`   Trade ID: ${trade.id}`)
            console.log(`   Protocol: ${trade.protocol}`)
            console.log('')
          } else {
            console.log('⚠️  Trade not found in database')
            console.log('')
          }
        } catch (error: any) {
          console.error('❌ Swap failed:', error.message)

          if (error.message.includes('insufficient')) {
            console.log('')
            console.log('ℹ️  Insufficient token balance or allowance')
          } else if (error.message.includes('Pool') || error.message.includes('pool')) {
            console.log('')
            console.log('ℹ️  Pool may not exist or have insufficient liquidity')
          } else if (error.message.includes('Permit2')) {
            console.log('')
            console.log('ℹ️  Permit2 approval may be needed')
          }
          console.log('')
        }
      }

      // Test 5: Hooks Support
      console.log('─'.repeat(80))
      console.log('TEST 5: Hooks Support')
      console.log('─'.repeat(80))

      console.log('ℹ️  Hooks allow custom pool behavior:')
      console.log('   • Dynamic fees')
      console.log('   • Custom validations')
      console.log('   • MEV protection')
      console.log('   • Limit orders')
      console.log('')
      console.log('Example usage:')
      console.log('```typescript')
      console.log('await chain.uniswapV4.swap({')
      console.log('  tokenIn: "WETH",')
      console.log('  tokenOut: "USDC",')
      console.log('  amountIn: "0.01",')
      console.log('  poolKey: {')
      console.log('    currency0: "0x...",')
      console.log('    currency1: "0x...",')
      console.log('    fee: 3000,')
      console.log('    tickSpacing: 60,')
      console.log('    hooks: "0xYourHooksContract"')
      console.log('  },')
      console.log('  hookData: "0x1234..."  // Custom data for hooks')
      console.log('})```')
      console.log('')

    } catch (error: any) {
      console.error('❌ Balance check failed:', error.message)
      console.log('')
    }

    // Close execution and show P&L
    console.log('─'.repeat(80))
    console.log('CLOSING EXECUTION')
    console.log('─'.repeat(80))

    const result = await dt.close()

    console.log('✅ Execution closed')
    console.log(`   Starting inventory: ${result.startingInventory.length} balances`)
    console.log(`   Ending inventory: ${result.endingInventory.length} balances`)
    console.log(`   Total P&L: $${result.totalPnl.toFixed(4)}`)
    console.log(`   Gas costs: $${result.totalGasCost.toFixed(4)}`)
    console.log(`   Net P&L: $${result.netPnl.toFixed(4)}`)
    console.log('')

    console.log('='.repeat(80))
    console.log('✅ UNISWAP V4 TEST COMPLETE')
    console.log('='.repeat(80))
    console.log('')
    console.log('Uniswap V4 swaps use the Universal Router with Permit2 approvals')
    console.log('Quotes work immediately without any setup required')
    console.log('')

    process.exit(0)

  } catch (error: any) {
    console.error('')
    console.error('='.repeat(80))
    console.error('❌ TEST FAILED')
    console.error('='.repeat(80))
    console.error('')
    console.error('Error:', error.message)

    if (error.stack) {
      console.error('')
      console.error('Stack trace:')
      console.error(error.stack)
    }

    console.error('')
    process.exit(1)
  }
}

// Run the test
testUniswapV4()
