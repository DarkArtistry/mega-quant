# MEGA QUANT - Analysis & Strategy Metrics Architecture Plan

## Executive Summary

This document outlines the comprehensive architecture for implementing real-time analytics, portfolio tracking, and strategy performance metrics for the MEGA QUANT multi-chain trading platform.

**Available APIs:**
- Etherscan API (and equivalents: Arbiscan, Polygonscan, etc.)
- CoinMarketCap API
- Alchemy API
- RPC Providers (Alchemy, Infura, public RPCs)

---

## 0. Critical Design Decision: Strategy Executions vs Individual Trades

### 0.1 The Problem with Simple Trade-Based P&L

**Scenario: Cross-Chain Arbitrage**
```
Strategy: Buy ETH on Ethereum, sell ETH on Arbitrum
├─ Trade 1: Buy 1 ETH with 1825 USDC on Ethereum (chain: 1, tx: 0xabc...)
└─ Trade 2: Sell 1 ETH for 1830 USDC on Arbitrum (chain: 42161, tx: 0xdef...)

Problem: These are TWO separate on-chain transactions, but ONE logical position
```

If we calculate P&L per trade:
- Trade 1: -1825 USDC (loss)
- Trade 2: +1830 USDC (profit)
- Win Rate: 1/2 = 50% ❌ WRONG!

**Actual P&L:** +5 USDC (minus gas costs on both chains)
**Actual Win Rate:** This should count as ONE profitable execution, not two trades

### 0.2 Architecture Solution: Strategy Executions

We need a higher-level abstraction called **Strategy Execution** that:
1. Groups related trades across multiple chains
2. Has a defined lifecycle (opened → active → closed)
3. Calculates aggregate P&L across all constituent trades
4. Tracks net exposure and inventory changes

```
Strategy Execution (Position)
├─ Multiple trades across multiple chains
├─ Aggregate P&L calculation
├─ Status: opened, active, closed, failed
└─ Win/Loss determined at execution level, not trade level
```

### 0.3 Types of Strategy Executions & Profit Calculations

**Type A: Simple Swap**
- Single trade on one chain
- Execution contains 1 trade
- **P&L Formula**: `(Exit Price - Entry Price) × Quantity - Fees`

**Type B: Cross-Chain Arbitrage**
- Buy token on Chain A (cheaper), sell token on Chain B (more expensive)
- Requires pre-positioned inventory on both chains (no bridging needed)
- Net exposure: 0 (inventory neutral)
- **P&L Formula**: `(Portfolio Value After) - (Portfolio Value Before) - Gas Costs`
- **Alternative Formula**: `(Sell Price on Chain B - Buy Price on Chain A) × Quantity - Gas on Both Chains - Slippage`
- **Components**:
  - Gross Spread = Price differential between chains
  - Gas Costs = Transaction fees on both chains
  - Slippage = Price impact on both chains
  - Inventory Rebalance = Optional bridging costs if rebalancing inventory later
- **Key Insight**: No immediate bridging required! Maintain inventory across chains and arbitrage spreads as they appear. P&L is calculated from total portfolio value change across all chains.

**Type C: Spot Long + Perp Short (Funding Rate Arbitrage)**
- Go long on spot asset (Chain A), short equivalent via perpetual futures (Chain B)
- **P&L Formula**: `(Spot PNL) + (Perp PNL) + Funding Received/Paid - Total Fees`
- **Components**:
  - Spot Long PNL = `(Exit Price - Entry Price) × Quantity`
  - Perp Short PNL = `(Entry Price - Exit Price) × Quantity`
  - Funding = Sum of funding payments over holding period (positive if rates favor shorts)
  - Fees = Entry/Exit trading fees + Gas/Bridging + Slippage
- **Example**: Buy 1 ETH spot at $3,000, short 1 ETH perp at $3,010, hold 7 days at 0.01% daily funding
  - Directional PNL = $0 (neutral)
  - Funding = 0.01% × $3,000 × 7 ≈ +$2.10
  - Net Profit = Funding - Fees

**Type D: Options-Based Delta Neutral (Straddles/Strangles)**
- Combine calls and puts for neutrality
- Profits from volatility (vega) or time decay (theta)
- **P&L Formula (Long Straddle)**: `|Asset Price - Strike| × Quantity - (Call Premium + Put Premium) - Fees`
- **P&L Formula (Short Straddle)**: `(Call Premium + Put Premium) - |Asset Price - Strike| × Quantity - Fees`
- **Components**:
  - Premiums Collected (selling) or Paid (buying)
  - Intrinsic Value at Expiry
  - Gamma Scalping PNL = Sum of small directional rebalancing trades
- **Cross-chain**: If options on different chains, add hedging costs

**Type E: Yield Farming with Delta Hedging**
- Stake in liquidity pools, hedge impermanent loss via shorts
- **P&L Formula**: `Farming Rewards × Reward Price + Pool Value Change - Impermanent Loss - Hedging PNL - Fees`
- **Components**:
  - Farming Rewards = APY-based token earnings
  - Impermanent Loss ≈ `2 × (Price Ratio Change)^0.5 / (1 + Price Ratio Change) - 1` (for 50/50 pools)
  - Hedging PNL = Short perp profits to offset pool exposure
- **Example**: $10,000 in ETH-USDC pool, 10% APY, ETH rises 20%
  - Rewards = 10% / 12 × $10,000 ≈ +$83
  - IL (unhedged) ≈ -2.8% or -$280
  - Hedged: Short offsets IL, net ~$0 directional
  - Net Profit = Rewards - Fees

**Type F: Market Making**
- Multiple entry/exit cycles
- Each execution is one round-trip (buy + sell)
- **P&L Formula**: `Sum of (Sell Price - Buy Price) × Quantity - Gas per Trade × Trade Count`
- P&L: Spread captured - gas costs

**Type G: Custom**
- User-defined complex strategy
- P&L calculated based on custom logic

### 0.4 Revised Win Rate Calculation

```typescript
// CORRECT: Based on executions
winRate = (profitableExecutions / totalExecutions) * 100

// WRONG: Based on individual trades
winRate = (profitableTrades / totalTrades) * 100
```

### 0.5 Implementation Classes

```typescript
// Execution types
enum ExecutionType {
  SIMPLE_SWAP = 'simple_swap',                    // Single trade
  CROSS_CHAIN_ARBITRAGE = 'cross_chain',          // Buy on chain A, sell on chain B
  SPOT_PERP_HEDGE = 'spot_perp_hedge',            // Long spot + short perp (funding rate arb)
  OPTIONS_DELTA_NEUTRAL = 'options_delta',        // Straddles, strangles
  YIELD_FARMING_HEDGED = 'yield_farming',         // LP provision with IL hedge
  MARKET_MAKING = 'market_making',                // Buy + sell cycles
  CUSTOM = 'custom'                               // User-defined logic
}

// Execution status
enum ExecutionStatus {
  OPENED = 'opened',       // Position opened, waiting for closure
  ACTIVE = 'active',       // Actively managing position
  CLOSED = 'closed',       // Position closed, P&L realized
  FAILED = 'failed',       // Execution failed
  PARTIAL = 'partial'      // Partially filled
}

class StrategyExecution {
  id: string;
  strategy_id: string;
  execution_type: ExecutionType;
  status: ExecutionStatus;

  // Timing
  opened_at: Date;
  closed_at?: Date;

  // Trades involved
  trade_ids: string[];  // References to trades table

  // P&L tracking (aggregate)
  total_pnl_usd: number;
  total_gas_cost_usd: number;
  net_pnl_usd: number;  // total_pnl - gas_costs - all other costs

  // Strategy-specific P&L components
  bridge_fees_usd?: number;              // Cross-chain transfer costs
  funding_received_usd?: number;         // Funding rate payments (spot_perp_hedge)
  funding_paid_usd?: number;             // Funding rate costs
  premiums_collected_usd?: number;       // Options premiums received
  premiums_paid_usd?: number;            // Options premiums paid
  farming_rewards_usd?: number;          // Yield farming token rewards
  impermanent_loss_usd?: number;         // IL from LP positions
  slippage_cost_usd?: number;            // Price impact across trades
  hedging_cost_usd?: number;             // Cost of hedging positions

  // Position details (for complex strategies)
  spot_positions?: Position[];           // Spot holdings
  perp_positions?: PerpPosition[];       // Perpetual futures positions
  options_positions?: OptionsPosition[]; // Calls/Puts
  lp_positions?: LPPosition[];           // Liquidity pool positions

  // Inventory tracking
  starting_inventory: TokenAmount[];
  ending_inventory: TokenAmount[];

  // Metadata
  tags: string[];
  notes?: string;
}

interface Position {
  chain_id: number;
  token_address: string;
  token_symbol: string;
  quantity: number;
  entry_price_usd: number;
  exit_price_usd?: number;
  side: 'long' | 'short';
}

interface PerpPosition extends Position {
  exchange: string;               // e.g., 'binance', 'dydx', 'gmx'
  leverage: number;
  liquidation_price?: number;
  funding_rate_hourly: number;    // Funding rate at entry
  total_funding_collected: number; // Cumulative funding
}

interface OptionsPosition {
  chain_id: number;
  protocol: string;               // e.g., 'opyn', 'zeta', 'hegic'
  option_type: 'call' | 'put';
  strike_price: number;
  expiry: Date;
  premium_paid: number;
  premium_collected: number;
  quantity: number;
  intrinsic_value?: number;       // At expiry
}

interface LPPosition {
  chain_id: number;
  pool_address: string;
  protocol: string;               // e.g., 'uniswap-v3', 'raydium'
  token0_symbol: string;
  token1_symbol: string;
  liquidity_provided_usd: number;
  current_value_usd?: number;
  impermanent_loss_usd: number;
  rewards_earned_tokens: TokenAmount[];
  apy: number;
}

interface TokenAmount {
  chain_id: number;
  token_address: string;
  token_symbol: string;
  amount: number;
  usd_value: number;
}
```

