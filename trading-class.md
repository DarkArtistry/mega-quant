# Trading Class Architecture: DeltaTrade API

## Overview

This document outlines the architecture for a fluent JavaScript API that enables users to easily create multi-chain, delta-neutral trading strategies.

## Design Goals

1. **Intuitive API**: `dt.ethereum.uniswapV3.swap(...)` - Chain-first, protocol-second
2. **Automatic Tracking**: All trades under one `dt` instance are grouped into a single execution
3. **Multi-Chain Support**: Execute trades across any supported chain transparently
4. **Protocol Agnostic**: Start with Uniswap V3, extensible to any DEX
5. **Database Integration**: Automatic recording, P&L calculation, inventory tracking

## User-Facing API

### Basic Usage Example

```typescript
// Strategy code running in Web Worker
async function arbitrageStrategy() {
  // 1. Create a delta trade (automatically creates execution in DB)
  const dt = await createDeltaTrade('cross_chain');

  // 2. Execute trades across multiple chains
  // Buy ETH on Ethereum (cheaper)
  await dt.ethereum.uniswapV3.swap({
    tokenIn: 'USDC',
    tokenOut: 'WETH',
    amountIn: '1825',
    slippage: 0.5,
    recipient: 'self'  // Optional, defaults to wallet address
  });

  // Sell ETH on Arbitrum (more expensive)
  await dt.arbitrum.uniswapV3.swap({
    tokenIn: 'WETH',
    tokenOut: 'USDC',
    amountIn: '1.0',
    slippage: 0.5
  });

  // 3. Close the delta trade (calculates final P&L)
  const result = await dt.close();
  console.log('Net P&L:', result.netPnl);
}
```

### Advanced Usage: Multiple Operations

```typescript
async function complexArbitrage() {
  const dt = await createDeltaTrade('delta_neutral');

  // Multiple swaps on different chains - all part of one execution
  await dt.ethereum.uniswapV3.swap({
    tokenIn: 'USDC',
    tokenOut: 'WETH',
    amountIn: '1000'
  });

  await dt.arbitrum.uniswapV3.swap({
    tokenIn: 'WETH',
    tokenOut: 'USDC',
    amountIn: '0.5'
  });

  await dt.polygon.quickswap.swap({
    tokenIn: 'WETH',
    tokenOut: 'USDC',
    amountIn: '0.5'
  });

  // All three swaps are grouped into one execution
  // P&L calculated as: ending portfolio value - starting portfolio value - all gas costs
  await dt.close();
}
```

### Liquidity Provision Example

```typescript
async function yieldFarmingStrategy() {
  const dt = await createDeltaTrade('yield_farming');

  // Add liquidity to Uniswap V3 pool
  await dt.ethereum.uniswapV3.addLiquidity({
    token0: 'WETH',
    token1: 'USDC',
    fee: 3000,  // 0.3% fee tier
    amount0Desired: '0.5',
    amount1Desired: '1500',
    tickLower: -887220,  // Price range
    tickUpper: 887220
  });

  // Hedge with short on Arbitrum (different protocol)
  await dt.arbitrum.gmx.openPosition({
    token: 'WETH',
    side: 'short',
    size: '0.5',
    leverage: 1
  });

  await dt.close();
}
```

## Architecture

### Class Hierarchy

```
createDeltaTrade() function
    ↓ creates
DeltaTrade instance
    ↓ has
ChainProxy (ethereum, arbitrum, polygon, ...)
    ↓ has
ProtocolProxy (uniswapV3, sushiswap, gmx, ...)
    ↓ has
Methods (swap, addLiquidity, removeLiquidity, ...)
```

### Core Classes

#### 1. DeltaTrade (Main Class)

```typescript
class DeltaTrade {
  executionId: string;
  executionType: ExecutionType;
  strategyId: string;
  startingInventory: TokenAmount[];
  trades: Trade[] = [];

  // Chain proxies (dynamically created)
  ethereum: ChainProxy;
  arbitrum: ChainProxy;
  polygon: ChainProxy;
  bsc: ChainProxy;
  avalanche: ChainProxy;
  optimism: ChainProxy;
  base: ChainProxy;
  // ... more chains

  constructor(strategyId: string, executionType: ExecutionType);

  async initialize(): Promise<void>;
  async close(): Promise<ExecutionResult>;
  async cancel(): Promise<void>;

  // Internal methods
  private async captureStartingInventory(): Promise<void>;
  private async captureEndingInventory(): Promise<void>;
  private async recordTrade(trade: Trade): Promise<void>;
  private async calculatePnL(): Promise<PnLResult>;
}
```

#### 2. ChainProxy

```typescript
class ChainProxy {
  chainId: number;
  chainName: string;
  deltaTrade: DeltaTrade;
  provider: ethers.providers.Provider;
  signer: ethers.Signer;

  // Protocol proxies (dynamically created)
  uniswapV3: UniswapV3Protocol;
  sushiswap: SushiswapProtocol;
  quickswap: QuickswapProtocol;
  gmx: GMXProtocol;
  // ... more protocols

  constructor(deltaTrade: DeltaTrade, chainId: number);

  async getBalance(token: string): Promise<string>;
  async getProvider(): ethers.providers.Provider;
  async getSigner(): ethers.Signer;
}
```

#### 3. ProtocolProxy (Base Class)

```typescript
abstract class ProtocolProxy {
  chain: ChainProxy;
  protocolName: string;

  constructor(chain: ChainProxy, protocolName: string);

  // Abstract methods that each protocol implements
  abstract swap(params: SwapParams): Promise<Transaction>;

  // Helper methods
  protected async approve(token: string, spender: string, amount: string): Promise<void>;
  protected async estimateGas(tx: any): Promise<bigint>;
  protected async sendTransaction(tx: any): Promise<Transaction>;
  protected async recordTrade(trade: TradeData): Promise<void>;
}
```

#### 4. UniswapV3Protocol (Example Implementation)

```typescript
class UniswapV3Protocol extends ProtocolProxy {
  routerAddress: string;
  quoterAddress: string;
  nftPositionManagerAddress: string;

  // Contract instances
  router: ethers.Contract;
  quoter: ethers.Contract;
  nftPositionManager: ethers.Contract;

  constructor(chain: ChainProxy);

  async swap(params: SwapParams): Promise<Transaction> {
    // 1. Get quote for expected output
    const quote = await this.getQuote(params);

    // 2. Approve token spending
    await this.approve(params.tokenIn, this.routerAddress, params.amountIn);

    // 3. Build swap transaction
    const swapTx = await this.buildSwapTx(params, quote);

    // 4. Execute transaction
    const tx = await this.sendTransaction(swapTx);

    // 5. Record trade in database
    await this.recordTrade({
      executionId: this.chain.deltaTrade.executionId,
      strategyId: this.chain.deltaTrade.strategyId,
      chainId: this.chain.chainId,
      protocol: 'uniswap-v3',
      txHash: tx.hash,
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      amountOut: quote.amountOut,
      // ... other details
    });

    return tx;
  }

  async addLiquidity(params: AddLiquidityParams): Promise<Transaction> {
    // Similar pattern: approve → build tx → execute → record
  }

  async removeLiquidity(params: RemoveLiquidityParams): Promise<Transaction> {
    // Similar pattern
  }

  // Helper methods
  private async getQuote(params: SwapParams): Promise<QuoteResult> {
    // Call Quoter contract
  }

  private async buildSwapTx(params: SwapParams, quote: QuoteResult): any {
    // Build transaction data
  }
}
```

## Implementation Details

### 1. Factory Function

```typescript
// Global factory function available in worker
async function createDeltaTrade(
  executionType: ExecutionType = 'custom'
): Promise<DeltaTrade> {
  // Get strategy ID from worker context
  const strategyId = self.strategyId;

  // Create execution in database
  const executionId = await fetch('/api/executions', {
    method: 'POST',
    body: JSON.stringify({
      strategy_id: strategyId,
      execution_type: executionType,
      status: 'opened'
    })
  }).then(r => r.json()).then(d => d.id);

  // Create DeltaTrade instance
  const dt = new DeltaTrade(strategyId, executionId, executionType);
  await dt.initialize();

  return dt;
}

// Make available globally in worker
self.createDeltaTrade = createDeltaTrade;
```

### 2. Chain and Protocol Registration

