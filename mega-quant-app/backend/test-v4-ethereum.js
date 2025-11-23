// Test V4 on Ethereum mainnet (likely to have more liquidity)
(async () => {
  const WETH = 'WETH'
  const USDC = 'USDC'
  const SWAP_AMOUNT = '0.0001'

  const FEE_TIERS = [
    { fee: 500, tickSpacing: 10, name: '0.05%' },
    { fee: 3000, tickSpacing: 60, name: '0.3%' },
    { fee: 10000, tickSpacing: 200, name: '1%' }
  ]

  console.log('═══════════════════════════════════════════════════════════')
  console.log('🦄 Uniswap V4 Test - ETHEREUM Mainnet')
  console.log('💡 Testing Ethereum (may have more V4 liquidity than Base)')
  console.log('═══════════════════════════════════════════════════════════\n')

  let successfulSwap = false

  for (const tier of FEE_TIERS) {
    console.log(`\n📊 Testing ${tier.name} fee tier...`)

    try {
      const quote = await dt.ethereum.uniswapV4.getQuote({
        tokenIn: WETH,
        tokenOut: USDC,
        amountIn: SWAP_AMOUNT,
        fee: tier.fee,
        tickSpacing: tier.tickSpacing
      })

      const rate = quote.exchangeRate
      console.log(`   Quote: ${quote.amountOut} USDC (rate: ${rate.toFixed(2)})`)

      // Validate rate
      if (rate < 1000 || rate > 10000) {
        console.log(`   ⚠️  Rate ${rate.toFixed(2)} seems wrong - skipping`)
        continue
      }

      console.log(`   ✅ Rate looks good!`)

      // Try swap
      console.log(`\n💱 Attempting swap...`)
      const result = await dt.ethereum.uniswapV4.swap({
        tokenIn: WETH,
        tokenOut: USDC,
        amountIn: SWAP_AMOUNT,
        slippage: 1.0,
        fee: tier.fee,
        tickSpacing: tier.tickSpacing
      })

      console.log('\n🎉 SWAP SUCCESSFUL ON ETHEREUM!')
      console.log('──────────────────────────────────────────────────────────')
      console.log(`Fee Tier: ${tier.name}`)
      console.log(`TX: ${result.transactionHash}`)
      console.log(`Amount Out: ${result.amountOut} USDC`)
      console.log(`Gas Cost: $${result.gasCostUsd.toFixed(4)}`)

      successfulSwap = true
      break

    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`)
    }
  }

  if (!successfulSwap) {
    console.log('\n\n═══════════════════════════════════════════════════════════')
    console.log('❌ NO WORKING V4 POOLS FOUND ON ETHEREUM')
    console.log('═══════════════════════════════════════════════════════════')
    console.log('\n💡 Possible reasons:')
    console.log('• V4 launched Jan 31, 2025 - liquidity still migrating')
    console.log('• Pools may not be initialized yet')
    console.log('• May need to wait for liquidity providers')
    console.log('\n📋 Alternative options:')
    console.log('• Try different token pairs (stablecoins might have more V4 liquidity)')
    console.log('• Provide liquidity to V4 pools yourself')
    console.log('• Wait for more liquidity to migrate from V3')
  }

  console.log('\n═══════════════════════════════════════════════════════════')
})()
