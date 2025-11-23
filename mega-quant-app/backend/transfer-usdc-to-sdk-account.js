import { createWalletClient, createPublicClient, http, parseUnits } from 'viem'
import { mainnet } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const EIL_RPC = 'https://virtual.rpc.tenderly.co/stitchApp/project/private/eil-eth/855f8569-52b8-4149-a19d-55cf5b8de368'
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const YOUR_ACCOUNT = '0xB5d8206099422A419149813e53Bf774b5F25ba6b'
const SDK_ACCOUNT = '0x7428514808b92d3c6628f549e9e47Aa16D3e8017'
const YOUR_PRIVATE_KEY = '0x0ab64f3127d928fecc57f3516829c71a1aff2575f66b13dcea7860c454c1231b'

const account = privateKeyToAccount(YOUR_PRIVATE_KEY)

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(EIL_RPC)
})

const walletClient = createWalletClient({
  chain: mainnet,
  transport: http(EIL_RPC),
  account
})

console.log('💸 Transferring USDC to SDK Smart Account')
console.log('━'.repeat(60))
console.log('From (Your Account):', YOUR_ACCOUNT)
console.log('To (SDK Account):', SDK_ACCOUNT)
console.log('Amount: 2000 USDC\n')

// Check balances before
console.log('1️⃣  Checking balances before...')
const yourBalance = await publicClient.readContract({
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

const sdkBalance = await publicClient.readContract({
  address: USDC,
  abi: [{
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }]
  }],
  functionName: 'balanceOf',
  args: [SDK_ACCOUNT]
})

console.log('   Your USDC:', Number(yourBalance) / 1e6, 'USDC')
console.log('   SDK USDC:', Number(sdkBalance) / 1e6, 'USDC')

// Transfer 2000 USDC
console.log('\n2️⃣  Transferring 2000 USDC...')

const hash = await walletClient.writeContract({
  address: USDC,
  abi: [{
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }]
  }],
  functionName: 'transfer',
  args: [SDK_ACCOUNT, parseUnits('2000', 6)]
})

console.log('   Transaction hash:', hash)
console.log('   Waiting for confirmation...')

await publicClient.waitForTransactionReceipt({ hash })

// Check balances after
console.log('\n3️⃣  Checking balances after...')
const yourBalanceAfter = await publicClient.readContract({
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

const sdkBalanceAfter = await publicClient.readContract({
  address: USDC,
  abi: [{
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }]
  }],
  functionName: 'balanceOf',
  args: [SDK_ACCOUNT]
})

console.log('   Your USDC:', Number(yourBalanceAfter) / 1e6, 'USDC')
console.log('   SDK USDC:', Number(sdkBalanceAfter) / 1e6, 'USDC')

console.log('\n✅ Done! SDK account now has USDC for cross-chain transfer!')
console.log('━'.repeat(60))
