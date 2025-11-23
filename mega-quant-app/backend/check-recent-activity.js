import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const EIL_RPC = 'https://virtual.rpc.tenderly.co/stitchApp/project/private/eil-eth/855f8569-52b8-4149-a19d-55cf5b8de368'
const YOUR_ACCOUNT = '0xB5d8206099422A419149813e53Bf774b5F25ba6b'
const ENTRY_POINT = '0x433709009B8330FDa32311DF1C2AFA402eD8D009'

const client = createPublicClient({
  chain: mainnet,
  transport: http(EIL_RPC)
})

console.log('🔍 Checking recent activity on EIL network...\n')

// Get current block
const blockNumber = await client.getBlockNumber()
console.log('Current block:', blockNumber)

// Check EntryPoint deposit changes (indicates UserOp execution)
const currentDeposit = await client.readContract({
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

console.log('\nYour EntryPoint deposit:', Number(currentDeposit) / 1e18, 'ETH')
console.log('(If this decreased, a UserOp was executed!)')

// Check account nonce
try {
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

  console.log('\nYour nonce:', nonce.toString())
  console.log('(Higher nonce = more UserOps executed)')
} catch (e) {
  console.log('\nCould not check nonce:', e.message)
}

console.log('\n💡 Diagnosis:')
console.log('If EntryPoint deposit decreased or nonce increased,')
console.log('then UserOperations ARE being executed!')
console.log('The SDK timeout might just be an event listening issue.')
