// Test all V4 fee tiers to find which pools exist and have liquidity
(async () => {
  const WETH = 'WETH'
  const USDC = 'USDC'
  const SWAP_AMOUNT = '0.0001'

  const FEE_TIERS = [
    { fee: 100, tickSpacing: 1, name: '0.01%' },
    { fee: 500, tickSpacing: 10, name: '0.05%' },
    { fee: 3000, tickSpacing: 60, name: '0.3%' },
    { fee: 10000, tickSpacing: 200, name: '1%' }
  ]

  console.log('═══════════════════════════════════════════════════════════')
  console.log('🦄 Uniswap V4 Pool Discovery - Base Mainnet')
  console.log(`🔍 Testing ${FEE_TIERS.length} fee tiers to find working pools`)
  console.log('═══════════════════════════════════════════════════════════\n')

  const workingPools = []
  const failedPools = []

  for (const tier of FEE_TIERS) {
    console.log(`\n📊 Testing ${tier.name} fee tier (${tier.fee})...`)

    try {
      const quote = await dt.base.uniswapV4.getQuote({
        tokenIn: WETH,
        tokenOut: USDC,
        amountIn: SWAP_AMOUNT,
        fee: tier.fee,
        tickSpacing: tier.tickSpacing
      })

      const rate = quote.exchangeRate

      console.log(`   Quote: ${quote.amountOut} USDC`)
      console.log(`   Rate: ${rate.toFixed(2)} USDC per WETH`)

      // Validate rate is reasonable (WETH typically $2000-$4000)
      if (rate < 1000 || rate > 10000) {
        console.log(`   ⚠️  Rate seems wrong - likely low/no liquidity`)
        failedPools.push({ ...tier, reason: `Unrealistic rate: ${rate.toFixed(2)}`, quote })
      } else {
        console.log(`   ✅ Rate looks good!`)
        workingPools.push({ ...tier, quote })
      }

    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`)
      failedPools.push({ ...tier, reason: error.message })
    }
  }

  // Summary
  console.log('\n\n═══════════════════════════════════════════════════════════')
  console.log('📋 SUMMARY')
  console.log('═══════════════════════════════════════════════════════════')

  if (workingPools.length > 0) {
    console.log(`\n✅ Found ${workingPools.length} pool(s) with good liquidity:\n`)
    workingPools.forEach(pool => {
      console.log(`   ${pool.name} (fee: ${pool.fee})`)
      console.log(`   └─ Rate: ${pool.quote.exchangeRate.toFixed(2)} USDC/WETH`)
      console.log(`   └─ Quote: ${pool.quote.amountOut} USDC for ${SWAP_AMOUNT} WETH\n`)
    })

    // Try swap with best pool (first one found)
    const bestPool = workingPools[0]
    console.log(`\n💱 Attempting swap with ${bestPool.name} fee tier...\n`)

    try {
      const result = await dt.base.uniswapV4.swap({
        tokenIn: WETH,
        tokenOut: USDC,
        amountIn: SWAP_AMOUNT,
        slippage: 1.0,
        fee: bestPool.fee,
        tickSpacing: bestPool.tickSpacing
      })

      console.log('✅ SWAP SUCCESSFUL!')
      console.log('──────────────────────────────────────────────────────────')
      console.log(`TX: ${result.transactionHash}`)
      console.log(`Amount Out: ${result.amountOut} USDC`)
      console.log(`Gas Cost: $${result.gasCostUsd.toFixed(4)}`)

    } catch (error) {
      console.error(`\n❌ Swap failed: ${error.message}`)
      console.log('\nThe quote worked but swap failed - possible reasons:')
      console.log('• Pool exists but has insufficient liquidity for this size')
      console.log('• Price moved between quote and swap')
      console.log('• V4 liquidity still migrating from V3')
    }

  } else {
    console.log('\n❌ No working V4 pools found')
    console.log('\n💡 Uniswap V4 launched Jan 31, 2025')
    console.log('   Liquidity is still migrating from V3')
    console.log('   Pools may not exist yet or have very low liquidity\n')

    console.log('Failed pools:')
    failedPools.forEach(pool => {
      console.log(`   • ${pool.name}: ${pool.reason}`)
    })
  }

  console.log('\n═══════════════════════════════════════════════════════════')
})()
