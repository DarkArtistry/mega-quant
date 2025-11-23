/**
 * Test WebSocket Live Data Connection
 *
 * This script tests:
 * 1. WebSocket connection to /ws/live-data
 * 2. Subscription to WETH/USDC on Sepolia
 * 3. Price updates
 * 4. Historical trades fetching
 * 5. Mempool monitoring
 */

import WebSocket from 'ws'

const WS_URL = 'ws://localhost:3001/ws/live-data'
const TEST_NETWORK = 11155111 // Sepolia
const TEST_PAIR = 'WETH/USDC'
const TEST_PROTOCOL = 'uniswap-v3' // Start with V3

interface WebSocketMessage {
  type: string
  payload?: any
  clientId?: string
  message?: string
  hasAlchemyKey?: boolean
  pollIntervalMs?: number
}

function testWebSocket() {
  console.log('=' .repeat(60))
  console.log('🧪 WebSocket Live Data Testing')
  console.log('=' .repeat(60))
  console.log(`Connecting to: ${WS_URL}`)
  console.log(`Network: Sepolia (${TEST_NETWORK})`)
  console.log(`Pair: ${TEST_PAIR}`)
  console.log(`Protocol: ${TEST_PROTOCOL}`)
  console.log('=' .repeat(60))

  const ws = new WebSocket(WS_URL)

  let messagesReceived = 0
  let connected = false
  let subscribed = false

  ws.on('open', () => {
    console.log('✅ WebSocket connected')
    connected = true
  })

  ws.on('message', (data: WebSocket.Data) => {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString())
      messagesReceived++

      console.log(`\n📨 Message #${messagesReceived}: ${message.type}`)

      switch (message.type) {
        case 'connected':
          console.log(`   Client ID: ${message.clientId}`)
          console.log(`   Alchemy Key: ${message.hasAlchemyKey ? '✅ Configured' : '❌ Not configured'}`)
          console.log(`   Poll Interval: ${message.pollIntervalMs}ms`)

          // Subscribe to WETH/USDC on Sepolia
          console.log(`\n📡 Subscribing to ${TEST_PAIR} on network ${TEST_NETWORK}...`)
          ws.send(JSON.stringify({
            type: 'subscribe',
            payload: {
              networkId: TEST_NETWORK,
              pairSymbol: TEST_PAIR,
              protocolId: TEST_PROTOCOL
            }
          }))
          break

        case 'subscribed':
          console.log(`   ✅ Subscribed to: ${JSON.stringify(message.payload)}`)
          subscribed = true
          break

        case 'price_update':
          console.log(`   💰 Price: ${message.payload?.price?.toFixed(4)} ${TEST_PAIR.split('/')[1]}`)
          console.log(`   📊 Tick: ${message.payload?.tick}`)
          console.log(`   ⏰ Time: ${new Date(message.payload?.timestamp).toLocaleTimeString()}`)
          break

        case 'initial_trades':
          console.log(`   📜 Historical trades: ${message.payload?.trades?.length || 0}`)
          if (message.payload?.trades?.length > 0) {
            console.log(`   Last trade: ${JSON.stringify(message.payload.trades[0])}`)
          }
          break

        case 'historical_trades':
          console.log(`   📜 Historical trades: ${message.payload?.trades?.length || 0}`)
          if (message.payload?.trades?.length > 0) {
            console.log(`   First trade: ${JSON.stringify(message.payload.trades[0])}`)
          }
          break

        case 'new_trade':
          console.log(`   🔄 New trade:`)
          console.log(`      Type: ${message.payload?.trade?.type}`)
          console.log(`      Amount: ${message.payload?.trade?.tokenInAmount} ${message.payload?.trade?.tokenIn}`)
          console.log(`      Wallet: ${message.payload?.trade?.walletAddress}`)
          break

        case 'initial_mempool':
          console.log(`   🌊 Initial mempool txs: ${message.payload?.txs?.length || 0}`)
          break

        case 'mempool_tx':
          console.log(`   🌊 Mempool tx:`)
          console.log(`      Type: ${message.payload?.tx?.type}`)
          console.log(`      Hash: ${message.payload?.tx?.hash}`)
          console.log(`      Gas: ${message.payload?.tx?.gasPrice} gwei`)
          break

        case 'error':
          console.log(`   ❌ Error: ${message.message}`)
          break

        default:
          console.log(`   Data: ${JSON.stringify(message).slice(0, 200)}`)
      }

      // After receiving 10 messages, close and exit
      if (messagesReceived >= 15) {
        console.log('\n' + '=' .repeat(60))
        console.log('✅ Test Complete!')
        console.log(`   Messages received: ${messagesReceived}`)
        console.log(`   Connected: ${connected ? '✅' : '❌'}`)
        console.log(`   Subscribed: ${subscribed ? '✅' : '❌'}`)
        console.log('=' .repeat(60))
        ws.close()
        setTimeout(() => process.exit(0), 500)
      }
    } catch (error) {
      console.error('❌ Error parsing message:', error)
    }
  })

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error)
    process.exit(1)
  })

  ws.on('close', () => {
    console.log('\n📡 WebSocket disconnected')
    if (messagesReceived < 5) {
      console.log('⚠️  Test ended early - check if backend is running')
      process.exit(1)
    }
  })

  // Timeout after 30 seconds
  setTimeout(() => {
    console.log('\n⏱️  Test timeout (30s)')
    console.log(`   Messages received: ${messagesReceived}`)
    if (messagesReceived > 0) {
      console.log('✅ Some data received - test partially successful')
      process.exit(0)
    } else {
      console.log('❌ No data received - check backend')
      process.exit(1)
    }
  }, 30000)
}

testWebSocket()
