import { createPublicClient, http, decodeFunctionData } from 'viem'
import { mainnet } from 'viem/chains'

const EIL_RPC = 'https://virtual.rpc.tenderly.co/stitchApp/project/private/eil-eth/855f8569-52b8-4149-a19d-55cf5b8de368'
const ENTRY_POINT = '0x433709009B8330FDa32311DF1C2AFA402eD8D009'
const SMART_ACCOUNT = '0x7428514808b92d3c6628f549e9e47Aa16D3e8017'
const FACTORY = '0xa3B0aE3203c671746b23e78Ebb170a476C8e13A3'

const client = createPublicClient({
  chain: mainnet,
  transport: http(EIL_RPC)
})

console.log('🔍 Debugging UserOperation AA23 Error\n')
console.log('═'.repeat(60))

// Check all prerequisites
console.log('\n1️⃣  Checking Prerequisites...\n')

// Check if smart account is deployed
const code = await client.getBytecode({ address: SMART_ACCOUNT })
const isDeployed = code && code !== '0x'
console.log('   Smart Account Deployed:', isDeployed ? 'YES ✅' : 'NO ❌')

// Check smart account ETH balance
const ethBalance = await client.getBalance({ address: SMART_ACCOUNT })
console.log('   Smart Account ETH:', Number(ethBalance) / 1e18, 'ETH')

// Check EntryPoint deposit
const deposit = await client.readContract({
  address: ENTRY_POINT,
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
console.log('   EntryPoint Deposit:', Number(deposit) / 1e18, 'ETH')

// Check USDC balance
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
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
console.log('   Smart Account USDC:', Number(usdcBalance) / 1e6, 'USDC')

// Check factory
const factoryCode = await client.getBytecode({ address: FACTORY })
console.log('   Factory Deployed:', factoryCode && factoryCode !== '0x' ? 'YES ✅' : 'NO ❌')

console.log('\n2️⃣  Analyzing UserOperation...\n')

// The callData from the logs
const callData = '0x34fcd5be0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000120000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000044095ea7b300000000000000000000000073ca37d21bb665df9899339ad31897747d782a7c00000000000000000000000000000000000000000000000000000000000f42390000000000000000000000000000000000000000000000000000000000000000000000000000000073ca37d21bb665df9899339ad31897747d782a7c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000038437e43814000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000240000000000000000000000000000000000000000000000000000000000000000100000000000000000000000073ca37d21bb665df9899339ad31897747d782a7c0000000000000000000000007428514808b92d3c6628f549e9e47aa16d3e801700000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000f423900000000000000000000000000000000000000000000000000000000000000020000000000000000000000005786b965a6949a8b951025d733e8baea091c45a2000000000000000000000000a632b01fb508ae20c48f9a06642dff09bc8c12980000000000000000000000000000000000000000000000000000000000002105000000000000000000000000dfa767774b04046e2ad3afdb6474475de6f7be1c0000000000000000000000007428514808b92d3c6628f549e9e47aa16d3e801700000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000002386f26fc100000000000000000000000000000000000000000000000000000000000069222cf00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda0291300000000000000000000000000000000000000000000000000000000000f423900000000000000000000000000000000000000000000000000000000'

console.log('   CallData Function: executeBatch')
console.log('   Operations:')
console.log('     1. Approve USDC to Paymaster (1.000505 USDC)')
console.log('     2. Call Paymaster submitOrder')

console.log('\n3️⃣  Diagnosis...\n')

if (!isDeployed) {
  console.log('   ⚠️  Smart account NOT deployed - will deploy via initCode')
  console.log('   💡 The issue might be in the callData execution AFTER deployment')
} else {
  console.log('   ✅ Smart account is already deployed')
}

if (Number(deposit) > 0) {
  console.log('   ✅ Has EntryPoint deposit to pay for gas')
} else {
  console.log('   ❌ No EntryPoint deposit - cannot pay for gas!')
}

if (Number(usdcBalance) >= 1000505) {
  console.log('   ✅ Has enough USDC for the operation')
} else {
  console.log('   ❌ Insufficient USDC!')
}

console.log('\n4️⃣  Possible Issues...\n')
console.log('   The AA23 error with empty revert data could mean:')
console.log('   1. Paymaster.submitOrder() is reverting')
console.log('   2. The voucher data is invalid')
console.log('   3. The EIL protocol requires something we\'re missing')
console.log('   4. The bundler is rejecting because no paymaster fields are set')

console.log('\n💡 Next Steps:')
console.log('   1. The EIL SDK should be adding paymaster fields to the UserOp')
console.log('   2. Contact the EIL team - this appears to be an SDK issue')
console.log('   3. The SDK docs or examples might show how to enable paymaster')

console.log('\n═'.repeat(60))
