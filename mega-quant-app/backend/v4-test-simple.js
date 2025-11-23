// ========================================
// UNISWAP V4 - SIMPLE QUOTE TEST
// BASE MAINNET ONLY
// ========================================

(async () => {
  const WETH = 'WETH'
  const USDC = 'USDC'
  const SWAP_AMOUNT = '0.0001'

  // Fee tiers to try
  const FEE_TIERS = [
    { fee: 500, tickSpacing: 10, name: '0.05%' },
    { fee: 3000, tickSpacing: 60, name: '0.3%' },
    { fee: 10000, tickSpacing: 200, name: '1%' }
  ]

  console.log('═══════════════════════════════════════════════════════════')
  console.log('🦄 Uniswap V4 - Simple Quote Test (Base)')
  console.log('═══════════════════════════════════════════════════════════\n')

  // Try each fee tier
  for (const tier of FEE_TIERS) {
    console.log(`📊 Trying ${tier.name} fee tier...`)

    try {
      const quote = await dt.base.uniswapV4.getQuote({
        tokenIn: WETH,
        tokenOut: USDC,
        amountIn: SWAP_AMOUNT,
        fee: tier.fee,
        tickSpacing: tier.tickSpacing
      })

      console.log(`✅ Quote SUCCESS!`)
      console.log(`   Quote: ${quote.amountOut} USDC`)
      console.log(`   Rate: ${quote.exchangeRate.toFixed(2)} USDC per WETH`)
      console.log(`   Est. Gas: $${(quote.gasCostUsd || 0).toFixed(4)}\n`)

      // Found working pool - try to swap
      console.log(`💱 Attempting swap with ${tier.name} fee...`)

      const result = await dt.base.uniswapV4.swap({
        tokenIn: WETH,
        tokenOut: USDC,
        amountIn: SWAP_AMOUNT,
        slippage: 1.0,
        fee: tier.fee,
        tickSpacing: tier.tickSpacing
      })

      console.log(`✅ Swap successful!`)
      console.log(`   TX: ${result.transactionHash}`)
      console.log(`   Amount In: ${result.amountIn} WETH`)
      console.log(`   Amount Out: ${result.amountOut} USDC`)
      console.log(`   Gas Cost: $${result.gasCostUsd.toFixed(4)}`)

      break // Success - exit loop

    } catch (error) {
      console.log(`❌ ${tier.name} failed: ${error.message}\n`)
    }
  }

  console.log('═══════════════════════════════════════════════════════════')
  console.log('✅ Test completed!')
  console.log('═══════════════════════════════════════════════════════════')
})()
