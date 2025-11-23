// MEGA QUANT Strategy Worker
// This worker executes trading strategies in isolation from the main thread

// Store interval/timeout IDs for cleanup
const timers = new Set();

// Override setInterval to track timers
const originalSetInterval = self.setInterval;
self.setInterval = function(...args) {
  const id = originalSetInterval.apply(self, args);
  timers.add(id);
  return id;
};

// Override setTimeout to track timers
const originalSetTimeout = self.setTimeout;
self.setTimeout = function(...args) {
  const id = originalSetTimeout.apply(self, args);
  timers.add(id);
  return id;
};

// Override clearInterval to untrack timers
const originalClearInterval = self.clearInterval;
self.clearInterval = function(id) {
  timers.delete(id);
  return originalClearInterval.call(self, id);
};

// Override clearTimeout to untrack timers
const originalClearTimeout = self.clearTimeout;
self.clearTimeout = function(id) {
  timers.delete(id);
  return originalClearTimeout.call(self, id);
};

// DeltaTrade API Proxy - communicates with backend
// The backend keeps DeltaTrade instances in memory for fast signing
class DeltaTradeProxy {
  constructor(apiBaseUrl = 'http://localhost:3001') {
    this.apiBaseUrl = apiBaseUrl;
    this.executionId = null;
    this.chains = {};
  }

  async init(executionType, strategyId, chainConfigs) {
    console.info('🔧 Initializing DeltaTrade...');
    console.info(`   Strategy: ${strategyId}`);
    console.info(`   Chains: ${chainConfigs.map(c => c.chainName).join(', ')}`);

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/trading/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          executionType,
          strategyId,
          chainConfigs  // Array of { chainName, accountId }
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to initialize DeltaTrade');
      }

      this.executionId = data.executionId;

      // Set up chain proxies for configured chains
      chainConfigs.forEach(config => {
        this.chains[config.chainName] = new ChainProxy(config.chainName, this.executionId, this.apiBaseUrl);
      });

      // Also expose as direct properties for convenience
      // Mainnets
      this.ethereum = this.chains.ethereum;
      this.arbitrum = this.chains.arbitrum;
      this.polygon = this.chains.polygon;
      this.optimism = this.chains.optimism;
      this.base = this.chains.base;
      this.bsc = this.chains.bsc;

      // Testnets
      this.sepolia = this.chains.sepolia;
      this.baseSepolia = this.chains['base-sepolia'];
      this.arbitrumSepolia = this.chains['arbitrum-sepolia'];
      this.optimismSepolia = this.chains['optimism-sepolia'];

      console.log(`✅ DeltaTrade initialized (Execution: ${this.executionId})`);
      console.log(`   Backend has private keys loaded in memory for fast signing`);
      return this;
    } catch (error) {
      console.error(`❌ DeltaTrade init failed: ${error.message}`);
      throw error;
    }
  }

  async close() {
    console.info('🔒 Closing DeltaTrade execution...');
    console.info('   Calculating P&L and cleaning up backend resources...');
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/trading/${this.executionId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to close execution');
      }

      console.log(`✅ Execution closed. Net P&L: $${data.result.netPnl.toFixed(2)}`);
      console.log(`   Private keys removed from backend memory`);
      return data.result;
    } catch (error) {
      console.error(`❌ Close failed: ${error.message}`);
      throw error;
    }
  }
}

class ChainProxy {
  constructor(chainName, executionId, apiBaseUrl) {
    this.chainName = chainName;
    this.executionId = executionId;
    this.apiBaseUrl = apiBaseUrl;
    this.uniswapV3 = new UniswapV3Proxy(chainName, executionId, apiBaseUrl);
    this.uniswapV4 = new UniswapV4Proxy(chainName, executionId, apiBaseUrl);
    this.oneInch = new OneInchProxy(chainName, executionId, apiBaseUrl);
  }

  async getNativeBalance() {
    const response = await fetch(
      `${this.apiBaseUrl}/api/trading/${this.executionId}/balance/${this.chainName}/native`
    );
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.balance;
  }

  async getTokenBalance(tokenAddress) {
    const response = await fetch(
      `${this.apiBaseUrl}/api/trading/${this.executionId}/balance/${this.chainName}/${tokenAddress}`
    );
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.balance;
  }

  async getGasPrice() {
    const response = await fetch(
      `${this.apiBaseUrl}/api/trading/${this.executionId}/gas-price/${this.chainName}`
    );
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.gasPrice;
  }
}

class UniswapV3Proxy {
  constructor(chainName, executionId, apiBaseUrl) {
    this.chainName = chainName;
    this.executionId = executionId;
    this.apiBaseUrl = apiBaseUrl;
  }

