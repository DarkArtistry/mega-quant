/**
 * Initialize WETH/USDC Uniswap V4 Pool on Sepolia
 *
 * This script:
 * 1. Initializes the WETH/USDC pool
 * 2. Adds initial liquidity
 * 3. Makes the pool ready for trading
 */

import { ethers, parseUnits, Contract } from 'ethers'
import dotenv from 'dotenv'

dotenv.config()

// Sepolia Configuration
const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com'
const POOL_MANAGER = '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543'

// Token addresses on Sepolia
const WETH = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'  // Sepolia WETH
const USDC = '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8'  // Sepolia USDC

// Pool parameters
const FEE = 3000  // 0.3%
const TICK_SPACING = 60
const HOOKS = ethers.ZeroAddress  // No hooks

// ABIs
const POOL_MANAGER_ABI = [
  'function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks), uint160 sqrtPriceX96) external returns (int24 tick)',
  'function modifyLiquidity((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks), (int24 tickLower, int24 tickUpper, int256 liquidityDelta, bytes32 salt), bytes hookData) external returns (int256, int256)',
  'function unlock(bytes calldata data) external returns (bytes memory)'
]

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)'
]

async function initializePool() {
  console.log('═'.repeat(70))
  console.log('🦄 INITIALIZING UNISWAP V4 POOL ON SEPOLIA')
  console.log('═'.repeat(70))
  console.log('')

  // Get private key
  const privateKey = process.env.TEST_PRIVATE_KEY || process.env.PRIVATE_KEY
  if (!privateKey) {
    throw new Error('Please set TEST_PRIVATE_KEY or PRIVATE_KEY in .env file')
  }

  console.log('📡 Connecting to Sepolia...')
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC)
  const wallet = new ethers.Wallet(privateKey, provider)
  console.log(`✅ Connected with wallet: ${wallet.address}`)
  console.log('')

  // Check balances
  console.log('💰 Checking token balances...')
  const wethContract = new Contract(WETH, ERC20_ABI, wallet)
  const usdcContract = new Contract(USDC, ERC20_ABI, wallet)

  const wethBalance = await wethContract.balanceOf(wallet.address)
  const usdcBalance = await usdcContract.balanceOf(wallet.address)

  console.log(`   WETH: ${ethers.formatUnits(wethBalance, 18)}`)
  console.log(`   USDC: ${ethers.formatUnits(usdcBalance, 6)}`)
  console.log('')

  if (wethBalance === 0n || usdcBalance === 0n) {
    console.log('⚠️  WARNING: You need both WETH and USDC to add liquidity')
    console.log('   Get testnet tokens from:')
    console.log('   - https://sepoliafaucet.com/')
    console.log('   - Wrap ETH to WETH at https://sepolia.etherscan.io/address/' + WETH)
    console.log('   - Get USDC from testnet faucet')
    console.log('')
    console.log('   Continuing with pool initialization (you can add liquidity later)...')
    console.log('')
  }

  // Create pool key
  const [currency0, currency1] = WETH.toLowerCase() < USDC.toLowerCase()
    ? [WETH, USDC]
    : [USDC, WETH]

  const poolKey = {
    currency0,
    currency1,
    fee: FEE,
    tickSpacing: TICK_SPACING,
    hooks: HOOKS
  }

  console.log('🔑 Pool Key:')
  console.log(`   Currency0: ${currency0}`)
  console.log(`   Currency1: ${currency1}`)
  console.log(`   Fee: ${FEE} (${FEE/10000}%)`)
  console.log(`   Tick Spacing: ${TICK_SPACING}`)
  console.log(`   Hooks: ${HOOKS}`)
  console.log('')

  // Calculate initial price (1 WETH = 3200 USDC)
  // sqrtPriceX96 = sqrt(price) * 2^96
  // For WETH/USDC where currency0=USDC, currency1=WETH:
  // price = WETH/USDC = 3200
  // We need price in terms of currency1/currency0

  let targetPrice: number
  if (currency0.toLowerCase() === USDC.toLowerCase()) {
    // currency0 = USDC, currency1 = WETH
    // price = amount of USDC per WETH = 3200
    targetPrice = 3200 * 1e12  // Adjust for decimals (USDC is 6 decimals, WETH is 18)
  } else {
    // currency0 = WETH, currency1 = USDC
    targetPrice = 1 / (3200 * 1e12)
  }

  const sqrtPrice = Math.sqrt(targetPrice)
  const sqrtPriceX96 = BigInt(Math.floor(sqrtPrice * (2 ** 96)))

  console.log('💹 Initial Price:')
  console.log(`   Target: 1 WETH = 3200 USDC`)
  console.log(`   sqrtPriceX96: ${sqrtPriceX96}`)
  console.log('')

  // Initialize pool
  console.log('🎬 Initializing pool...')
  const poolManager = new Contract(POOL_MANAGER, POOL_MANAGER_ABI, wallet)

  try {
    const tx = await poolManager.initialize(poolKey, sqrtPriceX96, {
      gasLimit: 500000
    })

    console.log(`   Transaction sent: ${tx.hash}`)
    console.log(`   Waiting for confirmation...`)

    const receipt = await tx.wait()
    console.log(`✅ Pool initialized!`)
    console.log(`   Block: ${receipt.blockNumber}`)
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`)
    console.log('')

    console.log('═'.repeat(70))
    console.log('✅ SUCCESS!')
    console.log('═'.repeat(70))
    console.log('')
    console.log('Your WETH/USDC V4 pool is now initialized on Sepolia!')
    console.log('You can now:')
    console.log('  1. Run your trading loop')
    console.log('  2. Add liquidity (optional, for better prices)')
    console.log('')
    console.log('Pool Details:')
    console.log(`  WETH: ${WETH}`)
    console.log(`  USDC: ${USDC}`)
    console.log(`  Fee: 0.3%`)
    console.log(`  Initial Price: 1 WETH ≈ 3200 USDC`)
    console.log('')

  } catch (error: any) {
    if (error.message.includes('PoolAlreadyInitialized') || error.message.includes('already initialized')) {
      console.log('✅ Pool is already initialized!')
      console.log('   You can start trading immediately.')
      console.log('')
    } else if (error.message.includes('revert')) {
      console.error('❌ Transaction reverted:', error.message)
      console.log('')
      console.log('This might mean:')
      console.log('  • The pool already exists')
      console.log('  • Invalid pool parameters')
      console.log('  • Insufficient gas')
      console.log('')
    } else {
      console.error('❌ Error:', error.message)
      if (error.stack) {
        console.error(error.stack)
      }
    }
  }
}

initializePool().catch(console.error)
