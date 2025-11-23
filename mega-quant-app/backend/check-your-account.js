import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const EIL_RPC = 'https://virtual.rpc.tenderly.co/stitchApp/project/private/eil-eth/855f8569-52b8-4149-a19d-55cf5b8de368'
const YOUR_ACCOUNT = '0xB5d8206099422A419149813e53Bf774b5F25ba6b'
const ENTRY_POINT = '0x433709009B8330FDa32311DF1C2AFA402eD8D009'
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

const client = createPublicClient({
  chain: mainnet,
  transport: http(EIL_RPC)
})

console.log('🔍 Checking Your Account on EIL Network')
console.log('═'.repeat(60))
console.log('Address:', YOUR_ACCOUNT)
console.log()

// Check bytecode
const code = await client.getBytecode({ address: YOUR_ACCOUNT })
const hasCode = code && code !== '0x'

console.log('1️⃣  Contract Status:')
console.log('   Bytecode:', hasCode ? `YES (${code.length} bytes)` : 'NO (EOA or undeployed)')
if (hasCode) {
  console.log('   First 100 bytes:', code.slice(0, 200))
}

// Check ETH balance
const ethBalance = await client.getBalance({ address: YOUR_ACCOUNT })
console.log('\n2️⃣  Balances:')
console.log('   ETH:', Number(ethBalance) / 1e18, 'ETH')

// Check USDC balance
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
  args: [YOUR_ACCOUNT]
})
console.log('   USDC:', Number(usdcBalance) / 1e6, 'USDC')

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
  args: [YOUR_ACCOUNT]
})
console.log('   EntryPoint Deposit:', Number(deposit) / 1e18, 'ETH')

console.log('\n3️⃣  Analysis:')
if (hasCode) {
  console.log('   ✅ This IS a smart contract!')
  console.log('   ✅ Can be used as smart account for ERC-4337')
  if (Number(deposit) > 0) {
    console.log('   ✅ Has EntryPoint deposit - ready to use!')
  } else {
    console.log('   ⚠️  No EntryPoint deposit - needs deposit to pay for gas')
  }
} else {
  console.log('   ❌ This is an EOA (no contract code)')
  console.log('   ❌ Cannot be used directly for ERC-4337 UserOperations')
  console.log('   💡 You need a smart contract wallet, not an EOA')
}

console.log('\n═'.repeat(60))
