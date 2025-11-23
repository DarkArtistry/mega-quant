import { WebSocket, WebSocketServer } from 'ws'
import { ethers } from 'ethers'
import type { Server } from 'http'
import { getDatabase } from '../db/index.js'
import { protocolRegistry } from '../protocols/ProtocolRegistry.js'
import { getTokensForPair } from '../config/tokens.js'
import { loadRpcUrls, hasEncryptedAlchemyApiKey, buildRpcUrl } from './rpc-config-loader.js'
import { loadDecryptedRpcConfigs } from './encryption-service.js'

// Uniswap V3 Pool ABI (minimal for slot0 and Swap events)
const UNISWAP_V3_POOL_ABI = [
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)'
]

// Uniswap V4 Quoter ABI
const UNISWAP_V4_QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) poolKey, bool zeroForOne, uint128 exactAmount, bytes hookData) params) external returns (uint256 amountOut, uint256 gasEstimate)'
]

// ERC20 ABI for getting token info
const ERC20_ABI = [
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)'
]

// Uniswap V3 Router addresses for mempool filtering
const UNISWAP_V3_ROUTERS: Record<number, string[]> = {
  1: ['0xE592427A0AEce92De3Edee1F18E0157C05861564', '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'], // Mainnet
  11155111: ['0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E'], // Sepolia
  8453: ['0x2626664c2603336E57B271c5C0b26F421741e481'], // Base
  84532: ['0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4'], // Base Sepolia
}

// Uniswap V3 Pool addresses by network and pair (WETH/USDC only)
const POOL_ADDRESSES: Record<number, Record<string, string>> = {
  1: { // Ethereum Mainnet
    'WETH/USDC': '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640', // 0.05% fee pool
  },
  11155111: { // Sepolia
    'WETH/USDC': '0x9799b5edc1aa7d3fad350309b08df3f64914e244',
  },
  8453: { // Base
    'WETH/USDC': '0xd0b53D9277642d899DF5C87A3966A349A798F224',
  },
  84532: { // Base Sepolia
    'WETH/USDC': '0x46880b404CD35c165EDdefF7421019F8dD25F4Ad', // 0.3% fee tier - highest liquidity
  },
}

// Uniswap V4 Quoter addresses by network
const V4_QUOTER_ADDRESSES: Record<number, string> = {
  1: '0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203',        // Ethereum
  8453: '0x0d5e0f971ed27fbff6c2837bf31316121532048d',     // Base
  10: '0x1f3131a13296fb91c90870043742c3cdbff1a8d7',      // Optimism
  42161: '0x3972c00f7ed4885e145823eb7c655375d275a1c5',   // Arbitrum
  137: '0xb3d5c3dfc3a7aebff71895a7191796bffc2c81b9',     // Polygon
}

// Uniswap V4 Pool configurations (PoolKey structure)
interface V4PoolKey {
  currency0: string  // Token address
  currency1: string  // Token address
  fee: number        // Fee tier (e.g., 3000 = 0.3%)
  tickSpacing: number // Tick spacing
  hooks: string      // Hooks contract address (0x0 for no hooks)
}

const V4_POOL_CONFIGS: Record<number, Record<string, V4PoolKey>> = {
  1: { // Ethereum Mainnet
    // Add V4 pools here as they become available
    // Example:
    // 'WETH/USDC': {
    //   currency0: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    //   currency1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    //   fee: 500,
    //   tickSpacing: 10,
    //   hooks: '0x0000000000000000000000000000000000000000'
    // }
  },
  8453: { // Base
    // Add Base V4 pools here
  },
}

// 1inch token addresses for WETH/USDC pairs
const TOKEN_ADDRESSES: Record<number, { WETH: string; USDC: string }> = {
  1: { // Ethereum Mainnet
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
  },
  11155111: { // Sepolia
    WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
    USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
  },
  8453: { // Base
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
  },
  84532: { // Base Sepolia
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
  }
}

// 1inch API base URL
const ONEINCH_API_BASE = 'https://api.1inch.dev/swap/v6.0'

// Network RPC URLs (fallback when Alchemy is not available)
const DEFAULT_RPC_URLS: Record<number, string> = {
  1: 'https://eth.llamarpc.com',
  11155111: 'https://ethereum-sepolia-rpc.publicnode.com', // PublicNode - tested and working
  8453: 'https://mainnet.base.org',
  84532: 'https://sepolia.base.org',
}

// RPC request timeout (ms)
const RPC_TIMEOUT = 15000 // 15 seconds (PublicNode can be slow)

// Types
interface LiveDataSubscription {
  clientId: string
  networkId: number
  poolAddress: string
  pairSymbol: string
  protocolId: string // Protocol to monitor (uniswap-v3, uniswap-v4, 1inch)
}

interface TradeData {
  time: string
  type: 'buy' | 'sell'
  tokenIn: string
  tokenInAmount: number
  tokenOut: string
  tokenOutAmount: number
  gasPrice: number
  walletAddress: string
  txHash: string
  blockNumber: number
}

interface MempoolTx {
  hash: string
  from: string
  to: string
  value: string
  gasPrice: number
  timestamp: number
  type: 'buy' | 'sell' | 'transfer'
  data?: string
}

interface PriceUpdate {
  price: number
  sqrtPriceX96: string
  tick: number
  timestamp: number
}

// Ring buffer for memory-efficient storage
class RingBuffer<T> {
  private buffer: T[] = []
  private maxSize: number

  constructor(maxSize: number) {
    this.maxSize = maxSize
  }

  push(item: T): void {
    if (this.buffer.length >= this.maxSize) {
      this.buffer.shift()
    }
    this.buffer.push(item)
  }

  getAll(): T[] {
    return [...this.buffer]
  }

  clear(): void {
    this.buffer = []
  }
}

// Main Live Data Service
class LiveDataService {
  private wss: WebSocketServer | null = null
  private clients: Map<string, WebSocket> = new Map()
  private subscriptions: Map<string, LiveDataSubscription[]> = new Map()
  private providers: Map<number, ethers.JsonRpcProvider> = new Map()
  private wsProviders: Map<number, ethers.WebSocketProvider> = new Map()
  private alchemyWsProviders: Map<number, ethers.WebSocketProvider> = new Map()
  private priceIntervals: Map<string, NodeJS.Timeout> = new Map()
  private eventListeners: Map<string, ethers.Contract> = new Map()
  private mempoolIntervals: Map<number, NodeJS.Timeout> = new Map()
  private mempoolListeners: Map<number, boolean> = new Map() // Track active mempool listeners

  // Data caches with ring buffers (max 50 items per pool)
  private recentTrades: Map<string, RingBuffer<TradeData>> = new Map()
  private mempoolTxs: Map<number, RingBuffer<MempoolTx>> = new Map()
  private latestPrices: Map<string, PriceUpdate> = new Map()
  private tokenDecimals: Map<string, number> = new Map() // Cache token decimals
  private tokenSymbols: Map<string, string> = new Map() // Cache token symbols

  // RPC config (can be updated with user's Alchemy keys)
  private rpcUrls: Record<number, string> = { ...DEFAULT_RPC_URLS }
  private alchemyApiKey: string = ''
  private pollIntervalMs: number = 5000 // Default 5 seconds