  async swap(params) {
    console.log(`📊 Uniswap V3 Swap on ${this.chainName}: ${params.amountIn} ${params.tokenIn} → ${params.tokenOut}`);
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/trading/${this.executionId}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chain: this.chainName,
          protocol: 'uniswapV3',
          ...params
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Swap failed');
      }

      console.log(`✅ Swap successful! TX: ${data.result.txHash}`);
      console.log(`   Got ${data.result.tokenOutAmount} ${params.tokenOut}`);
      return data.result;
    } catch (error) {
      console.error(`❌ Swap failed: ${error.message}`);
      throw error;
    }
  }
}

class UniswapV4Proxy {
  constructor(chainName, executionId, apiBaseUrl) {
    this.chainName = chainName;
    this.executionId = executionId;
    this.apiBaseUrl = apiBaseUrl;
  }

  async getQuote(params) {
    console.log(`🔍 Uniswap V4 Quote on ${this.chainName}: ${params.amountIn} ${params.tokenIn} → ${params.tokenOut}`);
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/trading/${this.executionId}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chain: this.chainName,
          protocol: 'uniswapV4',
          ...params
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Quote failed');
      }

      console.log(`   Quote: ${data.result.amountOut} ${params.tokenOut} (rate: ${data.result.exchangeRate.toFixed(2)})`);
      return data.result;
    } catch (error) {
      console.error(`❌ Quote failed: ${error.message}`);
      throw error;
    }
  }

  async swap(params) {
    console.log(`🦄 Uniswap V4 Swap on ${this.chainName}: ${params.amountIn} ${params.tokenIn} → ${params.tokenOut}`);
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/trading/${this.executionId}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chain: this.chainName,
          protocol: 'uniswapV4',
          ...params
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Swap failed');
      }

      console.log(`✅ V4 Swap successful! TX: ${data.result.txHash}`);
      console.log(`   Got ${data.result.tokenOutAmount} ${params.tokenOut}`);
      return data.result;
    } catch (error) {
      console.error(`❌ V4 Swap failed: ${error.message}`);
      throw error;
    }
  }

  async swapWithHooks(params, hooksAddress, hookData) {
    console.log(`🎣 Uniswap V4 Swap with Hooks on ${this.chainName}`);
    console.log(`   Hooks: ${hooksAddress}`);
    return this.swap({
      ...params,
      poolKey: {
        hooks: hooksAddress
      },
      hookData: hookData || '0x'
    });
  }
}

class OneInchProxy {
  constructor(chainName, executionId, apiBaseUrl) {
    this.chainName = chainName;
    this.executionId = executionId;
    this.apiBaseUrl = apiBaseUrl;
  }

  async getQuote(params) {
    console.log(`🔍 1inch Quote on ${this.chainName}: ${params.amountIn} ${params.tokenIn} → ${params.tokenOut}`);
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/trading/${this.executionId}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chain: this.chainName,
          protocol: 'oneInch',
          ...params
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Quote failed');
      }

      console.log(`   Quote: ${data.result.amountOut} ${params.tokenOut} (rate: ${data.result.exchangeRate.toFixed(2)})`);
      return data.result;
    } catch (error) {
      console.error(`❌ Quote failed: ${error.message}`);
      throw error;
    }
  }

  async swap(params) {
    console.log(`🔄 1inch Swap on ${this.chainName}: ${params.amountIn} ${params.tokenIn} → ${params.tokenOut}`);
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/trading/${this.executionId}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chain: this.chainName,
          protocol: 'oneInch',
          ...params
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Swap failed');
      }

      console.log(`✅ 1inch Swap successful! TX: ${data.result.transactionHash}`);
      console.log(`   Got ${data.result.amountOut} ${params.tokenOut}`);
      console.log(`   Explorer: ${data.result.explorerUrl}`);
      return data.result;
    } catch (error) {
      console.error(`❌ Swap failed: ${error.message}`);
      throw error;
    }
  }
}

// Factory function for DeltaTrade
// chainConfigs: Array of { chainName: string, accountId: string }
// Example: [{ chainName: 'ethereum', accountId: 'uuid-123' }, { chainName: 'arbitrum', accountId: 'uuid-456' }]
async function createDeltaTrade(executionType, strategyId, chainConfigs) {
  const dt = new DeltaTradeProxy();
  await dt.init(executionType, strategyId, chainConfigs);
  return dt;
}

// Make available globally in worker
self.DeltaTrade = DeltaTradeProxy;
self.createDeltaTrade = createDeltaTrade;

// Custom console that sends logs back to main thread
const console = {
  log: (...args) => {
    self.postMessage({
      type: 'log',
      level: 'log',
      message: args.map(a => String(a)).join(' '),
      timestamp: Date.now()
    });
  },
  error: (...args) => {
    self.postMessage({
      type: 'log',
      level: 'error',
      message: args.map(a => String(a)).join(' '),
      timestamp: Date.now()
    });
  },
  warn: (...args) => {
    self.postMessage({
      type: 'log',
      level: 'warn',
      message: args.map(a => String(a)).join(' '),
      timestamp: Date.now()
    });
  },
  info: (...args) => {
    self.postMessage({
      type: 'log',
      level: 'info',
      message: args.map(a => String(a)).join(' '),
      timestamp: Date.now()
    });
  }
};

