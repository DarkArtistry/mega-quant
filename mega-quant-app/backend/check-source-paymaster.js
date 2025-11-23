import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const EIL_RPC = 'https://virtual.rpc.tenderly.co/stitchApp/project/private/eil-eth/855f8569-52b8-4149-a19d-55cf5b8de368'
const SOURCE_PAYMASTER = '0xc7F3D98ed15c483C0f666d9F3EA0Dc7abEe77ca2'
const ENTRY_POINT = '0x433709009B8330FDa32311DF1C2AFA402eD8D009'

const client = createPublicClient({
  chain: mainnet,
  transport: http(EIL_RPC)
})

console.log('🔍 Checking Source Paymaster on EIL Network')
console.log('═'.repeat(60))
console.log('Paymaster:', SOURCE_PAYMASTER)
console.log()

// Check if paymaster is deployed
const code = await client.getBytecode({ address: SOURCE_PAYMASTER })
const isDeployed = code && code !== '0x'

console.log('1️⃣  Deployment Status:')
console.log('   Deployed:', isDeployed ? 'YES ✅' : 'NO ❌')
if (isDeployed) {
  console.log('   Bytecode length:', code.length, 'bytes')
}

// Check paymaster ETH balance
const ethBalance = await client.getBalance({ address: SOURCE_PAYMASTER })
console.log('\n2️⃣  Balances:')
console.log('   ETH:', Number(ethBalance) / 1e18, 'ETH')

// Check paymaster's EntryPoint deposit
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
  args: [SOURCE_PAYMASTER]
})
console.log('   EntryPoint Deposit:', Number(deposit) / 1e18, 'ETH')

console.log('\n3️⃣  Analysis:')
if (!isDeployed) {
  console.log('   ❌ Paymaster NOT deployed!')
  console.log('   💡 This is why transactions are failing!')
} else if (Number(deposit) === 0 && Number(ethBalance) === 0) {
  console.log('   ❌ Paymaster has NO funds to sponsor gas!')
  console.log('   💡 This is why AA23 is failing!')
} else if (Number(deposit) === 0) {
  console.log('   ⚠️  Paymaster has no EntryPoint deposit')
  console.log('   💡 It needs ETH deposited in EntryPoint to sponsor UserOps')
} else {
  console.log('   ✅ Paymaster is ready!')
}

console.log('\n═'.repeat(60))
