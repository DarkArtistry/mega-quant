/**
 * Uniswap V3 Pool Liquidity Diagnostic
 *
 * Checks if pools exist and have liquidity on testnets
 */

import dotenv from 'dotenv'
dotenv.config()

import { Contract, JsonRpcProvider } from 'ethers'

// Uniswap V3 Factory ABI (minimal)
const FACTORY_ABI = [
  {
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'fee', type: 'uint24' }
    ],
    name: 'getPool',
    outputs: [{ name: 'pool', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  }
]

// Pool ABI (minimal)
const POOL_ABI = [
  {
    inputs: [],
    name: 'liquidity',
    outputs: [{ name: '', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'slot0',
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'observationIndex', type: 'uint16' },
      { name: 'observationCardinality', type: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16' },
      { name: 'feeProtocol', type: 'uint8' },
      { name: 'unlocked', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'token0',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'token1',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  }
]

// ERC20 ABI (minimal)
const ERC20_ABI = [
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
]

// Quoter ABI (minimal)
const QUOTER_ABI = [
  {
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'fee', type: 'uint24' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'sqrtPriceLimitX96', type: 'uint160' }
    ],
    name: 'quoteExactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
]

interface NetworkConfig {
  name: string
  rpcUrl: string
  factoryAddress: string
  quoterAddress: string
  wethAddress: string
  usdcAddress: string
}

const NETWORKS: Record<string, NetworkConfig> = {
  sepolia: {
    name: 'Sepolia',
    rpcUrl: process.env.SEPOLIA_RPC_URL!,
    factoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    quoterAddress: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
    wethAddress: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
    usdcAddress: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8'
  },
  'base-sepolia': {
    name: 'Base Sepolia',
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL!,
    factoryAddress: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24',
    quoterAddress: '0xC5290058841028F1614F3A6F0F5816cAd0df5E27',
    wethAddress: '0x4200000000000000000000000000000000000006',
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
  }
}

const FEE_TIERS = [
  { fee: 100, name: '0.01%' },
  { fee: 500, name: '0.05%' },
  { fee: 3000, name: '0.3%' },
  { fee: 10000, name: '1%' }
]

async function checkNetwork(networkKey: string) {
  const config = NETWORKS[networkKey]
  console.log('\n' + '='.repeat(80))
  console.log(`🔍 Checking ${config.name}`)
  console.log('='.repeat(80))
  console.log(`RPC: ${config.rpcUrl}`)
  console.log(`Factory: ${config.factoryAddress}`)
  console.log(`Quoter: ${config.quoterAddress}`)
  console.log(`WETH: ${config.wethAddress}`)
  console.log(`USDC: ${config.usdcAddress}`)

  try {
    const provider = new JsonRpcProvider(config.rpcUrl)

    // Test connection
    console.log('\n📡 Testing RPC connection...')
    const blockNumber = await provider.getBlockNumber()
    console.log(`✅ Connected! Current block: ${blockNumber}`)

    // Check token contracts
    console.log('\n🪙 Checking token contracts...')
    const wethContract = new Contract(config.wethAddress, ERC20_ABI, provider)
    const usdcContract = new Contract(config.usdcAddress, ERC20_ABI, provider)

    try {
      const wethSymbol = await wethContract.symbol()
      const wethDecimals = await wethContract.decimals()
      console.log(`✅ WETH contract: ${wethSymbol} (${wethDecimals} decimals)`)
    } catch (error: any) {
      console.log(`❌ WETH contract error: ${error.message}`)
    }

    try {
      const usdcSymbol = await usdcContract.symbol()
      const usdcDecimals = await usdcContract.decimals()
      console.log(`✅ USDC contract: ${usdcSymbol} (${usdcDecimals} decimals)`)
    } catch (error: any) {
      console.log(`❌ USDC contract error: ${error.message}`)
    }

    // Check Uniswap V3 Factory
    console.log('\n🏭 Checking Uniswap V3 Factory...')
    const factory = new Contract(config.factoryAddress, FACTORY_ABI, provider)

    try {
      // Try to call a method to verify factory exists
      const testPool = await factory.getPool(config.wethAddress, config.usdcAddress, 3000)
      console.log(`✅ Factory contract is accessible`)
    } catch (error: any) {
      console.log(`❌ Factory contract error: ${error.message}`)
      if (error.message.includes('could not decode result data')) {
        console.log(`   This might mean the factory is not deployed at this address`)
      }
    }

    // Check pools for each fee tier
    console.log('\n🏊 Checking WETH/USDC pools across fee tiers...')

    for (const { fee, name } of FEE_TIERS) {
      console.log(`\n  Fee Tier: ${name} (${fee})`)
      console.log('  ' + '-'.repeat(76))

      try {
        const poolAddress = await factory.getPool(
          config.wethAddress,
          config.usdcAddress,
          fee
        )

        if (poolAddress === '0x0000000000000000000000000000000000000000') {
          console.log(`  ❌ Pool does not exist`)
          continue
        }

        console.log(`  ✅ Pool exists: ${poolAddress}`)

        // Get pool details
        const pool = new Contract(poolAddress, POOL_ABI, provider)

        try {
          const liquidity = await pool.liquidity()
          console.log(`  📊 Liquidity: ${liquidity.toString()}`)

          if (liquidity === 0n) {
            console.log(`  ⚠️  Pool has ZERO liquidity!`)
          } else {
            console.log(`  ✅ Pool has liquidity`)

            // Get slot0 data
            const slot0 = await pool.slot0()
            console.log(`  📈 Current price (sqrtPriceX96): ${slot0.sqrtPriceX96.toString()}`)
            console.log(`  📍 Current tick: ${slot0.tick}`)

            // Get token order
            const token0 = await pool.token0()
            const token1 = await pool.token1()
            console.log(`  🔄 Token0: ${token0}`)
            console.log(`  🔄 Token1: ${token1}`)
          }
        } catch (error: any) {
          console.log(`  ❌ Failed to get pool data: ${error.message}`)
        }

      } catch (error: any) {
        console.log(`  ❌ Error checking pool: ${error.message}`)
      }
    }

    // Check Quoter contract
    console.log('\n💬 Checking Quoter contract...')
    const quoter = new Contract(config.quoterAddress, QUOTER_ABI, provider)

    try {
      // Try to get a quote (this will likely fail if no pool exists)
      const amountIn = 1000000000000000n // 0.001 WETH
      console.log(`  Testing quote for 0.001 WETH -> USDC (fee: 3000)...`)

      const amountOut = await quoter.quoteExactInputSingle.staticCall(
        config.wethAddress,
        config.usdcAddress,
        3000,
        amountIn,
        0
      )

      console.log(`  ✅ Quote successful!`)
      console.log(`  💰 Expected output: ${amountOut.toString()} USDC (raw)`)
      console.log(`  💵 Expected output: ${Number(amountOut) / 1e6} USDC`)

    } catch (error: any) {
      console.log(`  ❌ Quote failed: ${error.message}`)
      if (error.message.includes('could not decode result data')) {
        console.log(`     → Quoter returned empty data (pool may not exist or has no liquidity)`)
      } else if (error.message.includes('execution reverted')) {
        console.log(`     → Transaction reverted (pool likely doesn't exist or wrong quoter address)`)
      }
    }

  } catch (error: any) {
    console.error(`\n❌ Network check failed: ${error.message}`)
    console.error(error.stack)
  }
}

async function main() {
  console.log('\n🧪 Uniswap V3 Pool Liquidity Diagnostic\n')

  // Check both networks
  await checkNetwork('sepolia')
  await checkNetwork('base-sepolia')

  console.log('\n' + '='.repeat(80))
  console.log('✅ Diagnostic complete!')
  console.log('='.repeat(80))
}

main()
  .then(() => {
    console.log('\n✅ Diagnostic completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Diagnostic failed:', error)
    process.exit(1)
  })
