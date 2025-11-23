// ========================================
// UNISWAP V4 - BASE MAINNET
// REAL MONEY - SMALL AMOUNTS
// ========================================

const WETH = 'WETH'
const USDC = 'USDC'
const SWAP_AMOUNT = '0.0001' // 0.0001 WETH (~$0.27)

// Fee tiers to try (in order of preference)
const FEE_TIERS = [
  { fee: 500, tickSpacing: 10, name: '0.05%' },
  { fee: 3000, tickSpacing: 60, name: '0.3%' },
  { fee: 10000, tickSpacing: 200, name: '1%' }
]

console.log('═══════════════════════════════════════════════════════════')
console.log('🦄 Uniswap V4 Trading - BASE MAINNET')
console.log('⚠️  WARNING: USING REAL MONEY')
console.log('═══════════════════════════════════════════════════════════')
console.log('\n⚙️  Configuration:')
console.log(`   Pair: ${WETH}/${USDC}`)
console.log(`   Swap Amount: ${SWAP_AMOUNT} WETH`)
console.log(`   Max Iterations: 20`)
console.log(`   Delay: 30 seconds\n`)

// Step 1: Find working pool
console.log('🔍 Finding V4 pool with liquidity...')

let workingFee = null
let workingTickSpacing = null

for (const tier of FEE_TIERS) {
  try {
    console.log(`   Trying ${tier.name} fee tier...`)

    const testQuote = await dt.base.uniswapV4.getQuote({
      tokenIn: WETH,
      tokenOut: USDC,
      amountIn: SWAP_AMOUNT,
      fee: tier.fee,
      tickSpacing: tier.tickSpacing
    })

    workingFee = tier.fee
    workingTickSpacing = tier.tickSpacing

    console.log(`   ✅ Found working pool! Fee: ${tier.name}`)
    console.log(`   Quote: ${testQuote.amountOut} ${USDC}`)
    console.log()
    break

  } catch (error) {
    console.log(`   ❌ ${tier.name} pool not available`)
  }
}

if (!workingFee) {
  console.error('\n❌ No V4 pools found with liquidity on Base')
  console.error('Try Ethereum mainnet instead')
  throw new Error('No V4 pools available')
}

// Step 2: Trading loop
console.log('🚀 Starting trading loop...')
console.log('──────────────────────────────────────────────────────────')

let iteration = 0
const MAX_ITERATIONS = 20

while (iteration < MAX_ITERATIONS) {
  iteration++

  console.log(`\n[Iteration ${iteration}/${MAX_ITERATIONS}]`)

  try {
    // Get quote
    const quote = await dt.base.uniswapV4.getQuote({
      tokenIn: WETH,
      tokenOut: USDC,
      amountIn: SWAP_AMOUNT,
      fee: workingFee,
      tickSpacing: workingTickSpacing
    })

    console.log(`📊 Quote: ${SWAP_AMOUNT} ${WETH} → ${quote.amountOut} ${USDC}`)
    console.log(`   Rate: ${quote.exchangeRate.toFixed(2)} ${USDC} per ${WETH}`)
    console.log(`   Price Impact: ${quote.priceImpact.toFixed(4)}%`)
    console.log(`   Est. Gas: $${(quote.gasCostUsd || 0).toFixed(4)}`)

    // Execute swap
    console.log(`\n💱 Executing swap...`)

    const result = await dt.base.uniswapV4.swap({
      tokenIn: WETH,
      tokenOut: USDC,
      amountIn: SWAP_AMOUNT,
      slippage: 1.0, // 1% slippage for safety
      poolKey: dt.base.uniswapV4.createCustomPoolKey(
        dt.base.tokens.WETH.address,
        dt.base.tokens.USDC.address,
        workingFee,
        workingTickSpacing
      )
    })

    console.log(`✅ Swap successful!`)
    console.log(`   TX: ${result.transactionHash}`)
    console.log(`   Amount Out: ${result.amountOut} ${USDC}`)
    console.log(`   Gas Used: ${result.gasUsed.toLocaleString()}`)
    console.log(`   Gas Cost: $${result.gasCostUsd.toFixed(4)}`)

    // Reverse swap (USDC back to WETH)
    console.log(`\n🔄 Reverse swap: ${USDC} → ${WETH}`)

    const reverseQuote = await dt.base.uniswapV4.getQuote({
      tokenIn: USDC,
      tokenOut: WETH,
      amountIn: result.amountOut,
      fee: workingFee,
      tickSpacing: workingTickSpacing
    })

    console.log(`📊 Quote: ${result.amountOut} ${USDC} → ${reverseQuote.amountOut} ${WETH}`)

    const reverseResult = await dt.base.uniswapV4.swap({
      tokenIn: USDC,
      tokenOut: WETH,
      amountIn: result.amountOut,
      slippage: 1.0,
      poolKey: dt.base.uniswapV4.createCustomPoolKey(
        dt.base.tokens.WETH.address,
        dt.base.tokens.USDC.address,
        workingFee,
        workingTickSpacing
      )
    })

    console.log(`✅ Reverse swap successful!`)
    console.log(`   TX: ${reverseResult.transactionHash}`)
    console.log(`   Amount Out: ${reverseResult.amountOut} ${WETH}`)
    console.log(`   Gas Cost: $${reverseResult.gasCostUsd.toFixed(4)}`)

    // Calculate net P&L
    const startAmount = parseFloat(SWAP_AMOUNT)
    const endAmount = parseFloat(reverseResult.amountOut)
    const tokenPnL = endAmount - startAmount
    const totalGasCost = result.gasCostUsd + reverseResult.gasCostUsd

    console.log(`\n📈 Round ${iteration} Summary:`)
    console.log(`   Started: ${startAmount} ${WETH}`)
    console.log(`   Ended: ${endAmount} ${WETH}`)
    console.log(`   Token P&L: ${tokenPnL >= 0 ? '+' : ''}${tokenPnL.toFixed(6)} ${WETH}`)
    console.log(`   Total Gas: $${totalGasCost.toFixed(4)}`)

  } catch (error) {
    console.error(`\n❌ Error in iteration ${iteration}:`, error.message)
  }

  // Wait before next iteration
  if (iteration < MAX_ITERATIONS) {
    console.log(`\n⏸️  Waiting 30 seconds...`)
    await new Promise(resolve => setTimeout(resolve, 30000))
  }
}

console.log('\n═══════════════════════════════════════════════════════════')
console.log('✅ Trading loop completed!')
console.log('═══════════════════════════════════════════════════════════')
