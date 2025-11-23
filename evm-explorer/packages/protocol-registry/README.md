# Protocol Registry

The Protocol Registry module provides protocol identification and enrichment capabilities for EVM transactions. It combines data from multiple sources to identify which DeFi protocols are being interacted with in mempool transactions, and provides contract ABIs for transaction decoding.

## Features

- **Multi-Source Data**: Combines high-confidence manual data with comprehensive DefiLlama API data
- **Fast Lookups**: Optimized for real-time transaction processing
- **Multi-Chain Support**: Works across all major EVM chains with dynamic chain resolution
- **Confidence Scoring**: Provides confidence levels for protocol matches
- **Category Classification**: Groups protocols by type (DEX, Lending, NFT, etc.)
- **ABI Support**: Fetches contract ABIs from multiple sources for transaction decoding
- **Batch Operations**: Efficient batch lookup for processing multiple transactions
- **Caching**: Built-in caching to reduce API calls
- **TypeScript Support**: Fully typed for excellent developer experience

## Installation

```bash
pnpm add @evm-explorer/protocol-registry
```

## Usage

### Basic Usage

```typescript
import { ProtocolRegistry } from '@evm-explorer/protocol-registry';
import { ChainRegistry } from '@evm-explorer/chain-registry';

// First initialize the chain registry
const chainRegistry = new ChainRegistry();
await chainRegistry.initialize();

// Create and initialize the protocol registry
const protocolRegistry = new ProtocolRegistry(chainRegistry);
await protocolRegistry.initialize();

// Look up a protocol
const result = protocolRegistry.lookup('0x7a250d5630b4cf539739df2c5dacb4c659f2488d', 1);
if (result) {
  console.log(`Protocol: ${result.protocol.name}`);
  console.log(`Category: ${result.protocol.category}`);
  console.log(`Confidence: ${result.confidence}`);
  console.log(`Source: ${result.source}`);
}
```

### Quick Lookups

For performance-critical paths where confidence scoring isn't needed:

```typescript
// Fast lookup without confidence scoring
const protocol = protocolRegistry.quickLookup('0x7a250d5630b4cf539739df2c5dacb4c659f2488d', 1);
if (protocol) {
  console.log(`Found ${protocol.name}`);
}
```

### Batch Operations

Process multiple addresses efficiently:

```typescript
const addresses = [
  { address: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', chainId: 1 },
  { address: '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45', chainId: 1 },
  { address: '0x1111111254eeb25477b68fb85ed929f73a960582', chainId: 1 },
];

const results = protocolRegistry.batchLookup(addresses);
for (const [address, result] of results) {
  if (result) {
    console.log(`${address}: ${result.protocol.name}`);
  }
}
```

### Query by Chain or Category

```typescript
// Get all protocols on Ethereum
const ethereumProtocols = protocolRegistry.getProtocolsByChain(1);

// Get all DEX protocols
const dexProtocols = protocolRegistry.getProtocolsByCategory('DEX');

// Search by name
const uniswapProtocols = protocolRegistry.searchByName('uniswap');
```

### Custom Protocols

Add protocols not in DefiLlama:

```typescript
protocolRegistry.addCustomProtocol({
  name: 'My Custom Protocol',
  category: 'DEX',
  chainId: 1,
  address: '0x1234567890123456789012345678901234567890',
  metadata: {
    symbol: 'MCP',
    website: 'https://mycustomprotocol.com',
  },
});
```

### Statistics and Monitoring

```typescript
// Get registry statistics
const stats = protocolRegistry.getStats();
console.log(`Total protocols: ${stats.totalProtocols}`);
console.log(`Unique addresses: ${stats.totalAddresses}`);
console.log('By category:', stats.byCategory);
console.log('By chain:', stats.byChain);

// Get all protocol names
const names = protocolRegistry.getProtocolNames();

// Get all categories
const categories = protocolRegistry.getCategories();
```

### Configuration

```typescript
const registry = new ProtocolRegistry(chainRegistry, {
  // Cache duration in milliseconds (default: 6 hours)
  cacheExpiry: 6 * 60 * 60 * 1000,
  
  // Batch size for processing (default: 1000)
  batchSize: 1000,
  
  // Include TVL data (default: false)
  includeTvl: false,
  
  // Etherscan API key (v2 supports 60+ chains)
  etherscanApiKey: process.env.ETHERSCAN_API_KEY,
});
```

### ABI Support

The registry can fetch contract ABIs from multiple sources for transaction decoding:

