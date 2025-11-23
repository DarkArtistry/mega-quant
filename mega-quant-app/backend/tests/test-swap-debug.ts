/**
 * Debug swap execution on Base Sepolia
 */

import dotenv from 'dotenv'
dotenv.config()

import { Contract, JsonRpcProvider, Wallet, parseUnits, formatUnits, MaxUint256 } from 'ethers'

// SwapRouter02 ABI (IV3SwapRouter)
const SWAP_ROUTER_02_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ],
        name: 'params',
        type: 'tuple'
      }
    ],
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function'
  }
]

const ERC20_ABI = [
  {
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
]

async function debugSwap() {
  console.log('\n🔍 Debugging Swap on Base Sepolia\n')

  const PRIVATE_KEY = '0x0ab64f3127d928fecc57f3516829c71a1aff2575f66b13dcea7860c454c1231b'
  const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL!

  // Try the original router address
  const ROUTER_ADDRESS = '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4'
  const WETH_ADDRESS = '0x4200000000000000000000000000000000000006'
  const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'

  const provider = new JsonRpcProvider(RPC_URL)
  const wallet = new Wallet(PRIVATE_KEY, provider)

  console.log(`Wallet: ${wallet.address}`)
  console.log(`Router: ${ROUTER_ADDRESS}`)
  console.log(`WETH: ${WETH_ADDRESS}`)
  console.log(`USDC: ${USDC_ADDRESS}`)
  console.log('')

  // Get contracts
  const weth = new Contract(WETH_ADDRESS, ERC20_ABI, wallet)
  const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, wallet)
  const router = new Contract(ROUTER_ADDRESS, SWAP_ROUTER_02_ABI, wallet)

  // Check balances
  console.log('📊 Current Balances:')
  const wethBalance = await weth.balanceOf(wallet.address)
  const usdcBalance = await usdc.balanceOf(wallet.address)
  console.log(`   WETH: ${formatUnits(wethBalance, 18)}`)
  console.log(`   USDC: ${formatUnits(usdcBalance, 6)}`)
  console.log('')

  // Check allowance
  console.log('🔐 Checking Allowance:')
  const allowance = await weth.allowance(wallet.address, ROUTER_ADDRESS)
  console.log(`   Current allowance: ${formatUnits(allowance, 18)} WETH`)

  const amountIn = parseUnits('0.001', 18)

  if (allowance < amountIn) {
    console.log('   Need to approve...')
    const approveTx = await weth.approve(ROUTER_ADDRESS, MaxUint256)
    await approveTx.wait()
    console.log('   ✅ Approved')
  } else {
    console.log('   ✅ Already approved')
  }
  console.log('')

  // Try swap with SwapRouter02 interface (no deadline!)
  console.log('🔄 Attempting Swap (SwapRouter02 format):')
  const swapParams = {
    tokenIn: WETH_ADDRESS,
    tokenOut: USDC_ADDRESS,
    fee: 3000,
    recipient: wallet.address,
    amountIn: amountIn,
    amountOutMinimum: parseUnits('3.5', 6), // Minimum 3.5 USDC
    sqrtPriceLimitX96: 0
  }

  console.log('   Params:', {
    ...swapParams,
    amountIn: formatUnits(swapParams.amountIn, 18) + ' WETH',
    amountOutMinimum: formatUnits(swapParams.amountOutMinimum, 6) + ' USDC'
  })

  try {
    console.log('   Estimating gas...')
    const gasEstimate = await router.exactInputSingle.estimateGas(swapParams)
    console.log(`   ✅ Gas estimate: ${gasEstimate.toString()}`)

    console.log('   Executing swap...')
    const tx = await router.exactInputSingle(swapParams)
    console.log(`   Transaction sent: ${tx.hash}`)

    const receipt = await tx.wait()
    console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`)
    console.log(`   Explorer: https://sepolia.basescan.org/tx/${tx.hash}`)

    // Check new balances
    const wethBalanceAfter = await weth.balanceOf(wallet.address)
    const usdcBalanceAfter = await usdc.balanceOf(wallet.address)

    console.log('\n📊 New Balances:')
    console.log(`   WETH: ${formatUnits(wethBalanceAfter, 18)} (${formatUnits(wethBalanceAfter - wethBalance, 18)})`)
    console.log(`   USDC: ${formatUnits(usdcBalanceAfter, 6)} (+${formatUnits(usdcBalanceAfter - usdcBalance, 6)})`)

  } catch (error: any) {
    console.error('   ❌ Swap failed:', error.message)

    if (error.code === 'CALL_EXCEPTION') {
      console.log('\n   Trying to decode revert reason...')
      console.log('   Error data:', error.data || 'none')
      console.log('   This might mean:')
      console.log('   - Wrong router address')
      console.log('   - Wrong function signature')
      console.log('   - Pool doesn\'t exist or has no liquidity')
      console.log('   - Insufficient input amount')
    }
  }
}

debugSwap()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