```typescript
// Chain configurations
const CHAIN_CONFIGS = {
  ethereum: {
    chainId: 1,
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/{apiKey}',
    protocols: {
      uniswapV3: {
        router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
        nftPositionManager: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88'
      }
    }
  },
  arbitrum: {
    chainId: 42161,
    rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/{apiKey}',
    protocols: {
      uniswapV3: {
        router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
        nftPositionManager: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88'
      }
    }
  },
  // ... more chains
};

// Protocol factory
function createProtocol(chain: ChainProxy, protocolName: string): ProtocolProxy {
  switch (protocolName) {
    case 'uniswapV3':
      return new UniswapV3Protocol(chain);
    case 'sushiswap':
      return new SushiswapProtocol(chain);
    // ... more protocols
    default:
      throw new Error(`Unknown protocol: ${protocolName}`);
  }
}
```

### 3. Token Address Resolution

```typescript
// Token registry by chain
const TOKEN_ADDRESSES = {
  ethereum: {
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
  },
  arbitrum: {
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
  },
  // ... more chains
};

function resolveTokenAddress(chainId: number, symbol: string): string {
  const chainName = getChainName(chainId);
  const address = TOKEN_ADDRESSES[chainName]?.[symbol];

  if (!address) {
    throw new Error(`Token ${symbol} not found on chain ${chainName}`);
  }

  return address;
}
```

### 4. Uniswap V3 ABIs

```typescript
// Uniswap V3 Router ABI (minimal, only what we need)
const UNISWAP_V3_ROUTER_ABI = [
  {
    "inputs": [
      {
        "components": [
          { "internalType": "address", "name": "tokenIn", "type": "address" },
          { "internalType": "address", "name": "tokenOut", "type": "address" },
          { "internalType": "uint24", "name": "fee", "type": "uint24" },
          { "internalType": "address", "name": "recipient", "type": "address" },
          { "internalType": "uint256", "name": "deadline", "type": "uint256" },
          { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
          { "internalType": "uint256", "name": "amountOutMinimum", "type": "uint256" },
          { "internalType": "uint160", "name": "sqrtPriceLimitX96", "type": "uint160" }
        ],
        "internalType": "struct ISwapRouter.ExactInputSingleParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "exactInputSingle",
    "outputs": [{ "internalType": "uint256", "name": "amountOut", "type": "uint256" }],
    "stateMutability": "payable",
    "type": "function"
  }
];

// Uniswap V3 Quoter ABI
const UNISWAP_V3_QUOTER_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "tokenIn", "type": "address" },
      { "internalType": "address", "name": "tokenOut", "type": "address" },
      { "internalType": "uint24", "name": "fee", "type": "uint24" },
      { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
      { "internalType": "uint160", "name": "sqrtPriceLimitX96", "type": "uint160" }
    ],
    "name": "quoteExactInputSingle",
    "outputs": [{ "internalType": "uint256", "name": "amountOut", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// ERC20 ABI (for approvals)
const ERC20_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "address", "name": "spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  }
];
```

### 5. Complete UniswapV3Protocol Implementation

