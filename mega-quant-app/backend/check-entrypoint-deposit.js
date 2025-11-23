import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const EIL_RPC = 'https://virtual.rpc.tenderly.co/stitchApp/project/private/eil-eth/855f8569-52b8-4149-a19d-55cf5b8de368'
const ENTRY_POINT = '0x433709009B8330FDa32311DF1C2AFA402eD8D009'
const SMART_ACCOUNT = '0x7428514808b92d3c6628f549e9e47Aa16D3e8017'

const client = createPublicClient({
  chain: mainnet,
  transport: http(EIL_RPC)
})

console.log('🔍 Checking EntryPoint deposits\n')

// Check balance deposited in EntryPoint
try {
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

  console.log('Smart Account:', SMART_ACCOUNT)
  console.log('EntryPoint Deposit:', Number(deposit) / 1e18, 'ETH')

  if (Number(deposit) === 0) {
    console.log('\n❌ NO DEPOSIT! This is why AA23 is failing!')
    console.log('   The smart account needs to deposit ETH into the EntryPoint.')
    console.log('   Since the account is not deployed yet, this is tricky...')
    console.log('\n💡 This is why EIL should be using a PAYMASTER!')
    console.log('   The paymaster would sponsor the gas instead.')
  } else {
    console.log('\n✅ Smart account has deposit in EntryPoint')
  }
} catch (e) {
  console.log('Error checking deposit:', e.message)
  console.log('\n💡 The balanceOf function might not exist on this EntryPoint version')
  console.log('   EntryPoint v0.8 uses different methods')
}
