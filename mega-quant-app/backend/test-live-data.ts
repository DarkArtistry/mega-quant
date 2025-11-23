/**
 * Test live data with unlocked Alchemy endpoints
 *
 * This script:
 * 1. Connects to WebSocket
 * 2. Unlocks with password
 * 3. Subscribes to live data
 * 4. Verifies price updates and mempool transactions
 */

import WebSocket from 'ws'

const WS_URL = 'ws://localhost:3001/ws/live-data'
const password = process.argv[2]

if (!password) {
  console.error('❌ Usage: tsx test-live-data.ts <password>')
  console.error('   Example: tsx test-live-data.ts Password2!')
  process.exit(1)
}

console.log('🔌 Connecting to WebSocket...')
const ws = new WebSocket(WS_URL)

let unlocked = false
let priceUpdates = 0
let mempoolTxs = 0

ws.on('open', () => {
  console.log('✅ Connected to WebSocket\n')

  console.log('🔓 Step 1: Sending unlock message...')
  ws.send(JSON.stringify({
    type: 'unlock',
    payload: { password }
  }))
})

ws.on('message', (data) => {
  const message = JSON.parse(data.toString())

  switch (message.type) {
    case 'connected':
      console.log('📡 WebSocket connected:', message.clientId)
      break

    case 'unlocked':
      console.log('✅ Step 2: Backend unlocked successfully!')
      console.log('   Message:', message.message)
      unlocked = true

      // Subscribe to Base Sepolia WETH/USDC
      console.log('\n📊 Step 3: Subscribing to Base Sepolia WETH/USDC...')
      ws.send(JSON.stringify({
        type: 'subscribe',
        payload: {
          networkId: 84532,
          pairSymbol: 'WETH/USDC',
          protocol: 'uniswap-v3'
        }
      }))
      break

    case 'unlock_failed':
      console.error('❌ Unlock failed:', message.error)
      process.exit(1)
      break

    case 'subscribed':
      console.log('✅ Step 4: Subscribed successfully!')
      console.log('   Network:', message.networkId)
      console.log('   Pair:', message.pairSymbol)
      console.log('   Protocol:', message.protocol)
      console.log('\n⏳ Waiting for live data...\n')
      break

    case 'price_update':
      priceUpdates++
      console.log(`📈 Price Update #${priceUpdates}:`)
      console.log(`   ${message.pairSymbol}: $${message.price.toFixed(4)}`)
      console.log(`   Network: ${message.networkId}`)
      console.log(`   Timestamp: ${new Date(message.timestamp).toLocaleTimeString()}`)
      console.log()

      if (priceUpdates >= 3) {
        console.log('✅ Step 5: Received multiple price updates - Price polling works!\n')
      }
      break

    case 'mempool_tx':
      mempoolTxs++
      console.log(`🔄 Mempool Transaction #${mempoolTxs}:`)
      console.log(`   Type: ${message.txType}`)
      console.log(`   Hash: ${message.hash.substring(0, 10)}...`)
      console.log(`   From: ${message.from.substring(0, 10)}...`)
      console.log(`   To: ${message.to.substring(0, 10)}...`)
      console.log(`   Value: ${message.value} ETH`)
      console.log(`   Network: ${message.networkId}`)
      console.log()

      if (mempoolTxs >= 3) {
        console.log('✅ Step 6: Received multiple mempool txs - Mempool monitoring works!\n')
      }
      break

    case 'historical_trades':
      console.log(`📜 Historical Trades:`)
      console.log(`   Found ${message.trades.length} recent trades`)
      if (message.trades.length > 0) {
        console.log(`   Latest trade: ${message.trades[0].type} at $${message.trades[0].price.toFixed(4)}`)
      }
      console.log()
      break

    case 'error':
      console.error('❌ Error:', message.error)
      break
  }

  // Success criteria: Received data from all sources
  if (unlocked && priceUpdates >= 3 && mempoolTxs >= 3) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎉 SUCCESS! All live data working with Alchemy!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ Unlock: Working')
    console.log('✅ Price Updates: Working')
    console.log('✅ Mempool Transactions: Working')
    console.log('✅ Alchemy RPC: Working')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    process.exit(0)
  }
})

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message)
  process.exit(1)
})

ws.on('close', () => {
  console.log('🔌 WebSocket closed')
})

// Timeout after 30 seconds
setTimeout(() => {
  console.error('\n⏱️  Timeout after 30 seconds')
  console.log(`   Price updates: ${priceUpdates}`)
  console.log(`   Mempool txs: ${mempoolTxs}`)
  console.log(`   Unlocked: ${unlocked}`)
  process.exit(1)
}, 30000)
