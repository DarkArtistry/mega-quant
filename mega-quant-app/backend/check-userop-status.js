import { http } from 'viem'

const BUNDLER_URL = 'https://vnet.erc4337.io/bundler/1'
const USER_OP_HASH = '0xad5bc9000c15dc1edcd88f054a043d97491833ef0b4666137cc0df9ee34b1616'

console.log('🔍 Checking UserOperation status...\n')
console.log('UserOp Hash:', USER_OP_HASH)
console.log('Bundler:', BUNDLER_URL)
console.log()

try {
  // Query bundler for UserOperation receipt
  const response = await fetch(BUNDLER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getUserOperationReceipt',
      params: [USER_OP_HASH]
    })
  })

  const result = await response.json()

  console.log('📊 Bundler Response:')
  console.log(JSON.stringify(result, null, 2))

  if (result.result) {
    console.log('\n✅ UserOperation WAS EXECUTED!')
    console.log('Transaction Hash:', result.result.receipt?.transactionHash)
    console.log('Block Number:', result.result.receipt?.blockNumber)
    console.log('Success:', result.result.success)
  } else if (result.error) {
    console.log('\n❌ Error from bundler:', result.error.message)
  } else {
    console.log('\n⏳ UserOperation not found yet (might still be pending)')
  }
} catch (error) {
  console.error('❌ Failed to query bundler:', error.message)
}
