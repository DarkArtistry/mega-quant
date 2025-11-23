/**
 * Check Token Balances
 */

import { ethers } from 'ethers'

const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com'
const WETH = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'
const USDC = '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8'

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)'
]

async function checkBalances() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC)
  const wallet = new ethers.Wallet(
    process.env.TEST_PRIVATE_KEY || '',
    provider
  )

  console.log('💰 Your Token Balances:')
  console.log('═'.repeat(50))

  const ethBalance = await provider.getBalance(wallet.address)
  console.log(`ETH:  ${ethers.formatEther(ethBalance)}`)

  const weth = new ethers.Contract(WETH, ERC20_ABI, provider)
  const wethBal = await weth.balanceOf(wallet.address)
  console.log(`WETH: ${ethers.formatUnits(wethBal, 18)}`)

  const usdc = new ethers.Contract(USDC, ERC20_ABI, provider)
  const usdcBal = await usdc.balanceOf(wallet.address)
  console.log(`USDC: ${ethers.formatUnits(usdcBal, 6)}`)
  console.log('═'.repeat(50))
}

checkBalances().catch(console.error)
