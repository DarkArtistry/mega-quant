import { useState, useEffect, useCallback, useRef } from 'react'

// Types matching backend
export interface TradeData {
  time: string
  type: 'buy' | 'sell'
  tokenIn: string
  tokenInAmount: number
  tokenOut: string
  tokenOutAmount: number
  gasPrice: number
  walletAddress: string
  txHash: string
  blockNumber?: number
}

export interface MempoolTx {
  hash: string
  from: string
  to: string
  value: string
  gasPrice: number
  timestamp: number
  type: 'buy' | 'sell' | 'transfer'
}

export interface PriceUpdate {
  price: number
  sqrtPriceX96: string
  tick: number
  timestamp: number
}

interface LiveDataState {
  isConnected: boolean
  isSubscribed: boolean
  price: number | null
  priceUpdate: PriceUpdate | null
  recentTrades: TradeData[]
  mempoolTxs: MempoolTx[]
  error: string | null
  hasAlchemyKey: boolean
  pollIntervalMs: number
}

interface UseLiveDataOptions {
  networkId: number | null
  pairSymbol: string | null
  maxTrades?: number
  maxMempoolTxs?: number
  alchemyApiKey?: string | null
}

const WS_URL = 'ws://localhost:3001/ws/live-data'
const RECONNECT_DELAY = 3000
const MAX_RECONNECT_ATTEMPTS = 5

