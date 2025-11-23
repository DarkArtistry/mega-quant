# Delta-Neutral Strategy Implementation Examples

This file provides complete code examples for implementing each type of delta-neutral strategy mentioned in analysis-plan.md.

## Example 1: Cross-Chain Arbitrage (No Bridging Required)

```typescript
// Strategy: Buy ETH cheap on Chain A, sell expensive on Chain B
// Prerequisite: Have inventory on both chains (e.g., USDC on Ethereum, ETH on Arbitrum)
async function crossChainArbitrage() {
  const executionId = await mqApi.beginExecution('cross_chain');

  try {
    console.log('Starting cross-chain arbitrage...');

    // Capture starting inventory across all chains
    // Example:
    //   Ethereum: 1825 USDC
    //   Arbitrum: 1 ETH (valued at $1825)
    //   Total starting value: $3650
    const startingInventory = await mqApi.captureInventory(executionId);
    console.log('Starting portfolio value:', startingInventory.totalValue);

    // Detect arbitrage opportunity: ETH is $1825 on Ethereum, $1830 on Arbitrum
    const ethPriceEthereum = await mqApi.getPrice('ETH', 1);  // $1825
    const ethPriceArbitrum = await mqApi.getPrice('ETH', 42161);  // $1830
    const spread = ethPriceArbitrum - ethPriceEthereum;

    console.log(`Spread detected: $${spread} per ETH`);

    if (spread < 5) {
      console.log('Spread too small, aborting');
      await mqApi.cancelExecution(executionId);
      return;
    }

    // Step 1: Buy 1 ETH on Ethereum (cheaper)
    const buyTx = await mqApi.swap({
      executionId,
      chainId: 1,  // Ethereum
      tokenIn: 'USDC',
      tokenOut: 'ETH',
      amountIn: '1825',  // Buy at $1825
      slippage: 0.5
    });
    console.log(`✓ Bought 1 ETH on Ethereum: ${buyTx.hash}`);

    // Step 2: Simultaneously sell 1 ETH on Arbitrum (more expensive)
    // No need to bridge! We already have ETH on Arbitrum from previous inventory
    const sellTx = await mqApi.swap({
      executionId,
      chainId: 42161,  // Arbitrum
      tokenIn: 'ETH',
      tokenOut: 'USDC',
      amountIn: '1.0',  // Sell at $1830
      slippage: 0.5
    });
    console.log(`✓ Sold 1 ETH on Arbitrum: ${sellTx.hash}`);

    // Capture ending inventory
    // Example:
    //   Ethereum: 1 ETH (valued at $1825)
    //   Arbitrum: 1830 USDC
    //   Total ending value: $3655
    const endingInventory = await mqApi.captureInventory(executionId);
    console.log('Ending portfolio value:', endingInventory.totalValue);

    // Close execution - backend calculates P&L from inventory change
    // P&L = $3655 - $3650 - gas on both chains
    // Net profit ≈ $5 - gas fees
    await mqApi.endExecution(executionId);
    console.log('✅ Cross-chain arbitrage completed');

    // Note: Inventory is now imbalanced (more USDC on Arbitrum, more ETH on Ethereum)
    // Can rebalance later when bridging costs are low, or wait for reverse arbitrage opportunity

  } catch (error) {
    console.error('❌ Arbitrage failed:', error);
    await mqApi.failExecution(executionId, error.message);
  }
}
```

## Example 2: Spot Long + Perp Short (Funding Rate Arbitrage)

