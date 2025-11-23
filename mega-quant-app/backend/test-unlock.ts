/**
 * Test the password-based unlock system
 *
 * This script demonstrates how to:
 * 1. Connect to the WebSocket
 * 2. Send unlock message with password
 * 3. Receive confirmation that backend is using Alchemy
 */

import WebSocket from 'ws'

const WS_URL = 'ws://localhost:3001/ws/live-data'

// Get password from command line argument
const password = process.argv[2]

if (!password) {
  console.error('❌ Usage: tsx test-unlock.ts <password>')
  console.error('   Example: tsx test-unlock.ts mypassword123')
  process.exit(1)
}

console.log('🔌 Connecting to WebSocket...')
const ws = new WebSocket(WS_URL)

ws.on('open', () => {
  console.log('✅ Connected to WebSocket')
  console.log('🔓 Sending unlock message with password...')

  ws.send(JSON.stringify({
    type: 'unlock',
    payload: { password }
  }))
})

ws.on('message', (data) => {
  const message = JSON.parse(data.toString())
  console.log('📨 Received message:', message)

  if (message.type === 'unlocked') {
    console.log('✅ Backend unlocked successfully!')
    console.log('🚀 All networks now using Alchemy RPC endpoints')
    process.exit(0)
  }

  if (message.type === 'unlock_failed') {
    console.error('❌ Unlock failed:', message.error)
    process.exit(1)
  }
})

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message)
  process.exit(1)
})

ws.on('close', () => {
  console.log('🔌 WebSocket closed')
})

// Timeout after 10 seconds
setTimeout(() => {
  console.error('⏱️  Timeout waiting for unlock response')
  process.exit(1)
}, 10000)