```typescript
class UniswapV3Protocol extends ProtocolProxy {
  routerAddress: string;
  quoterAddress: string;
  router: ethers.Contract;
  quoter: ethers.Contract;

  constructor(chain: ChainProxy) {
    super(chain, 'uniswap-v3');

    const config = CHAIN_CONFIGS[chain.chainName].protocols.uniswapV3;
    this.routerAddress = config.router;
    this.quoterAddress = config.quoter;

    this.router = new ethers.Contract(
      this.routerAddress,
      UNISWAP_V3_ROUTER_ABI,
      chain.getSigner()
    );

    this.quoter = new ethers.Contract(
      this.quoterAddress,
      UNISWAP_V3_QUOTER_ABI,
      chain.getProvider()
    );
  }

  async swap(params: SwapParams): Promise<Transaction> {
    console.log(`[Uniswap V3] Swapping ${params.amountIn} ${params.tokenIn} → ${params.tokenOut} on ${this.chain.chainName}`);

    // 1. Resolve token addresses
    const tokenInAddress = resolveTokenAddress(this.chain.chainId, params.tokenIn);
    const tokenOutAddress = resolveTokenAddress(this.chain.chainId, params.tokenOut);

    // 2. Get quote
    const quote = await this.getQuote({
      tokenIn: tokenInAddress,
      tokenOut: tokenOutAddress,
      amountIn: params.amountIn,
      fee: params.fee || 3000  // Default to 0.3% fee tier
    });

    console.log(`[Uniswap V3] Expected output: ${quote.amountOut} ${params.tokenOut}`);

    // 3. Calculate minimum output with slippage
    const slippageBps = (params.slippage || 0.5) * 100;  // 0.5% = 50 bps
    const amountOutMinimum = quote.amountOut * (10000 - slippageBps) / 10000;

    // 4. Approve token spending if needed
    await this.approve(tokenInAddress, this.routerAddress, params.amountIn);

    // 5. Build swap transaction
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;  // 20 minutes
    const recipient = params.recipient || this.chain.signer.address;

    const swapParams = {
      tokenIn: tokenInAddress,
      tokenOut: tokenOutAddress,
      fee: params.fee || 3000,
      recipient,
      deadline,
      amountIn: ethers.utils.parseUnits(params.amountIn, await this.getDecimals(tokenInAddress)),
      amountOutMinimum: ethers.BigNumber.from(Math.floor(amountOutMinimum)),
      sqrtPriceLimitX96: 0  // No price limit
    };

    // 6. Execute swap
    console.log(`[Uniswap V3] Executing swap...`);
    const tx = await this.router.exactInputSingle(swapParams);
    console.log(`[Uniswap V3] Transaction sent: ${tx.hash}`);

    // 7. Wait for confirmation
    const receipt = await tx.wait();
    console.log(`[Uniswap V3] Transaction confirmed in block ${receipt.blockNumber}`);

    // 8. Get actual output amount from logs
    const actualAmountOut = await this.parseSwapOutput(receipt);

    // 9. Get gas cost in USD
    const gasCostUsd = await this.calculateGasCostUsd(receipt);

    // 10. Record trade in database
    await this.recordTrade({
      executionId: this.chain.deltaTrade.executionId,
      strategyId: this.chain.deltaTrade.strategyId,
      walletAddress: this.chain.signer.address,
      chainId: this.chain.chainId,
      protocol: 'uniswap-v3',
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      tokenInAddress: tokenInAddress,
      tokenInSymbol: params.tokenIn,
      tokenInAmount: params.amountIn,
      tokenOutAddress: tokenOutAddress,
      tokenOutSymbol: params.tokenOut,
      tokenOutAmount: actualAmountOut,
      gasUsed: receipt.gasUsed.toNumber(),
      gasPriceGwei: ethers.utils.formatUnits(receipt.effectiveGasPrice, 'gwei'),
      gasCostUsd,
      status: 'completed'
    });

    return tx;
  }

  private async getQuote(params: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    fee: number;
  }): Promise<{ amountOut: number }> {
    const decimalsIn = await this.getDecimals(params.tokenIn);
    const decimalsOut = await this.getDecimals(params.tokenOut);

    const amountInWei = ethers.utils.parseUnits(params.amountIn, decimalsIn);

    const amountOutWei = await this.quoter.callStatic.quoteExactInputSingle(
      params.tokenIn,
      params.tokenOut,
      params.fee,
      amountInWei,
      0  // sqrtPriceLimitX96
    );

    const amountOut = parseFloat(ethers.utils.formatUnits(amountOutWei, decimalsOut));

    return { amountOut };
  }

  private async getDecimals(tokenAddress: string): Promise<number> {
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, this.chain.getProvider());
    return await token.decimals();
  }

  private async parseSwapOutput(receipt: ethers.ContractReceipt): Promise<string> {
    // Parse Transfer event to get actual output amount
    // This is a simplified version - production would parse logs properly
    const transferTopic = ethers.utils.id('Transfer(address,address,uint256)');
    const transferLog = receipt.logs.find(log => log.topics[0] === transferTopic);

    if (transferLog) {
      const amount = ethers.BigNumber.from(transferLog.data);
      return ethers.utils.formatUnits(amount, 18);  // Simplified - should get actual decimals
    }

    return '0';
  }

  private async calculateGasCostUsd(receipt: ethers.ContractReceipt): Promise<number> {
    const gasUsed = receipt.gasUsed;
    const gasPrice = receipt.effectiveGasPrice;
    const gasCostEth = parseFloat(ethers.utils.formatEther(gasUsed.mul(gasPrice)));

    // Get ETH price from CoinMarketCap or cache
    const ethPriceUsd = await this.getETHPrice();

    return gasCostEth * ethPriceUsd;
  }

  private async getETHPrice(): Promise<number> {
    // In production, fetch from CoinMarketCap API or use cached value
    // For now, return a placeholder
    return 3000;  // $3000 per ETH
  }
}
```

