/**
 * Test Base Mainnet RPC and Pool Address
 */

import { ethers } from 'ethers'

const BASE_MAINNET_RPC = 'https://mainnet.base.org'
const BASE_MAINNET_NETWORK_ID = 8453

// Uniswap V3 Factory on Base
const UNISWAP_V3_FACTORY = '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'

// Token addresses on Base Mainnet
const WETH = '0x4200000000000000000000000000000000000006' // Canonical WETH
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // Base USDC

const FACTORY_ABI = [
  'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'
]

const POOL_ABI = [
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function liquidity() external view returns (uint128)'
]

const ERC20_ABI = [
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)'
]

async function testBaseMainnet() {
  console.log('=' .repeat(60))
  console.log('🧪 Base Mainnet Testing')
  console.log('=' .repeat(60))
  console.log(`RPC: ${BASE_MAINNET_RPC}`)
  console.log(`Factory: ${UNISWAP_V3_FACTORY}`)
  console.log(`WETH: ${WETH}`)
  console.log(`USDC: ${USDC}`)
  console.log('=' .repeat(60))

  try {
    // Test RPC connection
    console.log('\n📡 Testing RPC connection...')
    const provider = new ethers.JsonRpcProvider(BASE_MAINNET_RPC, BASE_MAINNET_NETWORK_ID, {
      staticNetwork: true
    })

    const startTime = Date.now()
    const blockNumber = await provider.getBlockNumber()
    const rpcTime = Date.now() - startTime

    console.log(`✅ RPC works! Block: ${blockNumber} (${rpcTime}ms)`)

    // Find pool address
    console.log('\n🔍 Finding WETH/USDC pool address...')
    const factory = new ethers.Contract(UNISWAP_V3_FACTORY, FACTORY_ABI, provider)

    // Try different fee tiers
    const feeTiers = [
      { fee: 500, name: '0.05%' },
      { fee: 3000, name: '0.3%' },
      { fee: 10000, name: '1%' }
    ]

    let bestPool = { address: '', liquidity: 0n, fee: 0, price: 0 }

    for (const { fee, name } of feeTiers) {
      console.log(`\n  Testing fee tier: ${name} (${fee})...`)

      try {
        const poolAddress = await factory.getPool(WETH, USDC, fee)

        if (poolAddress === ethers.ZeroAddress) {
          console.log(`  ❌ No pool found for fee ${name}`)
          continue
        }

        console.log(`  ✅ Pool found: ${poolAddress}`)

        // Check if pool has liquidity
        const pool = new ethers.Contract(poolAddress, POOL_ABI, provider)

        const [liquidity, slot0, token0Address, token1Address] = await Promise.all([
          pool.liquidity(),
          pool.slot0(),
          pool.token0(),
          pool.token1()
        ])

        console.log(`     Liquidity: ${liquidity.toString()}`)
        console.log(`     Token0: ${token0Address}`)
        console.log(`     Token1: ${token1Address}`)
        console.log(`     Tick: ${slot0[1]}`)

        // Get token info
        const token0 = new ethers.Contract(token0Address, ERC20_ABI, provider)
        const token1 = new ethers.Contract(token1Address, ERC20_ABI, provider)

        const [symbol0, decimals0, symbol1, decimals1] = await Promise.all([
          token0.symbol(),
          token0.decimals(),
          token1.symbol(),
          token1.decimals()
        ])

        console.log(`     ${symbol0} (${decimals0} decimals) / ${symbol1} (${decimals1} decimals)`)

        // Calculate price
        const sqrtPriceX96 = slot0[0]
        const Q96 = 2 ** 96
        const sqrtPrice = Number(sqrtPriceX96) / Q96
        const rawPrice = sqrtPrice * sqrtPrice

        // Adjust for decimals
        const decimalAdjustment = Math.pow(10, Number(decimals0) - Number(decimals1))
        let price = rawPrice * decimalAdjustment

        // Determine if we need to invert
        // If token0 is WETH, then price is already WETH in terms of USDC
        // If token1 is WETH, then we need to invert
        const isToken0WETH = token0Address.toLowerCase() === WETH.toLowerCase()
        const isToken1WETH = token1Address.toLowerCase() === WETH.toLowerCase()

        if (isToken1WETH) {
          // price is currently WETH per USDC, we want USDC per WETH
          price = 1 / price
        }

        console.log(`     💰 Price: ${price.toFixed(2)} ${isToken0WETH ? symbol1 : symbol0} per ${isToken0WETH ? symbol0 : symbol1}`)

        if (liquidity > bestPool.liquidity) {
          bestPool = { address: poolAddress, liquidity, fee, price }
        }

      } catch (error: any) {
        console.log(`  ❌ Error checking fee ${name}: ${error.message}`)
      }
    }

    if (bestPool.liquidity > 0n) {
      console.log('\n' + '=' .repeat(60))
      console.log('✅ BEST POOL (Highest Liquidity)')
      console.log('=' .repeat(60))
      console.log(`Pool Address: ${bestPool.address}`)
      console.log(`Fee Tier: ${bestPool.fee / 10000}%`)
      console.log(`Liquidity: ${bestPool.liquidity.toString()}`)
      console.log(`Price: ${bestPool.price.toFixed(2)} USDC per WETH`)
      console.log('=' .repeat(60))
      console.log('\nAdd this to POOL_ADDRESSES in live-data.ts:')
      console.log(`8453: { // Base`)
      console.log(`  'WETH/USDC': '${bestPool.address}',`)
      console.log(`},`)
      console.log('=' .repeat(60))

      // Sanity check
      if (bestPool.price < 1000 || bestPool.price > 10000) {
        console.log('\n⚠️  WARNING: Price seems unusual!')
        console.log(`   Expected: ~$2000-4000 USDC per ETH`)
        console.log(`   Got: $${bestPool.price.toFixed(2)} USDC per ETH`)
        console.log('   This could indicate:')
        console.log('   - Low liquidity pool')
        console.log('   - Incorrect pool address')
        console.log('   - Wrong token pair')
      } else {
        console.log('\n✅ Price looks reasonable!')
      }
    } else {
      console.log('\n❌ No pools with liquidity found on Base')
    }

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message)
    process.exit(1)
  }
}

testBaseMainnet()