### 0.6 Example: Cross-Chain Arbitrage Execution

```typescript
class CrossChainArbitrageExecution {
  async execute() {
    // Create execution record
    const execution = await db.createExecution({
      strategy_id: this.strategyId,
      execution_type: ExecutionType.CROSS_CHAIN_ARBITRAGE,
      status: ExecutionStatus.OPENED,
      opened_at: new Date()
    });

    try {
      // Capture starting inventory across all chains
      const startingInventory = await this.captureInventory();
      await db.updateExecution(execution.id, { starting_inventory: startingInventory });

      console.log('Starting inventory:', startingInventory);
      // Example: [{chain_id: 1, token: 'USDC', amount: 1825, usd_value: 1825},
      //           {chain_id: 42161, token: 'ETH', amount: 1, usd_value: 1825}]
      // Total starting value: $3650

      // Step 1: Buy ETH on Ethereum (cheaper)
      const buyTrade = await this.buyOnEthereum({
        tokenIn: 'USDC',
        tokenOut: 'ETH',
        amountIn: 1825,  // Price: $1825/ETH
        chainId: 1
      });
      await db.addTradeToExecution(execution.id, buyTrade.id);

      // Step 2: Simultaneously sell ETH on Arbitrum (more expensive)
      const sellTrade = await this.sellOnArbitrum({
        tokenIn: 'ETH',
        tokenOut: 'USDC',
        amountIn: 1,  // Price: $1830/ETH
        chainId: 42161
      });
      await db.addTradeToExecution(execution.id, sellTrade.id);

      // Capture ending inventory across all chains
      const endingInventory = await this.captureInventory();
      await db.updateExecution(execution.id, { ending_inventory: endingInventory });

      console.log('Ending inventory:', endingInventory);
      // Example: [{chain_id: 1, token: 'ETH', amount: 1, usd_value: 1825},
      //           {chain_id: 42161, token: 'USDC', amount: 1830, usd_value: 1830}]
      // Total ending value: $3655

      // Calculate P&L: Change in total portfolio value
      const pnl = await this.calculateExecutionPnL(execution.id);

      // Close execution
      await db.closeExecution(execution.id, {
        status: ExecutionStatus.CLOSED,
        closed_at: new Date(),
        total_pnl_usd: pnl.total,
        total_gas_cost_usd: pnl.gasCosts,
        net_pnl_usd: pnl.net
      });

      console.log(`Execution ${execution.id} closed with P&L: $${pnl.net}`);
      // Net P&L: $3655 - $3650 - gas = $5 - gas

    } catch (error) {
      await db.updateExecution(execution.id, {
        status: ExecutionStatus.FAILED
      });
      throw error;
    }
  }

  async captureInventory(): Promise<TokenAmount[]> {
    // Get balances across all chains for this strategy
    const inventory: TokenAmount[] = [];

    for (const chainId of this.activeChains) {
      const balances = await this.getChainBalances(chainId);
      for (const balance of balances) {
        const price = await getCurrentPrice(balance.token_symbol);
        inventory.push({
          chain_id: chainId,
          token_address: balance.token_address,
          token_symbol: balance.token_symbol,
          amount: balance.amount,
          usd_value: balance.amount * price
        });
      }
    }

    return inventory;
  }

  async calculateExecutionPnL(executionId: string) {
    const execution = await db.getExecution(executionId);
    const trades = await db.getExecutionTrades(executionId);

    // Method 1: Calculate from inventory change
    const startValue = execution.starting_inventory.reduce((sum, item) => sum + item.usd_value, 0);
    const endValue = execution.ending_inventory.reduce((sum, item) => sum + item.usd_value, 0);

    // Total gas across all trades
    const totalGas = trades.reduce((sum, t) => sum + t.gas_cost_usd, 0);

    // P&L = Change in total portfolio value - costs
    return {
      total: endValue - startValue,
      gasCosts: totalGas,
      net: endValue - startValue - totalGas
    };

    // Method 2: Alternative - sum individual trade P&L
    // (should give same result)
    // let totalPnL = 0;
    // for (const trade of trades) {
    //   totalPnL += trade.value_out_usd - trade.value_in_usd;
    // }
  }
}
```

---

### 0.7 Transaction Attribution: Shared Wallets Across Strategies

**Problem:** If the same wallet address is used by multiple strategies, how do we know which transaction belongs to which strategy?

**Solution:** Worker-initiated transaction tagging. Every trade is tagged with `strategy_id` at creation time.

#### How It Works

```typescript
// 1. When worker is created, it knows its strategy ID
const worker = new Worker('/strategy-worker.js');
worker.postMessage({
  type: 'init',
  strategyId: 'strategy-abc-123',  // Worker stores this
  walletAddress: '0x1234...',      // Same wallet used by multiple strategies
  chainId: 1
});

// 2. Inside worker: When executing a trade, pass strategy ID
async function executeSwap(params) {
  const tx = await ethersProvider.send('eth_sendTransaction', [{
    from: walletAddress,
    to: routerAddress,
    data: swapData,
    value: 0
  }]);

  // 3. IMMEDIATELY record transaction with strategy ID
  await fetch('/api/trades', {
    method: 'POST',
    body: JSON.stringify({
      strategy_id: self.strategyId,  // Worker knows which strategy it belongs to
      execution_id: params.executionId,
      tx_hash: tx.hash,
      chain_id: params.chainId,
      wallet_address: walletAddress,
      // ... other trade details
    })
  });

  return tx;
}
```

#### Database Design for Shared Wallets

```sql
-- Trades table with strategy attribution
CREATE TABLE trades (
  id SERIAL PRIMARY KEY,
  execution_id VARCHAR(36),
  strategy_id VARCHAR(36) NOT NULL,  -- ✅ Every transaction tagged with strategy
  wallet_address VARCHAR(42) NOT NULL,  -- Same wallet can be used by multiple strategies
  tx_hash VARCHAR(66) NOT NULL UNIQUE,
  chain_id INTEGER NOT NULL,
  -- ... other fields

  INDEX idx_strategy (strategy_id),
  INDEX idx_wallet (wallet_address),
  INDEX idx_strategy_wallet (strategy_id, wallet_address),  -- Efficient queries
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
);

-- Query: All trades for a specific strategy (even if wallet is shared)
SELECT * FROM trades
WHERE strategy_id = 'strategy-abc-123'
ORDER BY timestamp DESC;

-- Query: All trades for a wallet across all strategies
SELECT
  t.*,
  s.name as strategy_name,
  s.status as strategy_status
FROM trades t
JOIN strategies s ON s.id = t.strategy_id
WHERE t.wallet_address = '0x1234...'
ORDER BY t.timestamp DESC;

-- Query: Wallet utilization (which strategies use which wallets)
SELECT
  s.id as strategy_id,
  s.name as strategy_name,
  t.wallet_address,
  COUNT(*) as trade_count,
  SUM(t.profit_loss_usd) as total_pnl
FROM trades t
JOIN strategies s ON s.id = t.strategy_id
WHERE t.wallet_address = '0x1234...'
GROUP BY s.id, s.name, t.wallet_address;
```

#### Benefits of This Approach

✅ **Wallet Reuse**: Same wallet address can be used across multiple strategies
✅ **Accurate Attribution**: Every transaction knows which strategy initiated it
✅ **Per-Strategy P&L**: Calculate correctly even with shared wallets
✅ **Wallet Analytics**: See which strategies are using which wallets
✅ **No Conflicts**: Multiple strategies can trade simultaneously with same wallet (different execution IDs)

#### Example: Two Strategies, One Wallet

```typescript
// Strategy A: Cross-chain arbitrage
// Uses wallet 0x1234... on Ethereum and Arbitrum

// Strategy B: Yield farming
// Uses the SAME wallet 0x1234... on Ethereum

// Both strategies running simultaneously:

// Trade 1: Strategy A buys ETH on Ethereum
{
  strategy_id: 'strategy-A',
  wallet_address: '0x1234...',
  tx_hash: '0xabc...',
  chain_id: 1,
  token_in: 'USDC',
  token_out: 'ETH'
}

// Trade 2: Strategy B adds liquidity on Ethereum (same wallet!)
{
  strategy_id: 'strategy-B',
  wallet_address: '0x1234...',
  tx_hash: '0xdef...',
  chain_id: 1,
  token_in: 'ETH',
  token_out: 'LP-TOKEN'
}

// No conflict! Each trade knows its strategy
```

#### Transaction Discovery (Optional Enhancement)

If you want to discover transactions NOT initiated by workers (e.g., manual trades):

```typescript
// Scan wallet transactions via Etherscan
async function discoverTransactions(walletAddress: string, chainId: number) {
  const txList = await etherscanApi.getTransactions(walletAddress);

  for (const tx of txList) {
    // Check if transaction already exists
    const existing = await db.query(
      'SELECT id FROM trades WHERE tx_hash = ?',
      [tx.hash]
    );

    if (!existing) {
      // Found unattributed transaction
      // Option 1: Assign to "Manual Trades" pseudo-strategy
      // Option 2: Prompt user to categorize
      // Option 3: Ignore (only track worker-initiated trades)

      console.log(`Unattributed tx: ${tx.hash}`);
      // You could show this in UI for user to categorize
    }
  }
}
```

#### Key Implementation Points

1. **Worker Always Knows Strategy ID**: Passed during worker creation
2. **Immediate Recording**: Record transaction BEFORE it's mined (use tx hash)
3. **Update on Confirmation**: Update with block number, gas used when confirmed
4. **Unique Constraint**: `tx_hash` is UNIQUE to prevent duplicates
5. **Foreign Key**: Ensures trades are deleted when strategy is deleted

---

## 1. Analysis Page Architecture

### 1.1 Portfolio Overview

**Required Metrics:**
- Total Balance (USD)
- Total Positions Value (USD)
- Win Rate (%)
- Max Drawdown (%)
- Total Trades Count
- Active Strategies Count

#### Data Sources & Implementation

**1.1.1 Total Balance**
```
Data Source: Alchemy Enhanced APIs + CoinMarketCap
Method: Parallel multi-chain balance aggregation

Implementation:
1. Use Alchemy Token API for each chain:
   GET https://eth-mainnet.g.alchemy.com/v2/{apiKey}/getTokenBalances
   Params: { address: walletAddress }

2. Get native token balances via RPC:
   eth_getBalance for each wallet on each chain

3. Fetch current prices from CoinMarketCap:
   GET https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest
   Params: { symbol: "ETH,MATIC,ARB,BNB,AVAX" }

4. Calculate:
   totalBalance = Σ(tokenBalance * tokenPrice) across all chains

Database Schema (optional persistence):
CREATE TABLE portfolio_snapshots (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  wallet_address VARCHAR(42) NOT NULL,
  chain_id INTEGER NOT NULL,
  total_balance_usd DECIMAL(18, 2) NOT NULL,
  INDEX idx_wallet_time (wallet_address, timestamp DESC)
);
```

**1.1.2 Win Rate & Total Trades/Executions**
```
Data Source: Database (strategy_executions table) + Etherscan Transaction APIs
Method: Analyze completed strategy executions to calculate profitability

⚠️ IMPORTANT: Win rate is based on EXECUTIONS, not individual trades!
See Section 0 for detailed explanation of why this matters.

Implementation:
1. Track all strategy executions in database
2. Group related trades into executions
3. Calculate win rate:
   winRate = (profitableExecutions / totalExecutions) * 100

Database Schema:

-- Strategy Executions (high-level positions)
CREATE TABLE strategy_executions (
  id VARCHAR(36) PRIMARY KEY,
  strategy_id VARCHAR(36) NOT NULL,
  execution_type VARCHAR(50) NOT NULL CHECK (execution_type IN (
    'simple_swap', 'cross_chain', 'delta_neutral', 'market_making', 'liquidity', 'custom'
  )),
  status VARCHAR(20) NOT NULL CHECK (status IN (
    'opened', 'active', 'closed', 'failed', 'partial'
  )),

  -- Timing
  opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMP,
  duration_seconds INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (COALESCE(closed_at, NOW()) - opened_at))
  ) STORED,

  -- P&L (aggregate across all trades)
  total_pnl_usd DECIMAL(18, 2) DEFAULT 0,
  total_gas_cost_usd DECIMAL(18, 2) DEFAULT 0,
  net_pnl_usd DECIMAL(18, 2) GENERATED ALWAYS AS (
    total_pnl_usd - total_gas_cost_usd
  ) STORED,

  -- Inventory tracking (stored as JSON)
  starting_inventory JSONB,  -- [{chain_id, token_address, amount, usd_value}, ...]
  ending_inventory JSONB,

  -- Metadata
  tags TEXT[],
  notes TEXT,

  INDEX idx_strategy (strategy_id),
  INDEX idx_status (status),
  INDEX idx_opened_at (opened_at DESC),
  INDEX idx_net_pnl (net_pnl_usd DESC),
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
);

-- Individual Trades (on-chain transactions)
CREATE TABLE trades (
  id SERIAL PRIMARY KEY,
  execution_id VARCHAR(36),  -- NULL for standalone trades, set for multi-trade executions
  strategy_id VARCHAR(36) NOT NULL,
  wallet_address VARCHAR(42) NOT NULL,  -- Which wallet executed this trade
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  chain_id INTEGER NOT NULL,
  protocol VARCHAR(50),
  tx_hash VARCHAR(66) NOT NULL UNIQUE,
  block_number INTEGER NOT NULL,

  -- Trade details
  token_in_address VARCHAR(42) NOT NULL,
  token_in_symbol VARCHAR(20) NOT NULL,
  token_in_amount DECIMAL(36, 18) NOT NULL,

  token_out_address VARCHAR(42) NOT NULL,
  token_out_symbol VARCHAR(20) NOT NULL,
  token_out_amount DECIMAL(36, 18) NOT NULL,

  -- Pricing (from CoinMarketCap at trade time)
  token_in_price_usd DECIMAL(18, 8),
  token_out_price_usd DECIMAL(18, 8),

  -- P&L calculation (for this individual trade only)
  value_in_usd DECIMAL(18, 2),
  value_out_usd DECIMAL(18, 2),
  profit_loss_usd DECIMAL(18, 2),

  -- Gas costs
  gas_used INTEGER,
  gas_price_gwei DECIMAL(18, 9),
  gas_cost_usd DECIMAL(18, 2),

  -- Trade status
  status VARCHAR(20) DEFAULT 'completed',

  INDEX idx_execution (execution_id),
  INDEX idx_strategy (strategy_id),
  INDEX idx_wallet (wallet_address),
  INDEX idx_strategy_wallet (strategy_id, wallet_address),  -- Shared wallet queries
  INDEX idx_chain (chain_id),
  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_tx_hash (tx_hash),
  FOREIGN KEY (execution_id) REFERENCES strategy_executions(id) ON DELETE SET NULL,
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
);

-- CORRECT Query for Win Rate (based on executions):
SELECT
  COUNT(*) FILTER (WHERE net_pnl_usd > 0) * 100.0 / NULLIF(COUNT(*), 0) as win_rate,
  COUNT(*) as total_executions,
  SUM(net_pnl_usd) as total_net_pnl,
  AVG(net_pnl_usd) as avg_pnl_per_execution
FROM strategy_executions
WHERE strategy_id = ? AND status = 'closed';

-- Alternative: Query for total trades (individual transactions)
SELECT COUNT(*) as total_trades
FROM trades
WHERE strategy_id = ? AND status = 'completed';

-- Query: Executions with their constituent trades
SELECT
  e.id as execution_id,
  e.execution_type,
  e.net_pnl_usd,
  e.opened_at,
  e.closed_at,
  COUNT(t.id) as num_trades,
  ARRAY_AGG(DISTINCT t.chain_id) as chains_involved,
  ARRAY_AGG(t.tx_hash) as tx_hashes
FROM strategy_executions e
LEFT JOIN trades t ON t.execution_id = e.id
WHERE e.strategy_id = ? AND e.status = 'closed'
GROUP BY e.id
ORDER BY e.closed_at DESC;
```

**1.1.3 Max Drawdown**
```
Data Source: Database (historical portfolio values)
Method: Calculate maximum peak-to-trough decline

Implementation:
1. Store periodic portfolio snapshots (every 5 minutes when strategies are running)
2. Calculate drawdown:

Database Schema:
CREATE TABLE portfolio_history (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  total_value_usd DECIMAL(18, 2) NOT NULL,
  INDEX idx_timestamp (timestamp)
);

Query for Max Drawdown:
WITH portfolio_peaks AS (
  SELECT
    timestamp,
    total_value_usd,
    MAX(total_value_usd) OVER (ORDER BY timestamp) as peak_value
  FROM portfolio_history
  WHERE timestamp >= NOW() - INTERVAL '30 days'
),
drawdowns AS (
  SELECT
    timestamp,
    ((total_value_usd - peak_value) / peak_value) * 100 as drawdown_pct
  FROM portfolio_peaks
  WHERE peak_value > 0
)
SELECT MIN(drawdown_pct) as max_drawdown
FROM drawdowns;
```

