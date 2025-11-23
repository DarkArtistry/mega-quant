/**
 * Test Base Sepolia RPC and Find Pool Address
 */

import { ethers } from 'ethers'

const BASE_SEPOLIA_RPC = 'https://sepolia.base.org'
const BASE_SEPOLIA_NETWORK_ID = 84532

// Uniswap V3 Factory on Base Sepolia
const UNISWAP_V3_FACTORY = '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24'

// Token addresses on Base Sepolia
const WETH = '0x4200000000000000000000000000000000000006' // Canonical WETH
const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' // Base Sepolia USDC

const FACTORY_ABI = [
  'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'
]

const POOL_ABI = [
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function liquidity() external view returns (uint128)'
]

async function testBaseSepolia() {
  console.log('=' .repeat(60))
  console.log('🧪 Base Sepolia Testing')
  console.log('=' .repeat(60))
  console.log(`RPC: ${BASE_SEPOLIA_RPC}`)
  console.log(`Factory: ${UNISWAP_V3_FACTORY}`)
  console.log(`WETH: ${WETH}`)
  console.log(`USDC: ${USDC}`)
  console.log('=' .repeat(60))

  try {
    // Test RPC connection
    console.log('\n📡 Testing RPC connection...')
    const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC, BASE_SEPOLIA_NETWORK_ID, {
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

    let foundPool = false

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

        const [liquidity, slot0, token0, token1] = await Promise.all([
          pool.liquidity(),
          pool.slot0(),
          pool.token0(),
          pool.token1()
        ])

        console.log(`     Liquidity: ${liquidity.toString()}`)
        console.log(`     Token0: ${token0}`)
        console.log(`     Token1: ${token1}`)
        console.log(`     Tick: ${slot0[1]}`)

        if (liquidity > 0n) {
          console.log(`  ✅ Pool has liquidity!`)
          foundPool = true

          // Calculate price
          const sqrtPriceX96 = slot0[0]
          const Q96 = 2 ** 96
          const sqrtPrice = Number(sqrtPriceX96) / Q96
          const rawPrice = sqrtPrice * sqrtPrice

          console.log(`     Raw price: ${rawPrice}`)

          console.log('\n' + '=' .repeat(60))
          console.log('✅ FOUND WORKING POOL!')
          console.log('=' .repeat(60))
          console.log(`Pool Address: ${poolAddress}`)
          console.log(`Fee Tier: ${name} (${fee})`)
          console.log(`Liquidity: ${liquidity.toString()}`)
          console.log('=' .repeat(60))
          console.log('\nAdd this to POOL_ADDRESSES in live-data.ts:')
          console.log(`84532: { // Base Sepolia`)
          console.log(`  'WETH/USDC': '${poolAddress}',`)
          console.log(`},`)
          console.log('=' .repeat(60))
        } else {
          console.log(`  ⚠️  Pool exists but has no liquidity`)
        }

      } catch (error: any) {
        console.log(`  ❌ Error checking fee ${name}: ${error.message}`)
      }
    }

    if (!foundPool) {
      console.log('\n❌ No pools with liquidity found on Base Sepolia')
      console.log('   Base Sepolia may not have active Uniswap V3 pools')
      console.log('   Try using Base Mainnet (8453) instead')
    }

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message)
    process.exit(1)
  }
}

testBaseSepolia()
