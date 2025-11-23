/**
 * V4 Base Mainnet - QUOTER TEST (Correct Contract!)
 * Uses the actual Quoter contract for getting swap quotes
 */

import { ethers } from 'ethers'

// Configuration
const PRIVATE_KEY = ''
const PUBLIC_RPC = 'https://mainnet.base.org'

// CORRECT Base V4 Address - QUOTER not StateView!
const QUOTER = '0x0d5e0f971ed27fbff6c2837bf31316121532048d'

// Token addresses
const WETH = '0x4200000000000000000000000000000000000006'
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

// Test amount
const SWAP_AMOUNT = ethers.parseEther('0.0001') // 0.0001 WETH

// Quoter ABI - quoteExactInputSingle function
const QUOTER_ABI = [
  {
    "inputs": [
      {
        "components": [
          {
            "components": [
              { "name": "currency0", "type": "address" },
              { "name": "currency1", "type": "address" },
              { "name": "fee", "type": "uint24" },
              { "name": "tickSpacing", "type": "int24" },
              { "name": "hooks", "type": "address" }
            ],
            "name": "poolKey",
            "type": "tuple"
          },
          { "name": "zeroForOne", "type": "bool" },
          { "name": "exactAmount", "type": "uint128" },
          { "name": "hookData", "type": "bytes" }
        ],
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "quoteExactInputSingle",
    "outputs": [
      { "name": "amountOut", "type": "uint256" },
      { "name": "gasEstimate", "type": "uint256" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]

// Standard tick spacings for fee tiers
const FEE_TIER_CONFIG = [
  { fee: 500, tickSpacing: 10 },      // 0.05%
  { fee: 3000, tickSpacing: 60 },     // 0.3%
  { fee: 10000, tickSpacing: 200 }    // 1%
]

async function main() {
  console.log('🧪 V4 QUOTER Test - Base Mainnet')
  console.log('═══════════════════════════════════════')
  console.log()

  const provider = new ethers.JsonRpcProvider(PUBLIC_RPC)
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider)
  const address = wallet.address

  console.log('📍 Wallet:', address)

  const balance = await provider.getBalance(address)
  console.log('💰 ETH Balance:', ethers.formatEther(balance), 'ETH')
  console.log()

  // Verify Quoter contract exists
  const quoterCode = await provider.getCode(QUOTER)
  if (quoterCode === '0x') {
    console.error('❌ Quoter contract not found at', QUOTER)
    return
  }
  console.log('✅ Quoter contract verified')
  console.log()

  // Create Quoter contract instance
  const quoter = new ethers.Contract(QUOTER, QUOTER_ABI, wallet)

  // Sort currencies (currency0 < currency1)
  const [currency0, currency1] = WETH.toLowerCase() < USDC.toLowerCase()
    ? [WETH, USDC]
    : [USDC, WETH]

  const zeroForOne = WETH.toLowerCase() === currency0.toLowerCase()

  console.log('🔍 Testing V4 Pools: WETH → USDC')
  console.log('Currency0:', currency0)
  console.log('Currency1:', currency1)
  console.log('Direction (zeroForOne):', zeroForOne)
  console.log('Amount:', ethers.formatEther(SWAP_AMOUNT), 'WETH')
  console.log()

  // Try each fee tier
  for (const { fee, tickSpacing } of FEE_TIER_CONFIG) {
    console.log(`\n📊 Fee Tier: ${fee/10000}% (tickSpacing: ${tickSpacing})`)
    console.log('─────────────────────────────────────')

    try {
      // Build params struct matching QuoteExactSingleParams
      const params = {
        poolKey: {
          currency0: currency0,
          currency1: currency1,
          fee: fee,
          tickSpacing: tickSpacing,
          hooks: ethers.ZeroAddress  // No hooks for standard pools
        },
        zeroForOne: zeroForOne,
        exactAmount: SWAP_AMOUNT,
        hookData: '0x'
      }

      console.log('Calling quoteExactInputSingle...')

      // CRITICAL: Use staticCall for non-view functions that revert
      const result = await quoter.quoteExactInputSingle.staticCall(params)

      const amountOut = result[0]
      const gasEstimate = result[1]

      console.log('✅ SUCCESS!')
      console.log('   Amount Out:', ethers.formatUnits(amountOut, 6), 'USDC')
      console.log('   Gas Estimate:', gasEstimate.toString())
      console.log('   📈 Rate:', (Number(ethers.formatUnits(amountOut, 6)) / Number(ethers.formatEther(SWAP_AMOUNT))).toFixed(2), 'USDC per WETH')
      console.log()
      console.log('🎉 Found working V4 pool on Base!')

      return { fee, tickSpacing, amountOut, gasEstimate }

    } catch (error) {
      console.log('❌ Failed:', error.message.split('\n')[0])

      // Try to extract more info from error
      if (error.data) {
        console.log('   Error data:', error.data)
      }
    }
  }

  console.log()
  console.log('═══════════════════════════════════════')
  console.log('❌ No V4 pools found with liquidity')
  console.log()
  console.log('This could mean:')
  console.log('1. V4 pools not initialized yet on Base')
  console.log('2. No liquidity for WETH/USDC on Base V4')
  console.log('3. Try Ethereum mainnet instead')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
