/**
 * Initialize WETH/Circle-USDC V4 Pool on Sepolia
 */

import { ethers } from 'ethers'

const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com'
const POOL_MANAGER = '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543'
const WETH = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'
const CIRCLE_USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'

const FEE = 3000
const TICK_SPACING = 60
const HOOKS = ethers.ZeroAddress

const POOL_MANAGER_ABI = [
  'function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks), uint160 sqrtPriceX96) external returns (int24 tick)'
]

async function initializeCirclePool() {
  console.log('═'.repeat(70))
  console.log('🦄 INITIALIZING WETH/Circle-USDC V4 POOL')
  console.log('═'.repeat(70))
  console.log('')

  const privateKey = process.env.TEST_PRIVATE_KEY || ''
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC)
  const wallet = new ethers.Wallet(privateKey, provider)

  console.log(`Wallet: ${wallet.address}`)
  console.log('')

  // Sort tokens
  const [currency0, currency1] = WETH.toLowerCase() < CIRCLE_USDC.toLowerCase()
    ? [WETH, CIRCLE_USDC]
    : [CIRCLE_USDC, WETH]

  const poolKey = {
    currency0,
    currency1,
    fee: FEE,
    tickSpacing: TICK_SPACING,
    hooks: HOOKS
  }

  console.log('Pool Key:')
  console.log(`  Currency0: ${currency0}`)
  console.log(`  Currency1: ${currency1}`)
  console.log(`  Fee: 0.3%`)
  console.log('')

  // Calculate initial price: 1 WETH = 3200 USDC
  let targetPrice: number
  if (currency0.toLowerCase() === CIRCLE_USDC.toLowerCase()) {
    targetPrice = 3200 * 1e12  // Adjust for decimals
  } else {
    targetPrice = 1 / (3200 * 1e12)
  }

  const sqrtPrice = Math.sqrt(targetPrice)
  const sqrtPriceX96 = BigInt(Math.floor(sqrtPrice * (2 ** 96)))

  console.log(`Initial Price: 1 WETH ≈ 3200 USDC`)
  console.log(`sqrtPriceX96: ${sqrtPriceX96}`)
  console.log('')

  try {
    const poolManager = new ethers.Contract(POOL_MANAGER, POOL_MANAGER_ABI, wallet)

    console.log('Initializing pool...')
    const tx = await poolManager.initialize(poolKey, sqrtPriceX96, {
      gasLimit: 500000
    })

    console.log(`TX: ${tx.hash}`)
    console.log('Waiting for confirmation...')

    const receipt = await tx.wait()

    console.log('')
    console.log('═'.repeat(70))
    console.log('✅ POOL INITIALIZED!')
    console.log('═'.repeat(70))
    console.log('')
    console.log(`Block: ${receipt.blockNumber}`)
    console.log(`Gas: ${receipt.gasUsed}`)
    console.log(`TX: https://sepolia.etherscan.io/tx/${tx.hash}`)
    console.log('')
    console.log('Next: Update token config and add liquidity!')
    console.log('')

  } catch (error: any) {
    if (error.message.includes('PoolAlreadyInitialized') || error.message.includes('already initialized')) {
      console.log('✅ Pool already exists!')
      console.log('')
      console.log('Skip to: Add liquidity')
    } else {
      console.error('❌ Error:', error.message)
    }
    console.log('')
  }
}

initializeCirclePool().catch(console.error)
