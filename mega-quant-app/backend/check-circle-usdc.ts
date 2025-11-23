/**
 * Check Circle USDC Balance on Sepolia
 */

import { ethers } from 'ethers'

const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com'
const WETH = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'
const CIRCLE_USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'  // Circle's official USDC on Sepolia

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function name() view returns (string)'
]

async function checkCircleUSDC() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC)
  const wallet = new ethers.Wallet(
    process.env.TEST_PRIVATE_KEY || '',
    provider
  )

  console.log('💰 Checking Circle USDC Balance')
  console.log('═'.repeat(70))
  console.log(`Wallet: ${wallet.address}`)
  console.log('')

  const usdc = new ethers.Contract(CIRCLE_USDC, ERC20_ABI, provider)

  try {
    const [name, symbol, decimals, balance] = await Promise.all([
      usdc.name(),
      usdc.symbol(),
      usdc.decimals(),
      usdc.balanceOf(wallet.address)
    ])

    console.log(`Token: ${name} (${symbol})`)
    console.log(`Address: ${CIRCLE_USDC}`)
    console.log(`Balance: ${ethers.formatUnits(balance, decimals)} ${symbol}`)
    console.log('')

    if (balance > 0n) {
      console.log('✅ You have Circle USDC!')
      console.log('')
      console.log('Next step: Initialize new V4 pool with Circle USDC')
      console.log('(The old pool used a different USDC token)')
    } else {
      console.log('❌ No Circle USDC found')
      console.log('')
      console.log('Try claiming again from: https://faucet.circle.com/')
    }
  } catch (error: any) {
    console.error('Error:', error.message)
  }
  console.log('═'.repeat(70))
}

checkCircleUSDC().catch(console.error)
