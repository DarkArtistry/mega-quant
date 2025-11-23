import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const EIL_RPC = 'https://virtual.rpc.tenderly.co/stitchApp/project/private/eil-eth/855f8569-52b8-4149-a19d-55cf5b8de368'
const EOA = '0xB5d8206099422A419149813e53Bf774b5F25ba6b'
const SMART_ACCOUNT = '0x7428514808b92d3c6628f549e9e47Aa16D3e8017'
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

const client = createPublicClient({
  chain: mainnet,
  transport: http(EIL_RPC)
})

const abi = [{
  name: 'balanceOf',
  type: 'function',
  stateMutability: 'view',
  inputs: [{ name: 'account', type: 'address' }],
  outputs: [{ type: 'uint256' }]
}]

console.log('Checking balances on EIL Virtual Network...\n')

// Check EOA
const eoaBalance = await client.readContract({
  address: USDC,
  abi,
  functionName: 'balanceOf',
  args: [EOA]
})
console.log('EOA (Your Wallet):', EOA)
console.log('  USDC Balance:', Number(eoaBalance) / 1e6, 'USDC\n')

// Check Smart Account
const smartBalance = await client.readContract({
  address: USDC,
  abi,
  functionName: 'balanceOf',
  args: [SMART_ACCOUNT]
})
console.log('Smart Account:', SMART_ACCOUNT)
console.log('  USDC Balance:', Number(smartBalance) / 1e6, 'USDC\n')

// Check if smart account is deployed
const code = await client.getBytecode({ address: SMART_ACCOUNT })
console.log('Smart Account Deployed:', code && code !== '0x' ? 'YES ✅' : 'NO (will deploy on first tx)')
