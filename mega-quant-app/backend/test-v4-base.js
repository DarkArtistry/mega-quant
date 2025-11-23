/**
 * V4 Base Mainnet Debugging Script
 * Tests actual V4 contracts on Base to find the issue
 */

import { ethers } from 'ethers'

// Configuration
const PRIVATE_KEY = ''
const RPC_URL = 'https://base-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY' // Will try public RPC if needed
const PUBLIC_RPC = 'https://mainnet.base.org'

// Base V4 Addresses (from chains.ts)
const POOL_MANAGER = '0x498581ff718922c3f8e6a244956af099b2652b2b'
const STATE_VIEW = '0xa3c0c9b65bad0b08107aa264b0f3db444b867a71'

// Token addresses
const WETH = '0x4200000000000000000000000000000000000006'
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

// Test amounts
const SWAP_AMOUNT = ethers.parseEther('0.0001') // 0.0001 WETH

async function main() {
  console.log('🧪 V4 Base Mainnet Debugging')
  console.log('═══════════════════════════════════════')
  console.log()

  // Create provider (try public RPC)
  const provider = new ethers.JsonRpcProvider(PUBLIC_RPC)
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider)
  const address = wallet.address

  console.log('📍 Wallet:', address)

  // Check balance
  const balance = await provider.getBalance(address)
  console.log('💰 ETH Balance:', ethers.formatEther(balance), 'ETH')
  console.log()

  // Step 1: Verify V4 contracts are actually deployed
  console.log('Step 1: Verifying V4 Contract Deployments')
  console.log('──────────────────────────────────────')

  const poolManagerCode = await provider.getCode(POOL_MANAGER)
  const stateViewCode = await provider.getCode(STATE_VIEW)

  console.log('PoolManager deployed?', poolManagerCode !== '0x' ? '✅ YES' : '❌ NO')
  console.log('StateView deployed?', stateViewCode !== '0x' ? '✅ YES' : '❌ NO')
  console.log()

  if (poolManagerCode === '0x' || stateViewCode === '0x') {
    console.error('❌ V4 contracts not deployed on Base mainnet!')
    console.error('The addresses in our config may be wrong or V4 is not live on Base yet.')
    return
  }

  // Step 2: Check if tokens exist
  console.log('Step 2: Verifying Token Contracts')
  console.log('──────────────────────────────────────')

  const wethCode = await provider.getCode(WETH)
  const usdcCode = await provider.getCode(USDC)

  console.log('WETH deployed?', wethCode !== '0x' ? '✅ YES' : '❌ NO')
  console.log('USDC deployed?', usdcCode !== '0x' ? '✅ YES' : '❌ NO')
  console.log()

  // Step 3: Try to call StateView with different methods
  console.log('Step 3: Testing StateView Contract Calls')
  console.log('──────────────────────────────────────')

  // ABI for StateView.getQuote (from Uniswap V4 periphery)
  const stateViewAbi = [
    // Try the actual V4 StateView ABI
    'function getQuote((address,address,uint24,uint24,bool,bool,uint256,uint160,bytes)) external returns (uint256)',
    // Alternative: maybe it's a different function name
    'function quoteExactInputSingle((address,address,uint256,uint24,uint160)) external returns (uint256)',
  ]

  const stateView = new ethers.Contract(STATE_VIEW, stateViewAbi, provider)

  // Try fee tiers
  const feeTiers = [500, 3000, 10000]

  for (const fee of feeTiers) {
    console.log(`\nTrying ${fee/10000}% fee tier...`)

    try {
      // V4 uses PoolKey struct: (currency0, currency1, fee, tickSpacing, hooks)
      // But StateView might have different parameters

      // Attempt 1: Try calling with struct (similar to what we have)
      const params = {
        tokenIn: WETH,
        tokenOut: USDC,
        fee: fee,
        tickSpacing: 60, // Standard tick spacing for fee tier
        zeroForOne: WETH.toLowerCase() < USDC.toLowerCase(),
        exactInput: true,
        amountSpecified: SWAP_AMOUNT,
        sqrtPriceLimitX96: 0n,
        hookData: '0x'
      }

      console.log('  Calling StateView.getQuote...')
      const quote = await stateView.getQuote(params)
      console.log('  ✅ SUCCESS! Quote:', ethers.formatUnits(quote, 6), 'USDC')
      console.log('  Pool exists with liquidity!')
      return

    } catch (error) {
      console.log('  ❌ Failed:', error.message.split('\n')[0])
    }
  }

  console.log()
  console.log('Step 4: Check if ANY V4 pool exists')
  console.log('──────────────────────────────────────')

  // Try calling PoolManager directly to see if pool is initialized
  const poolManagerAbi = [
    'function pools(bytes32) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)',
    'function getLiquidity(bytes32) external view returns (uint128)'
  ]

  const poolManager = new ethers.Contract(POOL_MANAGER, poolManagerAbi, provider)

  for (const fee of feeTiers) {
    try {
      // Compute pool ID (this is a guess at the format)
      const poolKey = ethers.solidityPackedKeccak256(
        ['address', 'address', 'uint24'],
        [WETH < USDC ? WETH : USDC, WETH < USDC ? USDC : WETH, fee]
      )

      console.log(`\nChecking ${fee/10000}% pool...`)
      console.log('  Pool ID:', poolKey)

      const poolData = await poolManager.pools(poolKey)
      console.log('  sqrtPrice:', poolData.sqrtPriceX96.toString())
      console.log('  tick:', poolData.tick.toString())

      if (poolData.sqrtPriceX96 > 0n) {
        console.log('  ✅ Pool is initialized!')

        // Check liquidity
        try {
          const liquidity = await poolManager.getLiquidity(poolKey)
          console.log('  Liquidity:', liquidity.toString())
        } catch (e) {
          console.log('  Could not check liquidity:', e.message)
        }
      } else {
        console.log('  ❌ Pool not initialized')
      }

    } catch (error) {
      console.log('  ❌ Error:', error.message.split('\n')[0])
    }
  }

  console.log()
  console.log('═══════════════════════════════════════')
  console.log('🔍 Diagnosis:')
  console.log('If all pools show "missing revert data" or "not initialized",')
  console.log('it likely means V4 is not actually live on Base mainnet yet,')
  console.log('or the contract addresses we have are incorrect.')
  console.log()
  console.log('💡 Next steps:')
  console.log('1. Verify V4 deployment status on Base mainnet')
  console.log('2. Check if we need to use V4 on Ethereum mainnet instead')
  console.log('3. Or check if Base V4 addresses are different from what we have')
}

main().catch(console.error)
