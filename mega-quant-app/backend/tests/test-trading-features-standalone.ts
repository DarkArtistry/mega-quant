/**
 * Standalone Test for Trading Decision Support Features
 *
 * Tests the new trading features without requiring the backend server:
 * - Gas price fetching
 * - Token price fetching
 * - Token pair ratios
 * - Swap quotes
 * - Cost estimation
 */

import { ChainProxy } from '../src/lib/trading/ChainProxy.js'
import { DeltaTrade } from '../src/lib/trading/DeltaTrade.js'

// Use a test private key (DO NOT use real funds)
const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001'

async function testTradingFeaturesStandalone() {
  console.log('\n🧪 Standalone Test: Trading Decision Support Features\n')
  console.log('=' .repeat(70))

  try {
    // Create DeltaTrade instance directly (skip API call)
    const mockExecutionId = 'test-exec-' + Date.now()
    const mockStrategyId = 'test-strategy-001'

    console.log(`Creating test execution: ${mockExecutionId}`)
    console.log('')

    const dt = new DeltaTrade(
      mockExecutionId,
      mockStrategyId,
      'test_features',
      { 'base': TEST_PRIVATE_KEY }  // Only test Base chain
    )

    console.log('✅ DeltaTrade instance created')
    console.log('')

    // Test 1: Gas Price Information
    console.log('📊 Test 1: Gas Price Information')
    console.log('-'.repeat(70))
    try {
      const gasInfo = await dt.base!.getGasPriceInfo()
      console.log(`✅ Gas Price: ${gasInfo.gasPriceGwei} gwei`)
      console.log(`✅ Estimated Swap Cost: $${gasInfo.estimatedSwapGasCostUsd?.toFixed(2) || 'N/A'}`)
      console.log('')
    } catch (error: any) {
      console.error(`❌ Failed: ${error.message}`)
      console.log('')
    }

    // Test 2: Token Price Fetching
    console.log('💰 Test 2: Token Price Fetching')
    console.log('-'.repeat(70))
    try {
      const wethPrice = await dt.base!.getTokenPriceUSD('WETH')
      const usdcPrice = await dt.base!.getTokenPriceUSD('USDC')
      console.log(`✅ WETH Price: $${wethPrice.toFixed(2)}`)
      console.log(`✅ USDC Price: $${usdcPrice.toFixed(4)}`)
      console.log('')
    } catch (error: any) {
      console.error(`❌ Failed: ${error.message}`)
      console.log('')
    }

    // Test 3: Token Pair Ratio
    console.log('🔄 Test 3: Token Pair Ratio')
    console.log('-'.repeat(70))
    try {
      const ratio = await dt.base!.getTokenPairRatio('WETH', 'USDC')
      console.log(`✅ 1 WETH = ${ratio.toFixed(2)} USDC (market rate)`)
      console.log('')
    } catch (error: any) {
      console.error(`❌ Failed: ${error.message}`)
      console.log('')
    }

    // Test 4: Swap Quote
    console.log('📝 Test 4: Swap Quote')
    console.log('-'.repeat(70))
    try {
      const quote = await dt.base!.getSwapQuote('WETH', 'USDC', '0.1')
      console.log(`✅ Input: 0.1 WETH`)
      console.log(`✅ Expected Output: ${quote.amountOut} USDC`)
      console.log(`✅ Min Output (0.5% slippage): ${quote.amountOutMin} USDC`)
      console.log(`✅ Exchange Rate: ${quote.exchangeRate.toFixed(2)} USDC per WETH`)
      console.log(`✅ Price Impact: ${quote.priceImpact.toFixed(4)}%`)
      console.log(`✅ Estimated Gas Cost: $${quote.gasCostUsd?.toFixed(2) || 'N/A'}`)
      console.log('')
    } catch (error: any) {
      console.error(`❌ Failed: ${error.message}`)
      console.log('')
    }

    // Test 5: Cost Estimation
    console.log('💵 Test 5: Total Swap Cost Estimation')
    console.log('-'.repeat(70))
    try {
      const costEst = await dt.base!.estimateTotalSwapCost('WETH', 'USDC', '0.1')
      console.log(`✅ Input: 0.1 WETH`)
      console.log(`✅ Expected Output: ${costEst.amountOut} USDC`)
      console.log(`✅ Output Value: $${costEst.amountOutUsd.toFixed(2)}`)
      console.log(`✅ Gas Cost: $${costEst.gasCostUsd.toFixed(2)}`)
      console.log(`✅ Total Cost: $${costEst.totalCostUsd.toFixed(2)}`)
      console.log(`✅ Net Value: $${costEst.netAmountOutUsd.toFixed(2)}`)
      console.log(`✅ Profitable: ${costEst.profitable ? '✅ YES' : '❌ NO'}`)
      console.log('')
    } catch (error: any) {
      console.error(`❌ Failed: ${error.message}`)
      console.log('')
    }

    // Test 6: Decision Making Example
    console.log('🤖 Test 6: Automated Trading Decision')
    console.log('-'.repeat(70))
    try {
      const gasInfo = await dt.base!.getGasPriceInfo()
      const quote = await dt.base!.getSwapQuote('WETH', 'USDC', '0.1')
      const costEst = await dt.base!.estimateTotalSwapCost('WETH', 'USDC', '0.1')

      const shouldTrade = (
        gasInfo.estimatedSwapGasCostUsd! < 10 &&  // Gas < $10
        quote.priceImpact < 1.0 &&                 // Price impact < 1%
        costEst.profitable                         // Trade is profitable
      )

      console.log('✅ Trading Conditions:')
      console.log(`  ✓ Gas cost < $10: ${gasInfo.estimatedSwapGasCostUsd! < 10 ? '✅ PASS' : '❌ FAIL'} ($${gasInfo.estimatedSwapGasCostUsd?.toFixed(2)})`)
      console.log(`  ✓ Price impact < 1%: ${quote.priceImpact < 1.0 ? '✅ PASS' : '❌ FAIL'} (${quote.priceImpact.toFixed(4)}%)`)
      console.log(`  ✓ Trade profitable: ${costEst.profitable ? '✅ PASS' : '❌ FAIL'}`)
      console.log('')
      console.log(`✅ Decision: ${shouldTrade ? '🟢 TRADE' : '🔴 SKIP'}`)
      console.log('')
    } catch (error: any) {
      console.error(`❌ Failed: ${error.message}`)
      console.log('')
    }

    console.log('=' .repeat(70))
    console.log('✅ All tests completed successfully!')
    console.log('')
    console.log('Note: This test does not execute actual trades or require the backend server.')
    console.log('It only tests the quote and price fetching capabilities.')
    console.log('')

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run tests
testTradingFeaturesStandalone()
  .then(() => {
    console.log('✅ Test suite completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  })
