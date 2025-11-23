// ========================================
// UNISWAP V4 - QUOTE & TRADE
// BASE + ETHEREUM MAINNET
// REAL MONEY - SMALL AMOUNTS
// ========================================

(async () => {
  const WETH = 'WETH'
  const USDC = 'USDC'
  const SWAP_AMOUNT = '0.0001' // 0.0001 WETH (~$0.27)

  console.log('═══════════════════════════════════════════════════════════')
  console.log('🦄 Uniswap V4 - Quote & Trade Test')
  console.log('⚠️  WARNING: USING REAL MONEY ON MAINNET')
  console.log('═══════════════════════════════════════════════════════════')
  console.log()

  // ===========================================
  // STEP 0: Show Token Addresses and Fee Tiers
  // ===========================================
  console.log('📝 STEP 0: Available Tokens & Fee Tiers (from dt instance)')
  console.log('═══════════════════════════════════════════════════════════')

  console.log('\n🔵 BASE Tokens:')
  console.log(`   WETH: ${dt.base.tokens.WETH.address}`)
  console.log(`   USDC: ${dt.base.tokens.USDC.address}`)

  console.log('\n⚫ ETHEREUM Tokens:')
  console.log(`   WETH: ${dt.ethereum.tokens.WETH.address}`)
  console.log(`   USDC: ${dt.ethereum.tokens.USDC.address}`)

  console.log('\n⚙️  V4 Fee Tiers:')
  dt.base.uniswapV4.FEE_TIERS.forEach(tier => {
    console.log(`   ${tier.name}: fee=${tier.fee}, tickSpacing=${tier.tickSpacing}`)
  })

  // ===========================================
  // STEP 1: Test Quotes on Both Chains
  // ===========================================
  console.log('\n\n📊 STEP 1: Getting Quotes')
  console.log('═══════════════════════════════════════════════════════════')

  const results = {
    base: null,
    ethereum: null
  }

  // Test Base
  console.log('\n🔵 BASE MAINNET')
  console.log('──────────────────────────────────────────────────────────')
  for (const tier of dt.base.uniswapV4.FEE_TIERS) {
    try {
      console.log(`   Trying ${tier.name} fee tier...`)

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

      results.base = { ...tier, quote }
      break

    } catch (error) {
      console.log(`   ❌ ${tier.name} failed: ${error.message}`)
    }
  }

  if (!results.base) {
    console.log('   ⚠️  No V4 pools found on Base')
  }

  // Test Ethereum
  console.log('\n⚫ ETHEREUM MAINNET')
  console.log('──────────────────────────────────────────────────────────')
  for (const tier of dt.ethereum.uniswapV4.FEE_TIERS) {
    try {
      console.log(`   Trying ${tier.name} fee tier...`)

      const quote = await dt.ethereum.uniswapV4.getQuote({
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

      results.ethereum = { ...tier, quote }
      break

    } catch (error) {
      console.log(`   ❌ ${tier.name} failed: ${error.message}`)
    }
  }

  if (!results.ethereum) {
    console.log('   ⚠️  No V4 pools found on Ethereum')
  }

  // ===========================================
  // STEP 2: Execute Trades
  // ===========================================
  console.log('\n\n💱 STEP 2: Executing Trades')
  console.log('═══════════════════════════════════════════════════════════')

  const tradeResults = []

  // Trade on Base (if pool found)
  if (results.base) {
    console.log('\n🔵 BASE MAINNET TRADE')
    console.log('──────────────────────────────────────────────────────────')

    try {
      console.log(`Trading ${SWAP_AMOUNT} WETH → USDC...`)

      const result = await dt.base.uniswapV4.swap({
        tokenIn: WETH,
        tokenOut: USDC,
        amountIn: SWAP_AMOUNT,
        slippage: 1.0,
        poolKey: dt.base.uniswapV4.createCustomPoolKey(
          dt.base.tokens.WETH.address,
          dt.base.tokens.USDC.address,
          results.base.fee,
          results.base.tickSpacing
        )
      })

      console.log('✅ Trade successful!')
      console.log(`   TX: ${result.transactionHash}`)
      console.log(`   Amount In: ${result.amountIn} WETH`)
      console.log(`   Amount Out: ${result.amountOut} USDC`)
      console.log(`   Gas Used: ${result.gasUsed.toLocaleString()}`)
      console.log(`   Gas Cost: $${result.gasCostUsd.toFixed(4)}`)

      tradeResults.push({
        chain: 'base',
        success: true,
        tx: result.transactionHash,
        amountOut: result.amountOut,
        gasCost: result.gasCostUsd
      })

    } catch (error) {
      console.error('❌ Trade failed:', error.message)
      tradeResults.push({
        chain: 'base',
        success: false,
        error: error.message
      })
    }
  }

  // Trade on Ethereum (if pool found)
  if (results.ethereum) {
    console.log('\n⚫ ETHEREUM MAINNET TRADE')
    console.log('──────────────────────────────────────────────────────────')

    try {
      console.log(`Trading ${SWAP_AMOUNT} WETH → USDC...`)
      console.log('⚠️  Higher gas costs expected on Ethereum!')

      const result = await dt.ethereum.uniswapV4.swap({
        tokenIn: WETH,
        tokenOut: USDC,
        amountIn: SWAP_AMOUNT,
        slippage: 1.0,
        poolKey: dt.ethereum.uniswapV4.createCustomPoolKey(
          dt.ethereum.tokens.WETH.address,
          dt.ethereum.tokens.USDC.address,
          results.ethereum.fee,
          results.ethereum.tickSpacing
        )
      })

      console.log('✅ Trade successful!')
      console.log(`   TX: ${result.transactionHash}`)
      console.log(`   Amount In: ${result.amountIn} WETH`)
      console.log(`   Amount Out: ${result.amountOut} USDC`)
      console.log(`   Gas Used: ${result.gasUsed.toLocaleString()}`)
      console.log(`   Gas Cost: $${result.gasCostUsd.toFixed(4)}`)

      tradeResults.push({
        chain: 'ethereum',
        success: true,
        tx: result.transactionHash,
        amountOut: result.amountOut,
        gasCost: result.gasCostUsd
      })

    } catch (error) {
      console.error('❌ Trade failed:', error.message)
      tradeResults.push({
        chain: 'ethereum',
        success: false,
        error: error.message
      })
    }
  }

  // ===========================================
  // STEP 3: Summary
  // ===========================================
  console.log('\n\n📈 SUMMARY')
  console.log('═══════════════════════════════════════════════════════════')

  console.log('\nQuotes Found:')
  console.log(`   Base: ${results.base ? '✅ ' + results.base.name + ' fee tier' : '❌ No pool'}`)
  console.log(`   Ethereum: ${results.ethereum ? '✅ ' + results.ethereum.name + ' fee tier' : '❌ No pool'}`)

  console.log('\nTrades Executed:')
  for (const trade of tradeResults) {
    if (trade.success) {
      console.log(`   ✅ ${trade.chain}: ${trade.amountOut} USDC (gas: $${trade.gasCost.toFixed(4)})`)
      console.log(`      TX: ${trade.tx}`)
    } else {
      console.log(`   ❌ ${trade.chain}: ${trade.error}`)
    }
  }

  const totalGas = tradeResults
    .filter(t => t.success)
    .reduce((sum, t) => sum + t.gasCost, 0)

  if (tradeResults.some(t => t.success)) {
    console.log(`\nTotal Gas Spent: $${totalGas.toFixed(4)}`)
  }

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('✅ Test completed!')
  console.log('═══════════════════════════════════════════════════════════')
})()
