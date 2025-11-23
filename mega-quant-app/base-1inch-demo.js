// 🚀 MEGA QUANT - 1inch Base Mainnet Demo
// Demonstrates smart routing using 1inch aggregator on Base
// Compares direct Uniswap V3 vs 1inch's 300+ DEX aggregation

(async () => {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('🚀 MEGA QUANT - 1inch on Base Mainnet')
  console.log('    Smart DEX Aggregation Demo')
  console.log('═══════════════════════════════════════════════════════════\n')

  // Small amount for demo - adjust as needed
  const AMOUNT = '0.0001' // 0.0001 ETH (~$0.25)

  try {
    console.log('📊 Fetching Quotes from Multiple Sources...\n')

    // ─────────────────────────────────────
    // 1️⃣ GET QUOTE FROM UNISWAP V3 (Direct)
    // ─────────────────────────────────────
    console.log('   → Querying Uniswap V3 directly on Base...')
    let uniV3Quote
    try {
      uniV3Quote = await dt.base.uniswapV3.getQuote({
        tokenIn: 'ETH',
        tokenOut: 'USDC',
        amountIn: AMOUNT
      })
      console.log('   ✅ Uniswap V3 quote received')
    } catch (error) {
      console.log('   ⚠️  Uniswap V3 quote failed:', error.message)
    }

    // ─────────────────────────────────────
    // 2️⃣ GET QUOTE FROM 1INCH (Aggregated)
    // ─────────────────────────────────────
    console.log('   → Querying 1inch aggregator (300+ DEXs)...')
    const oneInchQuote = await dt.base.oneInch.getQuote({
      tokenIn: 'ETH',
      tokenOut: 'USDC',
      amountIn: AMOUNT
    })
    console.log('   ✅ 1inch quote received\n')

    // ─────────────────────────────────────
    // 3️⃣ DISPLAY PRICE COMPARISON
    // ─────────────────────────────────────
    console.log('💰 Price Comparison:\n')
    console.log('┌─────────────────────────────────────────────────┐')

    if (uniV3Quote) {
      console.log('│ Uniswap V3 (Direct on Base)                    │')
      console.log(`│   Output: ${uniV3Quote.amountOut} USDC`.padEnd(51) + '│')
      console.log(`│   Rate:   ${uniV3Quote.exchangeRate.toFixed(2)} USDC/ETH`.padEnd(51) + '│')
      console.log(`│   Gas:    $${(uniV3Quote.gasCostUsd || 0).toFixed(4)}`.padEnd(51) + '│')
      console.log('├─────────────────────────────────────────────────┤')
    }

    console.log('│ 1inch (Aggregated across 300+ DEXs)            │')
    console.log(`│   Output: ${oneInchQuote.amountOut} USDC`.padEnd(51) + '│')
    console.log(`│   Rate:   ${oneInchQuote.exchangeRate.toFixed(2)} USDC/ETH`.padEnd(51) + '│')
    console.log(`│   Gas:    $${(oneInchQuote.gasCostUsd || 0).toFixed(4)}`.padEnd(51) + '│')
    console.log('└─────────────────────────────────────────────────┘\n')

    // ─────────────────────────────────────
    // 4️⃣ CALCULATE BEST VENUE
    // ─────────────────────────────────────
    const oneInchOutput = parseFloat(oneInchQuote.amountOut)
    let bestVenue = '1inch'
    let priceDiff = 0

    if (uniV3Quote) {
      const uniV3Output = parseFloat(uniV3Quote.amountOut)
      const isBetter = oneInchOutput > uniV3Output
      priceDiff = Math.abs((oneInchOutput / uniV3Output - 1) * 100)

      console.log('🎯 Best Execution Venue:')
      if (isBetter) {
        console.log(`   ✅ 1inch is better by ${priceDiff.toFixed(2)}%`)
        console.log('   📍 1inch found better pricing through aggregation')
        bestVenue = '1inch'
      } else {
        console.log(`   ✅ Uniswap V3 is better by ${priceDiff.toFixed(2)}%`)
        console.log('   📍 Uniswap V3 has best direct pricing')
        bestVenue = 'uniswapV3'
      }
    } else {
      console.log('🎯 Execution Venue:')
      console.log('   ✅ Using 1inch (Uniswap V3 not available)')
    }

    console.log('\n')

    // ─────────────────────────────────────
    // 5️⃣ EXECUTE SWAP
    // ─────────────────────────────────────
    console.log('💱 Executing Swap...\n')
    console.log(`   Amount to swap: ${AMOUNT} ETH`)
    console.log(`   Expected output: ${bestVenue === '1inch' ? oneInchQuote.amountOut : uniV3Quote.amountOut} USDC`)
    console.log(`   Protocol: ${bestVenue === '1inch' ? '1inch Aggregator' : 'Uniswap V3'}`)
    console.log(`   Network: Base Mainnet\n`)

    // Execute the swap
    let result
    if (bestVenue === '1inch') {
      result = await dt.base.oneInch.swap({
        tokenIn: 'ETH',
        tokenOut: 'USDC',
        amountIn: AMOUNT,
        slippage: 1.0 // 1% slippage tolerance
      })
    } else {
      result = await dt.base.uniswapV3.swap({
        tokenIn: 'ETH',
        tokenOut: 'USDC',
        amountIn: AMOUNT,
        slippage: 1.0
      })
    }

    // ─────────────────────────────────────
    // 6️⃣ DISPLAY RESULTS
    // ─────────────────────────────────────
    console.log('✅ SWAP SUCCESSFUL!\n')
    console.log('─'.repeat(63))
    console.log(`   Protocol:   ${bestVenue === '1inch' ? '1inch Aggregator' : 'Uniswap V3'}`)
    console.log(`   Network:    Base Mainnet`)
    console.log(`   Amount In:  ${result.amountIn} ETH`)
    console.log(`   Amount Out: ${result.amountOut} USDC`)
    console.log(`   Gas Used:   ${result.gasUsed.toLocaleString()}`)
    console.log(`   Gas Cost:   $${result.gasCostUsd.toFixed(4)}`)
    console.log('─'.repeat(63))

    console.log(`\n🔗 View Transaction on BaseScan:`)
    console.log(result.explorerUrl)
    console.log()

  } catch (error) {
    console.error('❌ Error during swap:', error.message)
    if (error.response?.data) {
      console.error('   API Error Details:', error.response.data)
    }
    console.error('\n💡 Troubleshooting Tips:')
    console.error('   1. Ensure you have ETH balance on Base mainnet')
    console.error('   2. Check that 1inch API key is set in backend/.env')
    console.error('   3. Verify network connectivity')
    console.error('   4. Try increasing the swap amount if liquidity is low')
  }

  console.log('═══════════════════════════════════════════════════════════')
  console.log('✅ Demo Complete')
  console.log('═══════════════════════════════════════════════════════════\n')
})()
