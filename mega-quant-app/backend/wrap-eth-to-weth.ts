/**
 * Wrap ETH to WETH on Sepolia
 *
 * This script wraps your Sepolia ETH into WETH
 */

import { ethers, parseEther } from 'ethers'
import dotenv from 'dotenv'

dotenv.config()

// Configuration
const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com'
const WETH_ADDRESS = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'

// Amount to wrap (change this as needed)
const AMOUNT_TO_WRAP = '0.1'  // 0.1 ETH

// WETH ABI (just the functions we need)
const WETH_ABI = [
  'function deposit() external payable',
  'function withdraw(uint256 amount) external',
  'function balanceOf(address account) external view returns (uint256)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)'
]

async function wrapETH() {
  console.log('═'.repeat(70))
  console.log('🎁 WRAPPING ETH → WETH ON SEPOLIA')
  console.log('═'.repeat(70))
  console.log('')

  // Get private key
  const privateKey = process.env.TEST_PRIVATE_KEY || process.env.PRIVATE_KEY
  if (!privateKey) {
    console.error('❌ Please set TEST_PRIVATE_KEY in environment')
    console.log('   Example: export TEST_PRIVATE_KEY=0x...')
    process.exit(1)
  }

  console.log('📡 Connecting to Sepolia...')
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC)
  const wallet = new ethers.Wallet(privateKey, provider)
  console.log(`✅ Wallet: ${wallet.address}`)
  console.log('')

  // Check balances
  console.log('💰 Checking balances...')

  const ethBalance = await provider.getBalance(wallet.address)
  const wethContract = new ethers.Contract(WETH_ADDRESS, WETH_ABI, wallet)
  const wethBalance = await wethContract.balanceOf(wallet.address)

  const ethFormatted = ethers.formatEther(ethBalance)
  const wethFormatted = ethers.formatEther(wethBalance)

  console.log(`   ETH:  ${ethFormatted}`)
  console.log(`   WETH: ${wethFormatted}`)
  console.log('')

  // Check if we have enough ETH
  const amountToWrap = parseEther(AMOUNT_TO_WRAP)
  const gasReserve = parseEther('0.01') // Keep 0.01 ETH for gas

  if (ethBalance < amountToWrap + gasReserve) {
    console.log('❌ Insufficient ETH!')
    console.log(`   Need: ${AMOUNT_TO_WRAP} ETH + 0.01 ETH for gas`)
    console.log(`   Have: ${ethFormatted} ETH`)
    console.log('')
    console.log('Get Sepolia ETH from faucets:')
    console.log('  • https://www.alchemy.com/faucets/ethereum-sepolia')
    console.log('  • https://faucet.quicknode.com/ethereum/sepolia')
    console.log('  • https://faucets.chain.link/sepolia')
    console.log('')
    process.exit(1)
  }

  console.log('✅ Sufficient ETH available')
  console.log('')

  // Wrap ETH
  console.log(`🎁 Wrapping ${AMOUNT_TO_WRAP} ETH → WETH...`)
  console.log('')

  try {
    // Estimate gas
    const gasEstimate = await wethContract.deposit.estimateGas({
      value: amountToWrap
    })

    console.log(`   Estimated gas: ${gasEstimate.toLocaleString()}`)
    console.log(`   Sending transaction...`)
    console.log('')

    const tx = await wethContract.deposit({
      value: amountToWrap,
      gasLimit: gasEstimate + 50000n // Add buffer
    })

    console.log(`   📤 Transaction sent: ${tx.hash}`)
    console.log(`   ⏳ Waiting for confirmation...`)
    console.log('')

    const receipt = await tx.wait()

    console.log('═'.repeat(70))
    console.log('✅ ETH WRAPPED SUCCESSFULLY!')
    console.log('═'.repeat(70))
    console.log('')
    console.log(`   Block: ${receipt.blockNumber}`)
    console.log(`   Gas Used: ${receipt.gasUsed.toLocaleString()}`)
    console.log(`   Transaction: https://sepolia.etherscan.io/tx/${tx.hash}`)
    console.log('')

    // Check new balances
    const newEthBalance = await provider.getBalance(wallet.address)
    const newWethBalance = await wethContract.balanceOf(wallet.address)

    console.log('💰 New Balances:')
    console.log(`   ETH:  ${ethers.formatEther(newEthBalance)}`)
    console.log(`   WETH: ${ethers.formatEther(newWethBalance)}`)
    console.log('')

    console.log('🎉 You now have WETH!')
    console.log('')
    console.log('Next steps:')
    console.log('1. Get USDC by swapping ETH on Uniswap V3')
    console.log('2. Run the liquidity script: npx tsx add-v4-liquidity-complete.ts')
    console.log('')

  } catch (error: any) {
    console.error('')
    console.error('❌ Failed to wrap ETH')
    console.error('')

    if (error.message.includes('insufficient funds')) {
      console.error('Insufficient ETH for transaction + gas')
      console.error(`You need at least ${AMOUNT_TO_WRAP} ETH + gas fees`)
    } else {
      console.error('Error:', error.message)
    }
    console.error('')
    process.exit(1)
  }
}

wrapETH().catch(console.error)
