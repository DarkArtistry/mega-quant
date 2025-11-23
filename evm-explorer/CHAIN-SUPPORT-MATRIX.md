# EVM Chain Support Matrix for Mempool Monitoring

## Executive Summary

**CRITICAL FINDING**: Public RPC endpoints do NOT support pending transaction monitoring for most major chains. This severely limits arbitrage capabilities without premium RPC providers.

## Test Results (November 2025)

### 🔴 Pending Transaction Support Status

| Chain | Chain ID | RPC Connection | Pending TX Support | Error Details |
|-------|----------|----------------|-------------------|---------------|
| **Ethereum** | 1 | ✅ Working | ❌ **NOT SUPPORTED** | `eth_newPendingTransactionFilter` not available on public RPCs |
| **Base** | 8453 | ✅ Working | ❌ **NOT SUPPORTED** | Error: "this request method is not supported" |
| **Arbitrum** | 42161 | ✅ Working | ❌ **NOT SUPPORTED** | Error: "method does not exist/is not available" |
| **Optimism** | 10 | ✅ Working | ❌ **NOT SUPPORTED** | Error: "rpc method is not whitelisted" |
| **Polygon** | 137 | ❌ No RPC | ❌ **NOT SUPPORTED** | No healthy public endpoints found |
| **BSC** | 56 | ❌ No RPC | ❌ **NOT SUPPORTED** | No healthy public endpoints found |
| **Avalanche** | 43114 | ✅ Working | ❌ **NOT SUPPORTED** | Error: "method is not available" |
| **Fantom** | 250 | ❌ No RPC | ❌ **NOT SUPPORTED** | No healthy public endpoints found |

### 📊 Support Breakdown

- **Chains with working RPC connections**: 5/8 (62.5%)
- **Chains with pending TX support (public)**: 0/8 (0%)
- **Chains critical for arbitrage working**: 0/6 (0%)

## Why Pending Transactions Don't Work

### 1. **L2 Chains (Base, Arbitrum, Optimism)**
- These chains have **different mempool architectures** than Ethereum L1
- Sequencers handle transaction ordering, not traditional mempools
- Public RPCs explicitly disable pending transaction methods
- **Solution**: Need sequencer-specific APIs or premium providers

### 2. **Public RPC Limitations**
Most public RPC providers disable pending transaction methods because:
- **Resource intensive**: Streaming pending transactions uses significant bandwidth
- **DoS prevention**: Prevents abuse of free infrastructure
- **Business model**: Premium feature reserved for paid tiers

### 3. **Method Not Whitelisted**
The `eth_newPendingTransactionFilter` method is commonly disabled on public endpoints:
```
- Ethereum: "method not supported"
- Base: "this request method is not supported"
- Arbitrum: "method does not exist/is not available"
- Optimism: "rpc method is not whitelisted"
```

## Impact on Arbitrage Module

### ❌ **Current Limitations**
1. **No cross-chain arbitrage detection** with public RPCs
2. **No real-time MEV monitoring** possible
3. **No sandwich attack detection**
4. **Limited to historical/confirmed transaction analysis only**

### ✅ **What Still Works**
1. **Block monitoring**: Can watch for new confirmed blocks
2. **Event logs**: Can monitor DEX events after confirmation
3. **Price feeds**: Can track on-chain prices (with ~12s delay)
4. **Historical analysis**: Can analyze past arbitrage opportunities

## Solutions & Recommendations

### Option 1: Premium RPC Providers (Recommended)
| Provider | Chains Supported | Pending TX Support | Cost |
|----------|-----------------|-------------------|------|
| **Alchemy** | ETH, Base, Arb, OP, Polygon | ✅ Yes (with filters) | Free tier + paid |
| **Infura** | ETH, Arb, OP, Polygon | ✅ Yes (limited) | Free tier + paid |
| **QuickNode** | Most major chains | ✅ Yes | Paid only |
| **Chainstack** | 40+ chains | ✅ Yes | Free tier + paid |
| **GetBlock** | 50+ chains | ✅ Yes | Free tier + paid |

### Option 2: Alternative Data Sources
1. **MEV-Boost Relays**: For Ethereum mainnet MEV data
2. **Flashbots Protect RPC**: For Ethereum private mempool
3. **Block Explorers APIs**: Some provide pending TX endpoints
4. **Direct Node Access**: Run your own nodes

### Option 3: Hybrid Approach
```typescript
// Fallback strategy for arbitrage detection
const strategy = {
  premiumChains: ['ethereum', 'base'],  // Use Alchemy/Infura
  blockMonitoring: ['arbitrum', 'optimism'],  // Monitor confirmed blocks
  eventBased: ['polygon', 'bsc'],  // Watch DEX events
};
```

## Implementation Recommendations

### For Testing/Development
```bash
# Use environment variables for premium RPCs
ALCHEMY_API_KEY=your_key_here
INFURA_PROJECT_ID=your_project_id

# Configure per chain
ETHEREUM_RPC=https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}
BASE_RPC=https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}
```

### For Production
1. **Use premium providers** for chains critical to arbitrage
2. **Implement fallback strategies** for unsupported chains
3. **Consider running own nodes** for high-frequency trading
4. **Use WebSocket connections** where available for lower latency

## Code Changes Needed

### 1. Update Chain Registry
```typescript
// Add premium RPC support
class ChainRegistry {
  getPremiumRpcUrl(chainId: number): string | null {
    const premiumProviders = {
      1: process.env.ETHEREUM_RPC,
      8453: process.env.BASE_RPC,
      42161: process.env.ARBITRUM_RPC,
      // ...
    };
    return premiumProviders[chainId] || null;
  }
}
```

### 2. Update Mempool Client
```typescript
// Add fallback for chains without pending TX support
class MempoolClient {
  async subscribe(options: SubscriptionOptions) {
    const supportsPendingTx = await this.checkPendingTxSupport(options.chainId);

    if (!supportsPendingTx) {
      // Fallback to block monitoring
      return this.subscribeToBlocks(options);
    }

    // Normal pending TX subscription
    return this.subscribeToPendingTx(options);
  }
}
```

## Test Commands

```bash
# Run chain diagnostic tests
RUN_CHAIN_DIAGNOSTIC=true pnpm test chain-connection

# Test with premium RPCs (set env vars first)
ALCHEMY_API_KEY=xxx RUN_MEMPOOL_INTEGRATION_TESTS=true pnpm test
```

## Conclusion

The arbitrage module **cannot function effectively** with only public RPCs. To enable cross-chain arbitrage detection:

1. **Immediate**: Get API keys for Alchemy/Infura (free tiers available)
2. **Short-term**: Implement fallback strategies for unsupported chains
3. **Long-term**: Consider running dedicated nodes for critical chains

**Without premium RPC access, the mempool monitoring functionality is essentially non-functional for arbitrage purposes.**

---

*Last Updated: November 2025*
*Test Environment: Public RPC endpoints via Chainlist*