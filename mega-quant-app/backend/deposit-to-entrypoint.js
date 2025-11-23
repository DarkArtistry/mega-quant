import { createWalletClient, createPublicClient, http, parseEther } from 'viem'
import { mainnet } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const EIL_RPC = 'https://virtual.rpc.tenderly.co/stitchApp/project/private/eil-eth/855f8569-52b8-4149-a19d-55cf5b8de368'
const ENTRY_POINT = '0x433709009B8330FDa32311DF1C2AFA402eD8D009'
const SMART_ACCOUNT = '0x7428514808b92d3c6628f549e9e47Aa16D3e8017'

// Private key that controls the smart account's ETH
// (We need to send from an account that has ETH on EIL network)
const PRIVATE_KEY = '0x33bca9d9d6a59eda33a2835c1f65c37cd63b00f6aaf6872fe85c7ff4b04a4d1b'

const account = privateKeyToAccount(PRIVATE_KEY)

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(EIL_RPC)
})

const walletClient = createWalletClient({
  chain: mainnet,
  transport: http(EIL_RPC),
  account
})

console.log('🏦 Depositing ETH into EntryPoint for Smart Account\n')
console.log('Smart Account:', SMART_ACCOUNT)
console.log('EntryPoint:', ENTRY_POINT)
console.log('Amount: 1 ETH\n')

// Check current deposit
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

console.log('Current deposit:', Number(currentDeposit) / 1e18, 'ETH')

// Deposit via depositTo
console.log('\n💸 Depositing 1 ETH...')

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
  value: parseEther('1')
})

console.log('Transaction hash:', hash)
console.log('Waiting for confirmation...\n')

await publicClient.waitForTransactionReceipt({ hash })

// Check new deposit
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

console.log('New deposit:', Number(newDeposit) / 1e18, 'ETH')
console.log('\n✅ Done! Smart account can now pay for gas from EntryPoint deposit!')
