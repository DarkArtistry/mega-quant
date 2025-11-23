import { createPublicClient, http, formatEther } from 'viem'
import { mainnet } from 'viem/chains'

const EIL_RPC = 'https://virtual.rpc.tenderly.co/stitchApp/project/private/eil-eth/855f8569-52b8-4149-a19d-55cf5b8de368'
const YOUR_ACCOUNT = '0xB5d8206099422A419149813e53Bf774b5F25ba6b'
const ENTRY_POINT = '0x433709009B8330FDa32311DF1C2AFA402eD8D009'

const client = createPublicClient({
  chain: mainnet,
  transport: http(EIL_RPC)
})

console.log('🔍 Checking EntryPoint deposit for YOUR account...\n')
console.log('Account:', YOUR_ACCOUNT)
console.log('EntryPoint:', ENTRY_POINT, '\n')

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
  args: [YOUR_ACCOUNT]
})

console.log('EntryPoint Deposit:', formatEther(deposit), 'ETH')

if (deposit === 5000000000000000000n) {
  console.log('(Still exactly 5 ETH - no gas consumed)')
} else if (deposit < 5000000000000000000n) {
  console.log('✅ Gas WAS consumed! UserOps executed!')
  console.log('Consumed:', formatEther(5000000000000000000n - deposit), 'ETH')
} else {
  console.log('(More than expected - maybe more deposits?)')
}
