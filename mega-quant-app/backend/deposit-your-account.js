import { createWalletClient, createPublicClient, http, parseEther } from 'viem'
import { mainnet } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const EIL_RPC = 'https://virtual.rpc.tenderly.co/stitchApp/project/private/eil-eth/855f8569-52b8-4149-a19d-55cf5b8de368'
const ENTRY_POINT = '0x433709009B8330FDa32311DF1C2AFA402eD8D009'
const YOUR_ACCOUNT = '0xB5d8206099422A419149813e53Bf774b5F25ba6b'
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

console.log('🏦 Depositing ETH into EntryPoint for YOUR Smart Account')
console.log('━'.repeat(60))
console.log('Your Smart Account:', YOUR_ACCOUNT)
console.log('EntryPoint:', ENTRY_POINT)
console.log()

// Check current deposit
console.log('1️⃣  Checking current EntryPoint deposit...')
const currentDeposit = await publicClient.readContract({
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

console.log('   Current deposit:', Number(currentDeposit) / 1e18, 'ETH')

// Deposit 5 ETH
console.log('\n2️⃣  Depositing 5 ETH into EntryPoint...')

const hash = await walletClient.writeContract({
  address: ENTRY_POINT,
  abi: [{
    name: 'depositTo',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: []
  }],
  functionName: 'depositTo',
  args: [YOUR_ACCOUNT],
  value: parseEther('5')
})

console.log('   Transaction hash:', hash)
console.log('   Waiting for confirmation...')

const receipt = await publicClient.waitForTransactionReceipt({ hash })
console.log('   ✅ Confirmed in block:', receipt.blockNumber)

// Check new deposit
console.log('\n3️⃣  Verifying new deposit...')
const newDeposit = await publicClient.readContract({
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

console.log('   New deposit:', Number(newDeposit) / 1e18, 'ETH')
console.log('\n🎉 SUCCESS! Your smart account can now pay for gas!')
console.log('━'.repeat(60))
console.log('Next: Update EilService to use YOUR account instead of generating new one')
