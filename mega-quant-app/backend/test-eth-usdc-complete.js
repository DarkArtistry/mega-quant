// ========================================
// COMPLETE ETH/USDC V4 TEST
// Gets quote, network fees, and executes swap
// Tests on Base and Ethereum mainnet
// ========================================

(async () => {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('🦄 Uniswap V4 - ETH/USDC Complete Test')
  console.log('═══════════════════════════════════════════════════════════\n')

  // Test configuration
  const TESTS = [
    {
      chain: 'base',
      chainProxy: dt.base,
      tokenIn: 'ETH',      // Native ETH
      tokenOut: 'USDC',
      amount: '0.0001'     // Small test amount
    },
    {
      chain: 'ethereum',
      chainProxy: dt.ethereum,
      tokenIn: 'ETH',      // Native ETH
      tokenOut: 'USDC',
      amount: '0.0001'     // Small test amount
    }
  ]

  // Fee tiers to try (in order of likelihood)
  const FEE_TIERS = [
    { fee: 3000, tickSpacing: 60, name: '0.3%' },   // Most common for ETH/USDC
    { fee: 500, tickSpacing: 10, name: '0.05%' },    // Stablecoin tier
    { fee: 10000, tickSpacing: 200, name: '1%' }     // Exotic tier
  ]

  // Run tests for each chain
  for (const test of TESTS) {
    console.log(`\n${'='.repeat(63)}`)
    console.log(`🔗 TESTING ${test.chain.toUpperCase()}`)
    console.log('='.repeat(63))

    // STEP 1: Get network fees
    console.log('\n💰 STEP 1: Network Fees')
    console.log('─'.repeat(63))

    try {
      const gasPrice = await test.chainProxy.getGasPrice()
      const gasPriceGwei = Number(gasPrice) / 1e9
      console.log(`✅ Gas Price: ${gasPriceGwei.toFixed(2)} gwei`)

      // Estimate swap cost (rough estimate: ~150k gas for V4 swap)
      const estimatedGas = 150000
      const estimatedCostWei = gasPrice * BigInt(estimatedGas)
      const estimatedCostEth = Number(estimatedCostWei) / 1e18
      const ethPriceUsd = 3000 // Rough estimate
      const estimatedCostUsd = estimatedCostEth * ethPriceUsd
      console.log(`  Estimated Swap Cost: ${estimatedCostEth.toFixed(6)} ETH (~$${estimatedCostUsd.toFixed(2)})`)
    } catch (error) {
      console.log(`⚠️  Could not fetch gas price: ${error.message}`)
    }

    // STEP 2: Try quotes for each fee tier
    console.log('\n📊 STEP 2: Getting Quotes')
    console.log('─'.repeat(63))

    let workingTier = null
    let bestQuote = null

    for (const tier of FEE_TIERS) {
      console.log(`\n   Testing ${tier.name} fee tier...`)

      try {
        const quote = await test.chainProxy.uniswapV4.getQuote({
          tokenIn: test.tokenIn,
          tokenOut: test.tokenOut,
          amountIn: test.amount,
          fee: tier.fee,
          tickSpacing: tier.tickSpacing
        })

        const rate = quote.exchangeRate
        console.log(`   Amount Out: ${quote.amountOut} ${test.tokenOut}`)
        console.log(`   Rate: ${rate.toFixed(2)} ${test.tokenOut} per ${test.tokenIn}`)

        // Validate rate is reasonable (ETH should be $2000-$5000)
        if (rate < 1000 || rate > 10000) {
          console.log(`   ⚠️  Rate seems unrealistic - likely low/no liquidity`)
          continue
        }

        console.log(`   ✅ Quote looks good!`)
        workingTier = tier
        bestQuote = quote
        break // Use first working tier

      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`)
      }
    }

    if (!workingTier) {
      console.log('\n❌ No working pools found on', test.chain)
      console.log('   V4 launched recently - liquidity still migrating')
      console.log('   Try again later or use different token pairs\n')
      continue // Skip to next chain
    }

    // STEP 3: Execute swap
    console.log('\n\n💱 STEP 3: Executing Swap')
    console.log('─'.repeat(63))
    console.log(`Using ${workingTier.name} fee tier`)
    console.log(`Swapping ${test.amount} ${test.tokenIn} → ${test.tokenOut}`)
    console.log(`Expected output: ~${bestQuote.amountOut} ${test.tokenOut}\n`)

    try {
      const result = await test.chainProxy.uniswapV4.swap({
        tokenIn: test.tokenIn,
        tokenOut: test.tokenOut,
        amountIn: test.amount,
        slippage: 1.0,  // 1% slippage tolerance
        fee: workingTier.fee,
        tickSpacing: workingTier.tickSpacing
      })

      console.log('✅ SWAP SUCCESSFUL!')
      console.log('─'.repeat(63))
      console.log(`TX Hash:     ${result.transactionHash}`)
      console.log(`Block:       ${result.blockNumber}`)
      console.log(`Amount In:   ${result.amountIn} ${test.tokenIn}`)
      console.log(`Amount Out:  ${result.amountOut} ${test.tokenOut}`)
      console.log(`Gas Used:    ${result.gasUsed.toLocaleString()}`)
      console.log(`Gas Cost:    $${result.gasCostUsd.toFixed(4)}`)
      console.log(`Timestamp:   ${new Date(result.timestamp * 1000).toISOString()}`)

    } catch (error) {
      console.error('\n❌ SWAP FAILED!')
      console.error(`Error: ${error.message}`)

      if (error.message.includes('execution reverted')) {
        console.log('\n💡 Possible reasons:')
        console.log('   • Pool exists but has insufficient liquidity')
        console.log('   • Price moved between quote and swap')
        console.log('   • Try a different fee tier or token pair')
      }
    }
  }

  console.log('\n\n═══════════════════════════════════════════════════════════')
  console.log('✅ Complete test finished!')
  console.log('═══════════════════════════════════════════════════════════\n')
})()