**1.1.4 Total Positions Value**
```
Data Source: Same as Total Balance
Method: Real-time aggregation of all non-native token holdings

Implementation:
Sum of all ERC20 token values across all chains
(excludes native tokens like ETH, MATIC, BNB which are gas reserves)
```

---

### 1.2 Assets Tracking

**Required Data:**
- Chain name
- Token name and symbol
- Balance (raw amount)
- USD Value
- Color code for UI

#### Implementation

**API Calls:**
```javascript
// For each wallet address on each chain
async function fetchTokenBalances(walletAddress, chainId, alchemyApiKey) {
  // 1. Get all token balances using Alchemy
  const response = await fetch(
    `https://${getAlchemyEndpoint(chainId)}.g.alchemy.com/v2/${alchemyApiKey}/getTokenBalances`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'alchemy_getTokenBalances',
        params: [walletAddress],
        id: 42
      })
    }
  );

  const { tokenBalances } = await response.json();

  // 2. Get token metadata for each token
  const tokensWithMetadata = await Promise.all(
    tokenBalances.map(async (token) => {
      const metadata = await fetch(
        `https://${getAlchemyEndpoint(chainId)}.g.alchemy.com/v2/${alchemyApiKey}/getTokenMetadata`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'alchemy_getTokenMetadata',
            params: [token.contractAddress],
            id: 42
          })
        }
      );
      return metadata.json();
    })
  );

  // 3. Get prices from CoinMarketCap
  const symbols = tokensWithMetadata.map(t => t.symbol).join(',');
  const prices = await fetch(
    `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbols}`,
    {
      headers: { 'X-CMC_PRO_API_KEY': coinMarketCapApiKey }
    }
  );

  // 4. Calculate USD values
  return tokensWithMetadata.map((token, i) => ({
    chain: getNetworkName(chainId),
    token: token.name,
    symbol: token.symbol,
    balance: parseFloat(ethers.utils.formatUnits(tokenBalances[i].tokenBalance, token.decimals)),
    usdValue: parseFloat(ethers.utils.formatUnits(tokenBalances[i].tokenBalance, token.decimals)) * prices[token.symbol]?.quote.USD.price,
    color: getChainColor(chainId)
  }));
}
```

**Database Schema:**
```sql
CREATE TABLE wallet_tokens (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  chain_id INTEGER NOT NULL,
  token_address VARCHAR(42) NOT NULL,
  token_symbol VARCHAR(20) NOT NULL,
  token_name VARCHAR(100) NOT NULL,
  token_decimals INTEGER NOT NULL,
  balance DECIMAL(36, 18) NOT NULL,
  last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (wallet_address, chain_id, token_address),
  INDEX idx_wallet_chain (wallet_address, chain_id)
);

CREATE TABLE token_prices (
  id SERIAL PRIMARY KEY,
  token_symbol VARCHAR(20) NOT NULL,
  price_usd DECIMAL(18, 8) NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  source VARCHAR(50) DEFAULT 'coinmarketcap',
  INDEX idx_symbol_time (token_symbol, timestamp DESC)
);
```

---

### 1.3 Gas Reserves

**Required Data:**
- Chain name
- Native token symbol (ETH, MATIC, BNB, AVAX, etc.)
- Balance
- USD Value
- Color code for UI

#### Implementation

**API Calls:**
```javascript
async function fetchGasReserves(wallets, chainIds, alchemyApiKey, cmcApiKey) {
  const reserves = [];

  for (const chainId of chainIds) {
    const network = SUPPORTED_NETWORKS.find(n => n.id === chainId);

    // 1. Get native token balance via RPC
    const provider = new ethers.providers.JsonRpcProvider(
      `https://${getAlchemyEndpoint(chainId)}.g.alchemy.com/v2/${alchemyApiKey}`
    );

    let totalBalance = ethers.BigNumber.from(0);
    for (const wallet of wallets) {
      const balance = await provider.getBalance(wallet.address);
      totalBalance = totalBalance.add(balance);
    }

    const formattedBalance = parseFloat(ethers.utils.formatEther(totalBalance));

    // 2. Get native token price from CoinMarketCap
    const priceResponse = await fetch(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${network.symbol}`,
      { headers: { 'X-CMC_PRO_API_KEY': cmcApiKey } }
    );
    const priceData = await priceResponse.json();
    const price = priceData.data[network.symbol].quote.USD.price;

    reserves.push({
      chain: network.displayName,
      symbol: network.symbol,
      balance: formattedBalance,
      usdValue: formattedBalance * price,
      color: network.color
    });
  }

  return reserves;
}
```

**Database Schema:**
```sql
CREATE TABLE gas_reserves (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  chain_id INTEGER NOT NULL,
  native_token_symbol VARCHAR(20) NOT NULL,
  balance DECIMAL(36, 18) NOT NULL,
  usd_value DECIMAL(18, 2) NOT NULL,
  last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (wallet_address, chain_id),
  INDEX idx_wallet (wallet_address)
);
```

---

### 1.4 Recent Trades

**Required Data:**
- Time
- Trading pair (e.g., ETH/USDC)
- Chain
- Protocol (e.g., Uniswap V3, Camelot)
- Token In (symbol, amount)
- Token Out (symbol, amount)
- Gas Price (gwei)
- Block Number
- Transaction Hash
- Explorer URL

#### Implementation Strategy

**Option A: Event Listening (Real-time)**
```javascript
// Listen to swap events from DEX contracts
async function monitorSwapEvents(strategyWallets, chainId) {
  const provider = new ethers.providers.JsonRpcProvider(getRpcUrl(chainId));

  // Uniswap V3 Swap event signature
  const swapEventTopic = ethers.utils.id('Swap(address,address,int256,int256,uint160,uint128,int24)');

  const filter = {
    topics: [swapEventTopic],
    // Filter for transactions involving our wallets
  };

  provider.on(filter, async (log) => {
    const tx = await provider.getTransaction(log.transactionHash);
    const receipt = await provider.getTransactionReceipt(log.transactionHash);

    // Parse swap details from logs
    const trade = parseSwapFromLogs(log, receipt);

    // Store in database
    await storeTrade(trade);
  });
}
```

**Option B: Etherscan API (Historical)**
```javascript
async function fetchTransactionHistory(walletAddress, chainId, etherscanApiKey) {
  const explorerApi = getExplorerApiUrl(chainId); // e.g., api.etherscan.io, api.arbiscan.io

  // 1. Get all transactions for the wallet
  const txListResponse = await fetch(
    `${explorerApi}?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${etherscanApiKey}`
  );
  const { result: transactions } = await txListResponse.json();

  // 2. Get internal transactions (for DEX interactions)
  const internalTxResponse = await fetch(
    `${explorerApi}?module=account&action=txlistinternal&address=${walletAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${etherscanApiKey}`
  );
  const { result: internalTxs } = await internalTxResponse.json();

  // 3. Get ERC20 token transfers
  const tokenTxResponse = await fetch(
    `${explorerApi}?module=account&action=tokentx&address=${walletAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${etherscanApiKey}`
  );
  const { result: tokenTransfers } = await tokenTxResponse.json();

  // 4. Correlate token transfers to identify swaps
  const trades = identifyTradesFromTransfers(tokenTransfers, transactions);

  return trades;
}

function identifyTradesFromTransfers(tokenTransfers, transactions) {
  // Group token transfers by transaction hash
  const txGroups = tokenTransfers.reduce((acc, transfer) => {
    if (!acc[transfer.hash]) acc[transfer.hash] = [];
    acc[transfer.hash].push(transfer);
    return acc;
  }, {});

  // Identify swaps (1 token out, 1 token in within same tx)
  const trades = [];
  for (const [txHash, transfers] of Object.entries(txGroups)) {
    const tx = transactions.find(t => t.hash === txHash);
    if (!tx) continue;

    // Find token in (sent from wallet) and token out (received by wallet)
    const tokenOut = transfers.find(t => t.from.toLowerCase() === walletAddress.toLowerCase());
    const tokenIn = transfers.find(t => t.to.toLowerCase() === walletAddress.toLowerCase());

    if (tokenOut && tokenIn) {
      trades.push({
        time: new Date(tx.timeStamp * 1000).toLocaleTimeString(),
        pair: `${tokenIn.tokenSymbol}/${tokenOut.tokenSymbol}`,
        chain: getChainName(tx.chainId),
        protocol: identifyProtocol(tx.to), // Map contract address to protocol
        tokenIn: {
          symbol: tokenIn.tokenSymbol,
          amount: parseFloat(ethers.utils.formatUnits(tokenIn.value, tokenIn.tokenDecimal))
        },
        tokenOut: {
          symbol: tokenOut.tokenSymbol,
          amount: parseFloat(ethers.utils.formatUnits(tokenOut.value, tokenOut.tokenDecimal))
        },
        gasPrice: parseFloat(ethers.utils.formatUnits(tx.gasPrice, 'gwei')),
        blockNumber: parseInt(tx.blockNumber),
        txHash: tx.hash,
        explorerUrl: getExplorerUrl(tx.chainId, tx.hash)
      });
    }
  }

  return trades;
}
```

**Option C: Alchemy Enhanced APIs (Recommended)**
```javascript
async function fetchRecentTradesAlchemy(walletAddress, chainId, alchemyApiKey) {
  // Use Alchemy's asset transfer API
  const response = await fetch(
    `https://${getAlchemyEndpoint(chainId)}.g.alchemy.com/v2/${alchemyApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'alchemy_getAssetTransfers',
        params: [{
          fromAddress: walletAddress,
          toAddress: walletAddress,
          category: ['erc20', 'external'],
          maxCount: '0x64', // 100 transfers
          order: 'desc'
        }],
        id: 1
      })
    }
  );

  const { result } = await response.json();

  // Group by transaction hash and correlate to identify swaps
  return parseTradesFromTransfers(result.transfers);
}
```

**Database Schema:**
```sql
-- Already defined in section 1.1.2
-- trades table contains all necessary fields
```

---

### 1.5 Active Strategies Display

**Required Data:**
- Strategy name
- Status (running, stopped, error, paused)
- Profit/Loss
- Runtime
- Trades executed
- Primary chain

#### Implementation

This data comes from the existing `Strategy` type and `trades` table.

**Query:**
```sql
SELECT
  s.id,
  s.name,
  s.status,
  s.runtime,
  COALESCE(SUM(t.profit_loss_usd), 0) as total_profit,
  COUNT(t.id) as trades_executed,
  (
    SELECT chain_id
    FROM trades
    WHERE strategy_id = s.id
    GROUP BY chain_id
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ) as primary_chain_id
FROM strategies s
LEFT JOIN trades t ON t.strategy_id = s.id AND t.status = 'completed'
WHERE s.status IN ('running', 'paused')
GROUP BY s.id, s.name, s.status, s.runtime;
```

---

## 2. Strategy Card Metrics Architecture

### 2.1 P&L (Profit & Loss)

**Data Source:** `strategy_executions` table (aggregate of all executions)

⚠️ **IMPORTANT:** P&L should be calculated at the execution level, not individual trade level, to properly handle multi-chain and delta-neutral strategies.

**Implementation:**
```javascript
// CORRECT: Calculate P&L from closed executions
async function calculateStrategyPnL(strategyId) {
  const result = await db.query(`
    SELECT SUM(net_pnl_usd) as total_net_pnl
    FROM strategy_executions
    WHERE strategy_id = ? AND status = 'closed'
  `, [strategyId]);

  return result[0].total_net_pnl || 0;
}

