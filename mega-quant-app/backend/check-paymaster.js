import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const EIL_RPC = 'https://virtual.rpc.tenderly.co/stitchApp/project/private/eil-eth/855f8569-52b8-4149-a19d-55cf5b8de368'
const PAYMASTER = '0x73Ca37d21Bb665df9899339ad31897747D782a7C'
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

const client = createPublicClient({
  chain: mainnet,
  transport: http(EIL_RPC)
})

console.log('Checking Paymaster on EIL Virtual Network...\n')

// Check if paymaster is deployed
const code = await client.getBytecode({ address: PAYMASTER })
console.log('Paymaster Address:', PAYMASTER)
console.log('Paymaster Deployed:', code && code !== '0x' ? 'YES ✅' : 'NO ❌')

if (code && code !== '0x') {
  console.log('Bytecode length:', code.length, 'bytes')
  
  // Check paymaster's USDC balance
  try {
    const balance = await client.readContract({
      address: USDC,
      abi: [{
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }]
      }],
      functionName: 'balanceOf',
      args: [PAYMASTER]
    })
    console.log('Paymaster USDC Balance:', Number(balance) / 1e6, 'USDC')
  } catch (e) {
    console.log('Could not check paymaster USDC balance')
  }
}
