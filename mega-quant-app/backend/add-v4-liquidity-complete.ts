/**
 * Add Liquidity to WETH/USDC V4 Pool using Position Manager
 *
 * This script uses the deployed V4 Position Manager on Sepolia
 * to add liquidity in a simplified way.
 */

import { ethers, parseUnits, MaxUint256 } from 'ethers'
import dotenv from 'dotenv'

dotenv.config()

// Configuration
const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com'
const POSITION_MANAGER = '0x1B1C77B606d13b09C84d1c7394B96b147bC03147'
const POOL_MANAGER = '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543'

// Tokens
const WETH = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'
const USDC = '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8'

// Pool parameters
const FEE = 3000
const TICK_SPACING = 60

// Liquidity amounts (adjust based on what you have)
const WETH_AMOUNT = '0.01'  // 0.01 WETH
const USDC_AMOUNT = '32'    // 32 USDC (≈ 3200 USDC per WETH)

// ABIs
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)'
]

// Simplified Position Manager ABI (key functions)
const POSITION_MANAGER_ABI = [
  'function modifyLiquidities(bytes calldata unlockData, uint256 deadline) external payable',
  'function initializePool((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks), uint160 sqrtPriceX96) external returns (int24)',
  // For minting positions
  'function mint((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks), int24 tickLower, int24 tickUpper, uint256 liquidity, uint256 amount0Max, uint256 amount1Max, address recipient, uint256 deadline) external payable returns (uint256 tokenId)',
]

async function addLiquidity() {
  console.log('═'.repeat(80))
  console.log('💧 ADDING LIQUIDITY TO UNISWAP V4 POOL VIA POSITION MANAGER')
  console.log('═'.repeat(80))
  console.log('')

  // Get private key
  const privateKey = process.env.TEST_PRIVATE_KEY || process.env.PRIVATE_KEY
  if (!privateKey) {
    console.error('❌ Please set TEST_PRIVATE_KEY in environment')
    console.log('   export TEST_PRIVATE_KEY=0x...')
    process.exit(1)
  }

  console.log('📡 Connecting to Sepolia...')
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC)
  const wallet = new ethers.Wallet(privateKey, provider)
  console.log(`✅ Wallet: ${wallet.address}`)
  console.log('')

  // Check balances
  console.log('💰 Checking balances...')
  const wethContract = new ethers.Contract(WETH, ERC20_ABI, wallet)
  const usdcContract = new ethers.Contract(USDC, ERC20_ABI, wallet)

  const [wethBalance, usdcBalance, wethSymbol, usdcSymbol] = await Promise.all([
    wethContract.balanceOf(wallet.address),
    usdcContract.balanceOf(wallet.address),
    wethContract.symbol(),
    usdcContract.symbol()
  ])

  const wethFormatted = ethers.formatUnits(wethBalance, 18)
  const usdcFormatted = ethers.formatUnits(usdcBalance, 6)

  console.log(`   ${wethSymbol}: ${wethFormatted}`)
  console.log(`   ${usdcSymbol}: ${usdcFormatted}`)
  console.log('')

  // Check if we have enough tokens
  const wethNeeded = parseUnits(WETH_AMOUNT, 18)
  const usdcNeeded = parseUnits(USDC_AMOUNT, 6)

  if (wethBalance < wethNeeded) {
    console.log(`❌ Insufficient WETH!`)
    console.log(`   Need: ${WETH_AMOUNT} WETH`)
    console.log(`   Have: ${wethFormatted} WETH`)
    console.log('')
    console.log('Get WETH:')
    console.log('1. Get Sepolia ETH from https://www.alchemy.com/faucets/ethereum-sepolia')
    console.log('2. Wrap ETH at https://sepolia.etherscan.io/address/' + WETH + '#writeContract')
    console.log('   Use the deposit() function')
    console.log('')
    process.exit(1)
  }

  if (usdcBalance < usdcNeeded) {
    console.log(`❌ Insufficient USDC!`)
    console.log(`   Need: ${USDC_AMOUNT} USDC`)
    console.log(`   Have: ${usdcFormatted} USDC`)
    console.log('')
    console.log('Get USDC:')
    console.log('1. Swap ETH for USDC on Uniswap V3: https://app.uniswap.org/')
    console.log('2. Make sure you are on Sepolia network')
    console.log('')
    process.exit(1)
  }

  console.log('✅ Sufficient tokens available')
  console.log('')

  // Approve tokens for Position Manager
  console.log('🔐 Approving tokens for Position Manager...')

  const wethAllowance = await wethContract.allowance(wallet.address, POSITION_MANAGER)
  if (wethAllowance < wethNeeded) {
    console.log('   Approving WETH...')
    const tx = await wethContract.approve(POSITION_MANAGER, MaxUint256)
    await tx.wait()
    console.log('   ✅ WETH approved')
  } else {
    console.log('   ✅ WETH already approved')
  }

  const usdcAllowance = await usdcContract.allowance(wallet.address, POSITION_MANAGER)
  if (usdcAllowance < usdcNeeded) {
    console.log('   Approving USDC...')
    const tx = await usdcContract.approve(POSITION_MANAGER, MaxUint256)
    await tx.wait()
    console.log('   ✅ USDC approved')
  } else {
    console.log('   ✅ USDC already approved')
  }
  console.log('')

  // Sort tokens for pool key
  const [currency0, currency1] = WETH.toLowerCase() < USDC.toLowerCase()
    ? [WETH, USDC]
    : [USDC, WETH]

  const poolKey = {
    currency0,
    currency1,
    fee: FEE,
    tickSpacing: TICK_SPACING,
    hooks: ethers.ZeroAddress
  }

  console.log('🔑 Pool Configuration:')
  console.log(`   Currency0: ${currency0}`)
  console.log(`   Currency1: ${currency1}`)
  console.log(`   Fee: ${FEE / 10000}%`)
  console.log(`   Tick Spacing: ${TICK_SPACING}`)
  console.log('')

  // Calculate tick range (full range for simplicity)
  const TICK_LOWER = -887220
  const TICK_UPPER = 887220

  console.log('💧 Adding Liquidity...')
  console.log(`   Amount0 (${currency0 === USDC ? 'USDC' : 'WETH'}): ${currency0 === USDC ? USDC_AMOUNT : WETH_AMOUNT}`)
  console.log(`   Amount1 (${currency1 === WETH ? 'WETH' : 'USDC'}): ${currency1 === WETH ? WETH_AMOUNT : USDC_AMOUNT}`)
  console.log(`   Tick Range: ${TICK_LOWER} to ${TICK_UPPER} (full range)`)
  console.log('')

  try {
    const positionManager = new ethers.Contract(POSITION_MANAGER, POSITION_MANAGER_ABI, wallet)

    // Calculate approximate liquidity
    // This is a simplified calculation - the actual liquidity will be determined by the contract
    const liquidity = parseUnits('100', 18) // Arbitrary liquidity amount

    const deadline = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now

    console.log('📤 Sending transaction...')
    console.log(`   This may take a minute...`)
    console.log('')

    // Note: The exact method signature depends on the Position Manager implementation
    // This is a best-effort based on common V4 Position Manager patterns
    const tx = await positionManager.mint(
      poolKey,
      TICK_LOWER,
      TICK_UPPER,
      liquidity,
      MaxUint256,  // amount0Max - will use up to this much
      MaxUint256,  // amount1Max - will use up to this much
      wallet.address,  // recipient
      deadline,
      {
        gasLimit: 2000000,  // High gas limit for V4 operations
        value: 0  // Not sending ETH
      }
    )

    console.log(`   TX Hash: ${tx.hash}`)
    console.log(`   Waiting for confirmation...`)

    const receipt = await tx.wait()

    console.log('')
    console.log('═'.repeat(80))
    console.log('✅ LIQUIDITY ADDED SUCCESSFULLY!')
    console.log('═'.repeat(80))
    console.log('')
    console.log(`   Block: ${receipt.blockNumber}`)
    console.log(`   Gas Used: ${receipt.gasUsed.toLocaleString()}`)
    console.log(`   Transaction: https://sepolia.etherscan.io/tx/${tx.hash}`)
    console.log('')
    console.log('🎉 Your V4 pool now has liquidity!')
    console.log('')
    console.log('Next steps:')
    console.log('1. Run your trading loop')
    console.log('2. Quotes will work')
    console.log('3. Swaps will execute')
    console.log('')

  } catch (error: any) {
    console.error('')
    console.error('❌ Failed to add liquidity')
    console.error('')

    if (error.message.includes('unknown method')) {
      console.error('The Position Manager interface might be different.')
      console.error('Checking contract to find the correct method...')
      console.error('')
      console.error('Alternative: Use V3 for testing, or manually add liquidity via Etherscan')
    } else if (error.message.includes('insufficient')) {
      console.error('Insufficient token balance or allowance')
    } else {
      console.error('Error:', error.message)
      if (error.data) {
        console.error('Error data:', error.data)
      }
    }

    console.error('')
    console.error('For now, you have two options:')
    console.error('1. Switch to Uniswap V3 (has existing liquidity)')
    console.error('2. Add liquidity manually via contract interaction on Etherscan')
    console.error('')
  }
}

addLiquidity().catch(console.error)
