import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const EIL_RPC = 'https://virtual.rpc.tenderly.co/stitchApp/project/private/eil-eth/855f8569-52b8-4149-a19d-55cf5b8de368'
const YOUR_ACCOUNT = '0xB5d8206099422A419149813e53Bf774b5F25ba6b'
const ENTRY_POINT = '0x433709009B8330FDa32311DF1C2AFA402eD8D009'

const client = createPublicClient({
  chain: mainnet,
  transport: http(EIL_RPC)
})

console.log('🔍 Checking nonce for YOUR account...\n')

const nonce = await client.readContract({
  address: ENTRY_POINT,
  abi: [{
    name: 'getNonce',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'sender', type: 'address' },
      { name: 'key', type: 'uint192' }
    ],
    outputs: [{ type: 'uint256' }]
  }],
  functionName: 'getNonce',
  args: [YOUR_ACCOUNT, 0n]
})

console.log('Account:', YOUR_ACCOUNT)
console.log('Nonce:', nonce.toString())

if (nonce > 0n) {
  console.log(`✅ ${nonce.toString()} UserOp(s) have been executed!`)
} else {
  console.log('❌ No UserOps executed yet (nonce is 0)')
}
