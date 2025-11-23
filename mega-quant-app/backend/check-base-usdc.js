import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

const BASE_EIL_RPC = 'https://virtual.rpc.tenderly.co/stitchApp/project/private/eil-base/7e7c502b-2f81-4fd2-87ea-33bc2ae559d9'
const YOUR_ACCOUNT = '0xB5d8206099422A419149813e53Bf774b5F25ba6b'
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

const client = createPublicClient({
  chain: base,
  transport: http(BASE_EIL_RPC)
})

console.log('🔍 Checking Base USDC balance on EIL network...\n')

const balance = await client.readContract({
  address: BASE_USDC,
  abi: [{
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }]
  }],
  functionName: 'balanceOf',
  args: [YOUR_ACCOUNT]
})

console.log('Your Address:', YOUR_ACCOUNT)
console.log('Base USDC Balance:', Number(balance) / 1e6, 'USDC')

if (Number(balance) > 0) {
  console.log('\n✅ YOU HAVE USDC ON BASE!')
  console.log('The cross-chain transfer might have worked!')
} else {
  console.log('\n❌ No USDC on Base yet')
}
