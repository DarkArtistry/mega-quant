import { createPublicClient, http } from 'viem'
import { mainnet, base } from 'viem/chains'

// Your custom Tenderly fork URLs
const YOUR_ETH_RPC = 'https://virtual.mainnet.eu.rpc.tenderly.co/a5658cee-add9-40a5-890c-2b32b3b4b2e4'
const YOUR_BASE_RPC = 'https://virtual.base.eu.rpc.tenderly.co/f346cd0c-38c5-43af-881d-26ef5805c88a'

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

console.log('🔍 Checking YOUR Tenderly forks...\n')
console.log('Account:', YOUR_ACCOUNT, '\n')

// Check Ethereum
const ethClient = createPublicClient({
  chain: mainnet,
  transport: http(YOUR_ETH_RPC)
})

const ethBalance = await ethClient.readContract({
  address: ETH_USDC,
  abi: usdcAbi,
  functionName: 'balanceOf',
  args: [YOUR_ACCOUNT]
})

console.log('📤 Ethereum (your fork):')
console.log('   RPC:', YOUR_ETH_RPC)
console.log('   USDC:', Number(ethBalance) / 1e6, '\n')

// Check Base
const baseClient = createPublicClient({
  chain: base,
  transport: http(YOUR_BASE_RPC)
})

const baseBalance = await baseClient.readContract({
  address: BASE_USDC,
  abi: usdcAbi,
  functionName: 'balanceOf',
  args: [YOUR_ACCOUNT]
})

console.log('📥 Base (your fork):')
console.log('   RPC:', YOUR_BASE_RPC)
console.log('   USDC:', Number(baseBalance) / 1e6, '\n')

// Now check EIL network for comparison
const EIL_ETH_RPC = 'https://virtual.rpc.tenderly.co/stitchApp/project/private/eil-eth/855f8569-52b8-4149-a19d-55cf5b8de368'
const EIL_BASE_RPC = 'https://virtual.rpc.tenderly.co/stitchApp/project/private/eil-base/7e7c502b-2f81-4fd2-87ea-33bc2ae559d9'

const eilEthClient = createPublicClient({
  chain: mainnet,
  transport: http(EIL_ETH_RPC)
})

const eilEthBalance = await eilEthClient.readContract({
  address: ETH_USDC,
  abi: usdcAbi,
  functionName: 'balanceOf',
  args: [YOUR_ACCOUNT]
})

const eilBaseClient = createPublicClient({
  chain: base,
  transport: http(EIL_BASE_RPC)
})

const eilBaseBalance = await eilBaseClient.readContract({
  address: BASE_USDC,
  abi: usdcAbi,
  functionName: 'balanceOf',
  args: [YOUR_ACCOUNT]
})

console.log('📊 EIL Network (SDK default):')
console.log('   Ethereum USDC:', Number(eilEthBalance) / 1e6)
console.log('   Base USDC:', Number(eilBaseBalance) / 1e6, '\n')

console.log('🔍 DIAGNOSIS:')
if (Number(ethBalance) === Number(eilEthBalance) && Number(baseBalance) === Number(eilBaseBalance)) {
  console.log('✅ SAME NETWORK! Your Tenderly forks ARE the EIL network!')
  console.log('   We can use your shorter URLs')
} else {
  console.log('❌ DIFFERENT NETWORKS!')
  console.log('   Your fork: ETH=' + (Number(ethBalance) / 1e6) + ', Base=' + (Number(baseBalance) / 1e6))
  console.log('   EIL network: ETH=' + (Number(eilEthBalance) / 1e6) + ', Base=' + (Number(eilBaseBalance) / 1e6))
  console.log('   EIL SDK uses the EIL network, NOT your fork!')
}