```typescript
// Strategy: Long spot ETH, short ETH perp, earn funding rates
async function fundingRateArbitrage() {
  const executionId = await mqApi.beginExecution('spot_perp_hedge');

  try {
    console.log('Starting funding rate arbitrage...');

    // Step 1: Buy spot ETH on Ethereum
    const spotTx = await mqApi.swap({
      executionId,
      chainId: 1,  // Ethereum
      tokenIn: 'USDC',
      tokenOut: 'ETH',
      amountIn: '3000',  // Buy 1 ETH at $3000
      slippage: 0.5
    });
    console.log(`Spot buy: ${spotTx.hash}`);

    // Step 2: Open short perp position (via CEX or GMX/etc.)
    const perpPosition = await mqApi.openPerpPosition({
      executionId,
      exchange: 'gmx',  // or 'binance', 'dydx', etc.
      chainId: 42161,    // Arbitrum for GMX
      token: 'ETH',
      side: 'short',
      size: '1.0',       // Short 1 ETH
      entryPrice: 3010,  // Slightly higher due to basis
      leverage: 1        // No leverage for safety
    });
    console.log(`Perp short opened: ${perpPosition.positionId}`);

    // Track position details
    await mqApi.recordPerpPosition(executionId, {
      exchange: 'gmx',
      token: 'ETH',
      side: 'short',
      size: 1.0,
      entryPrice: 3010,
      leverage: 1,
      fundingRateHourly: 0.0001  // 0.01% hourly = 0.24% daily
    });

    // Step 3: Hold position and collect funding
    // Funding rates are automatically paid/collected by the exchange
    // GMX funding updates every hour, tracked via events

    const holdDuration = 7 * 24 * 3600 * 1000;  // 7 days
    console.log(`Holding position for 7 days to collect funding...`);

    // Monitor funding payments (example)
    let totalFundingCollected = 0;
    const checkInterval = setInterval(async () => {
      const funding = await mqApi.getPerpFunding(perpPosition.positionId);
      totalFundingCollected += funding.lastPayment;
      console.log(`Funding collected: $${totalFundingCollected.toFixed(2)}`);

      // Record funding in execution
      await mqApi.recordFundingReceived(executionId, funding.lastPayment);
    }, 3600 * 1000);  // Check every hour

    // Wait 7 days
    await new Promise(resolve => setTimeout(resolve, holdDuration));
    clearInterval(checkInterval);

    // Step 4: Close positions
    // Close perp
    const closePerpTx = await mqApi.closePerpPosition({
      executionId,
      positionId: perpPosition.positionId,
      exitPrice: 3200  // ETH rose to $3200
    });
    console.log(`Perp closed: ${closePerpTx.hash}`);

    // Sell spot
    const sellSpotTx = await mqApi.swap({
      executionId,
      chainId: 1,
      tokenIn: 'ETH',
      tokenOut: 'USDC',
      amountIn: '1.0',
      slippage: 0.5
    });
    console.log(`Spot sold: ${sellSpotTx.hash}`);

    // Step 5: Calculate P&L
    // Spot P&L: (3200 - 3000) = +$200
    // Perp P&L: (3010 - 3200) = -$190
    // Net directional: +$10 (slight basis convergence)
    // Funding collected: ~$21 (7 days × 0.01% × $3000)
    // Net profit: $10 + $21 - gas fees = ~$26

    await mqApi.endExecution(executionId);
    console.log('✅ Funding rate arbitrage completed');

  } catch (error) {
    console.error('❌ Funding arbitrage failed:', error);
    await mqApi.failExecution(executionId, error.message);
  }
}
```

## Example 3: Options-Based Delta Neutral (Long Straddle)

