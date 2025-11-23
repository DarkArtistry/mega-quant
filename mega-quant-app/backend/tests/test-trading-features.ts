/**
 * Test Trading Decision Support Features
 *
 * Tests the new trading features:
 * - Gas price fetching
 * - Token price fetching
 * - Token pair ratios
 * - Swap quotes
 * - Cost estimation
 */

import { createDeltaTrade } from '../src/lib/trading/DeltaTrade.js'

// Use a test private key (DO NOT use real funds)
const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001'

async function testTradingFeatures() {
  console.log('\n🧪 Testing Trading Decision Support Features\n')
  console.log('=' .repeat(60))

  try {
    // Create a test execution on Base mainnet
    const dt = await createDeltaTrade(
      'test_features',
      'test-strategy-001',
      TEST_PRIVATE_KEY,
      ['base']  // Use Base mainnet for testing
    )

    console.log(`✅ Created execution: ${dt.executionId}`)
    console.log('')

    // Test 1: Gas Price Information
    console.log('📊 Test 1: Gas Price Information')
    console.log('-'.repeat(60))
    const gasInfo = await dt.base.getGasPriceInfo()
    console.log(`Gas Price: ${gasInfo.gasPriceGwei} gwei`)
    console.log(`Estimated Swap Cost: $${gasInfo.estimatedSwapGasCostUsd?.toFixed(2) || 'N/A'}`)
    console.log('')

    // Test 2: Token Price Fetching
    console.log('💰 Test 2: Token Price Fetching')
    console.log('-'.repeat(60))
    const wethPrice = await dt.base.getTokenPriceUSD('WETH')
    const usdcPrice = await dt.base.getTokenPriceUSD('USDC')
    console.log(`WETH Price: $${wethPrice.toFixed(2)}`)
    console.log(`USDC Price: $${usdcPrice.toFixed(4)}`)
    console.log('')

    // Test 3: Token Pair Ratio
    console.log('🔄 Test 3: Token Pair Ratio')
    console.log('-'.repeat(60))
    const ratio = await dt.base.getTokenPairRatio('WETH', 'USDC')
    console.log(`1 WETH = ${ratio.toFixed(2)} USDC (market rate)`)
    console.log('')

    // Test 4: Swap Quote
    console.log('📝 Test 4: Swap Quote')
    console.log('-'.repeat(60))
    const quote = await dt.base.getSwapQuote('WETH', 'USDC', '0.1')
    console.log(`Input: 0.1 WETH`)
    console.log(`Expected Output: ${quote.amountOut} USDC`)
    console.log(`Min Output (0.5% slippage): ${quote.amountOutMin} USDC`)
    console.log(`Exchange Rate: ${quote.exchangeRate.toFixed(2)} USDC per WETH`)
    console.log(`Price Impact: ${quote.priceImpact.toFixed(4)}%`)
    console.log(`Estimated Gas Cost: $${quote.gasCostUsd?.toFixed(2) || 'N/A'}`)
    console.log('')

    // Test 5: Cost Estimation
    console.log('💵 Test 5: Total Swap Cost Estimation')
    console.log('-'.repeat(60))
    const costEst = await dt.base.estimateTotalSwapCost('WETH', 'USDC', '0.1')
    console.log(`Input: 0.1 WETH`)
    console.log(`Expected Output: ${costEst.amountOut} USDC`)
    console.log(`Output Value: $${costEst.amountOutUsd.toFixed(2)}`)
    console.log(`Gas Cost: $${costEst.gasCostUsd.toFixed(2)}`)
    console.log(`Total Cost: $${costEst.totalCostUsd.toFixed(2)}`)
    console.log(`Net Value: $${costEst.netAmountOutUsd.toFixed(2)}`)
    console.log(`Profitable: ${costEst.profitable ? '✅ YES' : '❌ NO'}`)
    console.log('')

    // Test 6: Decision Making Example
    console.log('🤖 Test 6: Automated Trading Decision')
    console.log('-'.repeat(60))

    const shouldTrade = (
      gasInfo.estimatedSwapGasCostUsd! < 10 &&  // Gas < $10
      quote.priceImpact < 1.0 &&                 // Price impact < 1%
      costEst.profitable                         // Trade is profitable
    )

    console.log('Trading Conditions:')
    console.log(`  ✓ Gas cost < $10: ${gasInfo.estimatedSwapGasCostUsd! < 10 ? '✅ PASS' : '❌ FAIL'} ($${gasInfo.estimatedSwapGasCostUsd?.toFixed(2)})`)
    console.log(`  ✓ Price impact < 1%: ${quote.priceImpact < 1.0 ? '✅ PASS' : '❌ FAIL'} (${quote.priceImpact.toFixed(4)}%)`)
    console.log(`  ✓ Trade profitable: ${costEst.profitable ? '✅ PASS' : '❌ FAIL'}`)
    console.log('')
    console.log(`Decision: ${shouldTrade ? '🟢 TRADE' : '🔴 SKIP'}`)
    console.log('')

    // Close execution without trading
    console.log('🔒 Closing execution (no trades executed)')
    const result = await dt.close()
    console.log(`Execution closed: ${result.executionId}`)
    console.log('')

    console.log('=' .repeat(60))
    console.log('✅ All tests completed successfully!')
    console.log('')

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run tests
testTradingFeatures()
  .then(() => {
    console.log('✅ Test suite completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  })