// Global DeltaTrade instance - will be auto-initialized
let dt = null;

// Handle messages from main thread
self.onmessage = async function(e) {
  const { type, code, strategyId, chains } = e.data;

  if (type === 'execute') {
    try {
      // Send initial log
      console.info('🔍 Validating code...');

      // Validate syntax
      new Function(code);
      console.log('✅ Code validation successful!');

      // Auto-initialize DeltaTrade with strategy context
      if (strategyId) {
        console.info('🔧 Auto-initializing DeltaTrade...');
        console.info(`   Strategy: ${strategyId}`);

        let chainConfigs = [];

        // Try to get chain configs from strategy.chains first
        if (chains && Object.keys(chains).length > 0) {
          chainConfigs = Object.entries(chains).map(([chainId, config]) => {
            // Map chainId to chainName
            const chainIdNum = parseInt(chainId);
            let chainName;
            if (chainIdNum === 1) chainName = 'ethereum';
            else if (chainIdNum === 8453) chainName = 'base';
            else if (chainIdNum === 11155111) chainName = 'sepolia';
            else if (chainIdNum === 84532) chainName = 'base-sepolia';
            else chainName = `chain-${chainId}`;

            return {
              chainName,
              accountId: config.accountId || config.address
            };
          });
        }

        // If no chains configured in strategy object, fetch from database
        if (chainConfigs.length === 0) {
          console.info('   Fetching strategy account mappings from database...');
          try {
            const apiBaseUrl = 'http://localhost:3001';
            const response = await fetch(`${apiBaseUrl}/api/strategy-accounts/${strategyId}`);
            const data = await response.json();

            if (data.success && data.mappings && data.mappings.length > 0) {
              chainConfigs = data.mappings.map(mapping => ({
                chainName: mapping.networkName,
                accountId: mapping.accountId
              }));
              console.info(`   Found ${chainConfigs.length} account mappings`);
            } else {
              console.warn('   No account mappings found in database');
            }
          } catch (error) {
            console.error(`   Failed to fetch account mappings: ${error.message}`);
          }
        }

        if (chainConfigs.length > 0) {
          console.info(`   Chains: ${chainConfigs.map(c => c.chainName).join(', ')}`);

          // Create and initialize DeltaTrade
          dt = await createDeltaTrade('auto-execution', strategyId, chainConfigs);

          // Make it available globally
          self.dt = dt;

          // Show available chain accessors
          const availableChains = [];
          if (dt.ethereum) availableChains.push('dt.ethereum');
          if (dt.base) availableChains.push('dt.base');
          if (dt.arbitrum) availableChains.push('dt.arbitrum');
          if (dt.polygon) availableChains.push('dt.polygon');
          if (dt.optimism) availableChains.push('dt.optimism');
          if (dt.sepolia) availableChains.push('dt.sepolia');
          if (dt.baseSepolia) availableChains.push('dt.baseSepolia');
          if (dt.arbitrumSepolia) availableChains.push('dt.arbitrumSepolia');

          console.log('✅ DeltaTrade ready!');
          console.log(`   Available: ${availableChains.join(', ')}`);
          console.log('');
        } else {
          console.warn('⚠️  No chains configured for this strategy');
          console.warn('   Please configure accounts in the Account Manager');
          console.log('');
        }
      }

      console.info('▶️ Running strategy...');
      console.info('─'.repeat(50));

      // Execute the code with dt available
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const executor = new AsyncFunction('console', 'dt', code);
      await executor(console, dt);

      console.info('─'.repeat(50));
      console.log('✅ Strategy execution completed successfully!');

      self.postMessage({ type: 'completed' });
    } catch (error) {
      console.info('─'.repeat(50));
      console.error(`❌ Runtime error: ${error.message}`);
      console.warn('Check your strategy code and try again.');
      self.postMessage({ type: 'error', error: error.message });
    }
  } else if (type === 'stop') {
    // Close DeltaTrade if it was initialized
    if (dt) {
      try {
        console.info('Closing DeltaTrade execution...');
        await dt.close();
      } catch (error) {
        console.error('Error closing DeltaTrade:', error.message);
      }
    }

    // Clear all timers
    console.warn('⏹️ Stopping strategy...');
    timers.forEach(id => {
      originalClearInterval(id);
      originalClearTimeout(id);
    });
    timers.clear();
    console.info('Strategy stopped.');
    self.postMessage({ type: 'stopped' });
  }
};
