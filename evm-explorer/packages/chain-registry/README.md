# @evm-explorer/chain-registry

Dynamic chain and RPC management for EVM-compatible blockchains. This module provides automatic chain discovery, RPC endpoint health checking, and multi-RPC support for comprehensive mempool monitoring.

## Features

- **300+ EVM Chains**: Automatically loads chain data from Chainlist.org
- **Dynamic RPC Discovery**: No hardcoded endpoints - everything is loaded dynamically
- **Health Checking**: Automatic endpoint health monitoring with caching
- **Multi-RPC Support**: Query multiple RPC providers for comprehensive mempool coverage
- **Provider Diversity**: Prioritizes different providers for better data coverage
- **Automatic Failover**: Switches to healthy endpoints automatically
- **Reliability Scoring**: Tracks endpoint performance over time

## Installation

```bash
npm install @evm-explorer/chain-registry
# or
pnpm add @evm-explorer/chain-registry
```

## Basic Usage

```typescript
import { ChainRegistry } from '@evm-explorer/chain-registry';

// Initialize the registry
const registry = new ChainRegistry();
await registry.initialize();

// Get chain information
const ethereum = registry.getChain(1);
console.log(ethereum.name); // "Ethereum Mainnet"

// Get a healthy RPC client
const client = await registry.getPublicClient(1);
const blockNumber = await client.getBlockNumber();
```

## Mempool Aggregation

For comprehensive mempool monitoring, it's crucial to query multiple RPC providers since different nodes may have different pending transactions:

```typescript
// Get multiple diverse clients
const clients = await registry.getMultiplePublicClients(1, {
  clientCount: 3,        // Get 3 different clients
  preferDiverse: true,   // Prefer different providers
  minReliability: 0.5    // Only use endpoints with >50% reliability
});

// Query all clients for pending transactions
const mempoolResults = await Promise.allSettled(
  clients.map(async (client) => {
    const block = await client.getBlock({ blockTag: 'pending' });
    return {
      provider: client.transport.url,
      transactionCount: block.transactions.length,
      transactions: block.transactions
    };
  })
);

// Aggregate unique transactions from all providers
const uniqueTransactions = new Set();
for (const result of mempoolResults) {
  if (result.status === 'fulfilled') {
    result.value.transactions.forEach(tx => uniqueTransactions.add(tx));
  }
}

console.log(`Found ${uniqueTransactions.size} unique pending transactions`);
```

## Chain Discovery

```typescript
// Search for chains
const arbitrumChains = registry.searchChains('arbitrum');
const l2Chains = registry.getAllChains().filter(chain => 
  chain.name.includes('L2') || chain.name.includes('Layer 2')
);

// Check if a chain is supported
if (registry.isChainSupported(42161)) {
  console.log('Arbitrum One is supported!');
}

// Get all supported chain IDs
const chainIds = registry.getSupportedChainIds();
```

## RPC Endpoint Management

```typescript
// Get diverse RPC endpoints for a chain
const rpcUrls = await registry.getDiverseHealthyRpcUrls(1, {
  clientCount: 5,
  preferDiverse: true
});

// Check endpoint health status
const healthStatus = registry.getHealthStatus(1);
for (const [url, status] of healthStatus) {
  console.log(`${url}: ${status.healthy ? 'healthy' : 'unhealthy'} (${status.latency}ms)`);
}

// Get reliability scores
const scores = registry.getReliabilityScores(1);
for (const [url, score] of scores) {
  console.log(`${url}: ${(score * 100).toFixed(0)}% reliable`);
}
```

## Advanced Configuration

```typescript
const registry = new ChainRegistry({
  // How long to cache chain data (default: 24 hours)
  cacheExpiry: 12 * 60 * 60 * 1000,
  
  // Maximum endpoints to check per chain (default: 5)
  maxEndpointsPerChain: 10,
  
  // Health check timeout (default: 5000ms)
  healthCheckTimeout: 3000
});
```

## Provider Diversity

The module automatically identifies and groups endpoints by provider:

```typescript
const providerMap = registry.getRpcEndpointsByProvider(1);
for (const [provider, endpoints] of providerMap) {
  console.log(`${provider}: ${endpoints.length} endpoints`);
}
// Output:
// LlamaNodes: 2 endpoints
// Ankr: 1 endpoints
// Alchemy: 1 endpoints
// ...
```

## WebSocket Support

```typescript
// Get clients including WebSocket endpoints
const clients = await registry.getMultiplePublicClients(1, {
  clientCount: 3,
  includeWebSocket: true  // Include ws:// and wss:// endpoints
});

// WebSocket clients can subscribe to real-time updates
for (const client of clients) {
  if (client.transport.type === 'webSocket') {
    const unwatch = client.watchBlocks({
      onBlock: (block) => {
        console.log('New block:', block.number);
      }
    });
  }
}
```

## Error Handling

```typescript
try {
  const client = await registry.getPublicClient(99999);
} catch (error) {
  if (error.message.includes('No RPC endpoints found')) {
    console.log('Chain not supported');
  } else if (error.message.includes('No healthy RPC endpoints')) {
    console.log('All endpoints are down');
  }
}
```

## Cleanup

```typescript
// Disconnect specific chain
registry.disconnectChain(1);

// Disconnect all chains
registry.disconnectAll();
```

## Why Multiple RPCs for Mempool?

Different RPC providers may have different views of the mempool because:

1. **Geographic Distribution**: Transactions propagate through the network at different speeds
2. **Node Configuration**: Some nodes may have different mempool size limits or filters
3. **Provider Policies**: Some providers may filter certain types of transactions
4. **Network Topology**: Nodes connected to different peers see transactions at different times

By querying multiple providers, you get a more comprehensive view of pending transactions, which is crucial for:
- MEV detection
- Arbitrage opportunity discovery
- Network congestion monitoring
- Transaction flow analysis

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT