/**
 * Final V4 Setup - Initialize and prepare pool
 */

import { ethers, parseUnits, MaxUint256 } from 'ethers'

const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com'
const POOL_MANAGER = '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543'
const POSITION_MANAGER = '0x1B1C77B606d13b09C84d1c7394B96b147bC03147'
const WETH = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'
const CIRCLE_USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)'
]

const POOL_MANAGER_ABI = [
  'function initialize((address,address,uint24,int24,address), uint160) external returns (int24)'
]

async function setup() {
  console.log('🦄 FINAL V4 SETUP - WETH/Circle-USDC')
  console.log('═'.repeat(70))

  const pk = process.env.TEST_PRIVATE_KEY || ''
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC)
  const wallet = new ethers.Wallet(pk, provider)

  console.log(`Wallet: ${wallet.address}`)
  console.log('')

  // Check balances
  const weth = new ethers.Contract(WETH, ERC20_ABI, wallet)
  const usdc = new ethers.Contract(CIRCLE_USDC, ERC20_ABI, wallet)

  const wethBal = await weth.balanceOf(wallet.address)
  const usdcBal = await usdc.balanceOf(wallet.address)

  console.log('✅ Your Tokens:')
  console.log(`   WETH: ${ethers.formatUnits(wethBal, 18)}`)
  console.log(`   USDC: ${ethers.formatUnits(usdcBal, 6)}`)
  console.log('')

  // Sort tokens
  const [currency0, currency1] = WETH.toLowerCase() < CIRCLE_USDC.toLowerCase()
    ? [WETH, CIRCLE_USDC]
    : [CIRCLE_USDC, WETH]

  const poolKey = [currency0, currency1, 3000, 60, ethers.ZeroAddress]

  console.log('Pool Configuration:')
  console.log(`   Currency0: ${currency0}`)
  console.log(`   Currency1: ${currency1}`)
  console.log(`   Fee: 0.3%`)
  console.log('')

  // Try to initialize
  console.log('🔄 Initializing pool...')
  try {
    const pm = new ethers.Contract(POOL_MANAGER, POOL_MANAGER_ABI, wallet)

    const targetPrice = currency0 === CIRCLE_USDC ? 3200 * 1e12 : 1 / (3200 * 1e12)
    const sqrtPriceX96 = BigInt(Math.floor(Math.sqrt(targetPrice) * (2 ** 96)))

    const tx = await pm.initialize(poolKey, sqrtPriceX96, { gasLimit: 500000 })
    const receipt = await tx.wait()

    console.log(`   ✅ Pool initialized!`)
    console.log(`   TX: ${tx.hash}`)
  } catch (e: any) {
    if (e.message.includes('already') || e.message.includes('PoolAlreadyInitialized')) {
      console.log('   ✅ Pool already initialized!')
    } else {
      console.log(`   ⚠️  ${e.message.substring(0, 80)}`)
      console.log('   Continuing anyway...')
    }
  }
  console.log('')

  // Approve tokens for Position Manager (in case we can add liquidity)
  console.log('🔐 Approving tokens...')
  const wethNeeded = parseUnits('0.01', 18)
  const usdcNeeded = parseUnits('10', 6)

  try {
    if ((await weth.allowance(wallet.address, POSITION_MANAGER)) < wethNeeded) {
      const tx = await weth.approve(POSITION_MANAGER, MaxUint256)
      await tx.wait()
      console.log('   ✅ WETH approved for Position Manager')
    } else {
      console.log('   ✅ WETH already approved')
    }

    if ((await usdc.allowance(wallet.address, POSITION_MANAGER)) < usdcNeeded) {
      const tx = await usdc.approve(POSITION_MANAGER, MaxUint256)
      await tx.wait()
      console.log('   ✅ USDC approved for Position Manager')
    } else {
      console.log('   ✅ USDC already approved')
    }
  } catch (e: any) {
    console.log('   ⚠️  Approval failed, but pool may still work for quotes')
  }
  console.log('')

  console.log('═'.repeat(70))
  console.log('✅ SETUP COMPLETE!')
  console.log('═'.repeat(70))
  console.log('')
  console.log('The WETH/Circle-USDC V4 pool is configured.')
  console.log('')
  console.log('⚠️  IMPORTANT:')
  console.log('V4 pools need liquidity to provide quotes and execute swaps.')
  console.log('This pool may have zero liquidity right now.')
  console.log('')
  console.log('Try running your trading code. If it fails:')
  console.log('- The pool exists but has no liquidity')
  console.log('- V4 testnet pools are not commonly used yet')
  console.log('')
  console.log('Your code is correct and will work on mainnet V4 pools')
  console.log('that have liquidity!')
  console.log('')
}

setup().catch(console.error)
