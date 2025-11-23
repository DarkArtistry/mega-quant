# EVM Mempool + Arbitrage Explorer: Implementation Drafts and TODOs

## 🎯 Project Overview

A sophisticated frontend-only platform that visualizes:
1. **Real-time mempool transactions** across 300+ EVM chains
2. **Cross-chain arbitrage opportunities** (Spot DEXs + Perpetual markets)
3. **Bot detection** by correlating mempool data with arbitrage opportunities

### Key Principles
- **Frontend-only**: No backend servers, all data from public sources
- **Dynamic Data**: All chain/RPC data loaded from Chainlist, protocols from DefiLlama
- **Modular Architecture**: Clean separation of concerns for future extensibility
- **Production-ready**: Comprehensive testing, error handling, and performance optimization

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    External Data Sources                     │
├─────────────────┬──────────────────┬───────────────────────┤
│  Chainlist.org  │  DefiLlama API   │  DEX/Perp Protocols   │
└────────┬────────┴────────┬─────────┴────────┬──────────────┘
         │                 │                   │
         ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                Core Modules (@evm-explorer/*)               │
├─────────────────┬──────────────────┬───────────────────────┤
│  mempool-core   │                  │   protocol-registry   │
└────────┬────────┴────────┬─────────┴────────┬──────────────┘
         │                 │                   │
         ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                     State Management                         │
│                    (Zustand + React Query)                   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     UI Components                            │
│               (Next.js + Storybook + Tailwind)              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Firebase Hosting + Analytics                    │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Project Structure

```bash
evm-explorer/
├── packages/                    # Monorepo packages
│   ├── mempool-core/           # Core mempool functionality
│   │   ├── src/
│   │   │   ├── client.ts       # Mempool client with WebSocket/polling
│   │   │   ├── decoder.ts      # Transaction decoder
│   │   │   ├── enricher.ts     # Transaction enrichment
│   │   │   ├── types.ts        # TypeScript interfaces
│   │   │   └── index.ts        # Public API
│   │   ├── tests/
│   │   └── package.json
│   │
│   │   ├── src/
│   │   │   ├── detector.ts     # Opportunity detection algorithms
│   │   │   ├── calculator.ts   # Profit calculations
│   │   │   ├── markets/        # Market-specific logic
│   │   │   │   ├── spot.ts
│   │   │   │   └── perp.ts
│   │   │   └── index.ts
│   │   └── tests/
│   │
│   ├── protocol-registry/      # Protocol data management
│   │   ├── src/
│   │   │   ├── registry.ts     # Protocol lookup
│   │   │   ├── updater.ts      # DefiLlama sync
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   └── tests/
│   │
│   ├── chain-registry/         # Chain configuration
│   │   ├── src/
│   │   │   ├── chains.ts       # Chain data management
│   │   │   ├── rpc-manager.ts  # RPC endpoint selection
│   │   │   ├── health-check.ts # Endpoint health monitoring
│   │   │   └── index.ts
│   │   └── tests/
│   │
│   ├── ui-components/          # Shared UI components
│   │   ├── src/
│   │   │   ├── Table/
│   │   │   ├── Heatmap/
│   │   │   ├── Card/
│   │   │   └── index.ts
│   │   └── tests/
│   │
│   └── test-utils/             # Shared testing utilities
│       ├── src/
│       │   ├── mocks.ts
│       │   ├── fixtures.ts
│       │   └── helpers.ts
│       └── package.json
│
├── apps/
│   ├── web/                    # Next.js main application
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── mempool/
│   │   │   │   └── page.tsx
│   │   │   └── arbitrage/
│   │   │       └── page.tsx
│   │   ├── components/
│   │   │   ├── mempool/
│   │   │   │   ├── ProtocolHeatmap.tsx
│   │   │   │   ├── TransactionTable.tsx
│   │   │   │   └── StatsBar.tsx
│   │   │   └── arbitrage/
│   │   │       ├── OpportunityCard.tsx
│   │   │       ├── MarketOverview.tsx
│   │   │       └── ProfitCalculator.tsx
│   │   ├── hooks/
│   │   │   ├── useMempool.ts
│   │   │   ├── useArbitrage.ts
│   │   │   └── useChains.ts
│   │   ├── lib/
│   │   │   ├── firebase.ts
│   │   │   └── analytics.ts
│   │   └── public/
│   │
│   └── storybook/              # Storybook instance
│       ├── .storybook/
│       │   ├── main.ts
│       │   └── preview.tsx
│       └── stories/
│
├── scripts/                    # Build and utility scripts
│   ├── update-protocols.ts
│   └── generate-types.ts
│
├── tests/                      # Integration tests
│   ├── e2e/
│   └── integration/
│
├── docs/                       # Documentation
│   ├── API.md
│   └── ARCHITECTURE.md
│
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── firebase.json
└── IMPLEMENTATION-DRAFTS-AND-TODOS.md
```

## 🛠️ Technology Stack

### Core Technologies

| Category | Technology | Rationale |
|----------|------------|-----------|
| **Framework** | Next.js 14 (App Router) | SSG for performance, modern React features |
| **Language** | TypeScript 5.3+ | Type safety, better DX |
| **Blockchain** | Viem 2.0 | Lightweight, TypeScript-first, modular |
| **State** | Zustand + React Query | Simple state + server state caching |
| **Styling** | Tailwind CSS + Radix UI | Utility-first + accessible components |
| **Testing** | Vitest + Testing Library | Fast, ESM-native, good DX |
| **Documentation** | Storybook 7.6 | Component development and documentation |
| **Build** | Turbo + pnpm | Fast monorepo builds |
| **Hosting** | Firebase Hosting | CDN, easy deployment |
| **Analytics** | Firebase Analytics | Privacy-friendly, integrated |

## 🔄 Dynamic Data Loading Strategy

### Chain and RPC Management

```typescript
// packages/chain-registry/src/chains.ts
export class ChainRegistry {
  private chains: Map<number, ChainInfo> = new Map();
  private rpcEndpoints: Map<number, RpcEndpoint[]> = new Map();
  
  async loadFromChainlist(): Promise<void> {
    try {
      // Fetch chain data
      const chainsResponse = await fetch('https://chainid.network/chains.json');
      const chains = await chainsResponse.json();
      
      // Process each chain
      for (const chain of chains) {
        this.chains.set(chain.chainId, {
          id: chain.chainId,
          name: chain.name,
          nativeCurrency: chain.nativeCurrency,
          explorers: chain.explorers || [],
        });
        
        // Store RPC endpoints
        if (chain.rpc && chain.rpc.length > 0) {
          this.rpcEndpoints.set(chain.chainId, 
            chain.rpc.map(url => ({
              url,
              tracking: 'public',
              reliability: 0.5, // Default, will be updated based on usage
            }))
          );
        }
      }
    } catch (error) {
      console.error('Failed to load chains from Chainlist:', error);
      throw new Error('Unable to initialize chain registry');
    }
  }
  
  async getHealthyRpcUrl(chainId: number): Promise<string> {
    const endpoints = this.rpcEndpoints.get(chainId) || [];
    
    // Sort by reliability score
    const sorted = [...endpoints].sort((a, b) => b.reliability - a.reliability);
    
    // Try each endpoint until one works
    for (const endpoint of sorted) {
      try {
        await this.checkEndpointHealth(endpoint.url);
        return endpoint.url;
      } catch (error) {
        // Update reliability score
        endpoint.reliability *= 0.9;
        continue;
      }
    }
    
    throw new Error(`No healthy RPC endpoints found for chain ${chainId}`);
  }
  
  private async checkEndpointHealth(url: string): Promise<void> {
    const client = createPublicClient({
      transport: http(url),
    });
    
    // Simple health check - get latest block
    await client.getBlockNumber();
  }
}
```

### Protocol Registry Updates

```typescript
// packages/protocol-registry/src/updater.ts
export class ProtocolRegistry {
  private protocols: Map<string, ProtocolInfo> = new Map();
  private lastUpdate: Date | null = null;
  
  async loadFromDefiLlama(): Promise<void> {
    try {
      // Fetch all protocols
      const response = await fetch('https://api.llama.fi/protocols');
      const protocols = await response.json();
      
      // Process each protocol
      for (const protocol of protocols) {
        // Extract contract addresses for each chain
        if (protocol.address) {
          const addresses = typeof protocol.address === 'string' 
            ? [protocol.address] 
            : Object.values(protocol.address);
            
          for (const address of addresses) {
            this.protocols.set(address.toLowerCase(), {
              name: protocol.name,
              category: protocol.category || 'DeFi',
              logo: protocol.logo,
              chains: protocol.chains || [],
              tvl: protocol.tvl || 0,
            });
          }
        }
      }
      
      this.lastUpdate = new Date();
    } catch (error) {
      console.error('Failed to load protocols from DefiLlama:', error);
      // Use cached data if available
    }
  }
  
  getProtocol(address: string): ProtocolInfo | null {
    return this.protocols.get(address.toLowerCase()) || null;
  }
  
  async refreshIfNeeded(): Promise<void> {
    const ONE_DAY = 24 * 60 * 60 * 1000;
    if (!this.lastUpdate || Date.now() - this.lastUpdate.getTime() > ONE_DAY) {
      await this.loadFromDefiLlama();
    }
  }
}
```

## 📋 Complete Implementation TODO List

### Phase 1: Foundation (Week 1-2) ✅

- [x] **1. Project Setup**
  - [x] Initialize monorepo with pnpm
  - [x] Configure TypeScript with strict mode
  - [x] Set up ESLint and Prettier
  - [x] Configure path aliases
  - [x] Create basic folder structure

- [x] **2. Development Environment**
  - [x] Set up Turbo for monorepo builds
  - [x] Configure hot reloading
  - [x] Set up environment variables structure (no hardcoded values)
  - [x] Create development scripts

- [x] **3. Testing Infrastructure**
  - [x] Configure Vitest for unit tests
  - [x] Set up Testing Library
  - [x] Configure coverage reporting
  - [x] Create test utilities package
  - [x] Set up MSW for API mocking

### Phase 2: Core Modules (Week 2-3)

- [x] **4. Chain Registry Module** ✅
  - [x] Create dynamic chain loader from Chainlist
  - [x] Implement RPC endpoint manager
  - [x] Build health check system
  - [x] Add failover mechanism
  - [x] Write comprehensive tests
  - [x] Multi-RPC support for mempool aggregation

- [x] **5. Protocol Registry Module** ✅
  - [x] Create DefiLlama data fetcher
  - [x] Implement protocol lookup system
  - [x] Add caching with TTL
  - [x] Build update scheduler
  - [x] Create TypeScript definitions generator
  - [x] Dynamic chain resolution using chain-registry
  - [x] **ABI Support**:
    - [x] Manual ABIs for critical protocols
    - [x] Etherscan API v2 integration (supports 60+ chains)
    - [x] Sourcify integration
    - [x] 4byte function signature fallback
    - [x] Batch ABI fetching
    - [x] Caching layer

- [x] **6. Mempool Core Module**
  - [x] Implement WebSocket connection manager
  - [x] Build HTTP polling fallback
  - [x] Create transaction decoder
  - [x] Implement transaction enricher
  - [x] Add subscription management
  - [x] Write unit tests for all functions

- [x] **7. Alchemy Integration**
  - [x] Configure Alchemy endpoints
  - [x] Test WebSocket connections
  - [x] Verify pending transaction support
  - [x] Integrate with MempoolClient
  - [x] Document capabilities and limitations

**Note**: Arbitrage detection is intentionally left to user implementation.
The infrastructure provides all necessary data streams for users to build
their own arbitrage strategies at runtime.

### Phase 3: State Management (Week 3)

- [ ] **8. Zustand Stores**
  - [ ] Create mempool store
  - [ ] Build arbitrage store
  - [ ] Implement chain selection store
  - [ ] Add settings store
  - [ ] Test store interactions

- [ ] **9. React Query Integration**
  - [ ] Set up query client
  - [ ] Create custom hooks
  - [ ] Implement caching strategies
  - [ ] Add optimistic updates
  - [ ] Configure error handling

### Phase 4: UI Components (Week 4-5)

- [ ] **10. Storybook Setup**
  - [ ] Configure Storybook with Next.js
  - [ ] Set up component documentation
  - [ ] Create design tokens
  - [ ] Add accessibility testing
  - [ ] Configure visual regression tests

- [ ] **11. Base Component Library**
  - [ ] Create Card component
  - [ ] Build Table component with TanStack
  - [ ] Implement Loading skeletons
  - [ ] Create Error boundaries
  - [ ] Add Toast notifications

- [ ] **12. Mempool Components**
  - [ ] Build ProtocolHeatmap with react-heat-map-grid
  - [ ] Create TransactionTable with virtualization
  - [ ] Implement StatsBar
  - [ ] Build ChainSelector
  - [ ] Add FilterControls

- [ ] **13. Data Visualization Components**
  - [ ] Create DataCard for generic metrics
  - [ ] Build MarketOverview for chain statistics
  - [ ] Implement TransactionFlow visualization
  - [ ] Create CrossChainDashboard
  - [ ] Add FilterModal for advanced filtering

### Phase 5: Application Integration (Week 5-6)

- [ ] **14. Next.js Application**
  - [ ] Set up app router structure
  - [ ] Create layouts
  - [ ] Implement routing
  - [ ] Add meta tags
  - [ ] Configure CSP headers

- [ ] **15. Page Implementation**
  - [ ] Build mempool explorer page
  - [ ] Create cross-chain dashboard
  - [ ] Implement protocol analytics view
  - [ ] Add settings page
  - [ ] Create about/docs page

- [ ] **16. Firebase Integration**
  - [ ] Set up Firebase project
  - [ ] Configure hosting
  - [ ] Implement analytics
  - [ ] Add performance monitoring
  - [ ] Set up crash reporting

### Phase 6: Polish & Optimization (Week 6-7)

- [ ] **17. Performance Optimization**
  - [ ] Implement code splitting
  - [ ] Add lazy loading
  - [ ] Optimize bundle size
  - [ ] Add service worker
  - [ ] Implement data virtualization

- [ ] **18. Error Handling**
  - [ ] Add global error boundary
  - [ ] Implement retry logic
  - [ ] Create user-friendly error messages
  - [ ] Add error tracking
  - [ ] Test error scenarios

- [ ] **19. Responsive Design**
  - [ ] Test on mobile devices
  - [ ] Optimize for tablets
  - [ ] Add touch gestures
  - [ ] Implement responsive tables
  - [ ] Test on various screen sizes

### Phase 7: Testing & Documentation (Week 7-8)

- [ ] **20. Comprehensive Testing**
  - [ ] Write unit tests (80% coverage)
  - [ ] Create integration tests
  - [ ] Add E2E tests for critical paths
  - [ ] Performance testing
  - [ ] Accessibility testing

- [ ] **21. Documentation**
  - [ ] Write API documentation
  - [ ] Create user guide
  - [ ] Document architecture
  - [ ] Add inline code comments
  - [ ] Create troubleshooting guide

### Phase 8: Deployment & Launch (Week 8)

- [ ] **22. CI/CD Pipeline**
  - [ ] Set up GitHub Actions
  - [ ] Configure automated testing
  - [ ] Add deployment workflow
  - [ ] Set up preview deployments
  - [ ] Configure release process

- [ ] **23. Production Deployment**
  - [ ] Deploy to Firebase Hosting
  - [ ] Configure CDN
  - [ ] Set up monitoring
  - [ ] Test production build
  - [ ] Launch! 🚀

## 🧪 Test-Driven Development Strategy

### Test Structure

```typescript
// Example: packages/mempool-core/src/decoder.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TransactionDecoder } from './decoder';
import { mockTransaction } from '@evm-explorer/test-utils';

describe('TransactionDecoder', () => {
  let decoder: TransactionDecoder;
  
  beforeEach(() => {
    decoder = new TransactionDecoder();
  });
  
  describe('decode', () => {
    it('should decode Uniswap V3 multicall', () => {
      const tx = mockTransaction({
        to: '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45',
        input: '0x5ae401dc...',
      });
      
      const decoded = decoder.decode(tx);
      
      expect(decoded.protocol).toBe('Uniswap V3');
      expect(decoded.method).toBe('multicall');
      expect(decoded.category).toBe('DEX');
    });
    
    it('should handle unknown protocols gracefully', () => {
      const tx = mockTransaction({
        to: '0xunknown',
        input: '0x',
      });
      
      const decoded = decoder.decode(tx);
      
      expect(decoded.protocol).toBeNull();
      expect(decoded.category).toBe('Unknown');
    });
  });
});
```

### Testing Checklist for Each Module

- [ ] Unit tests for all public methods
- [ ] Integration tests for module interactions
- [ ] Error case testing
- [ ] Performance benchmarks
- [ ] Type safety tests
- [ ] Mock external dependencies

## 🔧 Development Guidelines

### Code Style

1. **TypeScript**: Use strict mode, avoid `any`
2. **Components**: Functional components with hooks
3. **Styling**: Tailwind utility classes, avoid inline styles
4. **Naming**: Clear, descriptive names
5. **Comments**: Document complex logic only

### Git Workflow

1. Feature branches from `main`
2. Conventional commits
3. PR with tests and documentation
4. Code review required
5. Squash and merge

### Performance Guidelines

1. Virtualize large lists
2. Memoize expensive computations
3. Lazy load non-critical components
4. Use React Query for server state
5. Monitor bundle size

## 📊 Success Metrics

1. **Performance**
   - Initial load < 3s
   - Time to interactive < 5s
   - Smooth 60fps scrolling

2. **Reliability**
   - 99.9% uptime
   - Graceful degradation
   - Automatic failover

3. **User Experience**
   - Intuitive navigation
   - Responsive design
   - Clear error messages

4. **Code Quality**
   - 80%+ test coverage
   - 0 critical vulnerabilities
   - Clean architecture

## 🚀 Future Enhancements (Post-Launch)

1. **Advanced Features**
   - MEV detection
   - Flash loan opportunities
   - Cross-chain messaging
   - Historical data analysis

2. **Integrations**
   - Wallet connection
   - Trade execution
   - Telegram/Discord alerts
   - API for developers

3. **Analytics**
   - Advanced filtering
   - Custom dashboards
   - Data export
   - Real-time alerts

## 📝 Notes

- All RPC endpoints are dynamically loaded from Chainlist
- Protocol data is fetched from DefiLlama
- No hardcoded configuration values
- Modular architecture enables easy extraction for other use cases
- Frontend-only design ensures decentralization and privacy

---

Last Updated: ${new Date().toISOString()}
