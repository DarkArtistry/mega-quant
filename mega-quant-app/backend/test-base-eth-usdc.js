// ========================================
// BASE MAINNET: ETH → USDC V4 Swap
// Simple showcase: Quote → Fees → Swap
// ========================================

(async () => {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('🦄 Uniswap V4 - ETH/USDC on Base Mainnet')
  console.log('═══════════════════════════════════════════════════════════\n')

  const AMOUNT = '0.0001' // 0.0001 ETH

  // ─────────────────────────────────────
  // 1️⃣ GET QUOTE
  // ─────────────────────────────────────
  console.log('📊 Getting Quote...\n')

  const quote = await dt.base.uniswapV4.getQuote({
    tokenIn: 'ETH',
    tokenOut: 'USDC',
    amountIn: AMOUNT,
    fee: 3000,        // 0.3% fee tier
    tickSpacing: 60
  })

  console.log(`   ${AMOUNT} ETH → ${quote.amountOut} USDC`)
  console.log(`   Rate: ${quote.exchangeRate.toFixed(2)} USDC per ETH`)
  console.log(`   Est. Gas: $${(quote.gasCostUsd || 0).toFixed(4)}\n`)

  // ─────────────────────────────────────
  // 2️⃣ NETWORK FEES
  // ─────────────────────────────────────
  console.log('💰 Network Fees...\n')

  const gasPrice = await dt.base.getGasPrice()
  const gasPriceGwei = Number(gasPrice) / 1e9

  console.log(`   Gas Price: ${gasPriceGwei.toFixed(2)} gwei`)
  console.log(`   Est. Swap Cost: ~$${((150000 * Number(gasPrice) / 1e18) * 3000).toFixed(4)}\n`)

  // ─────────────────────────────────────
  // 3️⃣ EXECUTE SWAP
  // ─────────────────────────────────────
  console.log('💱 Executing Swap...\n')

  const result = await dt.base.uniswapV4.swap({
    tokenIn: 'ETH',
    tokenOut: 'USDC',
    amountIn: AMOUNT,
    slippage: 1.0,
    fee: 3000,
    tickSpacing: 60
  })

  // ─────────────────────────────────────
  // ✅ SUCCESS
  // ─────────────────────────────────────
  console.log('✅ SWAP SUCCESSFUL!\n')
  console.log('─'.repeat(63))
  console.log(`   Amount In:  ${result.amountIn} ETH`)
  console.log(`   Amount Out: ${result.amountOut} USDC`)
  console.log(`   Gas Used:   ${result.gasUsed.toLocaleString()}`)
  console.log(`   Gas Cost:   $${result.gasCostUsd.toFixed(4)}`)
  console.log('─'.repeat(63))

  // Block explorer link
  const explorerUrl = dt.base.getExplorerUrl(result.transactionHash)
  console.log(`\n🔗 View on BaseScan:\n   ${explorerUrl}\n`)

  console.log('═══════════════════════════════════════════════════════════')
})()
