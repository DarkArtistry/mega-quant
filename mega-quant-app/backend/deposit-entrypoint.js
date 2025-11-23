import { createWalletClient, createPublicClient, http, parseEther } from 'viem'
import { mainnet } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const EIL_RPC = 'https://virtual.rpc.tenderly.co/stitchApp/project/private/eil-eth/855f8569-52b8-4149-a19d-55cf5b8de368'
const ENTRY_POINT = '0x433709009B8330FDa32311DF1C2AFA402eD8D009'
const SMART_ACCOUNT = '0x7428514808b92d3c6628f549e9e47Aa16D3e8017'
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

console.log('🏦 Depositing ETH into EntryPoint for Smart Account')
console.log('━'.repeat(60))
console.log('Your EOA:', account.address)
console.log('Smart Account:', SMART_ACCOUNT)
console.log('EntryPoint:', ENTRY_POINT)
console.log('Network: EIL Virtual Network (Ethereum)\n')

// Check your EOA balance
const eoaBalance = await publicClient.getBalance({ address: account.address })
console.log('1️⃣  Checking your EOA balance...')
console.log('   Your ETH:', Number(eoaBalance) / 1e18, 'ETH\n')

if (Number(eoaBalance) === 0) {
  console.log('❌ Your EOA has no ETH on EIL network!')
  console.log('   You need to get ETH for your EOA on the EIL virtual network first.')
  process.exit(1)
}

// Check current EntryPoint deposit for smart account
console.log('2️⃣  Checking current EntryPoint deposit...')
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
  args: [SMART_ACCOUNT]
})

console.log('   Current deposit:', Number(currentDeposit) / 1e18, 'ETH\n')

// Determine deposit amount (1 ETH or whatever user has)
const depositAmount = Number(eoaBalance) > parseEther('1') ? '1' : String(Number(eoaBalance) * 0.9 / 1e18)
console.log('3️⃣  Depositing', depositAmount, 'ETH into EntryPoint...')

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
  args: [SMART_ACCOUNT],
  value: parseEther(depositAmount)
})

console.log('   Transaction hash:', hash)
console.log('   Waiting for confirmation...\n')

const receipt = await publicClient.waitForTransactionReceipt({ hash })
console.log('   ✅ Confirmed in block:', receipt.blockNumber)

// Check new deposit
console.log('\n4️⃣  Verifying new deposit...')
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
  args: [SMART_ACCOUNT]
})

console.log('   New deposit:', Number(newDeposit) / 1e18, 'ETH')
console.log('\n🎉 SUCCESS! Your smart account can now pay for gas!')
console.log('━'.repeat(60))
console.log('Next step: Try your cross-chain transfer again! 🚀')