```typescript
// Get ABI for a protocol
const abi = await protocolRegistry.getProtocolAbi(
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', 
  1
);
if (abi) {
  // Use with viem to decode transactions
  const decoded = decodeFunctionData({ abi, data: txData });
  console.log('Function:', decoded.functionName);
  console.log('Args:', decoded.args);
}

// Batch fetch ABIs
const abis = await protocolRegistry.batchGetAbis([
  { address: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', chainId: 1 },
  { address: '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45', chainId: 1 },
]);

// Get function signature when ABI is not available
const signature = await protocolRegistry.getFunctionSignature('0x38ed1739');
console.log(signature); // "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)"
```

#### ABI Sources

ABIs are fetched from multiple sources in priority order:

1. **Manual ABIs**: Curated ABIs for critical protocols (highest confidence)
2. **Etherscan API v2**: Verified contract ABIs (supports 60+ chains with single API key)
3. **Sourcify**: Decentralized contract verification
4. **4byte Directory**: Function signatures as fallback

#### Manual ABIs

The module includes pre-configured ABIs for major protocols:

```typescript
import { ManualAbiRegistry } from '@evm-explorer/protocol-registry';

// Check if manual ABI exists
if (ManualAbiRegistry.hasAbi(address, chainId)) {
  const abi = ManualAbiRegistry.getAbi(address, chainId);
}

// Available manual ABIs:
// - Uniswap V2 Router
// - Uniswap V3 Router  
// - 1inch Aggregation Router V5
// - OpenSea Seaport
// - Standard ERC20
```

## Manual Protocol Registry

The module includes a curated list of high-confidence protocol addresses:

```typescript
import { ManualProtocolRegistry } from '@evm-explorer/protocol-registry';

// Get all manual protocols
const manualProtocols = ManualProtocolRegistry.getAll();

// Check if an address is manually verified
const isVerified = ManualProtocolRegistry.isKnownProtocol(
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
  1
);

// Get statistics
const stats = ManualProtocolRegistry.getStats();
```

## Data Sources

1. **Manual Registry**: High-confidence addresses for critical protocols
   - Major DEXs (Uniswap, 1inch, CowSwap)
   - Lending protocols (Aave, Compound)
   - NFT marketplaces (OpenSea, Blur)
   - Chain-specific protocols (GMX, Velodrome)

2. **DefiLlama API**: Comprehensive protocol coverage
   - 3000+ protocols across 100+ chains
   - TVL data
   - Category classification
   - Social links and metadata

## Confidence Levels

- **High**: Protocol is in the manual registry (manually verified)
- **Medium**: Protocol is from DefiLlama API
- **Low**: Reserved for future community-sourced data

## Supported Chains

The registry supports all major EVM chains including:
- Ethereum (1)
- Polygon (137)
- Arbitrum (42161)
- Optimism (10)
- Base (8453)
- And many more...

## Performance Considerations

- Initial load fetches ~3000 protocols (cached for 6 hours)
- Lookups are O(1) using hash maps
- Batch operations process efficiently without repeated lookups
- Multi-RPC support integrates seamlessly with transaction processing

## API Reference

### ProtocolRegistry

Constructor:
- `new ProtocolRegistry(chainRegistry, options?)`: Create a new registry instance

Methods:
- `initialize()`: Initialize the registry (required before use)
- `lookup(address, chainId)`: Full lookup with confidence scoring
- `quickLookup(address, chainId)`: Fast lookup without confidence
- `batchLookup(lookups)`: Process multiple lookups efficiently
- `getProtocolsByChain(chainId)`: Get all protocols on a chain
- `getProtocolsByCategory(category)`: Get all protocols in a category
- `searchByName(query)`: Search protocols by name
- `addCustomProtocol(protocol)`: Add a custom protocol
- `getStats()`: Get registry statistics
- `refresh(force)`: Refresh data from external sources
- `getProtocolNames()`: Get all unique protocol names
- `getCategories()`: Get all unique categories
- `exportAll()`: Export all protocol data
- `getProtocolAbi(address, chainId)`: Get ABI for a protocol
- `getFunctionSignature(selector)`: Get function signature for 4-byte selector
- `batchGetAbis(protocols)`: Batch fetch ABIs for multiple protocols
- `clearAllCaches()`: Clear all caches including ABI cache

### Types

```typescript
interface ProtocolInfo {
  name: string;
  category: string;
  chainId: number;
  address: Address;
  logo?: string;
  tvl?: number;
  metadata?: {
    symbol?: string;
    website?: string;
    twitter?: string;
  };
}

interface ProtocolLookupResult {
  protocol: ProtocolInfo;
  confidence: 'high' | 'medium' | 'low';
  source: 'manual' | 'defiLlama' | 'community';
}
```

## Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
```

## Contributing

To add a protocol to the manual registry:

1. Edit `src/manual-registry.ts`
2. Add the protocol with verified addresses
3. Ensure proper categorization
4. Submit a PR with evidence of address verification

## License

MIT