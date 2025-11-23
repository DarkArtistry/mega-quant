# EVM Explorer Handover Document

## Project Overview
EVM Explorer is a frontend-only application that visualizes:
1. Real-time mempool transactions across 300+ EVM chains
2. Cross-chain arbitrage opportunities (Spot DEXs + Perpetual markets)
3. Bot detection by correlating mempool data with arbitrage opportunities

## Current Status
- **Phase 1 (Foundation)**: ✅ Complete
- **Phase 2 (Core Modules)**: Chain Registry ✅, Protocol Registry ✅
- **Phase 3 (Mempool Core)**: ✅ Complete
- **Phase 4 (Alchemy Integration)**: ✅ Complete
- **Phase 5 (UI/Frontend)**: ⏳ Pending

## Key Architectural Decisions

### 1. No Hardcoded Values
- All chain data dynamically loaded from Chainlist.org
- All protocol data dynamically loaded from DefiLlama API
- Environment variables for API keys

### 2. Monorepo Structure
```
evm-explorer/
├── packages/
│   ├── chain-registry/     ✅ Complete - Manages chains and RPC endpoints
│   ├── protocol-registry/  ✅ Complete - Protocol identification and ABIs
│   ├── mempool-core/       ✅ Complete - WebSocket/polling for mempool data
│   ├── ui-components/      ⏳ Todo - Shared React components
│   └── test-utils/         ✅ Complete - Testing utilities
└── apps/
    ├── web/               ⏳ Todo - Next.js main application
    └── storybook/         ⏳ Todo - Component documentation
```

### 3. Technology Stack
- **Framework**: Next.js 14 with App Router
- **Blockchain**: Viem (lightweight, TypeScript-first)
- **State**: Zustand + React Query
- **Testing**: Vitest + Testing Library
- **Build**: Turbo + pnpm
- **Hosting**: Firebase

## Completed Modules

### 1. Chain Registry (`packages/chain-registry`) ✅
**Purpose**: Dynamically manages blockchain networks and RPC endpoints

**Key Features**:
- Loads chain data from Chainlist.org API
- Health checks for RPC endpoints
- Automatic failover between endpoints
- Multi-RPC support for mempool aggregation
- Provider diversity tracking

**Key Files**:
- `src/chains.ts`: ChainDataLoader class
- `src/rpc-manager.ts`: RPC endpoint management
- `src/registry.ts`: Main ChainRegistry class

**Usage Example**:
```typescript
const registry = new ChainRegistry();
await registry.initialize();

// Get healthy RPC endpoint
const rpcUrl = await registry.getHealthyRpcUrl(1);

// Get multiple clients for mempool aggregation
const clients = await registry.getMultiplePublicClients(1, { 
  clientCount: 3,
  preferDiverse: true 
});
```

### 2. Protocol Registry (`packages/protocol-registry`) ✅
**Purpose**: Identifies DeFi protocols and provides ABIs for transaction decoding

**Key Features**:
- DefiLlama integration for protocol data
- Manual registry for high-confidence protocols
- ABI fetching from multiple sources
- Dynamic chain name resolution
- Caching with TTL

**Key Files**:
- `src/registry.ts`: Main ProtocolRegistry class
- `src/loader.ts`: DefiLlama data fetcher
- `src/manual-registry.ts`: Curated protocol addresses
- `src/abi-loader.ts`: ABI fetching logic
- `src/manual-abis.ts`: Pre-configured ABIs

**ABI Sources** (in priority order):
1. Manual ABIs (highest confidence)
2. Etherscan API v2 (supports 60+ chains)
3. Sourcify (decentralized verification)
4. 4byte directory (function signatures)

**Usage Example**:
```typescript
const chainRegistry = new ChainRegistry();
await chainRegistry.initialize();

const protocolRegistry = new ProtocolRegistry(chainRegistry, {
  etherscanApiKey: process.env.ETHERSCAN_API_KEY
});
await protocolRegistry.initialize();

// Look up protocol
const result = protocolRegistry.lookup('0x7a250d...', 1);

// Get ABI for decoding
const abi = await protocolRegistry.getProtocolAbi('0x7a250d...', 1);
```

## Environment Configuration

### `.env.local` (created, in .gitignore)
```env
# Etherscan API Key (supports 60+ chains with v2 API)
ETHERSCAN_API_KEY=FJJGJJ3E73GWTQK4EG4F2B85SN1Q54H8ZG

# Firebase Configuration (for deployment)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

## Next Steps

### Phase 3: Mempool Core Module ✅
**Status**: Complete with Alchemy Integration

**Implemented Features**:
1. WebSocket connection manager for real-time data
2. HTTP polling fallback for chains without WebSocket
3. Transaction decoder using protocol ABIs
4. Transaction enrichment with protocol info
5. Subscription management for different chains
6. Alchemy integration for premium RPC support

**Key Achievement**:
- With Alchemy, pending transaction monitoring now works on 80% of major chains (4/5)
- Previously 0% with public RPCs

### Phase 4: Arbitrage Detection (User Implementation)
**Important Architecture Decision**: Arbitrage logic is intentionally NOT a core module.

**Rationale**:
- The infrastructure provides generic mempool monitoring
- Users implement their own arbitrage strategies at runtime
- This keeps the core flexible and strategy-agnostic

**What the infrastructure provides**:
1. Real-time mempool transaction streams
2. Decoded transaction data with protocol identification
3. Cross-chain monitoring capabilities
4. All necessary data for arbitrage detection

**What users implement**:
1. Custom arbitrage algorithms
2. Profit calculations
3. Trading strategies
4. Risk management logic

### Phase 5: Frontend Application ⏳
**Requirements**:
1. Next.js 14 app with App Router
2. Two main visualizations:
   - Mempool heatmap with protocol activity
   - Arbitrage opportunity dashboard
3. Real-time updates using React Query
4. Responsive design

## Testing Strategy
All modules have comprehensive tests:
- Unit tests with Vitest
- Mocked external dependencies
- ~80% code coverage target

Run tests:
```bash
pnpm test                    # All tests
pnpm test:watch             # Watch mode
pnpm test:coverage          # Coverage report
```

## Development Commands
```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

## Important Notes
1. **Dynamic Data**: Never hardcode chain or protocol data
2. **API Keys**: Etherscan API v2 supports 60+ chains with single key
3. **Comments**: Add comprehensive JSDoc comments explaining what each class/method addresses
4. **Error Handling**: Always handle API failures gracefully
5. **Performance**: Use caching and batch operations where possible

## Resources
- [Chainlist API](https://chainid.network/chains.json)
- [DefiLlama API](https://api.llama.fi/protocols)
- [Etherscan API v2 Docs](https://docs.etherscan.io/v2)
- [Viem Documentation](https://viem.sh)
- [Next.js App Router](https://nextjs.org/docs/app)

## Contact
For questions about implementation decisions, refer to:
- `IMPLEMENTATION-DRAFTS-AND-TODOS.md` for detailed plans
- Individual package READMEs for usage examples
- Test files for expected behavior

---
Last handover: ${new Date().toISOString()}
