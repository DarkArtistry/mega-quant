/**
 * Swap ETH for USDC on Sepolia using Uniswap V3
 *
 * This will give you USDC needed for V4 liquidity
 */

import { ethers, parseEther, parseUnits } from 'ethers'
import dotenv from 'dotenv'

dotenv.config()

// Configuration
const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com'
const WETH = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'
const USDC = '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8'
const SWAP_ROUTER_V3 = '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E'  // Uniswap V3 SwapRouter on Sepolia

// Amount to swap
const ETH_AMOUNT = '0.05'  // Swap 0.05 ETH for USDC

// ABIs
const ERC20_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)'
]

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
]

async function swapForUSDC() {
  console.log('═'.repeat(70))
  console.log('💱 SWAPPING ETH → USDC ON SEPOLIA')
  console.log('═'.repeat(70))
  console.log('')

  const privateKey = process.env.TEST_PRIVATE_KEY || process.env.PRIVATE_KEY
  if (!privateKey) {
    console.error('❌ Please set TEST_PRIVATE_KEY')
    process.exit(1)
  }

  console.log('📡 Connecting to Sepolia...')
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC)
  const wallet = new ethers.Wallet(privateKey, provider)
  console.log(`✅ Wallet: ${wallet.address}`)
  console.log('')

  // Check balances
  console.log('💰 Current Balances:')
  const ethBalance = await provider.getBalance(wallet.address)
  const usdcContract = new ethers.Contract(USDC, ERC20_ABI, wallet)
  const usdcBalance = await usdcContract.balanceOf(wallet.address)

  console.log(`   ETH:  ${ethers.formatEther(ethBalance)}`)
  console.log(`   USDC: ${ethers.formatUnits(usdcBalance, 6)}`)
  console.log('')

  const amountIn = parseEther(ETH_AMOUNT)
  const gasReserve = parseEther('0.05')

  if (ethBalance < amountIn + gasReserve) {
    console.log('❌ Insufficient ETH!')
    console.log(`   Need: ${ETH_AMOUNT} ETH + 0.05 ETH for gas`)
    console.log(`   Have: ${ethers.formatEther(ethBalance)} ETH`)
    console.log('')
    process.exit(1)
  }

  console.log(`💱 Swapping ${ETH_AMOUNT} ETH → USDC...`)
  console.log('')

  try {
    const swapRouter = new ethers.Contract(SWAP_ROUTER_V3, SWAP_ROUTER_ABI, wallet)

    const params = {
      tokenIn: WETH,  // WETH address (V3 router will auto-wrap ETH)
      tokenOut: USDC,
      fee: 3000,  // 0.3% fee tier
      recipient: wallet.address,
      deadline: Math.floor(Date.now() / 1000) + 1800,  // 30 minutes
      amountIn: amountIn,
      amountOutMinimum: 0,  // Accept any amount (for testnet, not recommended for mainnet!)
      sqrtPriceLimitX96: 0
    }

    console.log('   Estimating gas...')
    const gasEstimate = await swapRouter.exactInputSingle.estimateGas(params, {
      value: amountIn  // Send ETH with transaction
    })

    console.log(`   Estimated gas: ${gasEstimate.toLocaleString()}`)
    console.log(`   Sending swap transaction...`)
    console.log('')

    const tx = await swapRouter.exactInputSingle(params, {
      value: amountIn,
      gasLimit: gasEstimate + 100000n
    })

    console.log(`   📤 Transaction: ${tx.hash}`)
    console.log(`   ⏳ Waiting for confirmation...`)
    console.log('')

    const receipt = await tx.wait()

    console.log('═'.repeat(70))
    console.log('✅ SWAP SUCCESSFUL!')
    console.log('═'.repeat(70))
    console.log('')
    console.log(`   Block: ${receipt.blockNumber}`)
    console.log(`   Gas Used: ${receipt.gasUsed.toLocaleString()}`)
    console.log(`   Transaction: https://sepolia.etherscan.io/tx/${tx.hash}`)
    console.log('')

    // Check new balances
    const newEthBalance = await provider.getBalance(wallet.address)
    const newUsdcBalance = await usdcContract.balanceOf(wallet.address)

    console.log('💰 New Balances:')
    console.log(`   ETH:  ${ethers.formatEther(newEthBalance)}`)
    console.log(`   USDC: ${ethers.formatUnits(newUsdcBalance, 6)}`)
    console.log('')

    const usdcReceived = newUsdcBalance - usdcBalance
    console.log(`🎉 Received: ${ethers.formatUnits(usdcReceived, 6)} USDC`)
    console.log('')

    console.log('Next step:')
    console.log('Run: npx tsx add-v4-liquidity-complete.ts')
    console.log('')

  } catch (error: any) {
    console.error('')
    console.error('❌ Swap failed')
    console.error('')

    if (error.message.includes('INSUFFICIENT_LIQUIDITY')) {
      console.error('No liquidity in V3 pool for this pair on Sepolia')
      console.error('')
      console.error('Alternative options:')
      console.error('1. Try a different DEX on Sepolia')
      console.error('2. Get USDC from a testnet faucet')
      console.error('3. Deploy mock USDC for testing')
    } else {
      console.error('Error:', error.message)
    }
    console.error('')
    process.exit(1)
  }
}

swapForUSDC().catch(console.error)
