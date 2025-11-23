// Test V4 with 0.3% fee tier (most common for WETH/USDC)
(async () => {
  const WETH = 'WETH'
  const USDC = 'USDC'
  const SWAP_AMOUNT = '0.0001'

  // Use 0.3% fee tier (most common for WETH/USDC pairs)
  const FEE_TIER = { fee: 3000, tickSpacing: 60, name: '0.3%' }

  console.log('═══════════════════════════════════════════════════════════')
  console.log('🦄 Uniswap V4 Test - Base Mainnet')
  console.log(`📊 Using ${FEE_TIER.name} fee tier (standard for WETH/USDC)`)
  console.log('═══════════════════════════════════════════════════════════\n')

  // Get quote
  console.log(`📊 Getting quote for ${SWAP_AMOUNT} WETH → USDC...`)
  try {
    const quote = await dt.base.uniswapV4.getQuote({
      tokenIn: WETH,
      tokenOut: USDC,
      amountIn: SWAP_AMOUNT,
      fee: FEE_TIER.fee,
      tickSpacing: FEE_TIER.tickSpacing
    })

    console.log(`✅ Quote received:`)
    console.log(`   Amount Out: ${quote.amountOut} USDC`)
    console.log(`   Exchange Rate: ${quote.exchangeRate.toFixed(2)} USDC per WETH`)
    console.log(`   Est. Gas Cost: $${(quote.gasCostUsd || 0).toFixed(4)}`)

    // Validate quote makes sense (WETH should be worth $2000-$4000)
    if (quote.exchangeRate < 1000 || quote.exchangeRate > 10000) {
      console.log(`\n⚠️  WARNING: Exchange rate ${quote.exchangeRate.toFixed(2)} seems unusual`)
      console.log(`   Expected range: 2000-4000 USDC per WETH`)
      console.log(`   This pool may have low liquidity - SKIPPING SWAP\n`)
      return
    }

    console.log(`\n✅ Quote looks reasonable, proceeding with swap...\n`)

    // Execute swap
    console.log(`💱 Swapping ${SWAP_AMOUNT} WETH → USDC...`)
    const result = await dt.base.uniswapV4.swap({
      tokenIn: WETH,
      tokenOut: USDC,
      amountIn: SWAP_AMOUNT,
      slippage: 1.0,
      fee: FEE_TIER.fee,
      tickSpacing: FEE_TIER.tickSpacing
    })

    console.log('\n✅ SWAP SUCCESSFUL!')
    console.log('──────────────────────────────────────────────────────────')
    console.log(`TX Hash: ${result.transactionHash}`)
    console.log(`Block: ${result.blockNumber}`)
    console.log(`Amount In: ${result.amountIn} WETH`)
    console.log(`Amount Out: ${result.amountOut} USDC`)
    console.log(`Gas Used: ${result.gasUsed.toLocaleString()}`)
    console.log(`Gas Cost: $${result.gasCostUsd.toFixed(4)}`)
    console.log(`Timestamp: ${new Date(result.timestamp * 1000).toISOString()}`)

  } catch (error) {
    console.error(`\n❌ FAILED: ${error.message}`)

    if (error.message.includes('Pool may not exist')) {
      console.log('\n💡 This fee tier pool may not exist on V4 yet')
      console.log('   V4 launched Jan 31, 2025 - liquidity still migrating')
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════')
})()
