# 🚀 Multi-Protocol Support Implementation Plan

## 📊 Current Architecture Issues

### Problems:
1. ❌ **Hardcoded Uniswap V3** - Router addresses and method signatures are hardcoded
2. ❌ **No Pair Filtering** - Shows ALL Uniswap swaps on the network (not specific to WETH/USDC)
3. ❌ **No Multi-Protocol Support** - Can't monitor CowSwap, 1inch, Uniswap V4
4. ❌ **No Abstraction** - Adding new protocols requires modifying core service code

### Current Flow:
```
Alchemy Mempool → Filter by Router Address → Detect Type → Broadcast
                  (Network-wide)            (Method signature)
```

---

## 🎯 New Architecture Design

### Goal:
```
Alchemy Mempool → Protocol Adapter → Pair Filter → Type Detection → Broadcast
                  (Generic)          (Token addresses)  (Protocol-specific)
```

### Architecture Components:

```
┌─────────────────────────────────────────────────────────────────┐
│                    IProtocolAdapter (Interface)                  │
├─────────────────────────────────────────────────────────────────┤
│ - name: string                                                   │
│ - getRouterAddresses(networkId): string[]                       │
│ - decodeTransaction(tx): DecodedSwap | null                     │
│ - matchesPool(decoded, poolAddress): boolean                    │
│ - detectTransactionType(tx): 'buy' | 'sell' | 'transfer'       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ implements
                                │
        ┌───────────────────────┴───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  UniswapV3   │      │  UniswapV4   │      │   CowSwap    │
│   Adapter    │      │   Adapter    │      │   Adapter    │
└──────────────┘      └──────────────┘      └──────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   1inch      │      │    Future    │      │    Future    │
│   Adapter    │      │  Protocols   │      │  Protocols   │
└──────────────┘      └──────────────┘      └──────────────┘
```

---

## 📝 Implementation Tasks

### **Phase 1: Token Address Configuration**

#### Task 1.1: Create Token Registry
**File:** `mega-quant-app/backend/src/config/tokens.ts`

```typescript
export interface TokenInfo {
  symbol: string
  address: string
  decimals: number
}

export const TOKEN_ADDRESSES: Record<number, Record<string, TokenInfo>> = {
  1: { // Mainnet
    WETH: { symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
    USDC: { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
    USDT: { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
  },
  11155111: { // Sepolia
    WETH: { symbol: 'WETH', address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', decimals: 18 },
    USDC: { symbol: 'USDC', address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', decimals: 6 },
  },
  // ... more networks
}
```

---

### **Phase 2: Protocol Abstraction Layer**

#### Task 2.1: Create Protocol Adapter Interface
**File:** `mega-quant-app/backend/src/protocols/IProtocolAdapter.ts`

```typescript
export interface DecodedSwap {
  tokenIn: string
  tokenOut: string
  amountIn?: string
  amountOut?: string
  recipient: string
  path?: string[]
}

export interface IProtocolAdapter {
  readonly name: string
  readonly protocolId: string

  // Get router/contract addresses for this protocol on a network
  getRouterAddresses(networkId: number): string[]

  // Decode a transaction to extract swap details
  decodeTransaction(tx: ethers.TransactionResponse): DecodedSwap | null

  // Check if decoded swap matches a specific trading pair
  matchesPair(decoded: DecodedSwap, tokenA: string, tokenB: string): boolean

  // Detect transaction type (buy/sell)
  detectTransactionType(tx: ethers.TransactionResponse, decoded: DecodedSwap): 'buy' | 'sell' | 'transfer'
}
```

---

### **Phase 3: Protocol Implementations**

#### Task 3.1: Uniswap V3 Adapter
**File:** `mega-quant-app/backend/src/protocols/UniswapV3Adapter.ts`