```typescript
// Strategy: Buy ATM call + ATM put, profit from volatility
async function longStraddleStrategy() {
  const executionId = await mqApi.beginExecution('options_delta');

  try {
    console.log('Starting long straddle...');

    // Current ETH price: $3000
    const strike = 3000;
    const expiry = Date.now() + (7 * 24 * 3600 * 1000);  // 7 days

    // Step 1: Buy ATM call option
    const buyCallTx = await mqApi.buyOption({
      executionId,
      chainId: 1,  // Ethereum
      protocol: 'opyn',  // or 'hegic', 'dopex', etc.
      optionType: 'call',
      strike,
      expiry,
      quantity: 1,
      premium: 100  // Pay $100 premium
    });
    console.log(`Call bought: ${buyCallTx.hash}`);

    // Record premium paid
    await mqApi.recordPremiumPaid(executionId, 100);

    // Step 2: Buy ATM put option
    const buyPutTx = await mqApi.buyOption({
      executionId,
      chainId: 1,
      protocol: 'opyn',
      optionType: 'put',
      strike,
      expiry,
      quantity: 1,
      premium: 100  // Pay $100 premium
    });
    console.log(`Put bought: ${buyPutTx.hash}`);

    // Record premium paid
    await mqApi.recordPremiumPaid(executionId, 100);

    // Total premium: $200
    console.log('Straddle established. Delta neutral at $3000');
    console.log('Need ETH to move >$200 from strike to profit');

    // Step 3: Wait for expiry
    await new Promise(resolve => setTimeout(resolve, expiry - Date.now()));

    // Step 4: Settle options
    const finalEthPrice = await mqApi.getPrice('ETH');
    console.log(`ETH at expiry: $${finalEthPrice}`);

    let callIntrinsic = 0;
    let putIntrinsic = 0;

    if (finalEthPrice > strike) {
      // Call is ITM
      callIntrinsic = finalEthPrice - strike;
      await mqApi.exerciseOption({
        executionId,
        optionId: buyCallTx.optionId,
        settlementValue: callIntrinsic
      });
    }

    if (finalEthPrice < strike) {
      // Put is ITM
      putIntrinsic = strike - finalEthPrice;
      await mqApi.exerciseOption({
        executionId,
        optionId: buyPutTx.optionId,
        settlementValue: putIntrinsic
      });
    }

    // P&L = Intrinsic Value - Premiums Paid - Gas
    // Example: ETH = $3300
    //   Call intrinsic = $300
    //   Put intrinsic = $0
    //   P&L = $300 - $200 - gas = +$90 profit

    await mqApi.endExecution(executionId);
    console.log('✅ Long straddle completed');

  } catch (error) {
    console.error('❌ Straddle failed:', error);
    await mqApi.failExecution(executionId, error.message);
  }
}
```

## Example 4: Yield Farming with Delta Hedging

```typescript
// Strategy: LP in ETH-USDC pool, hedge IL with ETH perp short
async function yieldFarmingHedged() {
  const executionId = await mqApi.beginExecution('yield_farming');

  try {
    console.log('Starting hedged yield farming...');

    // Step 1: Add liquidity to ETH-USDC pool (50/50)
    const lpTx = await mqApi.addLiquidity({
      executionId,
      chainId: 1,  // Ethereum
      protocol: 'uniswap-v3',
      token0: 'ETH',
      token1: 'USDC',
      amount0: '0.5',    // 0.5 ETH
      amount1: '1500',   // $1500 USDC
      fee: 3000,         // 0.3% fee tier
      tickLower: -887200,  // Wide range
      tickUpper: 887200
    });
    console.log(`LP added: ${lpTx.hash}`);

    // Record LP position
    await mqApi.recordLPPosition(executionId, {
      protocol: 'uniswap-v3',
      poolAddress: lpTx.poolAddress,
      nftId: lpTx.nftId,
      token0: 'ETH',
      token1: 'USDC',
      liquidityProvided: 3000,  // $3000 total
      apy: 15  // Estimated 15% APY from fees
    });

    // Step 2: Hedge IL by shorting 0.5 ETH perp
    const hedgeTx = await mqApi.openPerpPosition({
      executionId,
      exchange: 'gmx',
      chainId: 42161,
      token: 'ETH',
      side: 'short',
      size: '0.5',  // Hedge 50% of ETH exposure
      entryPrice: await mqApi.getPrice('ETH'),
      leverage: 1
    });
    console.log(`Hedge opened: ${hedgeTx.positionId}`);

    // Record hedging cost (if any funding paid)
    await mqApi.recordHedgingCost(executionId, 0);

    // Step 3: Farm for 30 days, collect fees
    const farmDuration = 30 * 24 * 3600 * 1000;
    console.log('Farming for 30 days...');

    let totalFeesEarned = 0;
    const checkFeesInterval = setInterval(async () => {
      const fees = await mqApi.getUniswapV3Fees(lpTx.nftId);
      totalFeesEarned = fees.token0Fees + fees.token1Fees;
      console.log(`Fees earned: $${totalFeesEarned.toFixed(2)}`);

      // Record farming rewards
      await mqApi.recordFarmingRewards(executionId, totalFeesEarned);
    }, 24 * 3600 * 1000);  // Check daily

    await new Promise(resolve => setTimeout(resolve, farmDuration));
    clearInterval(checkFeesInterval);

    // Step 4: Exit positions
    // Close hedge
    await mqApi.closePerpPosition({
      executionId,
      positionId: hedgeTx.positionId,
      exitPrice: await mqApi.getPrice('ETH')
    });

    // Remove liquidity
    const removeLiquidityTx = await mqApi.removeLiquidity({
      executionId,
      chainId: 1,
      protocol: 'uniswap-v3',
      nftId: lpTx.nftId
    });
    console.log(`LP removed: ${removeLiquidityTx.hash}`);

    // Step 5: Calculate IL
    const finalValue = removeLiquidityTx.token0Amount * (await mqApi.getPrice('ETH'))
                      + removeLiquidityTx.token1Amount;
    const impermanentLoss = 3000 - finalValue;

    // Record IL
    await mqApi.recordImpermanentLoss(executionId, impermanentLoss);

    // P&L = Fees Earned - IL (hedged) - Gas
    // Example: 15% APY for 30 days = 1.25% = $37.50
    //   IL = -$84 (if ETH rose 20% unhedged)
    //   Hedged IL ~= $0 (perp short offsets)
    //   Net = $37.50 - gas fees

    await mqApi.endExecution(executionId);
    console.log('✅ Hedged yield farming completed');

  } catch (error) {
    console.error('❌ Yield farming failed:', error);
    await mqApi.failExecution(executionId, error.message);
  }
}
```

