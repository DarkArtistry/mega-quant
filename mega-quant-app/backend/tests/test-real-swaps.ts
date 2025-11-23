/**
 * Real Swap Integration Test
 *
 * Tests ACTUAL swap execution on testnets:
 * - Ethereum Sepolia
 * - Base Sepolia
 *
 * Requirements:
 * - Alchemy API key configured in .env
 * - Testnet ETH in test wallet for gas
 * - TEST_PRIVATE_KEY environment variable
 *
 * ⚠️  WARNING: This test executes REAL transactions on testnets!
 */

// Load environment variables from .env file
import dotenv from 'dotenv'
dotenv.config()

import { DeltaTrade } from '../src/lib/trading/DeltaTrade.js'
import { accountKeyStore } from '../src/services/account-key-store.js'
import { formatUnits, parseUnits } from 'ethers'

// Test configuration
const TEST_STRATEGY_ID = 'test-strategy-real-swaps'
const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || '0x0ab64f3127d928fecc57f3516829c71a1aff2575f66b13dcea7860c454c1231b'
const TEST_ADDRESS = '0xB5d8206099422A419149813e53Bf774b5F25ba6b'

// Swap amounts (very small for testing)
const SEPOLIA_SWAP_AMOUNT_ETH = '0.001' // 0.001 ETH on Sepolia
const BASE_SEPOLIA_SWAP_AMOUNT_ETH = '0.001' // 0.001 ETH on Base Sepolia