## Database Integration

### API Endpoints Needed

```typescript
// 1. Create execution
POST /api/executions
Body: { strategy_id, execution_type, status }
Response: { id, ... }

// 2. Record trade
POST /api/trades
Body: { execution_id, strategy_id, wallet_address, chain_id, tx_hash, ... }
Response: { id, ... }

// 3. Capture inventory
POST /api/executions/:id/inventory
Body: { inventory: [{ chain_id, token_address, amount, usd_value }, ...] }
Response: { success: true }

// 4. Close execution
POST /api/executions/:id/close
Response: { net_pnl_usd, total_gas_cost_usd, ... }

// 5. Cancel execution
POST /api/executions/:id/cancel
Response: { success: true }
```

### Integration with Analysis Plan

This trading class implementation fully aligns with `analysis-plan.md`:

✅ **Section 0.2**: Strategy Executions architecture
- `createDeltaTrade()` creates an execution
- All trades under one instance grouped together
- Automatic P&L calculation

✅ **Section 0.3**: Execution types supported
- Pass execution type to `createDeltaTrade('cross_chain')`
- Supports all types: simple_swap, cross_chain, spot_perp_hedge, etc.

✅ **Section 0.6**: Inventory-based P&L
- `dt.initialize()` captures starting inventory
- `dt.close()` captures ending inventory
- P&L = ending value - starting value - gas costs

✅ **Section 0.7**: Transaction attribution
- Every trade automatically tagged with `strategy_id`
- `wallet_address` recorded for shared wallet support

✅ **Database Schema**: All required fields populated
- `trades` table: execution_id, strategy_id, wallet_address, chain_id, tx_hash, etc.
- `strategy_executions` table: created and updated automatically

## Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1)
- [ ] Implement DeltaTrade base class
- [ ] Implement ChainProxy with dynamic chain loading
- [ ] Implement ProtocolProxy base class
- [ ] Set up token address registry
- [ ] Create API endpoints for execution management

### Phase 2: Uniswap V3 Integration (Week 2)
- [ ] Implement UniswapV3Protocol class
- [ ] Add swap functionality
- [ ] Add liquidity provision (addLiquidity/removeLiquidity)
- [ ] Test on testnets (Goerli, Arbitrum Goerli)

### Phase 3: Multi-Protocol Support (Week 3)
- [ ] Implement SushiswapProtocol
- [ ] Implement GMXProtocol (for perps)
- [ ] Implement CurveProtocol (for stablecoins)
- [ ] Add protocol auto-detection

### Phase 4: Advanced Features (Week 4)
- [ ] Add flash loan support
- [ ] Add MEV protection
- [ ] Add gas optimization (batching)
- [ ] Add price impact warnings

### Phase 5: Production Hardening (Week 5)
- [ ] Comprehensive error handling
- [ ] Transaction retry logic
- [ ] Nonce management
- [ ] Gas price strategies
- [ ] Monitoring and alerting

## File Structure

```
src/
├── trading/
│   ├── DeltaTrade.ts           # Main class
│   ├── ChainProxy.ts           # Chain abstraction
│   ├── ProtocolProxy.ts        # Base protocol class
│   ├── protocols/
│   │   ├── UniswapV3Protocol.ts
│   │   ├── SushiswapProtocol.ts
│   │   ├── GMXProtocol.ts
│   │   └── ... more protocols
│   ├── config/
│   │   ├── chains.ts           # Chain configurations
│   │   ├── tokens.ts           # Token address registry
│   │   └── protocols.ts        # Protocol addresses
│   ├── abis/
│   │   ├── UniswapV3Router.json
│   │   ├── UniswapV3Quoter.json
│   │   ├── ERC20.json
│   │   └── ... more ABIs
│   └── utils/
│       ├── gas.ts              # Gas estimation utilities
│       ├── prices.ts           # Price fetching utilities
│       └── tokens.ts           # Token utilities
└── worker/
    └── strategy-worker.js      # Worker environment (has access to createDeltaTrade)
```

## Next Steps

1. **Validate with Analysis Plan**: Ensure all database fields are properly populated
2. **Create Example Strategies**: Write 3-5 example strategies using this API
3. **Test on Testnets**: Deploy to Goerli, test cross-chain swaps
4. **Document API**: Create comprehensive API documentation
5. **Build UI**: Update Strategy Editor with autocomplete for this API
