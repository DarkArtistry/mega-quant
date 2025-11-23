/**
 * Test RPC Connection and Pool Data Fetching
 *
 * This script tests:
 * 1. Connection to Sepolia RPC (fallback vs Alchemy)
 * 2. Fetching pool data (slot0, token0, token1)
 * 3. Timing and error handling
 */

import { ethers } from 'ethers'

// Uniswap V3 Pool ABI (minimal)
const POOL_ABI = [
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
]

// Test configuration
const SEPOLIA_NETWORK_ID = 11155111
const POOL_ADDRESS = '0x9799b5edc1aa7d3fad350309b08df3f64914e244' // WETH/USDC on Sepolia
const PAIR_SYMBOL = 'WETH/USDC'

// RPC endpoints to test
const RPC_ENDPOINTS = {
  fallback: 'https://rpc.sepolia.org',
  alchemy: process.env.ALCHEMY_API_KEY
    ? `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    : null,
  publicNode: 'https://ethereum-sepolia-rpc.publicnode.com',
  infura: 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // Public Infura
}

async function testRpcEndpoint(name: string, rpcUrl: string | null): Promise<boolean> {
  if (!rpcUrl) {
    console.log(`\n❌ ${name}: Skipped (no URL configured)`)
    return false
  }

  console.log(`\n🧪 Testing ${name}...`)
  console.log(`📍 URL: ${rpcUrl}`)

  try {
    const startTime = Date.now()

    // Create provider with timeout
    const provider = new ethers.JsonRpcProvider(rpcUrl, SEPOLIA_NETWORK_ID, {
      staticNetwork: true,
    })

    console.log(`⏱️  Connecting...`)

    // Test 1: Get block number (simple call)
    const blockNumber = await Promise.race([
      provider.getBlockNumber(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout getting block number')), 10000)
      )
    ]) as number

    const blockTime = Date.now() - startTime
    console.log(`✅ Block number: ${blockNumber} (${blockTime}ms)`)

    // Test 2: Get pool data
    console.log(`⏱️  Fetching pool data...`)
    const poolStartTime = Date.now()

    const pool = new ethers.Contract(POOL_ADDRESS, POOL_ABI, provider)

    const [slot0Result, token0, token1] = await Promise.race([
      Promise.all([
        pool.slot0(),
        pool.token0(),
        pool.token1()
      ]),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout fetching pool data')), 10000)
      )
    ]) as any

    const poolTime = Date.now() - poolStartTime

    // Calculate price
    const sqrtPriceX96 = slot0Result[0]
    const tick = slot0Result[1]
    const sqrtPrice = Number(sqrtPriceX96) / (2 ** 96)
    let price = sqrtPrice * sqrtPrice
    price = price * (10 ** 12) // Adjust for WETH/USDC decimals
    price = 1 / price // Invert for WETH/USDC

    console.log(`✅ Pool data fetched (${poolTime}ms)`)
    console.log(`   Token0: ${token0}`)
    console.log(`   Token1: ${token1}`)
    console.log(`   Tick: ${tick}`)
    console.log(`   💰 Price: ${price.toFixed(4)} USDC per WETH`)

    const totalTime = Date.now() - startTime
    console.log(`⏱️  Total time: ${totalTime}ms`)
    console.log(`✅ ${name} - SUCCESS`)

    return true

  } catch (error: any) {
    console.log(`❌ ${name} - FAILED`)
    console.log(`   Error: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('=' .repeat(60))
  console.log('🧪 RPC Endpoint Testing for Sepolia')
  console.log('=' .repeat(60))
  console.log(`Pool: ${POOL_ADDRESS}`)
  console.log(`Pair: ${PAIR_SYMBOL}`)
  console.log('=' .repeat(60))

  // Check for Alchemy API key
  if (!process.env.ALCHEMY_API_KEY) {
    console.log('\n⚠️  No ALCHEMY_API_KEY found in environment')
    console.log('   Run with: ALCHEMY_API_KEY=your_key npm run test:rpc')
  }

  const results: Record<string, boolean> = {}

  // Test all endpoints
  for (const [name, url] of Object.entries(RPC_ENDPOINTS)) {
    if (url) {
      results[name] = await testRpcEndpoint(name, url)
    }
  }

  // Summary
  console.log('\n' + '=' .repeat(60))
  console.log('📊 Test Results Summary')
  console.log('=' .repeat(60))

  for (const [name, success] of Object.entries(results)) {
    console.log(`${success ? '✅' : '❌'} ${name}: ${success ? 'PASS' : 'FAIL'}`)
  }

  const successCount = Object.values(results).filter(r => r).length
  const totalCount = Object.keys(results).length

  console.log('\n' + '=' .repeat(60))
  console.log(`✨ ${successCount}/${totalCount} endpoints working`)
  console.log('=' .repeat(60))

  // Recommendation
  if (results.alchemy) {
    console.log('\n✅ RECOMMENDATION: Use Alchemy (best performance)')
  } else if (results.infura) {
    console.log('\n💡 RECOMMENDATION: Use Infura (Alchemy not configured)')
  } else if (results.publicNode) {
    console.log('\n⚠️  RECOMMENDATION: Use PublicNode (limited performance)')
  } else if (results.fallback) {
    console.log('\n⚠️  RECOMMENDATION: Use fallback (may be unreliable)')
  } else {
    console.log('\n❌ ERROR: No working RPC endpoints found!')
    process.exit(1)
  }
}

main().catch(error => {
  console.error('\n❌ Test script failed:', error)
  process.exit(1)
})