// Get detailed P&L breakdown by execution type
async function getStrategyPnLBreakdown(strategyId) {
  const results = await db.query(`
    SELECT
      execution_type,
      COUNT(*) as execution_count,
      SUM(net_pnl_usd) as total_pnl,
      AVG(net_pnl_usd) as avg_pnl,
      COUNT(*) FILTER (WHERE net_pnl_usd > 0) as profitable_count
    FROM strategy_executions
    WHERE strategy_id = ? AND status = 'closed'
    GROUP BY execution_type
  `, [strategyId]);

  return results;
}

// Example: Cross-chain arbitrage P&L
async function calculateExecutionPnL(executionId) {
  const trades = await db.query(`
    SELECT
      token_in_symbol,
      token_in_amount,
      token_out_symbol,
      token_out_amount,
      gas_cost_usd,
      timestamp,
      chain_id
    FROM trades
    WHERE execution_id = ? AND status = 'completed'
    ORDER BY timestamp ASC
  `, [executionId]);

  // For delta-neutral: sum all value in vs value out
  let totalValueIn = 0;
  let totalValueOut = 0;
  let totalGas = 0;

  for (const trade of trades) {
    // Get prices at time of trade (historical)
    const inPrice = await getPriceAtTime(trade.token_in_symbol, trade.timestamp);
    const outPrice = await getPriceAtTime(trade.token_out_symbol, trade.timestamp);

    totalValueIn += trade.token_in_amount * inPrice;
    totalValueOut += trade.token_out_amount * outPrice;
    totalGas += trade.gas_cost_usd;
  }

  return {
    total_pnl_usd: totalValueOut - totalValueIn,
    total_gas_cost_usd: totalGas,
    net_pnl_usd: totalValueOut - totalValueIn - totalGas,
    num_trades: trades.length,
    chains_involved: [...new Set(trades.map(t => t.chain_id))]
  };
}
```

**Real-time Updates:**
```javascript
// Update execution P&L when it closes
async function onExecutionClosed(executionId) {
  // Calculate P&L for this execution
  const pnl = await calculateExecutionPnL(executionId);

  // Update execution record
  await db.query(`
    UPDATE strategy_executions
    SET
      total_pnl_usd = ?,
      total_gas_cost_usd = ?,
      status = 'closed',
      closed_at = NOW()
    WHERE id = ?
  `, [
    pnl.total_pnl_usd,
    pnl.total_gas_cost_usd,
    executionId
  ]);

  // Get strategy ID
  const execution = await db.query(`
    SELECT strategy_id FROM strategy_executions WHERE id = ?
  `, [executionId]);

  // Emit event to update strategy card UI
  emitStrategyUpdate(execution[0].strategy_id);
}

// Helper: Log execution flow for debugging
async function logExecutionFlow(executionId) {
  const execution = await db.query(`
    SELECT * FROM strategy_executions WHERE id = ?
  `, [executionId]);

  const trades = await db.query(`
    SELECT * FROM trades WHERE execution_id = ? ORDER BY timestamp ASC
  `, [executionId]);

  console.log(`
Execution ${executionId} (${execution[0].execution_type}):
  Status: ${execution[0].status}
  Opened: ${execution[0].opened_at}
  Closed: ${execution[0].closed_at}
  Duration: ${execution[0].duration_seconds}s
  Trades: ${trades.length}
  ${trades.map((t, i) => `
    Trade ${i + 1}:
      Chain: ${t.chain_id}
      In: ${t.token_in_amount} ${t.token_in_symbol}
      Out: ${t.token_out_amount} ${t.token_out_symbol}
      Gas: $${t.gas_cost_usd}
  `).join('')}
  Total P&L: $${execution[0].total_pnl_usd}
  Gas Costs: $${execution[0].total_gas_cost_usd}
  Net P&L: $${execution[0].net_pnl_usd}
  `);
}
```

**Worker Integration Example:**
```javascript
// In strategy code running in Web Worker
class mqApi {
  // Create a new execution
  async beginExecution(type = 'custom') {
    const executionId = generateUuid();

    await fetch('/api/executions', {
      method: 'POST',
      body: JSON.stringify({
        id: executionId,
        strategy_id: this.strategyId,
        execution_type: type,
        status: 'opened'
      })
    });

    return executionId;
  }

  // Execute a trade and link it to execution
  async swap(params) {
    const tx = await this.executeSwap(params);

    await fetch('/api/trades', {
      method: 'POST',
      body: JSON.stringify({
        execution_id: params.executionId,  // Link to execution
        strategy_id: this.strategyId,
        chain_id: params.chainId,
        tx_hash: tx.hash,
        // ... other trade details
      })
    });

    return tx;
  }

  // Close execution and calculate P&L
  async endExecution(executionId) {
    await fetch(`/api/executions/${executionId}/close`, {
      method: 'POST'
    });
  }
}

