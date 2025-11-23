// Test Strategy: Compare Uniswap V4 vs 1inch and execute on best venue
// This demonstrates smart DEX aggregation across multiple protocols

(async () => {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('💱 MEGA QUANT - Smart DEX Aggregation')
  console.log('    Uniswap V4 vs 1inch (300+ DEXs)')
  console.log('═══════════════════════════════════════════════════════════\n')

  const AMOUNT = '0.001' // 0.001 ETH to swap

  // ─────────────────────────────────────
  // 1️⃣ GET QUOTES FROM BOTH SOURCES
  // ─────────────────────────────────────
  console.log('📊 Fetching Quotes from Multiple Sources...\n')
  console.log('   → Querying Uniswap V4 directly...')
  console.log('   → Querying 1inch aggregator (searches 300+ DEXs)...\n')

  try {
    // Get Uniswap V4 quote
    const uniV4Quote = await dt.ethereum.uniswapV4.getQuote({
      tokenIn: 'ETH',
      tokenOut: 'USDC',
      amountIn: AMOUNT,
      fee: 3000,
      tickSpacing: 60
    })

    console.log('✅ Uniswap V4 quote received')

    // Get 1inch aggregated quote
    const oneInchQuote = await dt.ethereum.oneInch.getQuote({
      tokenIn: 'ETH',
      tokenOut: 'USDC',
      amountIn: AMOUNT
    })

    console.log('✅ 1inch quote received\n')

    // ─────────────────────────────────────
    // 2️⃣ COMPARE PRICES
    // ─────────────────────────────────────
    console.log('💰 Price Comparison:\n')
    console.log('┌─────────────────────────────────────────────────┐')
    console.log('│ Uniswap V4 (Direct)                             │')
    console.log(`│   Output: ${uniV4Quote.amountOut} USDC`.padEnd(51) + '│')
    console.log(`│   Rate:   ${uniV4Quote.exchangeRate.toFixed(2)} USDC/ETH`.padEnd(51) + '│')
    console.log(`│   Gas:    $${(uniV4Quote.gasCostUsd || 0).toFixed(4)}`.padEnd(51) + '│')
    console.log('├─────────────────────────────────────────────────┤')
    console.log('│ 1inch (Aggregated across 300+ DEXs)            │')
    console.log(`│   Output: ${oneInchQuote.amountOut} USDC`.padEnd(51) + '│')
    console.log(`│   Rate:   ${oneInchQuote.exchangeRate.toFixed(2)} USDC/ETH`.padEnd(51) + '│')
    console.log(`│   Gas:    $${(oneInchQuote.gasCostUsd || 0).toFixed(4)}`.padEnd(51) + '│')
    console.log('└─────────────────────────────────────────────────┘\n')

    // ─────────────────────────────────────
    // 3️⃣ CALCULATE PRICE DIFFERENCE
    // ─────────────────────────────────────
    const uniV4Output = parseFloat(uniV4Quote.amountOut)
    const oneInchOutput = parseFloat(oneInchQuote.amountOut)
    const isBetter = oneInchOutput > uniV4Output
    const priceDiff = Math.abs((oneInchOutput / uniV4Output - 1) * 100).toFixed(2)

    console.log('🎯 Best Execution Venue:')
    if (isBetter) {
      console.log(`   ✅ 1inch is better by ${priceDiff}%`)
      console.log('   📍 1inch found better pricing through aggregation')
      console.log('   💡 Routing through 1inch for optimal execution\n')
    } else {
      console.log(`   ✅ Uniswap V4 is better by ${priceDiff}%`)
      console.log('   📍 Uniswap V4 has best direct pricing')
      console.log('   💡 Routing directly through Uniswap V4\n')
    }

    // ─────────────────────────────────────
    // 4️⃣ DECISION LOGIC
    // ─────────────────────────────────────
    console.log('🤖 Smart Execution Decision:\n')
    console.log(`   Amount to swap: ${AMOUNT} ETH`)
    console.log(`   Expected output: ${isBetter ? oneInchQuote.amountOut : uniV4Quote.amountOut} USDC`)
    console.log(`   Protocol: ${isBetter ? '1inch Aggregator' : 'Uniswap V4'}`)
    console.log(`   Price improvement: ${priceDiff}%\n`)

    // ─────────────────────────────────────
    // 5️⃣ EXECUTE SWAP (Commented out for testing quotes only)
    // ─────────────────────────────────────
    console.log('💱 Ready to Execute...\n')
    console.log('   ⚠️  To execute the swap, uncomment the code below:\n')
    console.log('   const result = isBetter')
    console.log('     ? await dt.ethereum.oneInch.swap({')
    console.log('         tokenIn: "ETH",')
    console.log('         tokenOut: "USDC",')
    console.log(`         amountIn: "${AMOUNT}",`)
    console.log('         slippage: 1.0')
    console.log('       })')
    console.log('     : await dt.ethereum.uniswapV4.swap({')
    console.log('         tokenIn: "ETH",')
    console.log('         tokenOut: "USDC",')
    console.log(`         amountIn: "${AMOUNT}",`)
    console.log('         slippage: 1.0,')
    console.log('         fee: 3000,')
    console.log('         tickSpacing: 60')
    console.log('       })\n')

    /*
    // UNCOMMENT TO EXECUTE REAL SWAP:
    const result = isBetter
      ? await dt.ethereum.oneInch.swap({
          tokenIn: 'ETH',
          tokenOut: 'USDC',
          amountIn: AMOUNT,
          slippage: 1.0
        })
      : await dt.ethereum.uniswapV4.swap({
          tokenIn: 'ETH',
          tokenOut: 'USDC',
          amountIn: AMOUNT,
          slippage: 1.0,
          fee: 3000,
          tickSpacing: 60
        })

    console.log('✅ SWAP SUCCESSFUL!\n')
    console.log('─'.repeat(63))
    console.log(`   Protocol:   ${isBetter ? '1inch' : 'Uniswap V4'}`)
    console.log(`   Amount In:  ${result.amountIn} ETH`)
    console.log(`   Amount Out: ${result.amountOut} USDC`)
    console.log(`   Gas Used:   ${result.gasUsed.toLocaleString()}`)
    console.log(`   Gas Cost:   $${result.gasCostUsd.toFixed(4)}`)
    console.log('─'.repeat(63))

    console.log(`\n🔗 View Transaction on Block Explorer:`)
    console.log(result.explorerUrl)
    console.log()
    */

  } catch (error) {
    console.error('❌ Error during price comparison:', error.message)
    if (error.response?.data) {
      console.error('   API Error Details:', error.response.data)
    }
  }

  console.log('═══════════════════════════════════════════════════════════')
  console.log('✅ Price Comparison Complete')
  console.log('═══════════════════════════════════════════════════════════\n')
})()
