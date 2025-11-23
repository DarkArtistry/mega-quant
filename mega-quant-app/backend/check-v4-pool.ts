/**
 * Check if WETH/USDC Uniswap V4 pool exists on Base Sepolia
 */

import { ethers } from 'ethers'

const BASE_SEPOLIA_RPC = 'https://sepolia.base.org'
const POOL_MANAGER = '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408'
const WETH = '0x4200000000000000000000000000000000000006'
const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'

// PoolManager ABI - just the functions we need
const POOL_MANAGER_ABI = [
  'function getPoolId((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks)) external view returns (bytes32)',
  'function pools(bytes32 id) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)'
]

async function checkPool() {
  console.log('🔍 Checking WETH/USDC Uniswap V4 Pool on Base Sepolia')
  console.log('='.repeat(60))

  const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC)
  const poolManager = new ethers.Contract(POOL_MANAGER, POOL_MANAGER_ABI, provider)

  // Sort tokens (currency0 < currency1)
  const [currency0, currency1] = WETH.toLowerCase() < USDC.toLowerCase()
    ? [WETH, USDC]
    : [USDC, WETH]

  console.log(`Currency0: ${currency0}`)
  console.log(`Currency1: ${currency1}`)
  console.log('')

  // Try different fee tiers
  const feeTiers = [
    { fee: 500, name: '0.05%', tickSpacing: 10 },
    { fee: 3000, name: '0.3%', tickSpacing: 60 },
    { fee: 10000, name: '1%', tickSpacing: 200 }
  ]

  let foundPool = false

  for (const { fee, name, tickSpacing } of feeTiers) {
    console.log(`Testing fee tier: ${name} (${fee})...`)

    try {
      const poolKey = {
        currency0,
        currency1,
        fee,
        tickSpacing,
        hooks: ethers.ZeroAddress
      }

      const poolId = await poolManager.getPoolId(poolKey)
      console.log(`  Pool ID: ${poolId}`)

      const poolData = await poolManager.pools(poolId)
      const sqrtPriceX96 = poolData[0]
      const tick = poolData[1]

      console.log(`  SqrtPriceX96: ${sqrtPriceX96}`)
      console.log(`  Tick: ${tick}`)

      if (sqrtPriceX96 > 0n) {
        console.log(`  ✅ POOL INITIALIZED!`)
        foundPool = true

        // Calculate price
        const Q96 = 2n ** 96n
        const sqrtPrice = Number(sqrtPriceX96) / Number(Q96)
        const rawPrice = sqrtPrice * sqrtPrice

        console.log(`  Price: ${rawPrice}`)
        console.log('')
        console.log('✅ Found initialized pool!')
        console.log(`   Fee: ${name}`)
        console.log(`   TickSpacing: ${tickSpacing}`)
        console.log('')
        break
      } else {
        console.log(`  ❌ Pool exists but not initialized`)
      }
    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`)
    }
    console.log('')
  }

  if (!foundPool) {
    console.log('❌ No initialized WETH/USDC V4 pools found on Base Sepolia')
    console.log('')
    console.log('Recommendations:')
    console.log('  1. Use Sepolia testnet instead (may have more V4 pools)')
    console.log('  2. Use Uniswap V3 instead (more established)')
    console.log('  3. Create your own V4 pool')
    console.log('  4. Use mainnet Base (production pools exist)')
  }
}

checkPool().catch(console.error)
