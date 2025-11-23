/**
 * Test Base mainnet WETH/USDC pool
 * Verify the pool address and check the current price
 *
 * Usage: npx tsx test-base-pool.ts <alchemy-api-key>
 */

import { ethers } from 'ethers'

const POOL_ADDRESS = '0xd0b53D9277642d899DF5C87A3966A349A798F224'

// Get Alchemy API key from command line
const alchemyApiKey = process.argv[2]

if (!alchemyApiKey) {
  console.error('❌ Usage: npx tsx test-base-pool.ts <alchemy-api-key>')
  console.error('   Example: npx tsx test-base-pool.ts your-alchemy-api-key-here')
  process.exit(1)
}

const RPC_URL = `https://base-mainnet.g.alchemy.com/v2/${alchemyApiKey}`

const POOL_ABI = [
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function fee() external view returns (uint24)',
  'function liquidity() external view returns (uint128)'
]

const ERC20_ABI = [
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function name() external view returns (string)'
]

async function main() {
  console.log('🔍 Checking Base mainnet WETH/USDC pool...\n')
  console.log(`Pool Address: ${POOL_ADDRESS}`)
  console.log(`RPC: ${RPC_URL}\n`)

  const provider = new ethers.JsonRpcProvider(RPC_URL)

  // First, check if contract exists at this address
  console.log('1️⃣ Checking if contract exists...')
  const code = await provider.getCode(POOL_ADDRESS)
  if (code === '0x') {
    console.error('❌ No contract found at this address!')
    console.error('   This pool address appears to be incorrect for Base mainnet')
    process.exit(1)
  }
  console.log('✅ Contract exists at this address\n')

  const pool = new ethers.Contract(POOL_ADDRESS, POOL_ABI, provider)

  try {
    // Get pool info one by one to see which call fails
    console.log('2️⃣ Getting pool information...')

    console.log('   Calling token0()...')
    const token0Address = await pool.token0()
    console.log('   ✅ token0:', token0Address)

    console.log('   Calling token1()...')
    const token1Address = await pool.token1()
    console.log('   ✅ token1:', token1Address)

    console.log('   Calling fee()...')
    const fee = await pool.fee()
    console.log('   ✅ fee:', fee)

    console.log('   Calling liquidity()...')
    const liquidity = await pool.liquidity()
    console.log('   ✅ liquidity:', liquidity.toString())

    console.log('   Calling slot0()...')
    const slot0 = await pool.slot0()
    console.log('   ✅ slot0 retrieved\n')

    console.log('📊 Pool Information:')
    console.log(`  Token0: ${token0Address}`)
    console.log(`  Token1: ${token1Address}`)
    console.log(`  Fee: ${Number(fee) / 10000}%`)
    console.log(`  Liquidity: ${liquidity.toString()}`)
    console.log()

    // Get token info
    const token0 = new ethers.Contract(token0Address, ERC20_ABI, provider)
    const token1 = new ethers.Contract(token1Address, ERC20_ABI, provider)

    const [symbol0, decimals0Raw, name0, symbol1, decimals1Raw, name1] = await Promise.all([
      token0.symbol(),
      token0.decimals(),
      token0.name(),
      token1.symbol(),
      token1.decimals(),
      token1.name()
    ])

    // Convert decimals to numbers
    const decimals0 = Number(decimals0Raw)
    const decimals1 = Number(decimals1Raw)

    console.log('🪙 Token Information:')
    console.log(`  Token0: ${symbol0} (${name0}) - ${decimals0} decimals`)
    console.log(`  Token1: ${symbol1} (${name1}) - ${decimals1} decimals`)
    console.log()

    // Calculate price
    const sqrtPriceX96 = slot0[0]
    const Q96 = BigInt(2) ** BigInt(96)
    const sqrtPrice = Number(sqrtPriceX96) / Number(Q96)
    let rawPrice = sqrtPrice * sqrtPrice

    // Adjust for decimals
    const decimalAdjustment = Math.pow(10, decimals0 - decimals1)
    let price = rawPrice * decimalAdjustment

    console.log('💰 Price Calculation:')
    console.log(`  sqrtPriceX96: ${sqrtPriceX96.toString()}`)
    console.log(`  Raw price (token1/token0): ${rawPrice}`)
    console.log(`  Decimal adjustment: ${decimalAdjustment}`)
    console.log(`  Adjusted price: ${price}`)
    console.log()

    // Determine correct display
    console.log('📈 Current Prices:')
    console.log(`  ${symbol0}/${symbol1}: ${price.toFixed(6)}`)
    console.log(`  ${symbol1}/${symbol0}: ${(1/price).toFixed(6)}`)
    console.log()

    // Determine which is WETH and which is USDC
    const isToken0WETH = symbol0.includes('WETH') || symbol0.includes('ETH')
    const isToken1USDC = symbol1.includes('USDC')

    if (isToken0WETH && isToken1USDC) {
      const wethPrice = 1 / price
      console.log(`✅ WETH Price: $${wethPrice.toFixed(2)} USDC`)
      console.log(`   (This should be around $3100-3200)`)
    } else if (!isToken0WETH && !isToken1USDC) {
      const wethPrice = price
      console.log(`✅ WETH Price: $${wethPrice.toFixed(2)} USDC`)
      console.log(`   (This should be around $3100-3200)`)
    } else {
      console.log('⚠️  Unexpected token ordering!')
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()
