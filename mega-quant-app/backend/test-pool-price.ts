/**
 * Test Pool Price Calculation
 *
 * This script tests price calculation for Uniswap V3 pools
 */

import { ethers } from 'ethers'

const POOL_ABI = [
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
]

const ERC20_ABI = [
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function name() external view returns (string)',
]

const POOL_ADDRESS = '0x9799b5edc1aa7d3fad350309b08df3f64914e244'
const RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com'

async function testPoolPrice() {
  console.log('=' .repeat(60))
  console.log('🧪 Pool Price Calculation Test')
  console.log('=' .repeat(60))
  console.log(`Pool: ${POOL_ADDRESS}`)
  console.log(`RPC: ${RPC_URL}`)
  console.log('=' .repeat(60))

  const provider = new ethers.JsonRpcProvider(RPC_URL, 11155111, {
    staticNetwork: true
  })

  const pool = new ethers.Contract(POOL_ADDRESS, POOL_ABI, provider)

  // Get pool data
  console.log('\n📊 Fetching pool data...')
  const [slot0, token0Address, token1Address] = await Promise.all([
    pool.slot0(),
    pool.token0(),
    pool.token1()
  ])

  console.log(`Token0 address: ${token0Address}`)
  console.log(`Token1 address: ${token1Address}`)

  // Get token info
  const token0 = new ethers.Contract(token0Address, ERC20_ABI, provider)
  const token1 = new ethers.Contract(token1Address, ERC20_ABI, provider)

  const [symbol0, decimals0, name0, symbol1, decimals1, name1] = await Promise.all([
    token0.symbol(),
    token0.decimals(),
    token0.name(),
    token1.symbol(),
    token1.decimals(),
    token1.name()
  ])

  console.log(`\nToken0: ${symbol0} (${name0})`)
  console.log(`  Decimals: ${decimals0}`)
  console.log(`  Address: ${token0Address}`)

  console.log(`\nToken1: ${symbol1} (${name1})`)
  console.log(`  Decimals: ${decimals1}`)
  console.log(`  Address: ${token1Address}`)

  // Calculate price
  const sqrtPriceX96 = slot0[0]
  const tick = slot0[1]

  console.log(`\n📈 Price Calculation:`)
  console.log(`  sqrtPriceX96: ${sqrtPriceX96.toString()}`)
  console.log(`  Tick: ${tick}`)

  // Uniswap V3 price formula: price = (sqrtPriceX96 / 2^96)^2
  const Q96 = 2n ** 96n
  const sqrtPrice = Number(sqrtPriceX96) / Number(Q96)
  let price = sqrtPrice * sqrtPrice

  console.log(`  sqrtPrice (no decimals): ${sqrtPrice}`)
  console.log(`  price (no decimals): ${price}`)

  // Adjust for decimals
  const decimalAdjustment = 10 ** (Number(decimals0) - Number(decimals1))
  price = price * decimalAdjustment

  console.log(`  Decimal adjustment: ${decimalAdjustment}`)
  console.log(`  price (adjusted): ${price}`)

  // This price is token1 in terms of token0
  console.log(`\n💰 Final Prices:`)
  console.log(`  1 ${symbol1} = ${price.toFixed(6)} ${symbol0}`)
  console.log(`  1 ${symbol0} = ${(1 / price).toFixed(6)} ${symbol1}`)

  // Determine which way to display (usually show ETH in terms of USD)
  if (symbol1 === 'WETH' || symbol1 === 'WMATIC' || symbol1 === 'WBNB') {
    console.log(`\n🎯 Trading Price:`)
    console.log(`  ${symbol1}/${symbol0}: ${price.toFixed(2)} ${symbol0}`)
  } else {
    console.log(`\n🎯 Trading Price:`)
    console.log(`  ${symbol0}/${symbol1}: ${(1 / price).toFixed(6)} ${symbol1}`)
  }
}

testPoolPrice().catch(error => {
  console.error('❌ Error:', error)
  process.exit(1)
})