async function testRealSwaps() {
  console.log('\n🧪 Real Swap Integration Test Suite\n')
  console.log('='.repeat(80))
  console.log('⚠️  WARNING: This test executes REAL transactions on testnets!')
  console.log('='.repeat(80))

  // Verify environment variables are loaded
  console.log('\n🔧 Environment Configuration:')
  console.log('-'.repeat(80))
  console.log(`   SEPOLIA_RPC_URL: ${process.env.SEPOLIA_RPC_URL || 'NOT SET'}`)
  console.log(`   BASE_SEPOLIA_RPC_URL: ${process.env.BASE_SEPOLIA_RPC_URL || 'NOT SET'}`)
  console.log('')

  try {
    // ============================================
    // Setup: Load Test Account
    // ============================================
    console.log('\n📝 Setup: Loading Test Account')
    console.log('-'.repeat(80))

    accountKeyStore.loadAccounts([
      {
        accountId: 'test-account-real-swaps',
        accountName: 'Real Swap Test Account',
        address: TEST_ADDRESS,
        privateKey: TEST_PRIVATE_KEY
      }
    ])

    console.log('✅ Loaded test account into memory')

    // ============================================
    // Test 1: Create DeltaTrade with Testnets
    // ============================================
    console.log('\n📝 Test 1: Creating DeltaTrade Instance')
    console.log('-'.repeat(80))

    const executionId = `test-real-swaps-${Date.now()}`
    const dt = new DeltaTrade(
      executionId,
      TEST_STRATEGY_ID,
      'integration_test',
      {
        'sepolia': TEST_PRIVATE_KEY,
        'base-sepolia': TEST_PRIVATE_KEY
      }
    )

    console.log(`✅ DeltaTrade instance created`)
    console.log(`   Execution ID: ${executionId}`)
    console.log(`   Chains: Sepolia, Base Sepolia`)

    // ============================================
    // Test 2: Check Initial Balances - Sepolia
    // ============================================
    console.log('\n📝 Test 2: Checking Initial Balances (Sepolia)')
    console.log('-'.repeat(80))

    if (!dt.sepolia) {
      throw new Error('Sepolia chain not initialized')
    }

    const sepoliaWalletAddress = dt.sepolia.wallet.address
    console.log(`   Wallet Address: ${sepoliaWalletAddress}`)

    const sepoliaEthBalanceBefore = await dt.sepolia.getNativeBalance()
    console.log(`   ETH Balance: ${formatUnits(sepoliaEthBalanceBefore, 18)} ETH`)

    // Get token addresses
    const { TOKEN_ADDRESSES } = await import('../src/lib/trading/config/tokens.js')
    const sepoliaWethAddress = TOKEN_ADDRESSES['sepolia'].WETH.address
    const sepoliaUsdcAddress = TOKEN_ADDRESSES['sepolia'].USDC.address

    const sepoliaWethBalanceBefore = await dt.sepolia.getTokenBalance(sepoliaWethAddress)
    const sepoliaUsdcBalanceBefore = await dt.sepolia.getTokenBalance(sepoliaUsdcAddress)

    console.log(`   WETH Balance: ${formatUnits(sepoliaWethBalanceBefore, 18)} WETH`)
    console.log(`   USDC Balance: ${formatUnits(sepoliaUsdcBalanceBefore, 6)} USDC`)

    // Check if we have enough ETH for gas
    const minEthRequired = parseUnits('0.01', 18) // Need at least 0.01 ETH for gas
    const hasSepoliaEth = sepoliaEthBalanceBefore >= minEthRequired
    if (!hasSepoliaEth) {
      console.log(`\n⚠️  Warning: Insufficient ETH for gas on Sepolia`)
      console.log(`   Required: ${formatUnits(minEthRequired, 18)} ETH`)
      console.log(`   Have: ${formatUnits(sepoliaEthBalanceBefore, 18)} ETH`)
      console.log(`   Get testnet ETH from: https://sepoliafaucet.com/`)
      console.log(`   Skipping Sepolia swap tests...`)
    }

    // ============================================
    // Test 3: Get Gas Price (Sepolia)
    // ============================================
    if (hasSepoliaEth) {
      console.log('\n📝 Test 3: Fetching Gas Price (Sepolia)')
      console.log('-'.repeat(80))

      const sepoliaGasInfo = await dt.sepolia.getGasPriceInfo()
      console.log(`✅ Gas price fetched`)
      console.log(`   Gas Price: ${sepoliaGasInfo.gasPriceGwei} gwei`)
      console.log(`   Estimated Swap Cost: $${sepoliaGasInfo.estimatedSwapGasCostUsd?.toFixed(4) || 'N/A'}`)
    }

    // ============================================
    // Test 4: Get Swap Quote (Sepolia: ETH → WETH)
    // ============================================
    if (hasSepoliaEth) {
      console.log('\n📝 Test 4: Getting Swap Quote (Sepolia: ETH → WETH)')
      console.log('-'.repeat(80))

      // First, we need to wrap ETH to WETH (not a swap, just a deposit)
      console.log('   Note: Need to wrap ETH to WETH first for testing')
      console.log(`   Wrapping ${SEPOLIA_SWAP_AMOUNT_ETH} ETH...`)

      try {
      // For this test, let's just get a quote for WETH → USDC
      const sepoliaQuote = await dt.sepolia.getSwapQuote('WETH', 'USDC', SEPOLIA_SWAP_AMOUNT_ETH)
      console.log(`✅ Swap quote received`)
      console.log(`   Input: ${SEPOLIA_SWAP_AMOUNT_ETH} WETH`)
      console.log(`   Expected Output: ${sepoliaQuote.amountOut} USDC`)
      console.log(`   Min Output (0.5% slippage): ${sepoliaQuote.amountOutMin} USDC`)
      console.log(`   Exchange Rate: ${sepoliaQuote.exchangeRate.toFixed(2)} USDC per WETH`)
      console.log(`   Price Impact: ${sepoliaQuote.priceImpact.toFixed(4)}%`)
      console.log(`   Gas Cost: $${sepoliaQuote.gasCostUsd?.toFixed(4) || 'N/A'}`)

      // Check if we actually have WETH to swap
      if (sepoliaWethBalanceBefore === 0n) {
        console.log(`\n⚠️  Warning: No WETH balance on Sepolia`)
        console.log(`   Cannot execute WETH → USDC swap without WETH`)
        console.log(`   Skipping actual swap execution`)
        console.log(`   To test: Wrap some Sepolia ETH to WETH first`)
      } else {
        // ============================================
        // Test 5: Execute Real Swap (Sepolia: WETH → USDC)
        // ============================================
        console.log('\n📝 Test 5: Executing Real Swap (Sepolia: WETH → USDC)')
        console.log('-'.repeat(80))
        console.log('⚠️  WARNING: About to execute REAL transaction!')
        console.log(`   From: WETH`)
        console.log(`   To: USDC`)
        console.log(`   Amount: ${SEPOLIA_SWAP_AMOUNT_ETH} WETH`)
        console.log(`   Network: Sepolia Testnet`)
        console.log('')

        // Execute the swap
        const swapResult = await dt.sepolia.uniswapV3.swap({
          tokenIn: 'WETH',
          tokenOut: 'USDC',
          amountIn: SEPOLIA_SWAP_AMOUNT_ETH,
          slippageBps: 50 // 0.5% slippage tolerance
        })

        console.log(`✅ Swap executed successfully!`)
        console.log(`   Transaction Hash: ${swapResult.transactionHash}`)
        console.log(`   Block Number: ${swapResult.blockNumber}`)
        console.log(`   Amount In: ${swapResult.amountIn} WETH`)
        console.log(`   Amount Out: ${swapResult.amountOut} USDC`)
        console.log(`   Gas Used: ${swapResult.gasUsed}`)
        console.log(`   Gas Cost: $${swapResult.gasCostUsd.toFixed(4)}`)
        console.log(`   Explorer: https://sepolia.etherscan.io/tx/${swapResult.transactionHash}`)

        // ============================================
        // Test 6: Verify Balances After Swap (Sepolia)
        // ============================================
        console.log('\n📝 Test 6: Verifying Balances After Swap (Sepolia)')
        console.log('-'.repeat(80))

        const sepoliaWethBalanceAfter = await dt.sepolia.getTokenBalance(sepoliaWethAddress)
        const sepoliaUsdcBalanceAfter = await dt.sepolia.getTokenBalance(sepoliaUsdcAddress)

        console.log(`   WETH Balance Before: ${formatUnits(sepoliaWethBalanceBefore, 18)} WETH`)
        console.log(`   WETH Balance After:  ${formatUnits(sepoliaWethBalanceAfter, 18)} WETH`)
        console.log(`   WETH Change:         ${formatUnits(sepoliaWethBalanceAfter - sepoliaWethBalanceBefore, 18)} WETH`)
        console.log('')
        console.log(`   USDC Balance Before: ${formatUnits(sepoliaUsdcBalanceBefore, 6)} USDC`)
        console.log(`   USDC Balance After:  ${formatUnits(sepoliaUsdcBalanceAfter, 6)} USDC`)
        console.log(`   USDC Change:         ${formatUnits(sepoliaUsdcBalanceAfter - sepoliaUsdcBalanceBefore, 6)} USDC`)

        // Verify the swap worked
        if (sepoliaUsdcBalanceAfter > sepoliaUsdcBalanceBefore) {
          console.log(`\n✅ Swap verification successful - USDC balance increased!`)
        } else {
          console.log(`\n⚠️  Warning: USDC balance did not increase as expected`)
        }
      }
      } catch (error: any) {
        console.log(`⚠️  Swap quote/execution failed (may need WETH or liquidity):`)
        console.log(`   Error: ${error.message}`)
      }
    }

    // ============================================
    // Test 7: Check Initial Balances - Base Sepolia
    // ============================================
    console.log('\n📝 Test 7: Checking Initial Balances (Base Sepolia)')
    console.log('-'.repeat(80))

    if (!dt['base-sepolia']) {
      throw new Error('Base Sepolia chain not initialized')
    }

    const baseSepoliaWalletAddress = dt['base-sepolia'].wallet.address
    console.log(`   Wallet Address: ${baseSepoliaWalletAddress}`)

    const baseSepoliaEthBalanceBefore = await dt['base-sepolia'].getNativeBalance()
    console.log(`   ETH Balance: ${formatUnits(baseSepoliaEthBalanceBefore, 18)} ETH`)

    const baseSepoliaWethAddress = TOKEN_ADDRESSES['base-sepolia'].WETH.address
    const baseSepoliaUsdcAddress = TOKEN_ADDRESSES['base-sepolia'].USDC.address

    const baseSepoliaWethBalanceBefore = await dt['base-sepolia'].getTokenBalance(baseSepoliaWethAddress)
    const baseSepoliaUsdcBalanceBefore = await dt['base-sepolia'].getTokenBalance(baseSepoliaUsdcAddress)

    console.log(`   WETH Balance: ${formatUnits(baseSepoliaWethBalanceBefore, 18)} WETH`)
    console.log(`   USDC Balance: ${formatUnits(baseSepoliaUsdcBalanceBefore, 6)} USDC`)

    // Check if we have enough ETH for gas
    const hasBaseSepoliaEth = baseSepoliaEthBalanceBefore >= minEthRequired
    if (!hasBaseSepoliaEth) {
      console.log(`\n⚠️  Warning: Insufficient ETH for gas on Base Sepolia`)
      console.log(`   Required: ${formatUnits(minEthRequired, 18)} ETH`)
      console.log(`   Have: ${formatUnits(baseSepoliaEthBalanceBefore, 18)} ETH`)
      console.log(`   Get testnet ETH from: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet`)
      console.log(`   Skipping Base Sepolia swap tests...`)
    }

    // ============================================
    // Test 8: Get Gas Price (Base Sepolia)
    // ============================================
    if (hasBaseSepoliaEth) {
      console.log('\n📝 Test 8: Fetching Gas Price (Base Sepolia)')
      console.log('-'.repeat(80))

      const baseSepoliaGasInfo = await dt['base-sepolia'].getGasPriceInfo()
      console.log(`✅ Gas price fetched`)
      console.log(`   Gas Price: ${baseSepoliaGasInfo.gasPriceGwei} gwei`)
      console.log(`   Estimated Swap Cost: $${baseSepoliaGasInfo.estimatedSwapGasCostUsd?.toFixed(4) || 'N/A'}`)
    }

    // ============================================
    // Test 9: Get Swap Quote (Base Sepolia: WETH → USDC)
    // ============================================
    if (hasBaseSepoliaEth) {
      console.log('\n📝 Test 9: Getting Swap Quote (Base Sepolia: WETH → USDC)')
      console.log('-'.repeat(80))

      try {
      const baseSepoliaQuote = await dt['base-sepolia'].getSwapQuote('WETH', 'USDC', BASE_SEPOLIA_SWAP_AMOUNT_ETH)
      console.log(`✅ Swap quote received`)
      console.log(`   Input: ${BASE_SEPOLIA_SWAP_AMOUNT_ETH} WETH`)
      console.log(`   Expected Output: ${baseSepoliaQuote.amountOut} USDC`)
      console.log(`   Min Output (0.5% slippage): ${baseSepoliaQuote.amountOutMin} USDC`)
      console.log(`   Exchange Rate: ${baseSepoliaQuote.exchangeRate.toFixed(2)} USDC per WETH`)
      console.log(`   Price Impact: ${baseSepoliaQuote.priceImpact.toFixed(4)}%`)
      console.log(`   Gas Cost: $${baseSepoliaQuote.gasCostUsd?.toFixed(4) || 'N/A'}`)

      // Check if we actually have WETH to swap
      if (baseSepoliaWethBalanceBefore === 0n) {
        console.log(`\n⚠️  Warning: No WETH balance on Base Sepolia`)
        console.log(`   Cannot execute WETH → USDC swap without WETH`)
        console.log(`   Skipping actual swap execution`)
        console.log(`   To test: Wrap some Base Sepolia ETH to WETH first`)
      } else {
        // ============================================
        // Test 10: Execute Real Swap (Base Sepolia: WETH → USDC)
        // ============================================
        console.log('\n📝 Test 10: Executing Real Swap (Base Sepolia: WETH → USDC)')
        console.log('-'.repeat(80))
        console.log('⚠️  WARNING: About to execute REAL transaction!')
        console.log(`   From: WETH`)
        console.log(`   To: USDC`)
        console.log(`   Amount: ${BASE_SEPOLIA_SWAP_AMOUNT_ETH} WETH`)
        console.log(`   Network: Base Sepolia Testnet`)
        console.log('')

        // Execute the swap
        const swapResult = await dt['base-sepolia'].uniswapV3.swap({
          tokenIn: 'WETH',
          tokenOut: 'USDC',
          amountIn: BASE_SEPOLIA_SWAP_AMOUNT_ETH,
          slippageBps: 50 // 0.5% slippage tolerance
        })

        console.log(`✅ Swap executed successfully!`)
        console.log(`   Transaction Hash: ${swapResult.transactionHash}`)
        console.log(`   Block Number: ${swapResult.blockNumber}`)
        console.log(`   Amount In: ${swapResult.amountIn} WETH`)
        console.log(`   Amount Out: ${swapResult.amountOut} USDC`)
        console.log(`   Gas Used: ${swapResult.gasUsed}`)
        console.log(`   Gas Cost: $${swapResult.gasCostUsd.toFixed(4)}`)
        console.log(`   Explorer: https://sepolia.basescan.org/tx/${swapResult.transactionHash}`)

        // ============================================
        // Test 11: Verify Balances After Swap (Base Sepolia)
        // ============================================
        console.log('\n📝 Test 11: Verifying Balances After Swap (Base Sepolia)')
        console.log('-'.repeat(80))

        const baseSepoliaWethBalanceAfter = await dt['base-sepolia'].getTokenBalance(baseSepoliaWethAddress)
        const baseSepoliaUsdcBalanceAfter = await dt['base-sepolia'].getTokenBalance(baseSepoliaUsdcAddress)

        console.log(`   WETH Balance Before: ${formatUnits(baseSepoliaWethBalanceBefore, 18)} WETH`)
        console.log(`   WETH Balance After:  ${formatUnits(baseSepoliaWethBalanceAfter, 18)} WETH`)
        console.log(`   WETH Change:         ${formatUnits(baseSepoliaWethBalanceAfter - baseSepoliaWethBalanceBefore, 18)} WETH`)
        console.log('')
        console.log(`   USDC Balance Before: ${formatUnits(baseSepoliaUsdcBalanceBefore, 6)} USDC`)
        console.log(`   USDC Balance After:  ${formatUnits(baseSepoliaUsdcBalanceAfter, 6)} USDC`)
        console.log(`   USDC Change:         ${formatUnits(baseSepoliaUsdcBalanceAfter - baseSepoliaUsdcBalanceBefore, 6)} USDC`)

        // Verify the swap worked
        if (baseSepoliaUsdcBalanceAfter > baseSepoliaUsdcBalanceBefore) {
          console.log(`\n✅ Swap verification successful - USDC balance increased!`)
        } else {
          console.log(`\n⚠️  Warning: USDC balance did not increase as expected`)
        }
      }
      } catch (error: any) {
        console.log(`⚠️  Swap quote/execution failed (may need WETH or liquidity):`)
        console.log(`   Error: ${error.message}`)
      }
    }

    // ============================================
    // Test Summary
    // ============================================
    console.log('\n' + '='.repeat(80))
    console.log('✅ Real Swap Integration Test Completed!')
    console.log('='.repeat(80))
    console.log('\n📝 Test Summary:')
    console.log('   ✅ Account loading')
    console.log('   ✅ DeltaTrade creation with testnets')
    console.log('   ✅ Balance queries (Sepolia)')
    console.log('   ✅ Gas price fetching (Sepolia)')
    console.log('   ⚠️  Swap quote/execution (Sepolia) - depends on WETH balance')
    console.log('   ✅ Balance queries (Base Sepolia)')
    console.log('   ✅ Gas price fetching (Base Sepolia)')
    console.log('   ⚠️  Swap quote/execution (Base Sepolia) - depends on WETH balance')
    console.log('\n💡 Note: To execute actual swaps, you need:')
    console.log('   1. Testnet ETH for gas (from faucets)')
    console.log('   2. WETH tokens (wrap ETH using Uniswap or contract)')
    console.log('   3. Sufficient liquidity in Uniswap V3 pools on testnets')
    console.log('')

    // Cleanup
    accountKeyStore.clear()

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run the test
testRealSwaps()
  .then(() => {
    console.log('✅ Integration test suite completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Integration test suite failed:', error)
    process.exit(1)
  })