## Example 5: Market Making Strategy

```typescript
// Strategy: Place buy/sell orders around mid-price, capture spread
async function marketMakingStrategy() {
  const executionId = await mqApi.beginExecution('market_making');

  try {
    console.log('Starting market making...');

    // Get current ETH price
    const midPrice = await mqApi.getPrice('ETH');
    const spread = midPrice * 0.002;  // 0.2% spread

    const buyPrice = midPrice - spread / 2;
    const sellPrice = midPrice + spread / 2;

    console.log(`Mid: $${midPrice}, Spread: $${spread}`);
    console.log(`Buy: $${buyPrice}, Sell: $${sellPrice}`);

    // Place limit orders (this is simplified - real MM is more complex)
    let roundTrips = 0;
    const targetRoundTrips = 10;

    while (roundTrips < targetRoundTrips) {
      // Buy low
      const buyTx = await mqApi.swap({
        executionId,
        chainId: 1,
        tokenIn: 'USDC',
        tokenOut: 'ETH',
        amountIn: String(buyPrice),
        slippage: 0.1
      });
      console.log(`Bought at $${buyPrice}`);

      // Sell high
      const sellTx = await mqApi.swap({
        executionId,
        chainId: 1,
        tokenIn: 'ETH',
        tokenOut: 'USDC',
        amountIn: '1.0',
        slippage: 0.1
      });
      console.log(`Sold at $${sellPrice}`);

      roundTrips++;
      console.log(`Round trip ${roundTrips}/${targetRoundTrips}`);

      // Wait for next opportunity
      await new Promise(resolve => setTimeout(resolve, 60000));  // 1 min
    }

    // P&L = Sum of spreads captured - gas costs
    // Example: 10 round trips × $6 spread = $60 - gas

    await mqApi.endExecution(executionId);
    console.log('✅ Market making completed');

  } catch (error) {
    console.error('❌ Market making failed:', error);
    await mqApi.failExecution(executionId, error.message);
  }
}
```

## Supporting Methods for mqApi

These methods would need to be added to the TradingAPI service:

