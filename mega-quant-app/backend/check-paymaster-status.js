import { createPublicClient, http, formatEther } from 'viem'
import { mainnet } from 'viem/chains'

const EIL_RPC = 'https://virtual.mainnet.eu.rpc.tenderly.co/a5658cee-add9-40a5-890c-2b32b3b4b2e4'
const PAYMASTER = '0x73Ca37d21Bb665df9899339ad31897747D782a7C'
const ENTRY_POINT = '0x433709009B8330FDa32311DF1C2AFA402eD8D009'

const client = createPublicClient({
  chain: mainnet,
  transport: http(EIL_RPC)
})

console.log('🔍 Checking Paymaster status on EIL network...\n')
console.log('Paymaster:', PAYMASTER)
console.log('EntryPoint:', ENTRY_POINT, '\n')

// Check if paymaster is deployed
const code = await client.getCode({ address: PAYMASTER })
console.log('Paymaster bytecode:', code ? `${code.length} bytes` : 'NOT DEPLOYED ❌')

if (!code) {
  console.log('\n❌ PROBLEM: Paymaster is not deployed on this network!')
  process.exit(1)
}

// Check paymaster's ETH balance
const ethBalance = await client.getBalance({ address: PAYMASTER })
console.log('Paymaster ETH balance:', formatEther(ethBalance), 'ETH')

// Check paymaster's EntryPoint deposit
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
  args: [PAYMASTER]
})

console.log('Paymaster EntryPoint deposit:', formatEther(deposit), 'ETH')

if (deposit > 0n) {
  console.log('\n✅ Paymaster has EntryPoint deposit - can sponsor gas!')
} else {
  console.log('\n❌ Paymaster has NO EntryPoint deposit - cannot sponsor gas!')
}

// Check USDC balance (if paymaster accepts USDC for gas)
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
try {
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
    args: [PAYMASTER]
  })
  console.log('Paymaster USDC balance:', Number(usdcBalance) / 1e6, 'USDC')
} catch (e) {
  console.log('Could not check USDC balance')
}
