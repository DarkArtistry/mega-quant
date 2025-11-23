/**
 * Check for Uniswap V4 Helper Contracts on Sepolia
 *
 * V4 requires helper contracts for liquidity management
 */

import { ethers } from 'ethers'

const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com'

// Known V4 contract addresses on Sepolia (from docs)
const POOL_MANAGER = '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543'
const STATE_VIEW = '0xE1Dd9c3fA50EDB962E442f60DfBc432e24537E4C'
const UNIVERSAL_ROUTER = '0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b'

// Potential helper contracts (these may or may not exist)
const POTENTIAL_HELPERS = [
  { name: 'PositionManager', address: '0x1B1C77B606d13b09C84d1c7394B96b147bC03147' }, // Common v4 address
  { name: 'LiquidityManager', address: '0x000000000000000000000000000000000000dEaD' }, // Placeholder
]

async function checkHelpers() {
  console.log('🔍 Checking V4 Helper Contracts on Sepolia')
  console.log('═'.repeat(70))
  console.log('')

  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC)

  console.log('Known V4 Core Contracts:')
  console.log(`  ✅ PoolManager: ${POOL_MANAGER}`)
  console.log(`  ✅ StateView: ${STATE_VIEW}`)
  console.log(`  ✅ UniversalRouter: ${UNIVERSAL_ROUTER}`)
  console.log('')

  console.log('Checking for helper contracts...')
  console.log('')

  for (const helper of POTENTIAL_HELPERS) {
    try {
      const code = await provider.getCode(helper.address)

      if (code !== '0x') {
        console.log(`  ✅ ${helper.name}: ${helper.address}`)
        console.log(`     Code length: ${code.length} bytes`)
      } else {
        console.log(`  ❌ ${helper.name}: Not deployed at ${helper.address}`)
      }
    } catch (error) {
      console.log(`  ❌ ${helper.name}: Error checking ${helper.address}`)
    }
  }

  console.log('')
  console.log('═'.repeat(70))
  console.log('Result: V4 Helper Contracts Status')
  console.log('═'.repeat(70))
  console.log('')
  console.log('Since V4 is new on testnets, helper contracts may not exist.')
  console.log('We have two options:')
  console.log('')
  console.log('Option 1: Deploy a minimal Position Manager contract')
  console.log('  - Implements unlock callback pattern')
  console.log('  - Handles liquidity additions')
  console.log('  - ~500 lines of Solidity')
  console.log('')
  console.log('Option 2: Use direct PoolManager calls with manual unlock')
  console.log('  - More complex')
  console.log('  - Requires understanding V4 architecture')
  console.log('  - But no contract deployment needed')
  console.log('')
  console.log('Recommendation: Deploy a helper contract for easier liquidity management')
  console.log('')
}

checkHelpers().catch(console.error)