```typescript
class mqApi {
  // Execution lifecycle
  async beginExecution(type: ExecutionType): Promise<string>;
  async endExecution(executionId: string): Promise<void>;
  async failExecution(executionId: string, reason: string): Promise<void>;
  async cancelExecution(executionId: string): Promise<void>;

  // Inventory management (critical for cross-chain arbitrage)
  async captureInventory(executionId: string): Promise<InventorySnapshot>;
  async getChainBalances(chainId: number): Promise<TokenBalance[]>;

  interface InventorySnapshot {
    timestamp: number;
    inventory: Array<{
      chain_id: number;
      token_address: string;
      token_symbol: string;
      amount: number;
      usd_value: number;
    }>;
    totalValue: number;
  }

  // Trading
  async swap(params): Promise<Transaction>;

  // Optional: Bridging (for manual inventory rebalancing)
  async bridge(params): Promise<BridgeTransaction>;
  async waitForBridge(txHash: string, toChainId: number): Promise<void>;

  // Perpetual futures
  async openPerpPosition(params): Promise<PerpPosition>;
  async closePerpPosition(params): Promise<Transaction>;
  async getPerpFunding(positionId: string): Promise<FundingInfo>;

  // Options
  async buyOption(params): Promise<OptionsTransaction>;
  async exerciseOption(params): Promise<Transaction>;

  // Liquidity provision
  async addLiquidity(params): Promise<LPTransaction>;
  async removeLiquidity(params): Promise<RemoveLiquidityTx>;
  async getUniswapV3Fees(nftId: number): Promise<FeesInfo>;

  // P&L component tracking (automatically updated by execution methods)
  async recordBridgeFee(executionId: string, fee: number): Promise<void>;
  async recordFundingReceived(executionId: string, amount: number): Promise<void>;
  async recordFundingPaid(executionId: string, amount: number): Promise<void>;
  async recordPremiumPaid(executionId: string, amount: number): Promise<void>;
  async recordPremiumCollected(executionId: string, amount: number): Promise<void>;
  async recordFarmingRewards(executionId: string, amount: number): Promise<void>;
  async recordImpermanentLoss(executionId: string, amount: number): Promise<void>;
  async recordHedgingCost(executionId: string, amount: number): Promise<void>;
  async recordPerpPosition(executionId: string, position: PerpPosition): Promise<void>;
  async recordLPPosition(executionId: string, position: LPPosition): Promise<void>;

  // Price & data utilities
  async getPrice(token: string, chainId?: number): Promise<number>;
  async getPriceAtTime(token: string, timestamp: number): Promise<number>;
}
```

## Key Implementation Notes

### 1. Inventory-Based P&L Calculation

The most important concept for multi-chain strategies is **inventory tracking**:

```typescript
// At execution start
const starting = await mqApi.captureInventory(executionId);
// { totalValue: 10000, inventory: [...] }

// Execute trades across multiple chains
// ... trades ...

// At execution end
const ending = await mqApi.captureInventory(executionId);
// { totalValue: 10050, inventory: [...] }

// P&L = Change in total portfolio value
const pnl = ending.totalValue - starting.totalValue - gasCosts;
// pnl = $50 - gas
```

This approach:
- ✅ Works across any number of chains
- ✅ No bridging required
- ✅ Accounts for all asset movements
- ✅ Simple to calculate
- ✅ Matches how professional traders operate

### 2. Inventory Rebalancing Strategy

After executing arbitrage trades, your inventory will become imbalanced across chains. Three strategies:

**A) Wait for Reverse Arbitrage**
- Most efficient
- If ETH is expensive on Arbitrum now, wait for it to be expensive on Ethereum
- Execute opposite trade to naturally rebalance

**B) Batch Rebalancing**
- Accumulate imbalances over multiple arb trades
- Bridge once when imbalance is large enough to justify bridge costs
- Best when bridge fees are fixed

**C) Continuous Rebalancing**
- Bridge after each trade
- Only viable on low-cost bridges (Across, Hop)
- Or when spreads are very large (>$50)

### 3. Minimum Profitable Spread

Calculate the minimum spread needed to profit:

```typescript
function calculateMinSpread(params: {
  gasEthereum: number;      // ~$5 on mainnet
  gasArbitrum: number;      // ~$0.50 on L2
  slippagePercent: number;  // 0.5% = 0.005
  tradeSize: number;        // $1825
}) {
  const gasCosts = params.gasEthereum + params.gasArbitrum;
  const slippageCost = params.tradeSize * params.slippagePercent * 2;  // Both trades

  const minSpread = gasCosts + slippageCost;
  return minSpread;
}

// Example: $5.50 gas + ($1825 * 0.005 * 2) = $5.50 + $18.25 = $23.75
// Need at least $24 spread to break even
```

This is why cross-chain arbitrage works best:
- On low-gas chains (L2s, Polygon, BSC)
- With large trade sizes (spread is absolute, costs are % or fixed)
- During high volatility (larger spreads appear)

## Integration with Worker

These strategies would be written by users in the Strategy Editor and executed in Web Workers. The worker would have access to `mqApi` global object with all these methods.

```typescript
// In strategy-worker.js
const mqApi = new TradingAPI(strategyConfig);

// Make available globally in worker
self.mqApi = mqApi;

// User's strategy code has access to mqApi
// Example: await mqApi.beginExecution('cross_chain');
```