export function useLiveData(options: UseLiveDataOptions) {
  const { networkId, pairSymbol, maxTrades = 50, maxMempoolTxs = 50, alchemyApiKey } = options

  const [state, setState] = useState<LiveDataState>({
    isConnected: false,
    isSubscribed: false,
    price: null,
    priceUpdate: null,
    recentTrades: [],
    mempoolTxs: [],
    error: null,
    hasAlchemyKey: false,
    pollIntervalMs: 5000
  })

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttempts = useRef(0)
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null)
  const currentSubscription = useRef<{ networkId: number; pairSymbol: string } | null>(null)

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      const ws = new WebSocket(WS_URL)

      ws.onopen = () => {
        console.log('[LiveData] Connected to WebSocket')
        reconnectAttempts.current = 0
        setState(prev => ({ ...prev, isConnected: true, error: null }))

        // Re-subscribe if we had an active subscription
        if (currentSubscription.current) {
          ws.send(JSON.stringify({
            type: 'subscribe',
            payload: currentSubscription.current
          }))
        }
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          handleMessage(message)
        } catch (error) {
          console.error('[LiveData] Failed to parse message:', error)
        }
      }

      ws.onclose = () => {
        console.log('[LiveData] WebSocket closed')
        setState(prev => ({ ...prev, isConnected: false, isSubscribed: false }))
        wsRef.current = null

        // Attempt reconnection
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++
          console.log(`[LiveData] Reconnecting in ${RECONNECT_DELAY}ms (attempt ${reconnectAttempts.current})`)
          reconnectTimeout.current = setTimeout(connect, RECONNECT_DELAY)
        } else {
          setState(prev => ({ ...prev, error: 'Connection lost. Please refresh.' }))
        }
      }

      ws.onerror = (error) => {
        console.error('[LiveData] WebSocket error:', error)
        setState(prev => ({ ...prev, error: 'Connection error' }))
      }

      wsRef.current = ws
    } catch (error) {
      console.error('[LiveData] Failed to connect:', error)
      setState(prev => ({ ...prev, error: 'Failed to connect' }))
    }
  }, [])

  // Handle incoming messages
  const handleMessage = useCallback((message: any) => {
    const { type } = message
    // Handle both formats: { type, payload } and { type, ...data }
    const payload = message.payload || message

    switch (type) {
      case 'connected':
        console.log('[LiveData] Connection confirmed:', payload.clientId)
        setState(prev => ({
          ...prev,
          hasAlchemyKey: payload.hasAlchemyKey || false,
          pollIntervalMs: payload.pollIntervalMs || 5000
        }))
        break

      case 'poll_rate_changed':
        setState(prev => ({ ...prev, pollIntervalMs: payload.pollIntervalMs }))
        break

      case 'status':
        setState(prev => ({
          ...prev,
          hasAlchemyKey: payload.hasAlchemyKey || false,
          pollIntervalMs: payload.pollIntervalMs || 5000
        }))
        break

      case 'subscribed':
        console.log('[LiveData] Subscribed to:', payload)
        setState(prev => ({ ...prev, isSubscribed: true }))
        break

      case 'unsubscribed':
        console.log('[LiveData] Unsubscribed from:', payload)
        setState(prev => ({ ...prev, isSubscribed: false }))
        break

      case 'price_update':
        setState(prev => ({
          ...prev,
          price: payload.price,
          priceUpdate: {
            price: payload.price,
            sqrtPriceX96: payload.sqrtPriceX96,
            tick: payload.tick,
            timestamp: payload.timestamp
          }
        }))
        break

      case 'new_trade':
        setState(prev => ({
          ...prev,
          recentTrades: [payload.trade, ...prev.recentTrades].slice(0, maxTrades)
        }))
        break

      case 'initial_trades':
      case 'historical_trades':
        setState(prev => ({
          ...prev,
          recentTrades: [...payload.trades, ...prev.recentTrades]
            .slice(0, maxTrades)
            .sort((a, b) => {
              // Sort by time descending
              if (a.blockNumber && b.blockNumber) {
                return b.blockNumber - a.blockNumber
              }
              return 0
            })
        }))
        break

      case 'mempool_tx':
        setState(prev => ({
          ...prev,
          mempoolTxs: [payload.tx, ...prev.mempoolTxs].slice(0, maxMempoolTxs)
        }))
        break

      case 'initial_mempool':
        setState(prev => ({
          ...prev,
          mempoolTxs: payload.txs.slice(0, maxMempoolTxs)
        }))
        break

      case 'error':
        console.error('[LiveData] Server error:', message.message)
        setState(prev => ({ ...prev, error: message.message }))
        break

      case 'pong':
        // Heartbeat response
        break

      default:
        console.log('[LiveData] Unknown message type:', type)
    }
  }, [maxTrades, maxMempoolTxs])

  // Subscribe to a trading pair
  const subscribe = useCallback((networkId: number, pairSymbol: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      // Store subscription for when connection is established
      currentSubscription.current = { networkId, pairSymbol }
      connect()
      return
    }

    // Unsubscribe from previous if different
    if (currentSubscription.current &&
        (currentSubscription.current.networkId !== networkId ||
         currentSubscription.current.pairSymbol !== pairSymbol)) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        payload: currentSubscription.current
      }))
    }

    // Clear previous data
    setState(prev => ({
      ...prev,
      price: null,
      priceUpdate: null,
      recentTrades: [],
      mempoolTxs: [],
      isSubscribed: false
    }))

    // Subscribe to new pair
    currentSubscription.current = { networkId, pairSymbol }
    wsRef.current.send(JSON.stringify({
      type: 'subscribe',
      payload: { networkId, pairSymbol }
    }))
  }, [connect])

  // Unsubscribe from current pair
  const unsubscribe = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && currentSubscription.current) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        payload: currentSubscription.current
      }))
    }
    currentSubscription.current = null
    setState(prev => ({
      ...prev,
      isSubscribed: false,
      price: null,
      priceUpdate: null,
      recentTrades: [],
      mempoolTxs: []
    }))
  }, [])

  // Connect on mount
  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])

  // Subscribe when networkId and pairSymbol change
  useEffect(() => {
    if (networkId && pairSymbol) {
      subscribe(networkId, pairSymbol)
    } else {
      unsubscribe()
    }
  }, [networkId, pairSymbol, subscribe, unsubscribe])

  // Heartbeat to keep connection alive
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // Send Alchemy API key when connected and available
  useEffect(() => {
    console.log('[LiveData] Alchemy key effect:', { isConnected: state.isConnected, hasKey: !!alchemyApiKey, wsOpen: wsRef.current?.readyState === WebSocket.OPEN })
    if (state.isConnected && alchemyApiKey && wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[LiveData] Sending Alchemy API key to backend')
      wsRef.current.send(JSON.stringify({
        type: 'configure_alchemy',
        payload: { apiKey: alchemyApiKey }
      }))
    }
  }, [state.isConnected, alchemyApiKey])

  // Set poll rate
  const setPollRate = useCallback((intervalMs: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'set_poll_rate',
        payload: { intervalMs }
      }))
    }
  }, [])

  return {
    ...state,
    subscribe,
    unsubscribe,
    reconnect: connect,
    setPollRate
  }
}
