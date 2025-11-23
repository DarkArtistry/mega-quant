import { http, createPublicClient } from 'viem'
import { mainnet } from 'viem/chains'

const BUNDLER_URL = 'https://vnet.erc4337.io/bundler/1'
const ENTRY_POINT = '0x433709009B8330FDa32311DF1C2AFA402eD8D009'

console.log('🔍 Testing bundler connection...\n')

// Create client
const client = createPublicClient({
  chain: mainnet,
  transport: http(BUNDLER_URL)
})

try {
  // Test: Check supported entry points
  const response = await fetch(BUNDLER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_supportedEntryPoints',
      params: []
    })
  })

  const data = await response.json()
  console.log('✅ Bundler response:', JSON.stringify(data, null, 2))

  if (data.result && data.result.includes(ENTRY_POINT)) {
    console.log(`\n✅ Bundler supports our EntryPoint: ${ENTRY_POINT}`)
  } else {
    console.log(`\n❌ Bundler does NOT support our EntryPoint!`)
    console.log(`   Expected: ${ENTRY_POINT}`)
    console.log(`   Supported:`, data.result)
  }

} catch (error) {
  console.error('❌ Bundler test failed:', error.message)
}
