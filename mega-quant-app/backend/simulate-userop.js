import { createPublicClient, http, encodeFunctionData, decodeErrorResult } from 'viem'
import { mainnet } from 'viem/chains'

const EIL_RPC = 'https://virtual.rpc.tenderly.co/stitchApp/project/private/eil-eth/855f8569-52b8-4149-a19d-55cf5b8de368'
const ENTRY_POINT = '0x433709009B8330FDa32311DF1C2AFA402eD8D009'
const SMART_ACCOUNT = '0x7428514808b92d3c6628f549e9e47Aa16D3e8017'

const client = createPublicClient({
  chain: mainnet,
  transport: http(EIL_RPC)
})

// The handleOps calldata from your logs (just the first part to analyze)
const initCode = '0xa3B0aE3203c671746b23e78Ebb170a476C8e13A35fbfb9cf000000000000000000000000b5d8206099422a419149813e53bf774b5f25ba6b0000000000000000000000000000000000000000000000000000000000000000'

console.log('🔍 Checking Smart Account status on EIL Virtual Network\n')

// Check if smart account is deployed
const code = await client.getBytecode({ address: SMART_ACCOUNT })
const isDeployed = code && code !== '0x'

console.log('Smart Account:', SMART_ACCOUNT)
console.log('Is Deployed:', isDeployed ? 'YES ✅' : 'NO ❌')

if (!isDeployed) {
  console.log('\n⚠️  Smart account is NOT deployed yet!')
  console.log('   It will be deployed via initCode on first transaction')
  console.log('   InitCode:', initCode.slice(0, 42), '(factory)')
  console.log('   Factory Data:', '0x' + initCode.slice(42))
}

// Check balances
const ethBalance = await client.getBalance({ address: SMART_ACCOUNT })
console.log('\nBalances:')
console.log('  ETH:', Number(ethBalance) / 1e18, 'ETH')

// Check USDC balance
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
try {
  const usdcBalance = await client.readContract({
    address: USDC,
    abi: [{
      name: 'balanceOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ type: 'uint256' }]
    }],
    functionName: 'balanceOf',
    args: [SMART_ACCOUNT]
  })
  console.log('  USDC:', Number(usdcBalance) / 1e6, 'USDC')
} catch (e) {
  console.log('  USDC: Could not check')
}

console.log('\n💡 Diagnosis:')
if (!isDeployed && Number(ethBalance) > 0) {
  console.log('   Smart account has ETH but is not deployed yet.')
  console.log('   The factory deployment (initCode) should work.')
  console.log('   AA23 might be from the callData execution, not deployment.')
}
