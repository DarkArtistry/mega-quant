import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { initDatabase, closeDatabase } from './db/index.js'
import { liveDataService } from './services/live-data.js'

// Import routes
import strategiesRouter from './routes/strategies.js'
import strategyAccountsRouter from './routes/strategy-accounts.js'
import executionsRouter from './routes/executions.js'
import tradesRouter from './routes/trades.js'
import portfolioRouter from './routes/portfolio.js'
import balancesRouter from './routes/balances.js'
import rpcRouter from './routes/rpc.js'
import apiValidationRouter from './routes/api-validation.js'
import configRouter from './routes/config.js'
import configEncryptedRouter from './routes/config-encrypted.js'
import securityRouter from './routes/security.js'
import hdWalletsRouter from './routes/hd-wallets.js'
import tradingRouter from './routes/trading.js'
import pricesRouter from './routes/prices.js'
import crossChainRouter from './routes/cross-chain.js'
import transferRouter from './routes/transfer.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Request logging middleware (skip HEAD requests from wait-on polling)
app.use((req, res, next) => {
  if (req.method !== 'HEAD') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  }
  next()
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// API routes
app.use('/api/security', securityRouter)
app.use('/api/hd-wallets', hdWalletsRouter)
app.use('/api/strategies', strategiesRouter)
app.use('/api/strategy-accounts', strategyAccountsRouter)
app.use('/api/executions', executionsRouter)
app.use('/api/trades', tradesRouter)
app.use('/api/trading', tradingRouter) // DeltaTrade execution API
app.use('/api/portfolio', portfolioRouter)
app.use('/api/balances', balancesRouter) // Token balance fetching
app.use('/api/rpc', rpcRouter) // RPC URL management
app.use('/api/prices', pricesRouter) // Token price fetching
app.use('/api/transfer', transferRouter) // Direct transfers (same-chain)
app.use('/api/cross-chain', crossChainRouter) // Cross-chain transfers (EIL)
app.use('/api/validate', apiValidationRouter)
app.use('/api/config', configRouter) // Legacy unencrypted routes
app.use('/api/config-encrypted', configEncryptedRouter) // New encrypted routes

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500
    }
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Not found',
      status: 404
    }
  })
})

// Create HTTP server for both Express and WebSocket
const httpServer = createServer(app)

// Start server
async function startServer() {
  try {
    // Initialize SQLite database (auto-creates if doesn't exist)
    console.log('🔌 Initializing database...')
    initDatabase()
    console.log('✅ Database ready!')

    // Initialize Live Data WebSocket service
    console.log('🔴 Initializing Live Data WebSocket service...')
    liveDataService.initialize(httpServer)
    console.log('✅ Live Data WebSocket ready on /ws/live-data')

    // Initialize Direct Transfer Service
    console.log('💸 Initializing direct transfer service...')
    try {
      const { directTransferService } = await import('./lib/transfer/DirectTransferService.js')
      directTransferService.initialize({
        1: liveDataService.getRpcUrl(1),      // Ethereum
        8453: liveDataService.getRpcUrl(8453) // Base
      })
      console.log('✅ Direct transfer service ready')
    } catch (error: any) {
      console.warn('⚠️  Direct transfer service initialization failed:', error.message)
    }

    // Initialize EIL Service with DYNAMIC RPC getter (updates when app unlocks!)
    console.log('🌉 Initializing EIL cross-chain service...')
    try {
      const { eilService } = await import('./lib/eil/EilService.js')
      // Pass function that dynamically gets RPC URLs - updates when unlocked!
      await eilService.initialize((chainId: number) => liveDataService.getRpcUrl(chainId))
      console.log('✅ EIL cross-chain service ready')
    } catch (error: any) {
      console.warn('⚠️  EIL service initialization skipped:', error.message)
      console.warn('   Cross-chain transfers will not be available until EIL is configured')
    }

    // Start listening
    httpServer.listen(PORT, () => {
      console.log(`\n${'='.repeat(60)}`)
      console.log('🚀 MEGA QUANT Backend API Server')
      console.log(`${'='.repeat(60)}`)
      console.log(`📡 HTTP Server: http://localhost:${PORT}`)
      console.log(`🔴 WebSocket: ws://localhost:${PORT}/ws/live-data`)
      console.log(`💾 Database: SQLite (zero-config)`)
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(`${'='.repeat(60)}\n`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\nShutting down gracefully...')
  liveDataService.shutdown()
  closeDatabase()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n\nShutting down gracefully...')
  liveDataService.shutdown()
  closeDatabase()
  process.exit(0)
})

// Start the server
startServer()

export default app