```typescript
import { ethers } from 'ethers'
import { IProtocolAdapter, DecodedSwap } from './IProtocolAdapter.js'

const UNISWAP_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)',
  'function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountIn)',
  // ... more functions
]

export class UniswapV3Adapter implements IProtocolAdapter {
  readonly name = 'Uniswap V3'
  readonly protocolId = 'uniswap-v3'

  private routerInterface = new ethers.Interface(UNISWAP_V3_ROUTER_ABI)

  private routers: Record<number, string[]> = {
    1: ['0xE592427A0AEce92De3Edee1F18E0157C05861564', '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'],
    11155111: ['0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E'],
    8453: ['0x2626664c2603336E57B271c5C0b26F421741e481'],
    84532: ['0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4'],
  }

  getRouterAddresses(networkId: number): string[] {
    return this.routers[networkId] || []
  }

  decodeTransaction(tx: ethers.TransactionResponse): DecodedSwap | null {
    try {
      const decoded = this.routerInterface.parseTransaction({
        data: tx.data,
        value: tx.value
      })

      if (!decoded) return null

      // Handle different Uniswap V3 functions
      if (decoded.name === 'exactInputSingle') {
        const params = decoded.args.params
        return {
          tokenIn: params.tokenIn,
          tokenOut: params.tokenOut,
          amountIn: params.amountIn.toString(),
          recipient: params.recipient,
        }
      }

      if (decoded.name === 'exactOutputSingle') {
        const params = decoded.args.params
        return {
          tokenIn: params.tokenIn,
          tokenOut: params.tokenOut,
          amountOut: params.amountOut.toString(),
          recipient: params.recipient,
        }
      }

      // ... handle multicall, exactInput, exactOutput, etc.

      return null
    } catch (error) {
      return null
    }
  }

  matchesPair(decoded: DecodedSwap, tokenA: string, tokenB: string): boolean {
    const tokenInLower = decoded.tokenIn.toLowerCase()
    const tokenOutLower = decoded.tokenOut.toLowerCase()
    const tokenALower = tokenA.toLowerCase()
    const tokenBLower = tokenB.toLowerCase()

    return (
      (tokenInLower === tokenALower && tokenOutLower === tokenBLower) ||
      (tokenInLower === tokenBLower && tokenOutLower === tokenALower)
    )
  }

  detectTransactionType(tx: ethers.TransactionResponse, decoded: DecodedSwap): 'buy' | 'sell' | 'transfer' {
    // Exact method signature detection
    const methodId = tx.data.slice(0, 10)

    if (methodId === '0x414bf389' || methodId === '0xdb3e2198') {
      return 'buy' // exactInputSingle, exactInput
    } else if (methodId === '0x5023b4df' || methodId === '0x04e45aaf') {
      return 'sell' // exactOutputSingle, exactOutput
    }

    return 'transfer'
  }
}
```

#### Task 3.2: Uniswap V4 Adapter
**File:** `mega-quant-app/backend/src/protocols/UniswapV4Adapter.ts`

```typescript
// Uniswap V4 uses Hooks and different architecture
export class UniswapV4Adapter implements IProtocolAdapter {
  readonly name = 'Uniswap V4'
  readonly protocolId = 'uniswap-v4'

  // V4 uses PoolManager contract instead of Router
  private poolManagers: Record<number, string[]> = {
    1: ['0x...'], // V4 PoolManager on mainnet
    11155111: ['0x...'], // Sepolia
  }

  // ... implementation
}
```

#### Task 3.3: CowSwap Adapter
**File:** `mega-quant-app/backend/src/protocols/CowSwapAdapter.ts`

```typescript
export class CowSwapAdapter implements IProtocolAdapter {
  readonly name = 'CowSwap'
  readonly protocolId = 'cowswap'

  private settlementContracts: Record<number, string[]> = {
    1: ['0x9008D19f58AAbD9eD0D60971565AA8510560ab41'], // Mainnet
    100: ['0x9008D19f58AAbD9eD0D60971565AA8510560ab41'], // Gnosis
  }

  // CowSwap uses off-chain order book, different detection method
  decodeTransaction(tx: ethers.TransactionResponse): DecodedSwap | null {
    // CowSwap transactions interact with GPv2Settlement
    // Need to decode settle() function
  }
}
```

#### Task 3.4: 1inch Adapter
**File:** `mega-quant-app/backend/src/protocols/OneInchAdapter.ts`

```typescript
export class OneInchAdapter implements IProtocolAdapter {
  readonly name = '1inch'
  readonly protocolId = '1inch'

  private routers: Record<number, string[]> = {
    1: ['0x1111111254EEB25477B68fb85Ed929f73A960582'], // V5 Router
    11155111: ['0x...'],
  }

  // 1inch uses aggregation, multiple paths possible
  decodeTransaction(tx: ethers.TransactionResponse): DecodedSwap | null {
    // Decode swap(), unoswap(), etc.
  }
}
```

---

### **Phase 4: Protocol Registry**

#### Task 4.1: Create Protocol Registry
**File:** `mega-quant-app/backend/src/protocols/ProtocolRegistry.ts`

```typescript
import { IProtocolAdapter } from './IProtocolAdapter.js'
import { UniswapV3Adapter } from './UniswapV3Adapter.js'
import { UniswapV4Adapter } from './UniswapV4Adapter.js'
import { CowSwapAdapter } from './CowSwapAdapter.js'
import { OneInchAdapter } from './OneInchAdapter.js'

export class ProtocolRegistry {
  private adapters: Map<string, IProtocolAdapter> = new Map()

  constructor() {
    this.registerAdapter(new UniswapV3Adapter())
    this.registerAdapter(new UniswapV4Adapter())
    this.registerAdapter(new CowSwapAdapter())
    this.registerAdapter(new OneInchAdapter())
  }

  registerAdapter(adapter: IProtocolAdapter): void {
    this.adapters.set(adapter.protocolId, adapter)
  }

  getAdapter(protocolId: string): IProtocolAdapter | null {
    return this.adapters.get(protocolId) || null
  }

  getAllAdapters(): IProtocolAdapter[] {
    return Array.from(this.adapters.values())
  }

  getAdapterForRouter(networkId: number, routerAddress: string): IProtocolAdapter | null {
    for (const adapter of this.adapters.values()) {
      const routers = adapter.getRouterAddresses(networkId)
      if (routers.some(r => r.toLowerCase() === routerAddress.toLowerCase())) {
        return adapter
      }
    }
    return null
  }
}
```