  initialize(server: Server): void {
    // Load RPC configurations from database (managed nodes)
    this.loadRpcConfigurationsFromDb()
    this.wss = new WebSocketServer({ server, path: '/ws/live-data' })

    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId()
      this.clients.set(clientId, ws)
      this.subscriptions.set(clientId, [])

      console.log(`[LiveData] Client connected: ${clientId}`)

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          this.handleMessage(clientId, message)
        } catch (error) {
          console.error('[LiveData] Invalid message:', error)
        }
      })

      ws.on('close', () => {
        console.log(`[LiveData] Client disconnected: ${clientId}`)
        this.handleDisconnect(clientId)
      })

      ws.on('error', (error) => {
        console.error(`[LiveData] WebSocket error for ${clientId}:`, error)
      })

      // Send connection confirmation with status
      this.sendToClient(clientId, {
        type: 'connected',
        clientId,
        hasAlchemyKey: this.hasAlchemyKey(),
        pollIntervalMs: this.pollIntervalMs
      })
    })

    console.log('[LiveData] WebSocket server initialized on /ws/live-data')
  }

  private loadRpcConfigurationsFromDb(): void {
    try {
      console.log('[LiveData] 📡 Loading RPC configurations from database...')

      // Check if Alchemy API key is encrypted
      const hasEncryptedKey = hasEncryptedAlchemyApiKey()
      if (hasEncryptedKey) {
        console.log('[LiveData] 🔒 Alchemy API key is ENCRYPTED')
        console.log('[LiveData] 💡 Frontend must send unlock message with password to decrypt')
      } else {
        console.log('[LiveData] ⚠️  No Alchemy API key configured in database')
      }

      // Load RPC URLs based on managed node configurations
      // Will use fallback public RPCs until unlock message is received
      this.rpcUrls = loadRpcUrls(DEFAULT_RPC_URLS)

      // Only load custom RPCs from file if Alchemy is NOT configured in database
      // This prevents custom-rpcs.json from overriding user's Alchemy selection
      if (!hasEncryptedKey) {
        console.log('[LiveData] ℹ️  No Alchemy configured - checking for custom-rpcs.json...')
        this.loadCustomRpcsFromFile()
      } else {
        console.log('[LiveData] ⏭️  Skipping custom-rpcs.json (Alchemy is configured)')
      }

      console.log('[LiveData] 📊 RPC Configuration Summary:')
      for (const [networkId, url] of Object.entries(this.rpcUrls)) {
        const isAlchemy = url.includes('alchemy.com')
        const provider = isAlchemy ? 'Alchemy' : 'Public RPC'
        console.log(`[LiveData]   Network ${networkId}: ${provider}`)
      }
    } catch (error) {
      console.error('[LiveData] ❌ Error loading RPC configurations:', error)
      console.log('[LiveData] Falling back to default public RPCs')
    }
  }

  /**
   * Unlock: Decrypt API keys using password
   */
  private async handleUnlock(clientId: string, password: string): Promise<void> {
    try {
      console.log('[LiveData] 🔓 Unlocking with password...')

      // Load and decrypt all RPC configurations
      const { alchemyApiKey, coinMarketCapApiKey, customRpcUrls } = loadDecryptedRpcConfigs(password)

      // Check if we have any RPC configuration
      const hasCustomRpcs = Object.keys(customRpcUrls).length > 0
      if (!alchemyApiKey && !hasCustomRpcs) {
        this.sendToClient(clientId, {
          type: 'unlock_failed',
          error: 'No RPC configuration found. Please configure Alchemy API key or Custom RPCs.'
        })
        return
      }

      // Configure RPC endpoints
      if (alchemyApiKey || hasCustomRpcs) {
        // Use a placeholder for Alchemy key if not configured but we have custom RPCs
        const apiKeyToUse = alchemyApiKey || ''
        await this.configureAlchemyFromClient(apiKeyToUse, customRpcUrls)
      }

      // Configure PriceService with CoinMarketCap API key
      if (coinMarketCapApiKey) {
        const { priceService } = await import('../lib/trading/services/PriceService.js')
        priceService.setCoinMarketCapApiKey(coinMarketCapApiKey)
        console.log('[LiveData] ✅ CoinMarketCap API key configured for price service')
      } else {
        console.warn('[LiveData] ⚠️ No CoinMarketCap API key found - price service will use fallback prices')
      }

      // Load all accounts into memory
      try {
        const { loadAllAccounts } = await import('./load-all-accounts.js')
        const { accountKeyStore } = await import('./account-key-store.js')

        const accounts = loadAllAccounts(password)
        accountKeyStore.loadAccounts(accounts)
        console.log(`[LiveData] ✅ Loaded ${accounts.length} accounts into memory`)
      } catch (error: any) {
        console.error('[LiveData] ⚠️ Failed to load accounts:', error.message)
        // Continue anyway - accounts are optional
      }

      // Notify client
      this.sendToClient(clientId, {
        type: 'unlocked',
        success: true,
        message: 'Successfully unlocked and configured RPC endpoints'
      })

      console.log('[LiveData] ✅ Unlocked successfully')

    } catch (error: any) {
      console.error('[LiveData] ❌ Unlock failed:', error.message)
      this.sendToClient(clientId, {
        type: 'unlock_failed',
        error: error.message || 'Unlock failed'
      })
    }
  }

  /**
   * Lock: Clear all sensitive data from memory
   */
  private async handleLock(clientId: string): Promise<void> {
    try {
      console.log('[LiveData] 🔒 Locking and clearing sensitive data...')

      // Clear all account private keys from memory
      const { accountKeyStore } = await import('./account-key-store.js')
      accountKeyStore.clear()

      // Clear Alchemy API key from memory
      this.alchemyApiKey = ''

      // Reset to default public RPCs
      this.rpcUrls = { ...DEFAULT_RPC_URLS }

      // Clear cached providers (they have the old RPC URLs)
      this.providers.clear()
      this.alchemyWsProviders.clear()

      // Stop all services
      await this.stopAllServices()

      // Notify client
      this.sendToClient(clientId, {
        type: 'locked',
        success: true,
        message: 'All sensitive data cleared from memory'
      })

      console.log('[LiveData] ✅ Locked successfully - all sensitive data cleared')

    } catch (error: any) {
      console.error('[LiveData] ❌ Lock failed:', error.message)
    }
  }

  /**
   * Stop all active services
   */
  private async stopAllServices(): Promise<void> {
    // Stop all price polling
    for (const [poolKey, interval] of this.priceIntervals) {
      clearInterval(interval)
    }
    this.priceIntervals.clear()

    // Stop all mempool monitoring
    for (const networkId of this.mempoolListeners.keys()) {
      this.stopMempoolMonitoring(networkId)
    }

    console.log('[LiveData] ✅ All services stopped')
  }

  // Allow frontend to pass decrypted Alchemy key
  async configureAlchemyFromClient(apiKey: string, customRpcUrls?: Record<number, string>): Promise<void> {
    console.log(`[LiveData] 🔑 Configuring with Alchemy key: ${apiKey ? `${apiKey.slice(0, 10)}...` : 'NONE'}`)

    const hasCustomRpcs = customRpcUrls && Object.keys(customRpcUrls).length > 0
    const hasValidAlchemyKey = apiKey && apiKey !== 'configured_but_encrypted'

    // Need at least one of: Alchemy key OR custom RPCs
    if (!hasValidAlchemyKey && !hasCustomRpcs) {
      console.log('[LiveData] ⚠️ No valid RPC configuration provided')
      return
    }

    // Set Alchemy key if provided
    if (hasValidAlchemyKey) {
      const hadPreviousKey = this.hasAlchemyKey() && this.alchemyApiKey !== 'configured_but_encrypted'
      console.log(`[LiveData] Previous key status: ${hadPreviousKey ? 'HAD KEY' : 'NO KEY'}`)
      this.setAlchemyKey(apiKey)
      console.log('[LiveData] ✅ Alchemy API key configured')
    }

    // Apply custom RPC URLs if provided
    if (hasCustomRpcs) {
      for (const [networkId, customUrl] of Object.entries(customRpcUrls!)) {
        this.rpcUrls[parseInt(networkId)] = customUrl
        console.log(`[LiveData] ✅ Custom RPC for network ${networkId}: ${customUrl}`)
      }
    }

    console.log('[LiveData] ✅ RPC configuration completed successfully')

    // Restart ALL services to use new RPC endpoints
    console.log('[LiveData] 🔄 Restarting all services with configured RPC endpoints...')
    await this.restartAllServices()
  }

  private async restartAllServices(): Promise<void> {
    console.log('[LiveData] 🛑 Stopping all price polling intervals...')

    // Stop all price polling
    for (const [poolKey, interval] of this.priceIntervals) {
      clearInterval(interval)
      console.log(`[LiveData] Stopped price polling for ${poolKey}`)
    }
    this.priceIntervals.clear()

    // Restart mempool monitoring
    await this.restartMempoolMonitoring()

    // Restart price polling for all active subscriptions
    const activeSubscriptions = new Map<string, { networkId: number; poolAddress: string; pairSymbol: string }>()

    for (const subs of this.subscriptions.values()) {
      for (const sub of subs) {
        const key = `${sub.networkId}_${sub.poolAddress}`
        if (!activeSubscriptions.has(key)) {
          activeSubscriptions.set(key, {
            networkId: sub.networkId,
            poolAddress: sub.poolAddress,
            pairSymbol: sub.pairSymbol
          })
        }
      }
    }

    console.log(`[LiveData] 🔄 Restarting ${activeSubscriptions.size} price polling services...`)

    for (const { networkId, poolAddress, pairSymbol } of activeSubscriptions.values()) {
      await this.startPricePolling(networkId, poolAddress, pairSymbol)
      console.log(`[LiveData] ✅ Restarted price polling for ${pairSymbol} on network ${networkId}`)
    }

    console.log('[LiveData] ✅ All services restarted with Alchemy endpoints')
  }

  private async restartMempoolMonitoring(): Promise<void> {
    // Get all active networks from mempool listeners
    const activeNetworks = Array.from(this.mempoolListeners.keys())

    // Stop existing monitoring
    for (const networkId of activeNetworks) {
      this.stopMempoolMonitoring(networkId)
    }

    // Restart with Alchemy
    // TODO: Update this when mempool monitoring is needed
    // for (const networkId of activeNetworks) {
    //   await this.startMempoolMonitoring(networkId, 'protocol', 'pair')
    // }
  }

  private stopMempoolMonitoring(networkId: number): void {
    // Clear simulation interval if exists
    const interval = this.mempoolIntervals.get(networkId)
    if (interval) {
      clearInterval(interval)
      this.mempoolIntervals.delete(networkId)
    }

    // Close Alchemy WebSocket if exists
    const wsProvider = this.alchemyWsProviders.get(networkId)
    if (wsProvider) {
      console.log(`[LiveData] Stopping Alchemy WebSocket for network ${networkId}`)
      wsProvider.removeAllListeners()
      wsProvider.destroy()
      this.alchemyWsProviders.delete(networkId)
    }

    // Remove from listeners
    this.mempoolListeners.delete(networkId)
  }

  setAlchemyKey(apiKey: string): void {
    this.alchemyApiKey = apiKey
    if (apiKey) {
      // Update RPC URLs to use Alchemy
      this.rpcUrls[1] = `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`
      this.rpcUrls[11155111] = `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`
      this.rpcUrls[8453] = `https://base-mainnet.g.alchemy.com/v2/${apiKey}`
      this.rpcUrls[84532] = `https://base-sepolia.g.alchemy.com/v2/${apiKey}`

      console.log('[LiveData] ✅ Alchemy API key configured - Using Alchemy RPC endpoints')
      console.log('[LiveData] Sepolia RPC: https://eth-sepolia.g.alchemy.com/v2/[key]')

      // Clear cached providers to use new URLs
      const providerCount = this.providers.size
      this.providers.clear()
      this.alchemyWsProviders.clear()

      if (providerCount > 0) {
        console.log(`[LiveData] Cleared ${providerCount} cached providers - will recreate with Alchemy endpoints`)
      }
    }
  }

  hasAlchemyKey(): boolean {
    return !!this.alchemyApiKey
  }

  /**
   * Get the configured RPC URL for a network
   * Returns the dynamically configured RPC (Alchemy/custom) if unlocked, otherwise fallback
   */
  public getRpcUrl(networkId: number): string {
    const url = this.rpcUrls[networkId] || DEFAULT_RPC_URLS[networkId]
    console.log(`[LiveData] getRpcUrl(${networkId}):`, url)
    console.log(`[LiveData] Current rpcUrls:`, JSON.stringify(this.rpcUrls, null, 2))
    return url
  }

  /**
   * Get all current RPC URLs (for debugging)
   */
  public getAllRpcUrls(): Record<number, string> {
    return { ...this.rpcUrls }
  }

  /**
   * Manually set custom RPC URLs (bypasses encryption)
   * Useful for quick testing or when you don't want to deal with lock/unlock
   */
  public setCustomRpcUrls(customUrls: Record<string, string>): void {
    console.log('[LiveData] Setting custom RPC URLs...')

    for (const [networkIdStr, url] of Object.entries(customUrls)) {
      const networkId = parseInt(networkIdStr)
      console.log(`[LiveData]   Network ${networkId}: ${url}`)
      this.rpcUrls[networkId] = url
    }

    // Clear provider cache so new RPCs are used
    console.log('[LiveData] Clearing provider cache...')
    this.providers.clear()

    console.log('[LiveData] ✅ Custom RPC URLs applied successfully')
  }

  /**
   * Load custom RPCs from config file (custom-rpcs.json)
   * This runs on startup and bypasses encryption
   */
  private loadCustomRpcsFromFile(): void {
    try {
      const fs = require('fs')
      const path = require('path')

      const configPath = path.join(__dirname, '../../custom-rpcs.json')

      if (fs.existsSync(configPath)) {
        console.log('[LiveData] 📄 Loading custom RPCs from file...')
        const fileContent = fs.readFileSync(configPath, 'utf8')
        const customRpcs = JSON.parse(fileContent)

        for (const [networkIdStr, url] of Object.entries(customRpcs)) {
          const networkId = parseInt(networkIdStr)
          console.log(`[LiveData]   Network ${networkId}: ${url}`)
          this.rpcUrls[networkId] = url as string
        }

        console.log('[LiveData] ✅ Custom RPCs loaded from file!')
      } else {
        console.log('[LiveData] ℹ️  No custom-rpcs.json file found (this is optional)')
      }
    } catch (error: any) {
      console.error('[LiveData] ⚠️  Error loading custom RPCs from file:', error.message)
    }
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getProvider(networkId: number): ethers.JsonRpcProvider {
    if (!this.providers.has(networkId)) {
      const rpcUrl = this.rpcUrls[networkId] || DEFAULT_RPC_URLS[networkId]
      if (!rpcUrl) {
        throw new Error(`No RPC URL for network ${networkId}`)
      }

      // Create provider with timeout configuration
      const provider = new ethers.JsonRpcProvider(rpcUrl, networkId, {
        staticNetwork: true, // Performance optimization
      })

      // Set request timeout
      // @ts-ignore - pollingInterval is valid but not in types
      provider.pollingInterval = 5000 // 5 seconds

      console.log(`[LiveData] 🌐 Created provider for network ${networkId}`)
      console.log(`[LiveData] 📍 Using RPC: ${rpcUrl}`)
      console.log(`[LiveData] 🔑 Alchemy key status: ${this.alchemyApiKey ? 'CONFIGURED' : 'NOT SET'}`)

      this.providers.set(networkId, provider)
    }
    return this.providers.get(networkId)!
  }

  private async getTokenDecimals(provider: ethers.JsonRpcProvider, tokenAddress: string): Promise<number> {
    const cacheKey = `${await provider.getNetwork().then(n => n.chainId)}_${tokenAddress.toLowerCase()}`

    if (this.tokenDecimals.has(cacheKey)) {
      return this.tokenDecimals.get(cacheKey)!
    }

    try {
      const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider)
      const decimals = await Promise.race([
        token.decimals(),
        new Promise<number>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout getting decimals')), RPC_TIMEOUT)
        )
      ])
      this.tokenDecimals.set(cacheKey, Number(decimals))
      return Number(decimals)
    } catch (error) {
      console.warn(`[LiveData] Failed to get decimals for ${tokenAddress}, using default 18`)
      return 18 // Default to 18 if fetch fails
    }
  }

  private async getTokenSymbol(provider: ethers.JsonRpcProvider, tokenAddress: string): Promise<string> {
    const cacheKey = `${await provider.getNetwork().then(n => n.chainId)}_${tokenAddress.toLowerCase()}`

    if (this.tokenSymbols.has(cacheKey)) {
      return this.tokenSymbols.get(cacheKey)!
    }

    try {
      const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider)
      const symbol = await Promise.race([
        token.symbol(),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout getting symbol')), RPC_TIMEOUT)
        )
      ])
      this.tokenSymbols.set(cacheKey, symbol)
      return symbol
    } catch (error) {
      console.warn(`[LiveData] Failed to get symbol for ${tokenAddress}, using default UNKNOWN`)
      return 'UNKNOWN'
    }
  }

  private async handleMessage(clientId: string, message: any): Promise<void> {
    const { type, payload } = message

    switch (type) {
      case 'subscribe':
        await this.handleSubscribe(clientId, payload)
        break
      case 'unsubscribe':
        this.handleUnsubscribe(clientId, payload)
        break
      case 'ping':
        this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() })
        break
      case 'set_poll_rate':
        this.handleSetPollRate(clientId, payload)
        break
      case 'get_status':
        this.sendToClient(clientId, {
          type: 'status',
          hasAlchemyKey: this.hasAlchemyKey(),
          pollIntervalMs: this.pollIntervalMs
        })
        break
      case 'unlock':
        // New: Unlock with password to decrypt API keys
        if (payload?.password) {
          await this.handleUnlock(clientId, payload.password)
        }
        break
      case 'lock':
        // New: Lock and clear all sensitive data from memory
        await this.handleLock(clientId)
        break
      case 'configure_alchemy':
        // Legacy: Direct API key configuration (still supported)
        if (payload?.apiKey) {
          await this.configureAlchemyFromClient(payload.apiKey)
          this.sendToClient(clientId, {
            type: 'alchemy_configured',
            success: true
          })
        }
        break
      default:
        console.warn(`[LiveData] Unknown message type: ${type}`)
    }
  }

  private handleSetPollRate(clientId: string, payload: { intervalMs: number }): void {
    const { intervalMs } = payload
    // Minimum 1 second, maximum 60 seconds
    const clampedInterval = Math.max(1000, Math.min(60000, intervalMs))
    this.pollIntervalMs = clampedInterval
    console.log(`[LiveData] Poll rate set to ${clampedInterval}ms by ${clientId}`)

    // Notify all clients of new poll rate
    for (const [cid] of this.clients) {
      this.sendToClient(cid, {
        type: 'poll_rate_changed',
        pollIntervalMs: clampedInterval
      })
    }
  }

  private async handleSubscribe(clientId: string, payload: { networkId: number; pairSymbol: string; protocolId?: string }): Promise<void> {
    const { networkId, protocolId = 'uniswap-v3' } = payload
    let { pairSymbol } = payload

    // Normalize ETH to WETH for pool lookups
    pairSymbol = pairSymbol.replace('ETH/', 'WETH/').replace('/ETH', '/WETH')

    // Handle Uniswap V4 subscriptions
    if (protocolId === 'uniswap-v4') {
      await this.handleV4Subscribe(clientId, networkId, pairSymbol, protocolId)
      return
    }

    // Handle 1inch subscriptions
    if (protocolId === '1inch') {
      await this.handle1inchSubscribe(clientId, networkId, pairSymbol, protocolId)
      return
    }

    // Handle V3 subscriptions (existing logic)
    const poolAddress = POOL_ADDRESSES[networkId]?.[pairSymbol]

    if (!poolAddress) {
      this.sendToClient(clientId, {
        type: 'error',
        message: `Pool not found for ${pairSymbol} on network ${networkId}`
      })
      return
    }

    const subscription: LiveDataSubscription = {
      clientId,
      networkId,
      poolAddress,
      pairSymbol,
      protocolId
    }

    // Add to client subscriptions
    const clientSubs = this.subscriptions.get(clientId) || []
    clientSubs.push(subscription)
    this.subscriptions.set(clientId, clientSubs)

    const poolKey = `${networkId}_${poolAddress}`

    // Initialize ring buffer for this pool if needed
    if (!this.recentTrades.has(poolKey)) {
      this.recentTrades.set(poolKey, new RingBuffer<TradeData>(50))
    }

    // Start price polling for this pool
    await this.startPricePolling(networkId, poolAddress, pairSymbol)

    // Skip swap event listening - requires WebSocket provider
    // Public HTTP RPCs don't support persistent event filters
    // await this.startSwapEventListener(networkId, poolAddress, pairSymbol)

    // Start mempool monitoring for this network, protocol, and pair
    await this.startMempoolMonitoring(networkId, protocolId, pairSymbol)

    // Send initial data (non-blocking for historical trades)
    this.sendInitialData(clientId, networkId, poolAddress, pairSymbol).catch(err => {
      console.error('[LiveData] Error sending initial data:', err.message)
    })

    this.sendToClient(clientId, {
      type: 'subscribed',
      payload: { networkId, pairSymbol, poolAddress, protocol: protocolId }
    })

    console.log(`[LiveData] Client ${clientId} subscribed to ${pairSymbol} on network ${networkId} (${protocolId})`)
  }

  private async handleV4Subscribe(clientId: string, networkId: number, pairSymbol: string, protocolId: string): Promise<void> {
    const poolConfig = V4_POOL_CONFIGS[networkId]?.[pairSymbol]

    if (!poolConfig) {
      this.sendToClient(clientId, {
        type: 'error',
        message: `V4 pool configuration not found for ${pairSymbol} on network ${networkId}. Please add the pool configuration to V4_POOL_CONFIGS.`
      })
      return
    }

    const poolAddress = `V4:${poolConfig.currency0}/${poolConfig.currency1}`

    const subscription: LiveDataSubscription = {
      clientId,
      networkId,
      poolAddress,
      pairSymbol,
      protocolId
    }

    // Add to client subscriptions
    const clientSubs = this.subscriptions.get(clientId) || []
    clientSubs.push(subscription)
    this.subscriptions.set(clientId, clientSubs)

    // Start V4 price polling
    await this.startV4PricePolling(networkId, poolConfig, pairSymbol)

    this.sendToClient(clientId, {
      type: 'subscribed',
      payload: {
        networkId,
        pairSymbol,
        poolAddress,
        protocol: 'uniswap-v4',
        poolConfig
      }
    })

    console.log(`[LiveData] Client ${clientId} subscribed to V4 ${pairSymbol} on network ${networkId}`)
  }

  private async handle1inchSubscribe(clientId: string, networkId: number, pairSymbol: string, protocolId: string): Promise<void> {
    const tokenAddresses = TOKEN_ADDRESSES[networkId]

    if (!tokenAddresses) {
      this.sendToClient(clientId, {
        type: 'error',
        message: `1inch not supported on network ${networkId}. Token addresses not configured.`
      })
      return
    }

    const poolAddress = `1inch:${tokenAddresses.WETH}/${tokenAddresses.USDC}`

    const subscription: LiveDataSubscription = {
      clientId,
      networkId,
      poolAddress,
      pairSymbol,
      protocolId
    }

    // Add to client subscriptions
    const clientSubs = this.subscriptions.get(clientId) || []
    clientSubs.push(subscription)
    this.subscriptions.set(clientId, clientSubs)

    // Start 1inch price polling
    await this.start1inchPricePolling(networkId, pairSymbol)

    this.sendToClient(clientId, {
      type: 'subscribed',
      payload: {
        networkId,
        pairSymbol,
        poolAddress,
        protocol: '1inch',
        tokenAddresses
      }
    })

    console.log(`[LiveData] Client ${clientId} subscribed to 1inch ${pairSymbol} on network ${networkId}`)
  }

  private handleUnsubscribe(clientId: string, payload: { networkId: number; pairSymbol: string }): void {
    const clientSubs = this.subscriptions.get(clientId) || []
    const filtered = clientSubs.filter(
      s => !(s.networkId === payload.networkId && s.pairSymbol === payload.pairSymbol)
    )
    this.subscriptions.set(clientId, filtered)

    // TODO: Clean up polling/listeners if no clients subscribed

    this.sendToClient(clientId, {
      type: 'unsubscribed',
      payload
    })
  }

  private handleDisconnect(clientId: string): void {
    this.clients.delete(clientId)
    this.subscriptions.delete(clientId)
    // TODO: Clean up polling/listeners if no clients remain
  }

  private async startPricePolling(networkId: number, poolAddress: string, pairSymbol: string): Promise<void> {
    const poolKey = `${networkId}_${poolAddress}`

    // Don't create duplicate intervals
    if (this.priceIntervals.has(poolKey)) {
      return
    }

    let consecutiveErrors = 0
    const MAX_CONSECUTIVE_ERRORS = 3

    const pollPrice = async () => {
      try {
        const provider = this.getProvider(networkId)
        const pool = new ethers.Contract(poolAddress, UNISWAP_V3_POOL_ABI, provider)

        // Add timeout wrapper for RPC calls
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('RPC call timeout')), RPC_TIMEOUT)
        })

        const [slot0Result, token0Address, token1Address] = await Promise.race([
          Promise.all([
            pool.slot0(),
            pool.token0(),
            pool.token1()
          ]),
          timeoutPromise
        ]) as any

        const sqrtPriceX96 = slot0Result[0]
        const tick = slot0Result[1]

        // Get token decimals
        const [decimals0, decimals1] = await Promise.all([
          this.getTokenDecimals(provider, token0Address),
          this.getTokenDecimals(provider, token1Address)
        ])

        // Calculate price from sqrtPriceX96
        // Uniswap V3: sqrtPriceX96 = sqrt(price) * 2^96
        // price = (sqrtPriceX96 / 2^96)^2 = token1 / token0 (in raw units)
        const Q96 = BigInt(2) ** BigInt(96)
        const sqrtPrice = Number(sqrtPriceX96) / Number(Q96)
        let rawPrice = sqrtPrice * sqrtPrice

        // Convert to human-readable price (accounting for decimals)
        // Human price = raw price * 10^(decimals0 - decimals1)
        const decimalAdjustment = Math.pow(10, decimals0 - decimals1)
        let price = rawPrice * decimalAdjustment

        // price now represents: token1/token0 (e.g., USDC per WETH if token0=WETH, token1=USDC)
        // For pairs like "WETH/USDC", this is already what we want (USDC per WETH)
        // For pairs like "USDC/WETH", we need to invert to get WETH per USDC
        const [baseSymbol, quoteSymbol] = pairSymbol.split('/')

        // Get actual token symbols using cached method
        const [actualToken0Symbol, actualToken1Symbol] = await Promise.all([
          this.getTokenSymbol(provider, token0Address),
          this.getTokenSymbol(provider, token1Address)
        ])

        // If baseSymbol matches token1, we need to invert the price
        // Example: pairSymbol="WETH/USDC", but token0=USDC, token1=WETH
        // Then price = WETH/USDC, but we want USDC/WETH, so invert
        const baseMatchesToken1 = actualToken1Symbol.includes(baseSymbol) || baseSymbol.includes(actualToken1Symbol)

        if (baseMatchesToken1) {
          price = 1 / price
        }

        const priceUpdate: PriceUpdate = {
          price,
          sqrtPriceX96: sqrtPriceX96.toString(),
          tick: Number(tick),
          timestamp: Date.now()
        }

        this.latestPrices.set(poolKey, priceUpdate)
        console.log(`[LiveData] ✅ Price update for ${pairSymbol}: ${price.toFixed(4)}`)

        // Reset error counter on success
        consecutiveErrors = 0

        // Broadcast to all subscribed clients
        this.broadcastToSubscribers(networkId, poolAddress, {
          type: 'price_update',
          payload: {
            networkId,
            pairSymbol,
            poolAddress,
            ...priceUpdate
          }
        })
      } catch (error: any) {
        consecutiveErrors++

        // Only log every 3rd error to avoid spam
        if (consecutiveErrors % MAX_CONSECUTIVE_ERRORS === 0) {
          console.error(`[LiveData] ⚠️ Price poll error for ${pairSymbol} (${consecutiveErrors} consecutive errors):`, error.message || error)
          console.log(`[LiveData] Consider checking RPC endpoint or Alchemy API key`)
        }
      }
    }

    // Initial poll
    await pollPrice()

    // Poll at configured interval (rate limit friendly)
    const interval = setInterval(pollPrice, this.pollIntervalMs)
    this.priceIntervals.set(poolKey, interval)
  }

  /**
   * Start V4 price polling using Quoter contract
   */
  private async startV4PricePolling(networkId: number, poolConfig: V4PoolKey, pairSymbol: string): Promise<void> {
    const poolKey = `v4_${networkId}_${poolConfig.currency0}_${poolConfig.currency1}`

    // Don't create duplicate intervals
    if (this.priceIntervals.has(poolKey)) {
      return
    }

    let consecutiveErrors = 0
    const MAX_CONSECUTIVE_ERRORS = 3

    const pollPrice = async () => {
      try {
        const provider = this.getProvider(networkId)
        const quoterAddress = V4_QUOTER_ADDRESSES[networkId]

        if (!quoterAddress) {
          console.error(`[LiveData] No V4 Quoter address for network ${networkId}`)
          return
        }

        const quoter = new ethers.Contract(quoterAddress, UNISWAP_V4_QUOTER_ABI, provider)

        // Get token decimals
        const [decimals0, decimals1] = await Promise.all([
          this.getTokenDecimals(provider, poolConfig.currency0),
          this.getTokenDecimals(provider, poolConfig.currency1)
        ])

        // Quote 1 unit of currency0 to get price in currency1
        // Use 1 token with proper decimals (e.g., 1e18 for 18 decimals)
        const inputAmount = BigInt(10 ** decimals0)

        const params = {
          poolKey: {
            currency0: poolConfig.currency0,
            currency1: poolConfig.currency1,
            fee: poolConfig.fee,
            tickSpacing: poolConfig.tickSpacing,
            hooks: poolConfig.hooks
          },
          zeroForOne: true, // Swapping currency0 for currency1
          exactAmount: inputAmount,
          hookData: '0x' // Empty hook data
        }

        // Use staticCall to simulate without executing
        const [amountOut, gasEstimate] = await Promise.race([
          quoter.quoteExactInputSingle.staticCall(params),
          new Promise<[bigint, bigint]>((_, reject) =>
            setTimeout(() => reject(new Error('RPC call timeout')), RPC_TIMEOUT)
          )
        ])

        // Calculate price: amountOut / inputAmount (adjusted for decimals)
        const rawPrice = Number(amountOut) / Number(inputAmount)
        const decimalAdjustment = Math.pow(10, decimals0 - decimals1)
        let price = rawPrice * decimalAdjustment

        // Determine if we need to invert based on pair symbol
        const [baseSymbol] = pairSymbol.split('/')
        const [actualCurrency0Symbol, actualCurrency1Symbol] = await Promise.all([
          this.getTokenSymbol(provider, poolConfig.currency0),
          this.getTokenSymbol(provider, poolConfig.currency1)
        ])

        // If baseSymbol matches currency1, invert the price
        const baseMatchesCurrency1 = actualCurrency1Symbol.includes(baseSymbol) || baseSymbol.includes(actualCurrency1Symbol)
        if (baseMatchesCurrency1) {
          price = 1 / price
        }

        const priceUpdate: PriceUpdate = {
          price,
          sqrtPriceX96: '0', // V4 quoter doesn't return sqrtPriceX96
          tick: 0,
          timestamp: Date.now()
        }

        this.latestPrices.set(poolKey, priceUpdate)
        console.log(`[LiveData] ✅ V4 Price update for ${pairSymbol}: ${price.toFixed(4)} (gas: ${gasEstimate.toString()})`)

        // Reset error counter on success
        consecutiveErrors = 0

        // Broadcast to all subscribed clients
        this.broadcastToV4Subscribers(networkId, poolConfig, {
          type: 'price_update',
          payload: {
            networkId,
            pairSymbol,
            poolAddress: `V4:${poolConfig.currency0}/${poolConfig.currency1}`,
            ...priceUpdate
          }
        })
      } catch (error: any) {
        consecutiveErrors++

        if (consecutiveErrors % MAX_CONSECUTIVE_ERRORS === 0) {
          console.error(`[LiveData] V4 price polling error for ${pairSymbol}:`, error.message)
        }

        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS * 3) {
          console.error(`[LiveData] Too many consecutive V4 price errors for ${pairSymbol}, stopping polling`)
          const interval = this.priceIntervals.get(poolKey)
          if (interval) {
            clearInterval(interval)
            this.priceIntervals.delete(poolKey)
          }
        }
      }
    }

    // Poll immediately, then every 10 seconds
    await pollPrice()
    const interval = setInterval(pollPrice, 10000)
    this.priceIntervals.set(poolKey, interval)
  }

  private broadcastToV4Subscribers(networkId: number, poolConfig: V4PoolKey, message: any): void {
    const poolIdentifier = `V4:${poolConfig.currency0}/${poolConfig.currency1}`

    this.subscriptions.forEach((subs, clientId) => {
      subs.forEach(sub => {
        if (sub.networkId === networkId && sub.protocolId === 'uniswap-v4') {
          this.sendToClient(clientId, message)
        }
      })
    })
  }

  /**
   * Start 1inch price polling using 1inch Quote API
   */
  private async start1inchPricePolling(networkId: number, pairSymbol: string): Promise<void> {
    const poolKey = `1inch_${networkId}_${pairSymbol}`

    // Don't create duplicate intervals
    if (this.priceIntervals.has(poolKey)) {
      return
    }

    const tokenAddresses = TOKEN_ADDRESSES[networkId]
    if (!tokenAddresses) {
      console.error(`[LiveData] No token addresses configured for network ${networkId}`)
      return
    }

    let consecutiveErrors = 0
    const MAX_CONSECUTIVE_ERRORS = 3

    const pollPrice = async () => {
      try {
        const { WETH, USDC } = tokenAddresses

        // Quote 1 WETH to get price in USDC
        // Amount is 1 WETH = 1e18 wei
        const amount = '1000000000000000000' // 1 WETH

        const url = `${ONEINCH_API_BASE}/${networkId}/quote`
        const params = new URLSearchParams({
          src: WETH,
          dst: USDC,
          amount: amount,
          includeTokensInfo: 'false',
          includeProtocols: 'false',
          includeGas: 'false'
        })

        const response = await fetch(`${url}?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${process.env.ONEINCH_API_KEY || ''}`,
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(RPC_TIMEOUT)
        })

        if (!response.ok) {
          throw new Error(`1inch API error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json() as any

        // Calculate price: toAmount (USDC) / fromAmount (WETH)
        // USDC has 6 decimals, WETH has 18 decimals
        const toAmount = BigInt(data.dstAmount || data.toAmount || '0')
        const fromAmount = BigInt(amount)

        // Price = (toAmount / 1e6) / (fromAmount / 1e18)
        //       = (toAmount * 1e18) / (fromAmount * 1e6)
        //       = (toAmount * 1e12) / fromAmount
        const price = Number(toAmount * BigInt(10 ** 12)) / Number(fromAmount)

        const priceUpdate: PriceUpdate = {
          price,
          sqrtPriceX96: '0', // 1inch doesn't use sqrtPriceX96
          tick: 0,
          timestamp: Date.now()
        }

        this.latestPrices.set(poolKey, priceUpdate)
        console.log(`[LiveData] ✅ 1inch Price update for ${pairSymbol}: ${price.toFixed(4)}`)

        // Reset error counter on success
        consecutiveErrors = 0

        // Broadcast to all subscribed clients
        this.broadcastTo1inchSubscribers(networkId, {
          type: 'price_update',
          payload: {
            networkId,
            pairSymbol,
            poolAddress: `1inch:${WETH}/${USDC}`,
            ...priceUpdate
          }
        })
      } catch (error: any) {
        consecutiveErrors++

        if (consecutiveErrors % MAX_CONSECUTIVE_ERRORS === 0) {
          console.error(`[LiveData] 1inch price polling error for ${pairSymbol}:`, error.message)
        }

        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS * 3) {
          console.error(`[LiveData] Too many consecutive 1inch price errors for ${pairSymbol}, stopping polling`)
          const interval = this.priceIntervals.get(poolKey)
          if (interval) {
            clearInterval(interval)
            this.priceIntervals.delete(poolKey)
          }
        }
      }
    }

    // Poll immediately, then every 15 seconds (respecting 1inch rate limits)
    await pollPrice()
    const interval = setInterval(pollPrice, 15000) // 15s to respect 1 req/sec limit
    this.priceIntervals.set(poolKey, interval)
  }

  private broadcastTo1inchSubscribers(networkId: number, message: any): void {
    this.subscriptions.forEach((subs, clientId) => {
      subs.forEach(sub => {
        if (sub.networkId === networkId && sub.protocolId === '1inch') {
          this.sendToClient(clientId, message)
        }
      })
    })
  }

  private async startSwapEventListener(networkId: number, poolAddress: string, pairSymbol: string): Promise<void> {
    const poolKey = `${networkId}_${poolAddress}`

    // Don't create duplicate listeners
    if (this.eventListeners.has(poolKey)) {
      return
    }

    try {
      const provider = this.getProvider(networkId)
      const pool = new ethers.Contract(poolAddress, UNISWAP_V3_POOL_ABI, provider)

      // Listen for Swap events
      pool.on('Swap', async (sender, recipient, amount0, amount1, sqrtPriceX96, liquidity, tick, event) => {
        try {
          const tx = await event.getTransaction()
          const block = await event.getBlock()

          // Determine buy/sell based on amount signs
          const isBuy = BigInt(amount0) < 0n // Negative amount0 means token0 is going out (buying token0)

          const trade: TradeData = {
            time: new Date(block.timestamp * 1000).toLocaleTimeString(),
            type: isBuy ? 'buy' : 'sell',
            tokenIn: isBuy ? pairSymbol.split('/')[1] : pairSymbol.split('/')[0],
            tokenInAmount: Math.abs(Number(ethers.formatUnits(isBuy ? amount1 : amount0, isBuy ? 6 : 18))),
            tokenOut: isBuy ? pairSymbol.split('/')[0] : pairSymbol.split('/')[1],
            tokenOutAmount: Math.abs(Number(ethers.formatUnits(isBuy ? amount0 : amount1, isBuy ? 18 : 6))),
            gasPrice: Number(ethers.formatUnits(tx.gasPrice || 0n, 'gwei')),
            walletAddress: `${sender.slice(0, 6)}...${sender.slice(-4)}`,
            txHash: `${event.transactionHash.slice(0, 6)}...${event.transactionHash.slice(-4)}`,
            blockNumber: event.blockNumber
          }

          // Add to ring buffer
          const tradesBuffer = this.recentTrades.get(poolKey)
          if (tradesBuffer) {
            tradesBuffer.push(trade)
          }

          // Broadcast to subscribers
          this.broadcastToSubscribers(networkId, poolAddress, {
            type: 'new_trade',
            payload: {
              networkId,
              pairSymbol,
              poolAddress,
              trade
            }
          })
        } catch (error) {
          console.error('[LiveData] Error processing Swap event:', error)
        }
      })

      this.eventListeners.set(poolKey, pool)
      console.log(`[LiveData] Swap event listener started for ${poolKey}`)
    } catch (error) {
      console.error(`[LiveData] Failed to start swap listener for ${poolKey}:`, error)
    }
  }

  private async startMempoolMonitoring(networkId: number, protocolId: string, pairSymbol: string): Promise<void> {
    // Use a unique key for this network+protocol+pair combination
    const monitorKey = `${networkId}_${protocolId}_${pairSymbol}`

    // Don't create duplicate monitoring
    if (this.mempoolListeners.has(networkId)) {
      console.log(`[LiveData] Mempool monitoring already active for ${monitorKey}`)
      return
    }

    // Initialize ring buffer for this network
    if (!this.mempoolTxs.has(networkId)) {
      this.mempoolTxs.set(networkId, new RingBuffer<MempoolTx>(50))
    }

    // Check if we have Alchemy key for real mempool data
    if (this.hasAlchemyKey() && this.alchemyApiKey !== 'configured_but_encrypted') {
      console.log(`[LiveData] Starting real Alchemy mempool monitoring for ${monitorKey}`)
      await this.startAlchemyMempoolMonitoring(networkId, protocolId, pairSymbol)
    } else {
      console.log(`[LiveData] No valid Alchemy key - using simulated mempool for network ${networkId}`)
      this.simulateMempoolUpdates(networkId)
    }
  }

  private async startAlchemyMempoolMonitoring(
    networkId: number,
    protocolId: string,
    pairSymbol: string
  ): Promise<void> {
    try {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🔹 STEP 1: Get Protocol Adapter
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const adapter = protocolRegistry.getAdapter(protocolId)
      if (!adapter) {
        console.error(`[LiveData] No adapter found for protocol: ${protocolId}`)
        return
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🔹 STEP 2: Get Token Addresses for Pair
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const tokens = getTokensForPair(networkId, pairSymbol)
      if (!tokens) {
        console.error(`[LiveData] Token addresses not found for ${pairSymbol} on network ${networkId}`)
        return
      }

      const { token0, token1 } = tokens
      console.log(`[LiveData] Filtering for pair: ${token0.symbol} (${token0.address}) / ${token1.symbol} (${token1.address})`)

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🔹 STEP 3: Get Router Addresses from Protocol Adapter
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const routers = adapter.getRouterAddresses(networkId)
      if (routers.length === 0) {
        console.warn(`[LiveData] No router addresses for ${adapter.name} on network ${networkId}`)
        return
      }

      console.log(`[LiveData] Monitoring ${adapter.name} routers: ${routers.join(', ')}`)

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🔹 STEP 4: Connect to Alchemy WebSocket
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const wsUrl = this.getAlchemyWsUrl(networkId)
      if (!wsUrl) {
        console.error(`[LiveData] No Alchemy WebSocket URL for network ${networkId}`)
        return
      }

      console.log(`[LiveData] Connecting to Alchemy WebSocket for network ${networkId}`)

      const wsProvider = new ethers.WebSocketProvider(wsUrl)
      this.alchemyWsProviders.set(networkId, wsProvider)

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🔹 STEP 5: Listen for Pending Transactions
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      wsProvider.on('pending', async (txHash: string) => {
        try {
          // Fetch transaction details
          const tx = await wsProvider.getTransaction(txHash)
          if (!tx) return

          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // 🔸 FILTER #1: Router Address
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          const isToRouter = routers.some(router =>
            tx.to?.toLowerCase() === router
          )

          if (!isToRouter) {
            return // ❌ Skip: Not going to protocol router
          }

          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // 🔸 FILTER #2: Decode Transaction
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          const decoded = adapter.decodeTransaction(tx)
          if (!decoded) {
            return // ❌ Skip: Not a swap transaction
          }

          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // 🔸 FILTER #3: Pair-Specific Filtering
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          const matchesPair = adapter.matchesPair(decoded, token0.address, token1.address)
          if (!matchesPair) {
            return // ❌ Skip: Not for this trading pair
          }

          // ✅ PASSED ALL FILTERS - This is a swap for our pair!

          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // 🔸 Detect Transaction Type (Buy/Sell)
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // Assume first token in pair is the base token (e.g., WETH in WETH/USDC)
          const baseToken = token0.address
          const txType = adapter.detectTransactionType(tx, decoded, baseToken)

          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // 🔸 Create Mempool Transaction
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          const mempoolTx: MempoolTx = {
            hash: `${txHash.slice(0, 10)}...${txHash.slice(-8)}`,
            from: `${tx.from.slice(0, 6)}...${tx.from.slice(-4)}`,
            to: tx.to ? `${tx.to.slice(0, 6)}...${tx.to.slice(-4)}` : 'Contract Creation',
            value: `${ethers.formatEther(tx.value)} ETH`,
            gasPrice: tx.gasPrice ? Number(ethers.formatUnits(tx.gasPrice, 'gwei')) : 0,
            timestamp: Date.now(),
            type: txType
          }

          // Add to ring buffer
          const buffer = this.mempoolTxs.get(networkId)
          if (buffer) {
            buffer.push(mempoolTx)
          }

          console.log(`[LiveData] ✅ ${adapter.name} ${pairSymbol} ${txType.toUpperCase()}: ${mempoolTx.hash}`)

          // Broadcast to all clients subscribed to this network
          this.broadcastToNetwork(networkId, {
            type: 'mempool_tx',
            payload: {
              networkId,
              tx: mempoolTx
            }
          })
        } catch (error) {
          // Silently skip errors for individual transactions
          // (they might be mined before we can fetch them)
        }
      })

      // Mark as active
      this.mempoolListeners.set(networkId, true)
      console.log(`[LiveData] ✅ Alchemy mempool monitoring started: ${adapter.name} | ${pairSymbol} | Network ${networkId}`)

    } catch (error) {
      console.error(`[LiveData] Failed to start Alchemy mempool monitoring:`, error)
      // Fallback to simulation
      this.simulateMempoolUpdates(networkId)
    }
  }

  private getAlchemyWsUrl(networkId: number): string | null {
    if (!this.alchemyApiKey || this.alchemyApiKey === 'configured_but_encrypted') {
      return null
    }

    const wsUrls: Record<number, string> = {
      1: `wss://eth-mainnet.g.alchemy.com/v2/${this.alchemyApiKey}`,
      11155111: `wss://eth-sepolia.g.alchemy.com/v2/${this.alchemyApiKey}`,
      8453: `wss://base-mainnet.g.alchemy.com/v2/${this.alchemyApiKey}`,
      84532: `wss://base-sepolia.g.alchemy.com/v2/${this.alchemyApiKey}`
    }

    return wsUrls[networkId] || null
  }

  private simulateMempoolUpdates(networkId: number): void {
    // This simulates mempool activity
    // In production, replace with Alchemy pendingTransactions subscription

    const routers = UNISWAP_V3_ROUTERS[networkId] || []
    if (routers.length === 0) {
      console.warn(`[LiveData] No routers configured for network ${networkId}, skipping mempool simulation`)
      return
    }

    console.log(`[LiveData] Starting mempool simulation for network ${networkId}`)

    const generateMempoolTx = () => {
      // Generate realistic-looking pending tx
      const types: ('buy' | 'sell' | 'transfer')[] = ['buy', 'sell', 'transfer']
      const mempoolTx: MempoolTx = {
        hash: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 10)}`,
        from: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
        to: routers[0].slice(0, 10) + '...' + routers[0].slice(-4),
        value: `${(Math.random() * 5).toFixed(3)} ETH`,
        gasPrice: Math.round(20 + Math.random() * 50),
        timestamp: Date.now(),
        type: types[Math.floor(Math.random() * types.length)]
      }

      const buffer = this.mempoolTxs.get(networkId)
      if (buffer) {
        buffer.push(mempoolTx)
      }

      console.log(`[LiveData] Simulated mempool tx for network ${networkId}: ${mempoolTx.type}`)

      // Broadcast to all clients subscribed to this network
      this.broadcastToNetwork(networkId, {
        type: 'mempool_tx',
        payload: {
          networkId,
          tx: mempoolTx
        }
      })
    }

    // Generate first tx immediately
    generateMempoolTx()

    // Then continue at intervals
    const interval = setInterval(generateMempoolTx, 3000 + Math.random() * 2000) // Random interval 3-5 seconds

    // Store interval for cleanup
    this.mempoolIntervals.set(networkId, interval)
  }

  private async sendInitialData(clientId: string, networkId: number, poolAddress: string, pairSymbol: string): Promise<void> {
    const poolKey = `${networkId}_${poolAddress}`

    // Send cached price
    const latestPrice = this.latestPrices.get(poolKey)
    if (latestPrice) {
      this.sendToClient(clientId, {
        type: 'price_update',
        payload: {
          networkId,
          pairSymbol,
          poolAddress,
          ...latestPrice
        }
      })
    }

    // Send cached recent trades
    const trades = this.recentTrades.get(poolKey)
    if (trades) {
      this.sendToClient(clientId, {
        type: 'initial_trades',
        payload: {
          networkId,
          pairSymbol,
          poolAddress,
          trades: trades.getAll()
        }
      })
    }

    // Send cached mempool txs
    const mempool = this.mempoolTxs.get(networkId)
    if (mempool) {
      this.sendToClient(clientId, {
        type: 'initial_mempool',
        payload: {
          networkId,
          txs: mempool.getAll()
        }
      })
    }

    // Fetch recent historical swaps from Etherscan if available
    await this.fetchHistoricalSwaps(clientId, networkId, poolAddress, pairSymbol)
  }

  private async fetchHistoricalSwaps(clientId: string, networkId: number, poolAddress: string, pairSymbol: string): Promise<void> {
    try {
      console.log(`[LiveData] Fetching historical swaps for ${pairSymbol} on network ${networkId}`)
      const provider = this.getProvider(networkId)
      const pool = new ethers.Contract(poolAddress, UNISWAP_V3_POOL_ABI, provider)

      // Get last 10 blocks of Swap events (Alchemy free tier limit)
      const currentBlock = await Promise.race([
        provider.getBlockNumber(),
        new Promise<number>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout getting block number')), RPC_TIMEOUT)
        )
      ])
      const fromBlock = Math.max(0, currentBlock - 10) // Last ~10 blocks (Alchemy free tier limit)
      console.log(`[LiveData] Querying blocks ${fromBlock} to ${currentBlock}`)

      const filter = pool.filters.Swap()
      const events = await Promise.race([
        pool.queryFilter(filter, fromBlock, currentBlock),
        new Promise<any[]>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout querying swap events')), RPC_TIMEOUT)
        )
      ])
      console.log(`[LiveData] Found ${events.length} swap events`)

      const trades: TradeData[] = []

      // Process last 10 events
      for (const event of events.slice(-10)) {
        try {
          const args = (event as any).args
          if (!args) {
            console.warn('[LiveData] Event has no args:', event)
            continue
          }

          const [sender, recipient, amount0, amount1] = args
          const block = await event.getBlock()

          const isBuy = BigInt(amount0) < 0n

          trades.push({
            time: new Date(block.timestamp * 1000).toLocaleTimeString(),
            type: isBuy ? 'buy' : 'sell',
            tokenIn: isBuy ? pairSymbol.split('/')[1] : pairSymbol.split('/')[0],
            tokenInAmount: Math.abs(Number(ethers.formatUnits(isBuy ? amount1 : amount0, isBuy ? 6 : 18))),
            tokenOut: isBuy ? pairSymbol.split('/')[0] : pairSymbol.split('/')[1],
            tokenOutAmount: Math.abs(Number(ethers.formatUnits(isBuy ? amount0 : amount1, isBuy ? 18 : 6))),
            gasPrice: 0,
            walletAddress: `${sender.slice(0, 6)}...${sender.slice(-4)}`,
            txHash: `${event.transactionHash.slice(0, 6)}...${event.transactionHash.slice(-4)}`,
            blockNumber: event.blockNumber
          })
        } catch (e) {
          console.warn('[LiveData] Error processing event:', e)
          // Skip problematic events
        }
      }

      if (trades.length > 0) {
        console.log(`[LiveData] Sending ${trades.length} historical trades to client ${clientId}`)
        this.sendToClient(clientId, {
          type: 'historical_trades',
          payload: {
            networkId,
            pairSymbol,
            poolAddress,
            trades
          }
        })

        // Also add to ring buffer
        const poolKey = `${networkId}_${poolAddress}`
        const tradesBuffer = this.recentTrades.get(poolKey)
        if (tradesBuffer) {
          trades.forEach(trade => tradesBuffer.push(trade))
        }
      } else {
        console.log(`[LiveData] No historical trades found for ${pairSymbol}`)
      }
    } catch (error) {
      console.error('[LiveData] Error fetching historical swaps:', error)
      // Send error to client
      this.sendToClient(clientId, {
        type: 'error',
        message: `Failed to fetch historical trades: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  private sendToClient(clientId: string, message: any): void {
    const client = this.clients.get(clientId)
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message))
    }
  }

  private broadcastToSubscribers(networkId: number, poolAddress: string, message: any): void {
    for (const [clientId, subs] of this.subscriptions) {
      const isSubscribed = subs.some(s => s.networkId === networkId && s.poolAddress === poolAddress)
      if (isSubscribed) {
        this.sendToClient(clientId, message)
      }
    }
  }

  private broadcastToNetwork(networkId: number, message: any): void {
    for (const [clientId, subs] of this.subscriptions) {
      const isSubscribed = subs.some(s => s.networkId === networkId)
      if (isSubscribed) {
        this.sendToClient(clientId, message)
      }
    }
  }

  /**
   * Broadcast trade execution to all connected clients on the same network
   * Called after a strategy executes a trade
   */
  public broadcastTradeExecution(tradeData: {
    executionId: string
    strategyId: string
    chainId: number
    protocol: string
    txHash: string
    tokenIn: string
    tokenInAmount: string
    tokenOut: string
    tokenOutAmount: string
    timestamp: number
  }): void {
    console.log(`[LiveData] Broadcasting trade execution: ${tradeData.txHash}`)

    // Broadcast to all clients subscribed to this network
    this.broadcastToNetwork(tradeData.chainId, {
      type: 'trade_executed',
      payload: tradeData
    })

    // Also broadcast to all connected clients (for global trade feed)
    for (const client of this.clients.values()) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'strategy_trade',
          payload: tradeData
        }))
      }
    }
  }

  // Cleanup on shutdown
  shutdown(): void {
    // Clear all price intervals
    for (const interval of this.priceIntervals.values()) {
      clearInterval(interval)
    }
    this.priceIntervals.clear()

    // Clear all mempool intervals
    for (const interval of this.mempoolIntervals.values()) {
      clearInterval(interval)
    }
    this.mempoolIntervals.clear()

    // Close all Alchemy WebSocket providers
    for (const [networkId, wsProvider] of this.alchemyWsProviders) {
      console.log(`[LiveData] Closing Alchemy WebSocket for network ${networkId}`)
      wsProvider.removeAllListeners()
      wsProvider.destroy()
    }
    this.alchemyWsProviders.clear()
    this.mempoolListeners.clear()

    // Remove all event listeners
    for (const contract of this.eventListeners.values()) {
      contract.removeAllListeners()
    }
    this.eventListeners.clear()

    // Close all client connections
    for (const client of this.clients.values()) {
      client.close()
    }
    this.clients.clear()

    // Close WebSocket server
    if (this.wss) {
      this.wss.close()
    }

    console.log('[LiveData] Service shut down')
  }
}

// Singleton instance
export const liveDataService = new LiveDataService()
