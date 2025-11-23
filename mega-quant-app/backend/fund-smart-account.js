import { createWalletClient, createPublicClient, http, parseEther } from 'viem'
import { mainnet } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

// EIL Virtual Network
const EIL_RPC = 'https://virtual.rpc.tenderly.co/stitchApp/project/private/eil-eth/855f8569-52b8-4149-a19d-55cf5b8de368'

// Addresses
const SMART_ACCOUNT = '0x7428514808b92d3c6628f549e9e47Aa16D3e8017'
const EOA_PRIVATE_KEY = '0x33bca9d9d6a59eda33a2835c1f65c37cd63b00f6aaf6872fe85c7ff4b04a4d1b'

// Amount to send (0.5 ETH)
const AMOUNT = '0.5'

const account = privateKeyToAccount(EOA_PRIVATE_KEY)

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(EIL_RPC)
})

const walletClient = createWalletClient({
  chain: mainnet,
  transport: http(EIL_RPC),
  account
})

console.log('🏦 Funding Smart Account on EIL Virtual Network\n')
console.log('From (EOA):', account.address)
console.log('To (Smart Account):', SMART_ACCOUNT)
console.log('Amount:', AMOUNT, 'ETH\n')

// Check balances before
const balanceBefore = await publicClient.getBalance({ address: SMART_ACCOUNT })
const eoaBalance = await publicClient.getBalance({ address: account.address })

console.log('Before:')
console.log('  EOA Balance:', Number(eoaBalance) / 1e18, 'ETH')
console.log('  Smart Account Balance:', Number(balanceBefore) / 1e18, 'ETH\n')

if (Number(eoaBalance) < parseEther(AMOUNT)) {
  console.log('❌ EOA does not have enough ETH on EIL network!')
  console.log('   You need to get ETH for your EOA on the EIL virtual network first.')
  process.exit(1)
}

// Send ETH
console.log('💸 Sending', AMOUNT, 'ETH to Smart Account...')
const hash = await walletClient.sendTransaction({
  to: SMART_ACCOUNT,
  value: parseEther(AMOUNT)
})

console.log('Transaction hash:', hash)
console.log('Waiting for confirmation...\n')

await publicClient.waitForTransactionReceipt({ hash })

// Check balance after
const balanceAfter = await publicClient.getBalance({ address: SMART_ACCOUNT })
console.log('After:')
console.log('  Smart Account Balance:', Number(balanceAfter) / 1e18, 'ETH')
console.log('\n✅ Done! Your smart account now has ETH to pay for gas!')
