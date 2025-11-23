// ========================================
// UNISWAP V4 - IDEAL QUOTE & TRADE TEST
// Uses dt instance properties
// Checks network fees before swap
// ========================================

(async () => {
  const WETH = 'WETH'
  const USDC = 'USDC'
  const SWAP_AMOUNT = '0.0001'

  console.log('═══════════════════════════════════════════════════════════')
  console.log('🦄 Uniswap V4 - Quote & Trade (Base)')
  console.log('═══════════════════════════════════════════════════════════\n')

  // Try to get FEE_TIERS from dt instance
  let FEE_TIERS
  const FALLBACK_TIERS = [
    { fee: 500, tickSpacing: 10, name: '0.05%' },
    { fee: 3000, tickSpacing: 60, name: '0.3%' },
    { fee: 10000, tickSpacing: 200, name: '1%' }
  ]

  try {
    const tiers = dt.base.uniswapV4.FEE_TIERS
    console.log('Raw FEE_TIERS value:', tiers)
    console.log('FEE_TIERS type:', typeof tiers)
    console.log('Is array?', Array.isArray(tiers))

    if (Array.isArray(tiers) && tiers.length > 0) {
      FEE_TIERS = tiers
      console.log('✅ Using FEE_TIERS from dt.base.uniswapV4')
    } else {
      console.log('⚠️  FEE_TIERS is not a valid array, using fallback')
      FEE_TIERS = FALLBACK_TIERS
    }
  } catch (error) {
    console.log('⚠️  FEE_TIERS not accessible:', error.message)
    FEE_TIERS = FALLBACK_TIERS
  }

  console.log(`\n⚙️  Testing ${FEE_TIERS.length} fee tiers:`)
  FEE_TIERS.forEach(tier => {
    console.log(`   - ${tier.name}: fee=${tier.fee}, tickSpacing=${tier.tickSpacing}`)
  })

  // ===========================================
  // STEP 1: Check Network Fees
  // ===========================================
  console.log('\n💰 STEP 1: Checking Network Fees')
  console.log('──────────────────────────────────────────────────────────')

  try {
    const gasInfo = await dt.base.getGasPriceInfo()
    console.log(`Gas Price: ${gasInfo.gasPriceGwei} gwei`)
    if (gasInfo.estimatedSwapGasCostUsd) {
      console.log(`Estimated Swap Cost: $${gasInfo.estimatedSwapGasCostUsd.toFixed(4)}`)
    }
  } catch (error) {
    console.log(`⚠️  Could not fetch gas info: ${error.message}`)
  }

  // ===========================================
  // STEP 2: Try to Get Quote
  // ===========================================
  console.log('\n📊 STEP 2: Getting Quote')
  console.log('──────────────────────────────────────────────────────────')

  let workingTier = null

  for (const tier of FEE_TIERS) {
    console.log(`\n   Trying ${tier.name} fee tier...`)

    try {
      const quote = await dt.base.uniswapV4.getQuote({
        tokenIn: WETH,
        tokenOut: USDC,
        amountIn: SWAP_AMOUNT,
        fee: tier.fee,
        tickSpacing: tier.tickSpacing
      })

      console.log(`   ✅ SUCCESS!`)
      console.log(`      Quote: ${quote.amountOut} USDC`)
      console.log(`      Rate: ${quote.exchangeRate.toFixed(2)} USDC per WETH`)
      console.log(`      Est. Gas: $${(quote.gasCostUsd || 0).toFixed(4)}`)

      workingTier = tier
      break // Found working pool

    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`)
    }
  }

  if (!workingTier) {
    console.log('\n❌ No working V4 pools found!')
    return
  }

  // ===========================================
  // STEP 3: Execute Swap
  // ===========================================
  console.log('\n\n💱 STEP 3: Executing Swap')
  console.log('──────────────────────────────────────────────────────────')
  console.log(`Using ${workingTier.name} fee tier`)
  console.log(`Swapping ${SWAP_AMOUNT} WETH → USDC...\n`)

  try {
    const result = await dt.base.uniswapV4.swap({
      tokenIn: WETH,
      tokenOut: USDC,
      amountIn: SWAP_AMOUNT,
      slippage: 1.0,
      fee: workingTier.fee,
      tickSpacing: workingTier.tickSpacing
    })

    console.log('✅ Swap successful!')
    console.log('──────────────────────────────────────────────────────────')
    console.log(`TX Hash: ${result.transactionHash}`)
    console.log(`Block: ${result.blockNumber}`)
    console.log(`Amount In: ${result.amountIn} WETH`)
    console.log(`Amount Out: ${result.amountOut} USDC`)
    console.log(`Gas Used: ${result.gasUsed.toLocaleString()}`)
    console.log(`Gas Cost: $${result.gasCostUsd.toFixed(4)}`)
    console.log(`Timestamp: ${new Date(result.timestamp * 1000).toISOString()}`)

  } catch (error) {
    console.error('\n❌ Swap failed!')
    console.error(`Error: ${error.message}`)
  }

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('✅ Test completed!')
  console.log('═══════════════════════════════════════════════════════════')
})()
