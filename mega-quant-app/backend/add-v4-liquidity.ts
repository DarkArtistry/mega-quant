/**
 * Add Liquidity to WETH/USDC Uniswap V4 Pool on Sepolia
 *
 * This script adds liquidity to the initialized pool
 */

import { ethers, parseUnits, MaxUint256 } from 'ethers'
import dotenv from 'dotenv'

dotenv.config()

// Sepolia Configuration
const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com'
const POOL_MANAGER = '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543'

// Token addresses on Sepolia
const WETH = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'
const USDC = '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8'

// Pool parameters
const FEE = 3000
const TICK_SPACING = 60
const HOOKS = ethers.ZeroAddress

// Liquidity parameters
const TICK_LOWER = -887220  // Full range liquidity
const TICK_UPPER = 887220
const WETH_AMOUNT = '0.1'  // Amount of WETH to provide
const USDC_AMOUNT = '320'  // Amount of USDC to provide (≈ 3200 USDC per WETH)

// ABIs
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)'
]

const POOL_MANAGER_ABI = [
  'function unlock(bytes calldata data) external payable returns (bytes memory)',
  'function modifyLiquidity((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks), (int24 tickLower, int24 tickUpper, int256 liquidityDelta, bytes32 salt), bytes hookData) external returns (int256, int256)'
]

async function addLiquidity() {
  console.log('═'.repeat(70))
  console.log('💧 ADDING LIQUIDITY TO UNISWAP V4 POOL')
  console.log('═'.repeat(70))
  console.log('')

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
  const wethContract = new ethers.Contract(WETH, ERC20_ABI, wallet)
  const usdcContract = new ethers.Contract(USDC, ERC20_ABI, wallet)

  const wethBalance = await wethContract.balanceOf(wallet.address)
  const usdcBalance = await usdcContract.balanceOf(wallet.address)

  const wethBalanceFormatted = ethers.formatUnits(wethBalance, 18)
  const usdcBalanceFormatted = ethers.formatUnits(usdcBalance, 6)

  console.log(`   WETH: ${wethBalanceFormatted}`)
  console.log(`   USDC: ${usdcBalanceFormatted}`)
  console.log('')

  const wethNeeded = parseUnits(WETH_AMOUNT, 18)
  const usdcNeeded = parseUnits(USDC_AMOUNT, 6)

  if (wethBalance < wethNeeded || usdcBalance < usdcNeeded) {
    console.log('❌ Insufficient tokens!')
    console.log(`   Need: ${WETH_AMOUNT} WETH and ${USDC_AMOUNT} USDC`)
    console.log(`   Have: ${wethBalanceFormatted} WETH and ${usdcBalanceFormatted} USDC`)
    console.log('')
    console.log('Get testnet tokens:')
    console.log('1. Get Sepolia ETH from https://sepoliafaucet.com/')
    console.log('2. Wrap ETH to WETH:')
    console.log(`   Visit: https://sepolia.etherscan.io/address/${WETH}#writeContract`)
    console.log(`   Call 'deposit' with ${WETH_AMOUNT} ETH`)
    console.log('3. Get USDC from a testnet faucet or DEX')
    console.log('')
    process.exit(1)
  }

  // Approve tokens
  console.log('🔐 Approving tokens for PoolManager...')

  const wethAllowance = await wethContract.allowance(wallet.address, POOL_MANAGER)
  if (wethAllowance < wethNeeded) {
    console.log('   Approving WETH...')
    const tx1 = await wethContract.approve(POOL_MANAGER, MaxUint256)
    await tx1.wait()
    console.log('   ✅ WETH approved')
  } else {
    console.log('   ✅ WETH already approved')
  }

  const usdcAllowance = await usdcContract.allowance(wallet.address, POOL_MANAGER)
  if (usdcAllowance < usdcNeeded) {
    console.log('   Approving USDC...')
    const tx2 = await usdcContract.approve(POOL_MANAGER, MaxUint256)
    await tx2.wait()
    console.log('   ✅ USDC approved')
  } else {
    console.log('   ✅ USDC already approved')
  }
  console.log('')

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
  console.log(`   Fee: ${FEE} (0.3%)`)
  console.log('')

  // Calculate liquidity amount
  // For simplicity, we'll use a large liquidity value
  const liquidityDelta = parseUnits('1000', 18) // Arbitrary liquidity amount

  const modifyLiquidityParams = {
    tickLower: TICK_LOWER,
    tickUpper: TICK_UPPER,
    liquidityDelta: liquidityDelta,
    salt: ethers.ZeroHash
  }

  console.log('💧 Adding liquidity...')
  console.log(`   Tick Range: ${TICK_LOWER} to ${TICK_UPPER} (full range)`)
  console.log(`   Liquidity Delta: ${liquidityDelta}`)
  console.log('')

  try {
    const poolManager = new ethers.Contract(POOL_MANAGER, POOL_MANAGER_ABI, wallet)

    // Note: V4 requires using the unlock pattern for liquidity operations
    // This is a simplified version - production code would need proper unlock callback
    console.log('⚠️  Adding liquidity in V4 requires complex unlock pattern')
    console.log('   This might fail - V4 liquidity provisioning is not yet simplified')
    console.log('')

    const tx = await poolManager.modifyLiquidity(
      poolKey,
      modifyLiquidityParams,
      '0x', // Empty hook data
      { gasLimit: 1000000 }
    )

    console.log(`   Transaction sent: ${tx.hash}`)
    const receipt = await tx.wait()

    console.log('✅ Liquidity added successfully!')
    console.log(`   Block: ${receipt.blockNumber}`)
    console.log(`   Gas used: ${receipt.gasUsed}`)
    console.log('')

  } catch (error: any) {
    console.error('❌ Failed to add liquidity:', error.message)
    console.log('')
    console.log('V4 liquidity provisioning is complex and requires:')
    console.log('1. Using the unlock/lock callback pattern')
    console.log('2. Proper delta handling')
    console.log('3. Settling tokens correctly')
    console.log('')
    console.log('Alternative: Use a V4 liquidity manager contract or')
    console.log('switch to Uniswap V3 which has simpler liquidity provisioning')
    console.log('')
  }
}

addLiquidity().catch(console.error)
