// Test if Quoter contract is being used
import { DeltaTrade } from './dist/lib/trading/DeltaTrade.js'

const PRIVATE_KEY = ''

const dt = new DeltaTrade({
  chains: ['base'],
  executionId: 'test-123',
  strategyId: 'test',
  accounts: {
    base: PRIVATE_KEY
  }
})

await dt.initialize()

console.log('\n🔍 Testing V4 Quoter...\n')

try {
  const quote = await dt.base.uniswapV4.getQuote({
    tokenIn: 'WETH',
    tokenOut: 'USDC',
    amountIn: '0.0001',
    fee: 500,
    tickSpacing: 10
  })

  console.log('✅ Quote successful!')
  console.log(`   ${quote.amountOut} USDC`)
  console.log(`   Rate: ${quote.exchangeRate}`)
} catch (error) {
  console.error('❌ Quote failed:', error.message)
}

process.exit(0)