---

### **Phase 5: Update Live Data Service**

#### Task 5.1: Modify Mempool Monitoring
**File:** `mega-quant-app/backend/src/services/live-data.ts`

**Changes:**
1. Import `ProtocolRegistry` and `TOKEN_ADDRESSES`
2. Update `LiveDataSubscription` to include `protocolId`
3. Modify `startAlchemyMempoolMonitoring` to use protocol adapters
4. Add pair-specific filtering

```typescript
import { ProtocolRegistry } from '../protocols/ProtocolRegistry.js'
import { TOKEN_ADDRESSES } from '../config/tokens.js'

interface LiveDataSubscription {
  clientId: string
  networkId: number
  poolAddress: string
  pairSymbol: string
  protocolId: string // NEW: Specify which protocol to monitor
}

private protocolRegistry = new ProtocolRegistry()

private async startAlchemyMempoolMonitoring(
  networkId: number,
  protocolId: string,
  pairSymbol: string
): Promise<void> {
  const adapter = this.protocolRegistry.getAdapter(protocolId)
  if (!adapter) {
    console.error(`[LiveData] No adapter for protocol ${protocolId}`)
    return
  }

  const routers = adapter.getRouterAddresses(networkId)

  // Get token addresses for pair (e.g., WETH/USDC)
  const [token0Symbol, token1Symbol] = pairSymbol.split('/')
  const token0 = TOKEN_ADDRESSES[networkId]?.[token0Symbol]
  const token1 = TOKEN_ADDRESSES[networkId]?.[token1Symbol]

  if (!token0 || !token1) {
    console.error(`[LiveData] Token addresses not found for ${pairSymbol} on network ${networkId}`)
    return
  }

  wsProvider.on('pending', async (txHash: string) => {
    const tx = await wsProvider.getTransaction(txHash)
    if (!tx) return

    // Filter by router
    const isToRouter = routers.some(r =>
      tx.to?.toLowerCase() === r.toLowerCase()
    )
    if (!isToRouter) return

    // Decode transaction using protocol adapter
    const decoded = adapter.decodeTransaction(tx)
    if (!decoded) return

    // ✅ PAIR-SPECIFIC FILTERING
    const matchesPair = adapter.matchesPair(
      decoded,
      token0.address,
      token1.address
    )
    if (!matchesPair) {
      return // Skip: Not for this trading pair
    }

    // Detect type
    const txType = adapter.detectTransactionType(tx, decoded)

    // Create and broadcast mempool transaction
    // ...
  })
}
```

---

### **Phase 6: Update Frontend**

#### Task 6.1: Update Trading Panel to Send Protocol ID
**File:** `mega-quant-app/src/components/TradingPanel/TradingPanel.tsx`

```typescript
const {
  isConnected,
  isSubscribed,
  price: livePrice,
  recentTrades: liveTrades,
  mempoolTxs: liveMempoolTxs,
} = useLiveData({
  networkId: selectedNetworkId,
  pairSymbol: selectedPair,
  protocolId: selectedProtocolId, // NEW: Pass protocol ID
  alchemyApiKey
});
```

---

## 🎯 Implementation Order

### Week 1: Core Infrastructure
- [ ] Task 1.1: Token address configuration
- [ ] Task 2.1: Protocol adapter interface
- [ ] Task 4.1: Protocol registry

### Week 2: Uniswap Support
- [ ] Task 3.1: Uniswap V3 adapter (with pair filtering)
- [ ] Task 3.2: Uniswap V4 adapter
- [ ] Test Uniswap V3/V4 with real mempool

### Week 3: Additional Protocols
- [ ] Task 3.3: CowSwap adapter
- [ ] Task 3.4: 1inch adapter
- [ ] Test all protocols

### Week 4: Integration & Testing
- [ ] Task 5.1: Update live-data service
- [ ] Task 6.1: Update frontend
- [ ] End-to-end testing

---

## 📊 Success Criteria

### Pair-Specific Filtering:
✅ Only show WETH/USDC swaps (not WETH/DAI or other pairs)
✅ Filter by token addresses (not just router)

### Multi-Protocol Support:
✅ Monitor Uniswap V3, V4, CowSwap, 1inch simultaneously
✅ Each protocol uses its own adapter
✅ Easy to add new protocols (just implement IProtocolAdapter)

### Code Quality:
✅ Generic architecture (no hardcoded protocols)
✅ Separation of concerns (protocol logic separate from service)
✅ Type-safe with TypeScript interfaces

---

## 🚀 Next Steps

1. Start with **Token Configuration** (simplest)
2. Create **Protocol Adapter Interface** (foundation)
3. Implement **Uniswap V3 Adapter** with pair filtering (immediate value)
4. Test with real mempool data
5. Add remaining protocols incrementally
