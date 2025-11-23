/**
 * Test QuoterV2 interface on Base Sepolia
 */

import dotenv from 'dotenv'
dotenv.config()

import { Contract, JsonRpcProvider, parseUnits, formatUnits } from 'ethers'

// QuoterV2 ABI - returns a struct
const QUOTER_V2_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'fee', type: 'uint24' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ],
        name: 'params',
        type: 'tuple'
      }
    ],
    name: 'quoteExactInputSingle',
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'sqrtPriceX96After', type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32' },
      { name: 'gasEstimate', type: 'uint256' }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  }
]

async function testQuoterV2() {
  console.log('\n🧪 Testing QuoterV2 on Base Sepolia\n')

  const provider = new JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL!)
  const quoterAddress = '0xC5290058841028F1614F3A6F0F5816cAd0df5E27'
  const wethAddress = '0x4200000000000000000000000000000000000006'
  const usdcAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'

  const quoter = new Contract(quoterAddress, QUOTER_V2_ABI, provider)

  const amountIn = parseUnits('0.001', 18) // 0.001 WETH

  console.log('Testing QuoterV2.quoteExactInputSingle()...')
  console.log(`  Input: ${formatUnits(amountIn, 18)} WETH`)
  console.log(`  WETH: ${wethAddress}`)
  console.log(`  USDC: ${usdcAddress}`)
  console.log('')

  try {
    // QuoterV2 expects a struct as input
    const params = {
      tokenIn: wethAddress,
      tokenOut: usdcAddress,
      amountIn: amountIn,
      fee: 3000,
      sqrtPriceLimitX96: 0
    }

    const result = await quoter.quoteExactInputSingle.staticCall(params)

    console.log('✅ Quote successful!')
    console.log(`  Amount Out: ${formatUnits(result[0], 6)} USDC`)
    console.log(`  sqrtPriceX96After: ${result[1].toString()}`)
    console.log(`  Ticks Crossed: ${result[2]}`)
    console.log(`  Gas Estimate: ${result[3].toString()}`)

  } catch (error: any) {
    console.log('❌ QuoterV2 failed:', error.message)
    console.log('\nTrying QuoterV1 interface instead...')

    // Try QuoterV1 (original interface)
    const QUOTER_V1_ABI = [
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

    const quoterV1 = new Contract(quoterAddress, QUOTER_V1_ABI, provider)

    try {
      const amountOut = await quoterV1.quoteExactInputSingle.staticCall(
        wethAddress,
        usdcAddress,
        3000,
        amountIn,
        0
      )

      console.log('✅ QuoterV1 successful!')
      console.log(`  Amount Out: ${formatUnits(amountOut, 6)} USDC`)

    } catch (error2: any) {
      console.log('❌ QuoterV1 also failed:', error2.message)
    }
  }
}

testQuoterV2()
  .then(() => {
    console.log('\n✅ Test complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })
