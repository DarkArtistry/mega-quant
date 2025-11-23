/**
 * Wrap ETH to WETH on Base Sepolia
 */

import dotenv from 'dotenv'
dotenv.config()

import { Contract, JsonRpcProvider, Wallet, parseEther, formatEther } from 'ethers'

// WETH ABI (just the functions we need)
const WETH_ABI = [
  {
    constant: false,
    inputs: [],
    name: 'deposit',
    outputs: [],
    payable: true,
    stateMutability: 'payable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
]

async function wrapEth() {
  console.log('\n💎 Wrapping ETH to WETH on Base Sepolia\n')
  console.log('='.repeat(80))

  // Configuration
  const PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || '0x0ab64f3127d928fecc57f3516829c71a1aff2575f66b13dcea7860c454c1231b'
  const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL!
  const WETH_ADDRESS = '0x4200000000000000000000000000000000000006'
  const AMOUNT_TO_WRAP = '0.01' // Wrap 0.01 ETH

  console.log(`RPC: ${RPC_URL}`)
  console.log(`WETH: ${WETH_ADDRESS}`)
  console.log(`Amount: ${AMOUNT_TO_WRAP} ETH`)
  console.log('')

  try {
    // Setup provider and wallet
    const provider = new JsonRpcProvider(RPC_URL)
    const wallet = new Wallet(PRIVATE_KEY, provider)

    console.log(`Wallet: ${wallet.address}`)

    // Check connection
    const blockNumber = await provider.getBlockNumber()
    console.log(`Connected to Base Sepolia (block ${blockNumber})`)
    console.log('')

    // Get WETH contract
    const weth = new Contract(WETH_ADDRESS, WETH_ABI, wallet)

    // Verify WETH contract
    const symbol = await weth.symbol()
    const decimals = await weth.decimals()
    console.log(`Token: ${symbol} (${decimals} decimals)`)
    console.log('')

    // Check balances before
    console.log('📊 Balances Before:')
    console.log('-'.repeat(80))
    const ethBalanceBefore = await provider.getBalance(wallet.address)
    const wethBalanceBefore = await weth.balanceOf(wallet.address)
    console.log(`   ETH:  ${formatEther(ethBalanceBefore)} ETH`)
    console.log(`   WETH: ${formatEther(wethBalanceBefore)} WETH`)
    console.log('')

    // Check if we have enough ETH
    const amountToWrap = parseEther(AMOUNT_TO_WRAP)
    const minRequired = parseEther('0.011') // Need a bit extra for gas

    if (ethBalanceBefore < minRequired) {
      throw new Error(`Insufficient ETH balance. Need at least ${formatEther(minRequired)} ETH, have ${formatEther(ethBalanceBefore)} ETH`)
    }

    // Wrap ETH to WETH
    console.log('🔄 Wrapping ETH to WETH...')
    console.log('-'.repeat(80))
    console.log(`   Calling deposit() with ${AMOUNT_TO_WRAP} ETH`)

    const tx = await weth.deposit({ value: amountToWrap })
    console.log(`   Transaction sent: ${tx.hash}`)
    console.log(`   Waiting for confirmation...`)

    const receipt = await tx.wait()
    console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`)
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`)
    console.log(`   Explorer: https://sepolia.basescan.org/tx/${tx.hash}`)
    console.log('')

    // Check balances after
    console.log('📊 Balances After:')
    console.log('-'.repeat(80))
    const ethBalanceAfter = await provider.getBalance(wallet.address)
    const wethBalanceAfter = await weth.balanceOf(wallet.address)
    console.log(`   ETH:  ${formatEther(ethBalanceAfter)} ETH`)
    console.log(`   WETH: ${formatEther(wethBalanceAfter)} WETH`)
    console.log('')

    // Show changes
    console.log('📈 Changes:')
    console.log('-'.repeat(80))
    const ethChange = ethBalanceAfter - ethBalanceBefore
    const wethChange = wethBalanceAfter - wethBalanceBefore
    console.log(`   ETH:  ${formatEther(ethChange)} ETH (includes gas)`)
    console.log(`   WETH: +${formatEther(wethChange)} WETH`)
    console.log('')

    console.log('='.repeat(80))
    console.log('✅ Successfully wrapped ETH to WETH!')
    console.log('='.repeat(80))
    console.log('')
    console.log('🎯 You can now run the swap test:')
    console.log('   npm run test:real-swaps')
    console.log('')

  } catch (error: any) {
    console.error('\n❌ Error:', error.message)
    console.error(error)
    process.exit(1)
  }
}

wrapEth()
  .then(() => {
    console.log('✅ Wrap complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Wrap failed:', error)
    process.exit(1)
  })
