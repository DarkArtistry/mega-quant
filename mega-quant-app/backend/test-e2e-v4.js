/**
 * End-to-End Test for V4 Quote with QuoterRevert fix
 */

import fetch from 'node-fetch'

const BASE_URL = 'http://localhost:3001'
const PASSWORD = 'Test123!' // Replace with your actual password if different

async function testE2E() {
  console.log('🧪 End-to-End V4 Quote Test')
  console.log('═══════════════════════════════════════')
  console.log()

  try {
    // Step 1: Unlock the app
    console.log('Step 1: Unlocking app...')
    const unlockRes = await fetch(`${BASE_URL}/api/security/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: PASSWORD })
    })

    if (!unlockRes.ok) {
      const error = await unlockRes.json()
      throw new Error(`Unlock failed: ${JSON.stringify(error)}`)
    }

    const unlockData = await unlockRes.json()
    console.log('✅ App unlocked')
    console.log()

    // Step 2: Get strategies
    console.log('Step 2: Fetching strategies...')
    const strategiesRes = await fetch(`${BASE_URL}/api/strategies`)
    const strategies = await strategiesRes.json()

    if (!strategies || strategies.length === 0) {
      throw new Error('No strategies found. Please create a strategy with ethereum and base chains first.')
    }

    const strategy = strategies[0]
    console.log(`✅ Using strategy: ${strategy.id} (${strategy.name})`)
    console.log()

    // Step 3: Initialize DeltaTrade
    console.log('Step 3: Initializing DeltaTrade...')
    const initRes = await fetch(`${BASE_URL}/api/trading/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        strategyId: strategy.id,
        chains: ['base'] // Just test Base
      })
    })

    const initData = await initRes.json()
    const executionId = initData.executionId
    console.log(`✅ DeltaTrade initialized: ${executionId}`)
    console.log()

    // Step 4: Test V4 Quote with different fee tiers
    console.log('Step 4: Testing V4 Quotes on Base mainnet...')
    console.log('──────────────────────────────────────────')

    const feeTiers = [
      { fee: 500, tickSpacing: 10, name: '0.05%' },
      { fee: 3000, tickSpacing: 60, name: '0.3%' },
      { fee: 10000, tickSpacing: 200, name: '1%' }
    ]

    let foundWorkingPool = false

    for (const tier of feeTiers) {
      console.log(`\nTrying ${tier.name} fee tier (${tier.fee})...`)

      try {
        const quoteRes = await fetch(`${BASE_URL}/api/trading/${executionId}/quote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chain: 'base',
            protocol: 'uniswapV4',
            tokenIn: 'WETH',
            tokenOut: 'USDC',
            amountIn: '0.0001',
            fee: tier.fee,
            tickSpacing: tier.tickSpacing
          })
        })

        if (!quoteRes.ok) {
          const error = await quoteRes.json()
          console.log(`   ❌ Failed: ${error.error || 'Unknown error'}`)
          continue
        }

        const quoteData = await quoteRes.json()
        console.log(`   ✅ SUCCESS!`)
        console.log(`   Amount Out: ${quoteData.amountOut} USDC`)
        console.log(`   Rate: ${quoteData.exchangeRate.toFixed(2)} USDC per WETH`)
        console.log(`   Price Impact: ${quoteData.priceImpact.toFixed(4)}%`)
        console.log(`   Gas Cost: $${(quoteData.gasCostUsd || 0).toFixed(4)}`)

        foundWorkingPool = true
        break

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`)
      }
    }

    // Step 5: Clean up
    console.log('\n\nStep 5: Closing execution...')
    await fetch(`${BASE_URL}/api/trading/${executionId}/close`, {
      method: 'POST'
    })
    console.log('✅ Execution closed')

    // Final result
    console.log('\n═══════════════════════════════════════')
    if (foundWorkingPool) {
      console.log('🎉 TEST PASSED!')
      console.log('V4 Quoter is working correctly with QuoterRevert fix')
    } else {
      console.log('❌ TEST FAILED!')
      console.log('No V4 pools found with liquidity')
    }
    console.log('═══════════════════════════════════════')

    process.exit(foundWorkingPool ? 0 : 1)

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message)
    console.error(error)
    process.exit(1)
  }
}

testE2E()
