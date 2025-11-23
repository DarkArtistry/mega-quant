# MEGA QUANT

**Multi-chain Delta-Neutral Trading Platform**

Cross-chain DeFi trading with trustless asset transfers between Ethereum and Base.

---

## Technical Deep Dive: Building MEGA QUANT

### Desktop Architecture with Electron

**→ Code:** [`electron/main.ts`](./mega-quant-app/electron/main.ts) | [`electron/preload.ts`](./mega-quant-app/electron/preload.ts)

We built MEGA QUANT as a native desktop application using Electron, combining the flexibility of web technologies with the performance and security of a native app. This architecture allows us to securely manage private keys locally while providing a responsive trading interface. The Electron main process handles sensitive operations (key management, database access) while the renderer process focuses on UI and real-time data visualization.

### DeltaTrade Class: Core Trading Engine

**→ Code:** [`backend/src/lib/trading/DeltaTrade.ts`](./mega-quant-app/backend/src/lib/trading/DeltaTrade.ts)

At the heart of our trading system is the DeltaTrade JavaScript class, which implements delta-neutral arbitrage strategies. This class allows programmatic monitoring of price discrepancies across Uniswap V3, Uniswap V4, and 1inch aggregator to identify profitable arbitrage opportunities. The DeltaTrade engine calculates optimal position sizes, manages slippage tolerance, and executes multi-step trades atomically to maintain delta neutrality while capturing spread profits.

### Web Workers for Performance

**→ Code:** [`public/strategy-worker.js`](./mega-quant-app/public/strategy-worker.js) | [`src/components/StrategyCard/StrategyCard.tsx`](./mega-quant-app/src/components/StrategyCard/StrategyCard.tsx)

To keep the UI responsive during intensive calculations, we offloaded all strategy execution to Web Workers (strategy-worker.js). Each deployed trading strategy runs in its own isolated worker thread, performing continuous price monitoring, technical indicator calculations, and trade simulations without blocking the main UI thread. This architecture allows traders to run multiple strategies simultaneously while maintaining smooth 60fps chart rendering and real-time market data updates.

### Multi-DEX Integration

**→ Code:** [`backend/src/protocols/`](./mega-quant-app/backend/src/protocols/) | [`backend/src/lib/trading/services/`](./mega-quant-app/backend/src/lib/trading/services/)

**Uniswap V4:** We integrated Uniswap V4's new hook system and singleton architecture. Unlike V3's pool-per-pair model, V4 uses a single contract with custom hooks for advanced features. We leverage the Quoter contract to simulate swaps and calculate optimal routing across different fee tiers and hook configurations.

**1inch Aggregator:** For maximum liquidity and best execution, we integrated 1inch's fusion mode API. The aggregator automatically routes trades across 100+ DEXs, finding the optimal path while minimizing gas costs and slippage. We poll the quote API every 15 seconds to maintain fresh pricing data for our arbitrage detection algorithms.

### Cross-Platform Binary Distribution

**→ Code:** [`package.json`](./mega-quant-app/package.json#L61-L115) (build config) | [`resources/nodejs/`](./mega-quant-app/resources/nodejs/)

A major challenge was packaging Node.js along with the Electron app to ensure consistent runtime across Windows, macOS, and Linux. We bundle a stripped-down Node.js binary (resources/nodejs/) with the application, allowing backend services to run independently of the user's system Node installation. This approach eliminates version conflicts and ensures our complex dependency tree (ethers.js, viem, Web3 providers) works reliably across all platforms.

### Database & Encryption

**→ Code:** [`backend/src/services/encryption-service.ts`](./mega-quant-app/backend/src/services/encryption-service.ts) | [`backend/src/db/`](./mega-quant-app/backend/src/db/)

All sensitive data (private keys, API keys, trading history) is stored in a local SQLite database with AES-256-GCM encryption. The master password never touches the disk - it exists only in memory during the session. We implemented a secure key derivation function (PBKDF2) to generate encryption keys from the user's password, with each encrypted field storing its own IV and authentication tag for maximum security.

### Real-time Market Data Pipeline

**→ Code:** [`backend/src/services/live-data.ts`](./mega-quant-app/backend/src/services/live-data.ts) | [`src/components/TradingViewContainer/`](./mega-quant-app/src/components/TradingViewContainer/)

We built a WebSocket-based live data service that maintains persistent connections to Alchemy's WebSocket API for real-time mempool monitoring. The service filters pending transactions targeting Uniswap/1inch routers, decodes swap calldata, and broadcasts relevant trades to the frontend via WebSocket. This allows traders to see incoming trades before they're mined, enabling front-running detection and MEV opportunity analysis.

### EIL Integration for Cross-Chain Fund Management

**→ Code:** [`backend/src/lib/eil/`](./mega-quant-app/backend/src/lib/eil/) | [`src/components/CrossChainTransfer/`](./mega-quant-app/src/components/CrossChainTransfer/)

Finally, we integrated the Ethereum Interoperability Layer (EIL) protocol to enable seamless fund movement between Ethereum and Base. Using ERC-4337 account abstraction and ERC-7683 cross-chain intents, traders can rebalance portfolios across chains with a single signature. The voucher-based system provides trustless, atomic transfers in ~30 seconds, with gas fees sponsored by paymasters - eliminating the need to maintain ETH balances on multiple chains. This lets traders keep capital efficient while accessing liquidity on both networks.

### Notable Hacks & Optimizations

- **Bundle Size Optimization:** We use Vite's code-splitting to lazy-load trading chart libraries (lightweight-charts) only when needed, reducing initial load time by 60%.

- **Provider Caching:** Ethers.js providers are expensive to create. We maintain a singleton cache keyed by (networkId, rpcUrl) to reuse providers across components.

- **Ring Buffers:** For real-time trade feeds and mempool data, we use fixed-size ring buffers (50 items) instead of unbounded arrays to prevent memory leaks during extended trading sessions.

- **Monaco Editor Integration:** We embedded Monaco (VS Code's editor) for strategy development with full TypeScript IntelliSense, allowing traders to write and test strategies with autocomplete for our trading API.

The result is a professional-grade trading platform that feels like a native desktop app while leveraging the entire JavaScript/TypeScript ecosystem for rapid development and cross-chain DeFi integration.

---

## Getting Started

See the [mega-quant-app README](./mega-quant-app/README.md) for installation and usage instructions.

---

**Built with ❤️ for ETHGlobal Buenos Aires 2025**
