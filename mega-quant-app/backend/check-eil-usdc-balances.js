import { createPublicClient, http } from 'viem'
import { mainnet, base } from 'viem/chains'

// EIL Virtual Network RPCs (where transfers actually happen)
const EIL_ETH_RPC = 'https://virtual.rpc.tenderly.co/stitchApp/project/private/eil-eth/855f8569-52b8-4149-a19d-55cf5b8de368'
const EIL_BASE_RPC = 'https://virtual.rpc.tenderly.co/stitchApp/project/private/eil-base/7e7c502b-2f81-4fd2-87ea-33bc2ae559d9'

const YOUR_ACCOUNT = '0xB5d8206099422A419149813e53Bf774b5F25ba6b'
const ETH_USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

const usdcAbi = [{
  name: 'balanceOf',
  type: 'function',
  stateMutability: 'view',
  inputs: [{ name: 'account', type: 'address' }],
  outputs: [{ type: 'uint256' }]
}]

console.log('🔍 Checking USDC balances on EIL Virtual Network...\n')
console.log('Account:', YOUR_ACCOUNT, '\n')

// Check Ethereum USDC
const ethClient = createPublicClient({
  chain: mainnet,
  transport: http(EIL_ETH_RPC)
})

const ethBalance = await ethClient.readContract({
  address: ETH_USDC,
  abi: usdcAbi,
  functionName: 'balanceOf',
  args: [YOUR_ACCOUNT]
})

console.log('📤 Ethereum (source chain):')
console.log('   USDC:', Number(ethBalance) / 1e6)
console.log('   Expected: 9,999 (if transfer succeeded)\n')

// Check Base USDC
const baseClient = createPublicClient({
  chain: base,
  transport: http(EIL_BASE_RPC)
})

const baseBalance = await baseClient.readContract({
  address: BASE_USDC,
  abi: usdcAbi,
  functionName: 'balanceOf',
  args: [YOUR_ACCOUNT]
})

console.log('📥 Base (destination chain):')
console.log('   USDC:', Number(baseBalance) / 1e6)
console.log('   Expected: 10,001 (if transfer succeeded)\n')

// Verdict
if (Number(ethBalance) === 9999000000 && Number(baseBalance) === 10001000000) {
  console.log('✅ SUCCESS! Transfer completed on EIL virtual network!')
  console.log('   Issue: Frontend is querying your custom Tenderly forks, not EIL network')
} else if (Number(ethBalance) === 10000000000 && Number(baseBalance) === 10000000000) {
  console.log('❌ Transfer did NOT execute on EIL network yet')
  console.log('   Both chains still show 10,000 USDC')
} else {
  console.log('⚠️  Unexpected balances - something else happened')
}
