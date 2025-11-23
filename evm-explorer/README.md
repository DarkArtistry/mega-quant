# EVM Mempool + Arbitrage Explorer

A sophisticated frontend-only platform for visualizing real-time mempool transactions and cross-chain arbitrage opportunities across 300+ EVM chains.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/[your-username]/evm-explorer
cd evm-explorer

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Add your Etherscan API key to .env.local

# Run development server
pnpm dev
```

## 📋 Project Status

**Current Phase**: Core Module Development

| Module | Status | Description |
|--------|--------|-------------|
| Chain Registry | ✅ Complete | Dynamic chain/RPC management from Chainlist |
| Protocol Registry | ✅ Complete | Protocol identification & ABI fetching |
| Mempool Core | ✅ Complete | WebSocket/polling for mempool data |
| Alchemy Integration | ✅ Complete | Premium RPC support (80% chains with pending TX) |
| Frontend App | ⏳ Pending | Next.js application with visualizations |

See [HANDOVER-DOCUMENT.md](./HANDOVER-DOCUMENT.md) for detailed project state and next steps.

## 🏗️ Architecture

```
evm-explorer/
├── packages/           # Core functionality modules
│   ├── chain-registry/    # Dynamic chain/RPC management
│   ├── protocol-registry/ # Protocol identification & ABIs
│   ├── mempool-core/      # Real-time mempool monitoring
│   └── test-utils/        # Shared testing utilities
├── apps/              # Applications
│   ├── web/          # Next.js frontend
│   └── storybook/    # Component documentation
└── docs/             # Documentation
```

## 🔑 Key Features

- **No Hardcoded Data**: All chain and protocol data loaded dynamically
- **Multi-Chain Support**: 300+ EVM chains via Chainlist
- **Real-Time Mempool**: WebSocket connections with fallback (80% with Alchemy)
- **Protocol Identification**: Automatic protocol detection via DefiLlama
- **ABI Support**: Transaction decoding with multi-source ABI fetching
- **Arbitrage-Ready**: Infrastructure enables user-implemented arbitrage strategies
- **Frontend Only**: No backend servers, fully decentralized

## 🛠️ Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Blockchain**: Viem (TypeScript-first)
- **State**: Zustand + React Query
- **Styling**: Tailwind CSS + Radix UI
- **Testing**: Vitest + Testing Library
- **Build**: Turbo + pnpm
- **Hosting**: Firebase

## 📦 Available Packages

### @evm-explorer/chain-registry
Dynamic chain and RPC endpoint management.
```typescript
const registry = new ChainRegistry();
await registry.initialize();
const rpcUrl = await registry.getHealthyRpcUrl(1);
```

### @evm-explorer/protocol-registry
Protocol identification and ABI fetching.
```typescript
const protocolRegistry = new ProtocolRegistry(chainRegistry, {
  etherscanApiKey: process.env.ETHERSCAN_API_KEY
});
await protocolRegistry.initialize();
const abi = await protocolRegistry.getProtocolAbi(address, chainId);
```

## 📖 Documentation

- [Implementation Plan](./IMPLEMENTATION-DRAFTS-AND-TODOS.md) - Detailed development roadmap
- [Handover Document](./HANDOVER-DOCUMENT.md) - Current state and next steps
- [Architecture](./docs/ARCHITECTURE.md) - System design details
- Package READMEs - Individual module documentation

## 🧪 Development

```bash
# Run tests
pnpm test

# Enable integration tests (requires ETHERSCAN_API_KEY)
RUN_MEMPOOL_INTEGRATION_TESTS=true ETHERSCAN_API_KEY=your_key pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Build all packages
pnpm build

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

## 🔐 Environment Variables

Create `.env.local` with:
```env
# Etherscan API Key (supports 60+ chains with v2 API)
ETHERSCAN_API_KEY=your_etherscan_api_key

# Firebase Configuration (for deployment)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
```

## 🤝 Contributing

This project follows test-driven development. Please ensure:
1. All new features have tests
2. Tests pass before submitting PR
3. Code follows existing patterns
4. Comments explain complex logic

## 📄 License

MIT

---

For detailed implementation status and next steps, see [HANDOVER-DOCUMENT.md](./HANDOVER-DOCUMENT.md)