// Example: Delta-neutral arbitrage strategy
async function arbitrageStrategy() {
  const executionId = await mqApi.beginExecution('cross_chain');

  try {
    // Buy on Ethereum
    console.log('Buying ETH on Ethereum...');
    await mqApi.swap({
      executionId,
      chainId: 1,
      tokenIn: 'USDC',
      tokenOut: 'ETH',
      amountIn: '1825'
    });

    // Sell on Arbitrum
    console.log('Selling ETH on Arbitrum...');
    await mqApi.swap({
      executionId,
      chainId: 42161,
      tokenIn: 'ETH',
      tokenOut: 'USDC',
      amountIn: '1.0'
    });

    // Close execution - backend calculates P&L
    await mqApi.endExecution(executionId);
    console.log('Arbitrage execution closed');

  } catch (error) {
    console.error('Arbitrage failed:', error);
    // Mark execution as failed
    await fetch(`/api/executions/${executionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'failed' })
    });
  }
}
```

---

### 2.2 Runtime

**Data Source:** `strategies` table + in-memory worker tracking

**Implementation:**
```javascript
// Store strategy start time
const strategyStartTimes = new Map<string, number>();

function onStrategyStart(strategyId) {
  strategyStartTimes.set(strategyId, Date.now());
}

function getStrategyRuntime(strategyId) {
  const startTime = strategyStartTimes.get(strategyId);
  if (!startTime) return 0;

  const runtimeMs = Date.now() - startTime;
  return runtimeMs;
}

function formatRuntime(runtimeMs) {
  const seconds = Math.floor(runtimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}
```

**Database Persistence:**
```sql
ALTER TABLE strategies ADD COLUMN started_at TIMESTAMP;
ALTER TABLE strategies ADD COLUMN total_runtime_ms BIGINT DEFAULT 0;

-- Update runtime periodically (every 5 seconds)
UPDATE strategies
SET total_runtime_ms = total_runtime_ms + 5000
WHERE status = 'running';
```

---

### 2.3 Trades Executed

**Data Source:** `trades` table

**Implementation:**
```sql
-- Simple count query
SELECT COUNT(*) as trades_executed
FROM trades
WHERE strategy_id = ? AND status = 'completed';

-- Cache in strategy record for performance
ALTER TABLE strategies ADD COLUMN trades_count INTEGER DEFAULT 0;

-- Update via trigger
CREATE TRIGGER update_strategy_trades_count
AFTER INSERT ON trades
FOR EACH ROW
WHEN (NEW.status = 'completed')
BEGIN
  UPDATE strategies
  SET trades_count = trades_count + 1
  WHERE id = NEW.strategy_id;
END;
```

---

### 2.4 Chains

**Data Source:** `strategies` table (from `StrategyChainConfig`)

**Implementation:**
```typescript
// From existing Strategy type
interface Strategy {
  chains: {
    [chainId: number]: StrategyChainConfig;
  };
}

// Get chain stats for display
function getStrategyChainStats(strategy: Strategy): ChainStats[] {
  return Object.entries(strategy.chains).map(([chainId, config]) => ({
    chainId: parseInt(chainId),
    profit: config.totalProfit,
    trades: config.tradeCount,
    lastTrade: config.lastTradeTimestamp,
    isActive: config.isActive
  }));
}

// Update chain stats when trade completes
async function updateChainStatsOnTrade(trade) {
  const strategy = await getStrategy(trade.strategy_id);
  const chainConfig = strategy.chains[trade.chain_id];

  chainConfig.tradeCount += 1;
  chainConfig.totalProfit += trade.profit_loss_usd;
  chainConfig.lastTradeTimestamp = trade.timestamp;

  await updateStrategy(strategy);
}
```

**Database Schema:**
```sql
-- Store per-chain stats
CREATE TABLE strategy_chain_stats (
  id SERIAL PRIMARY KEY,
  strategy_id VARCHAR(36) NOT NULL,
  chain_id INTEGER NOT NULL,
  trade_count INTEGER DEFAULT 0,
  total_profit_usd DECIMAL(18, 2) DEFAULT 0,
  last_trade_timestamp TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  UNIQUE (strategy_id, chain_id),
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
);

-- Update via trigger
CREATE TRIGGER update_chain_stats
AFTER INSERT ON trades
FOR EACH ROW
WHEN (NEW.status = 'completed')
BEGIN
  INSERT INTO strategy_chain_stats (strategy_id, chain_id, trade_count, total_profit_usd, last_trade_timestamp)
  VALUES (NEW.strategy_id, NEW.chain_id, 1, NEW.profit_loss_usd, NEW.timestamp)
  ON CONFLICT (strategy_id, chain_id) DO UPDATE SET
    trade_count = strategy_chain_stats.trade_count + 1,
    total_profit_usd = strategy_chain_stats.total_profit_usd + EXCLUDED.total_profit_usd,
    last_trade_timestamp = EXCLUDED.last_trade_timestamp;
END;
```

---

## 3. Database Schema Overview

### 3.1 Core Tables

```sql
-- Strategies
CREATE TABLE strategies (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('initialized', 'running', 'paused', 'stopped', 'error', 'deleted')),
  code TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP,
  total_runtime_ms BIGINT DEFAULT 0,
  trades_count INTEGER DEFAULT 0,
  total_profit_usd DECIMAL(18, 2) DEFAULT 0,
  INDEX idx_status (status),
  INDEX idx_created (created_at DESC)
);

-- Strategy Chains Configuration
CREATE TABLE strategy_chains (
  id SERIAL PRIMARY KEY,
  strategy_id VARCHAR(36) NOT NULL,
  chain_id INTEGER NOT NULL,
  private_key VARCHAR(66) NOT NULL, -- Encrypted
  address VARCHAR(42) NOT NULL,
  rpc_endpoint VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  UNIQUE (strategy_id, chain_id),
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
);

-- Strategy Chain Stats
CREATE TABLE strategy_chain_stats (
  id SERIAL PRIMARY KEY,
  strategy_id VARCHAR(36) NOT NULL,
  chain_id INTEGER NOT NULL,
  trade_count INTEGER DEFAULT 0,
  total_profit_usd DECIMAL(18, 2) DEFAULT 0,
  last_trade_timestamp TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  UNIQUE (strategy_id, chain_id),
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
);

-- Strategy Executions (high-level positions/trades)
CREATE TABLE strategy_executions (
  id VARCHAR(36) PRIMARY KEY,
  strategy_id VARCHAR(36) NOT NULL,
  execution_type VARCHAR(50) NOT NULL CHECK (execution_type IN (
    'simple_swap', 'cross_chain', 'spot_perp_hedge', 'options_delta', 'yield_farming', 'market_making', 'custom'
  )),
  status VARCHAR(20) NOT NULL CHECK (status IN (
    'opened', 'active', 'closed', 'failed', 'partial'
  )),

  -- Timing
  opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMP,
  duration_seconds INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (COALESCE(closed_at, NOW()) - opened_at))
  ) STORED,

  -- P&L Components (aggregate across all trades/positions)
  total_pnl_usd DECIMAL(18, 2) DEFAULT 0,
  total_gas_cost_usd DECIMAL(18, 2) DEFAULT 0,

  -- Strategy-specific P&L components
  bridge_fees_usd DECIMAL(18, 2) DEFAULT 0,           -- Cross-chain transfer costs
  funding_received_usd DECIMAL(18, 2) DEFAULT 0,      -- Funding rate payments (perp shorts)
  funding_paid_usd DECIMAL(18, 2) DEFAULT 0,          -- Funding rate costs (perp longs)
  premiums_collected_usd DECIMAL(18, 2) DEFAULT 0,    -- Options premiums received
  premiums_paid_usd DECIMAL(18, 2) DEFAULT 0,         -- Options premiums paid
  farming_rewards_usd DECIMAL(18, 2) DEFAULT 0,       -- Yield farming rewards
  impermanent_loss_usd DECIMAL(18, 2) DEFAULT 0,      -- IL from LP positions
  slippage_cost_usd DECIMAL(18, 2) DEFAULT 0,         -- Price impact
  hedging_cost_usd DECIMAL(18, 2) DEFAULT 0,          -- Hedging costs

  -- Net P&L calculation (includes all costs)
  net_pnl_usd DECIMAL(18, 2) GENERATED ALWAYS AS (
    total_pnl_usd
    - total_gas_cost_usd
    - bridge_fees_usd
    - slippage_cost_usd
    - hedging_cost_usd
    - impermanent_loss_usd
    - premiums_paid_usd
    - funding_paid_usd
    + funding_received_usd
    + premiums_collected_usd
    + farming_rewards_usd
  ) STORED,

  -- Position details (stored as JSON)
  spot_positions JSONB,          -- [{chain_id, token, quantity, entry_price, exit_price, side}, ...]
  perp_positions JSONB,          -- [{exchange, token, leverage, funding_rate, ...}, ...]
  options_positions JSONB,       -- [{protocol, option_type, strike, expiry, premium, ...}, ...]
  lp_positions JSONB,            -- [{pool, protocol, token0, token1, liquidity, apy, ...}, ...]

  -- Inventory tracking
  starting_inventory JSONB,      -- Token balances at execution open
  ending_inventory JSONB,        -- Token balances at execution close

  -- Metadata
  tags TEXT[],
  notes TEXT,

  INDEX idx_strategy (strategy_id),
  INDEX idx_status (status),
  INDEX idx_opened_at (opened_at DESC),
  INDEX idx_net_pnl (net_pnl_usd DESC),
  INDEX idx_execution_type (execution_type),
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
);

-- Trades (individual on-chain transactions)
CREATE TABLE trades (
  id SERIAL PRIMARY KEY,
  execution_id VARCHAR(36),  -- NULL for standalone, set for multi-trade executions
  strategy_id VARCHAR(36) NOT NULL,
  wallet_address VARCHAR(42) NOT NULL,  -- Which wallet executed this trade
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  chain_id INTEGER NOT NULL,
  protocol VARCHAR(50),
  tx_hash VARCHAR(66) NOT NULL UNIQUE,
  block_number INTEGER NOT NULL,

  -- Trade details
  token_in_address VARCHAR(42) NOT NULL,
  token_in_symbol VARCHAR(20) NOT NULL,
  token_in_amount DECIMAL(36, 18) NOT NULL,

  token_out_address VARCHAR(42) NOT NULL,
  token_out_symbol VARCHAR(20) NOT NULL,
  token_out_amount DECIMAL(36, 18) NOT NULL,

  -- Pricing (at time of trade)
  token_in_price_usd DECIMAL(18, 8),
  token_out_price_usd DECIMAL(18, 8),
  value_in_usd DECIMAL(18, 2),
  value_out_usd DECIMAL(18, 2),
  profit_loss_usd DECIMAL(18, 2),  -- For this trade only, not overall execution

  -- Gas costs
  gas_used INTEGER,
  gas_price_gwei DECIMAL(18, 9),
  gas_cost_usd DECIMAL(18, 2),

  -- Status
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),

  INDEX idx_execution (execution_id),
  INDEX idx_strategy (strategy_id),
  INDEX idx_wallet (wallet_address),
  INDEX idx_strategy_wallet (strategy_id, wallet_address),  -- Shared wallet queries
  INDEX idx_chain (chain_id),
  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_tx_hash (tx_hash),
  FOREIGN KEY (execution_id) REFERENCES strategy_executions(id) ON DELETE SET NULL,
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
);

-- Portfolio Snapshots
CREATE TABLE portfolio_snapshots (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  wallet_address VARCHAR(42) NOT NULL,
  chain_id INTEGER NOT NULL,
  total_balance_usd DECIMAL(18, 2) NOT NULL,
  INDEX idx_wallet_time (wallet_address, timestamp DESC)
);

-- Portfolio History (aggregated)
CREATE TABLE portfolio_history (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  total_value_usd DECIMAL(18, 2) NOT NULL,
  INDEX idx_timestamp (timestamp)
);

-- Token Prices Cache
CREATE TABLE token_prices (
  id SERIAL PRIMARY KEY,
  token_symbol VARCHAR(20) NOT NULL,
  token_address VARCHAR(42),
  price_usd DECIMAL(18, 8) NOT NULL,
  market_cap_usd DECIMAL(24, 2),
  volume_24h_usd DECIMAL(24, 2),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  source VARCHAR(50) DEFAULT 'coinmarketcap',
  INDEX idx_symbol_time (token_symbol, timestamp DESC),
  INDEX idx_address (token_address)
);

-- Wallet Tokens (current holdings)
CREATE TABLE wallet_tokens (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  chain_id INTEGER NOT NULL,
  token_address VARCHAR(42) NOT NULL,
  token_symbol VARCHAR(20) NOT NULL,
  token_name VARCHAR(100) NOT NULL,
  token_decimals INTEGER NOT NULL,
  balance DECIMAL(36, 18) NOT NULL,
  last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (wallet_address, chain_id, token_address),
  INDEX idx_wallet_chain (wallet_address, chain_id)
);

-- Gas Reserves
CREATE TABLE gas_reserves (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  chain_id INTEGER NOT NULL,
  native_token_symbol VARCHAR(20) NOT NULL,
  balance DECIMAL(36, 18) NOT NULL,
  usd_value DECIMAL(18, 2) NOT NULL,
  last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (wallet_address, chain_id),
  INDEX idx_wallet (wallet_address)
);

-- Console Logs (for debugging)
CREATE TABLE strategy_logs (
  id SERIAL PRIMARY KEY,
  strategy_id VARCHAR(36) NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  log_level VARCHAR(20) NOT NULL CHECK (log_level IN ('log', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  INDEX idx_strategy_time (strategy_id, timestamp DESC),
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
);

-- Trading View Panels
CREATE TABLE trading_view_panels (
  id VARCHAR(36) PRIMARY KEY,
  strategy_id VARCHAR(36) NOT NULL,
  network_id INTEGER,
  protocol_id VARCHAR(50),
  pair_symbol VARCHAR(50),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
);
```

---

## 4. API Integration Details

### 4.1 Alchemy API Usage

**Token Balances:**
```bash
POST https://eth-mainnet.g.alchemy.com/v2/{apiKey}
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "alchemy_getTokenBalances",
  "params": ["0xWalletAddress"],
  "id": 42
}
```

**Token Metadata:**
```bash
POST https://eth-mainnet.g.alchemy.com/v2/{apiKey}
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "alchemy_getTokenMetadata",
  "params": ["0xTokenAddress"],
  "id": 42
}
```

**Asset Transfers (for trade history):**
```bash
POST https://eth-mainnet.g.alchemy.com/v2/{apiKey}
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "alchemy_getAssetTransfers",
  "params": [{
    "fromAddress": "0xWalletAddress",
    "category": ["erc20", "external"],
    "maxCount": "0x64",
    "order": "desc"
  }],
  "id": 1
}
```

**Endpoints by Network:**
- Ethereum: `eth-mainnet.g.alchemy.com`
- Polygon: `polygon-mainnet.g.alchemy.com`
- Arbitrum: `arb-mainnet.g.alchemy.com`
- Optimism: `opt-mainnet.g.alchemy.com`
- Base: `base-mainnet.g.alchemy.com`

---

### 4.2 Etherscan API Usage

**Transaction List:**
```bash
GET https://api.etherscan.io/api?module=account&action=txlist&address={walletAddress}&startblock=0&endblock=99999999&sort=desc&apikey={apiKey}
```

**Token Transactions:**
```bash
GET https://api.etherscan.io/api?module=account&action=tokentx&address={walletAddress}&startblock=0&endblock=99999999&sort=desc&apikey={apiKey}
```

**Transaction Receipt:**
```bash
GET https://api.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash={txHash}&apikey={apiKey}
```

**Gas Price:**
```bash
GET https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey={apiKey}
```

**Multi-chain Explorers:**
- Ethereum: `api.etherscan.io`
- Polygon: `api.polygonscan.com`
- Arbitrum: `api.arbiscan.io`
- Optimism: `api-optimistic.etherscan.io`
- Base: `api.basescan.org`
- BSC: `api.bscscan.com`
- Avalanche: `api.snowtrace.io`

---

### 4.3 CoinMarketCap API Usage

**Get Token Prices:**
```bash
GET https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=ETH,MATIC,ARB,BNB,AVAX
Headers:
  X-CMC_PRO_API_KEY: {apiKey}
```

**Get Token Info:**
```bash
GET https://pro-api.coinmarketcap.com/v1/cryptocurrency/info?symbol=ETH
Headers:
  X-CMC_PRO_API_KEY: {apiKey}
```

**Price Conversion:**
```bash
GET https://pro-api.coinmarketcap.com/v1/tools/price-conversion?amount=1&symbol=ETH&convert=USD
Headers:
  X-CMC_PRO_API_KEY: {apiKey}
```

---

## 5. Implementation Roadmap

### Phase 1: Core Metrics (Week 1)
- [ ] Set up database schema
- [ ] Implement token balance fetching (Alchemy)
- [ ] Implement price fetching (CoinMarketCap)
- [ ] Calculate total balance and positions value
- [ ] Implement gas reserves tracking

### Phase 2: Trade Tracking (Week 2)
- [ ] Implement transaction monitoring (Etherscan/Alchemy)
- [ ] Parse swap events from DEX contracts
- [ ] Store trades in database
- [ ] Calculate P&L for each trade
- [ ] Calculate win rate and total trades

### Phase 3: Strategy Metrics (Week 3)
- [ ] Implement runtime tracking
- [ ] Track trades per strategy
- [ ] Calculate per-strategy P&L
- [ ] Implement per-chain stats
- [ ] Real-time updates via WebSocket/SSE

### Phase 4: Advanced Analytics (Week 4)
- [ ] Implement portfolio history snapshots
- [ ] Calculate max drawdown
- [ ] Add performance charts
- [ ] Implement asset filtering and sorting
- [ ] Add export functionality (CSV, JSON)

### Phase 5: Optimization (Week 5)
- [ ] Add Redis caching for prices
- [ ] Implement pagination for trade history
- [ ] Optimize database queries
- [ ] Add rate limiting for API calls
- [ ] Implement background job processing

---

## 6. Storybook Mock Data Implementation

Since Storybook doesn't use a database, we'll generate mock data using the following approach:

### 6.1 Mock Data Generators

```typescript
// src/mocks/analysisDataGenerator.ts

import { SUPPORTED_NETWORKS } from '../config/networks';

export function generateMockTotalBalance(strategies: Strategy[]): number {
  // Sum all strategy profits plus base portfolio value
  const strategyValue = strategies.reduce((sum, s) => sum + s.totalProfit, 0);
  const baseValue = 50000; // Base portfolio value
  return baseValue + strategyValue;
}

export function generateMockWinRate(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  const winningTrades = trades.filter(t => t.profit_loss_usd > 0).length;
  return (winningTrades / trades.length) * 100;
}

export function generateMockMaxDrawdown(portfolioHistory: number[]): number {
  let maxDrawdown = 0;
  let peak = portfolioHistory[0];

  for (const value of portfolioHistory) {
    if (value > peak) peak = value;
    const drawdown = ((peak - value) / peak) * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  return maxDrawdown;
}

export function generateMockAssets(chains: number[]): Asset[] {
  const tokens = ['USDC', 'WETH', 'USDT', 'WBTC', 'DAI', 'LINK'];
  const assets: Asset[] = [];

  for (const chainId of chains) {
    const network = SUPPORTED_NETWORKS.find(n => n.id === chainId);
    if (!network) continue;

    const numTokens = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numTokens; i++) {
      const token = tokens[Math.floor(Math.random() * tokens.length)];
      assets.push({
        chain: network.displayName,
        token,
        symbol: token,
        balance: Math.random() * 1000,
        usdValue: Math.random() * 10000,
        color: network.color
      });
    }
  }

  return assets;
}

export function generateMockGasReserves(chains: number[]): GasReserve[] {
  return chains.map(chainId => {
    const network = SUPPORTED_NETWORKS.find(n => n.id === chainId);
    if (!network) return null;

    return {
      chain: network.displayName,
      symbol: network.symbol,
      balance: Math.random() * 0.5,
      usdValue: Math.random() * 1000,
      color: network.color
    };
  }).filter(Boolean);
}

export function generateMockRecentTrades(strategies: Strategy[], count: number = 10): RecentTrade[] {
  const protocols = ['Uniswap V3', 'Camelot', 'Quickswap', 'Aerodrome', 'PancakeSwap'];
  const tokens = ['ETH', 'USDC', 'USDT', 'WBTC', 'MATIC', 'ARB', 'LINK'];
  const trades: RecentTrade[] = [];

  for (let i = 0; i < count; i++) {
    const strategy = strategies[Math.floor(Math.random() * strategies.length)];
    const chainIds = Object.keys(strategy.chains).map(Number);
    const chainId = chainIds[Math.floor(Math.random() * chainIds.length)];
    const network = SUPPORTED_NETWORKS.find(n => n.id === chainId);

    const tokenIn = tokens[Math.floor(Math.random() * tokens.length)];
    let tokenOut = tokens[Math.floor(Math.random() * tokens.length)];
    while (tokenOut === tokenIn) {
      tokenOut = tokens[Math.floor(Math.random() * tokens.length)];
    }

    const timestamp = Date.now() - (i * 5 * 60 * 1000); // 5 minutes apart
    const time = new Date(timestamp).toLocaleTimeString();

    trades.push({
      time,
      pair: `${tokenOut}/${tokenIn}`,
      chain: network?.displayName || 'Unknown',
      protocol: protocols[Math.floor(Math.random() * protocols.length)],
      tokenIn: {
        symbol: tokenIn,
        amount: Math.random() * 1000
      },
      tokenOut: {
        symbol: tokenOut,
        amount: Math.random() * 10
      },
      gasPrice: Math.random() * 50 + 10,
      blockNumber: 18000000 + Math.floor(Math.random() * 100000),
      txHash: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      explorerUrl: `${network?.explorerUrl}/tx/0x...`
    });
  }

  return trades;
}
```

### 6.2 Update Stories with Generated Data

```typescript
// src/components/Analysis/Analysis.stories.tsx

import { generateMockTotalBalance, generateMockWinRate, generateMockAssets, generateMockGasReserves, generateMockRecentTrades } from '../../mocks/analysisDataGenerator';

const mockStrategies = [/* ... existing mock strategies ... */];

export const Default: Story = {
  args: {
    totalBalance: generateMockTotalBalance(mockStrategies),
    activeStrategies: mockStrategies.filter(s => s.status === 'running').length,
    winRate: generateMockWinRate(mockRecentTrades),
    totalPositionsValue: 93002.5,
    maxDrawdown: 12.3,
    totalTrades: mockRecentTrades.length,
    gasReserves: generateMockGasReserves([1, 137, 42161, 8453, 56]),
    assets: generateMockAssets([1, 137, 42161, 8453]),
    recentTrades: generateMockRecentTrades(mockStrategies, 10),
    strategies: mockStrategies,
  },
};
```

---

## 7. Performance Considerations

### 7.1 Caching Strategy

```typescript
// Implement Redis caching for expensive operations
class DataCache {
  private redis: RedisClient;

  async getCachedPrice(symbol: string): Promise<number | null> {
    const cached = await this.redis.get(`price:${symbol}`);
    if (cached) return parseFloat(cached);
    return null;
  }

  async setCachedPrice(symbol: string, price: number, ttl: number = 60) {
    await this.redis.setex(`price:${symbol}`, ttl, price.toString());
  }

  async getCachedBalance(address: string, chainId: number): Promise<TokenBalance[] | null> {
    const cached = await this.redis.get(`balance:${address}:${chainId}`);
    if (cached) return JSON.parse(cached);
    return null;
  }

  async setCachedBalance(address: string, chainId: number, balance: TokenBalance[], ttl: number = 30) {
    await this.redis.setex(`balance:${address}:${chainId}`, ttl, JSON.stringify(balance));
  }
}
```

### 7.2 Rate Limiting

```typescript
// Implement rate limiting for API calls
class RateLimiter {
  private limits = {
    etherscan: { calls: 0, limit: 5, window: 1000 }, // 5 calls per second
    coinmarketcap: { calls: 0, limit: 30, window: 60000 }, // 30 calls per minute
    alchemy: { calls: 0, limit: 660, window: 1000 } // 660 calls per second
  };

  async throttle(api: keyof typeof this.limits): Promise<void> {
    const limit = this.limits[api];

    if (limit.calls >= limit.limit) {
      await new Promise(resolve => setTimeout(resolve, limit.window));
      limit.calls = 0;
    }

    limit.calls++;
  }
}
```

### 7.3 Background Jobs

```typescript
// Use background job processing for data updates
class BackgroundJobProcessor {
  async schedulePortfolioSnapshot() {
    // Run every 5 minutes
    setInterval(async () => {
      await this.capturePortfolioSnapshot();
    }, 5 * 60 * 1000);
  }

  async schedulePriceUpdates() {
    // Update prices every 30 seconds
    setInterval(async () => {
      await this.updateAllTokenPrices();
    }, 30 * 1000);
  }

  async scheduleTradeSync() {
    // Sync new trades every minute
    setInterval(async () => {
      await this.syncRecentTrades();
    }, 60 * 1000);
  }
}
```

---

## 8. Conclusion

This architecture provides a comprehensive solution for tracking and displaying all required metrics in the MEGA QUANT platform. Key achievements:

✅ **Complete data pipeline** from blockchain → APIs → database → UI
✅ **Real-time updates** via event listeners and WebSocket connections
✅ **Multi-chain support** across 10+ EVM networks
✅ **Scalable database schema** with proper indexing and relationships
✅ **Mock data generators** for Storybook development
✅ **Performance optimizations** with caching and rate limiting
✅ **Comprehensive trade tracking** with P&L calculations
✅ **Strategy Execution abstraction** for delta-neutral and cross-chain strategies

### 🎯 Critical Design Highlight: Strategy Executions

The most important architectural decision in this plan is the introduction of **Strategy Executions** as a higher-level abstraction above individual trades.

**Why This Matters:**
```
Traditional Approach (WRONG):
├─ Trade 1: Buy ETH on Ethereum = -$1825 (LOSS)
├─ Trade 2: Sell ETH on Arbitrum = +$1830 (PROFIT)
└─ Win Rate = 1/2 = 50% ❌

Execution-Based Approach (CORRECT):
└─ Execution 1: Cross-chain Arbitrage
    ├─ Trade 1: Buy ETH on Ethereum
    └─ Trade 2: Sell ETH on Arbitrum
    └─ Net P&L: +$5 (profit)
└─ Win Rate = 1/1 = 100% ✅
```

**Implementation Requirements:**
1. Strategy code must call `mqApi.beginExecution()` before trades
2. All trades link to `execution_id`
3. Strategy code calls `mqApi.endExecution()` to calculate final P&L
4. UI displays metrics based on executions, not individual trades

**Benefits:**
- Correctly tracks cross-chain arbitrage (no bridging required!)
- Supports delta-neutral strategies
- Handles multi-leg positions (enter, manage, exit)
- Accurate win rate calculation
- Better P&L attribution
- Inventory-based P&L: Calculate from total portfolio value change across all chains

**Next Steps:**
1. Implement `strategy_executions` table migration with all P&L component columns
2. Add `execution_id` column to `trades` table
3. Create `mqApi.beginExecution()` and `mqApi.endExecution()` methods
4. **Implement `mqApi.captureInventory()` for inventory-based P&L** (critical!)
5. Add methods for recording P&L components (funding, premiums, IL, etc.)
6. Update strategy card to query executions, not trades
7. Add execution tracking to existing TradingAPI service
8. Create example strategies using execution pattern
9. Implement cross-chain price fetching (different prices on different chains)
10. Implement core services (token balance, price fetching)
11. Set up database migrations
12. Create data fetching hooks for React components
13. Implement real-time WebSocket updates
14. Add comprehensive error handling and logging
