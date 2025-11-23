import React, { useState, useEffect } from 'react';
import './Documentation.css';

export interface DocumentationProps {
  className?: string;
}

export const Documentation: React.FC<DocumentationProps> = ({ className }) => {
  const [activeSection, setActiveSection] = useState('getting-started');

  // Scroll to section when clicking nav links
  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Update active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        'getting-started',
        'manage-nodes',
        'account-generation',
        'api-config',
        'deltatrade-overview',
        'deltatrade-initialization',
        'strategy-editor-usage',
        'chain-proxies',
        'protocol-proxies',
        'trading-flow',
        'examples'
      ];

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top >= 0 && rect.top < window.innerHeight / 2) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    const content = document.querySelector('.docs-content');
    content?.addEventListener('scroll', handleScroll);
    return () => content?.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`documentation ${className || ''}`}>
      {/* Left Sidebar Navigation */}
      <nav className="docs-sidebar">
        <div className="docs-sidebar-header">
          <h2>Documentation</h2>
        </div>

        <div className="docs-nav-section">
          <h3>Getting Started</h3>
          <ul>
            <li>
              <a
                className={activeSection === 'getting-started' ? 'active' : ''}
                onClick={() => scrollToSection('getting-started')}
              >
                Quick Start
              </a>
            </li>
            <li>
              <a
                className={activeSection === 'manage-nodes' ? 'active' : ''}
                onClick={() => scrollToSection('manage-nodes')}
              >
                Manage Nodes
              </a>
            </li>
            <li>
              <a
                className={activeSection === 'account-generation' ? 'active' : ''}
                onClick={() => scrollToSection('account-generation')}
              >
                Account Generation
              </a>
            </li>
            <li>
              <a
                className={activeSection === 'api-config' ? 'active' : ''}
                onClick={() => scrollToSection('api-config')}
              >
                API Configuration
              </a>
            </li>
          </ul>
        </div>

        <div className="docs-nav-section">
          <h3>DeltaTrade API</h3>
          <ul>
            <li>
              <a
                className={activeSection === 'deltatrade-overview' ? 'active' : ''}
                onClick={() => scrollToSection('deltatrade-overview')}
              >
                Overview
              </a>
            </li>
            <li>
              <a
                className={activeSection === 'deltatrade-initialization' ? 'active' : ''}
                onClick={() => scrollToSection('deltatrade-initialization')}
              >
                Initialization
              </a>
            </li>
            <li>
              <a
                className={activeSection === 'strategy-editor-usage' ? 'active' : ''}
                onClick={() => scrollToSection('strategy-editor-usage')}
              >
                Strategy Editor Usage
              </a>
            </li>
            <li>
              <a
                className={activeSection === 'chain-proxies' ? 'active' : ''}
                onClick={() => scrollToSection('chain-proxies')}
              >
                Chain Proxies
              </a>
            </li>
            <li>
              <a
                className={activeSection === 'protocol-proxies' ? 'active' : ''}
                onClick={() => scrollToSection('protocol-proxies')}
              >
                Protocol Proxies
              </a>
            </li>
            <li>
              <a
                className={activeSection === 'trading-flow' ? 'active' : ''}
                onClick={() => scrollToSection('trading-flow')}
              >
                Trading Flow
              </a>
            </li>
            <li>
              <a
                className={activeSection === 'examples' ? 'active' : ''}
                onClick={() => scrollToSection('examples')}
              >
                Code Examples
              </a>
            </li>
          </ul>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="docs-content">
        <div className="docs-content-inner">
          {/* Getting Started Section */}
          <section id="getting-started" className="docs-section">
            <h1>Getting Started</h1>
            <p className="docs-lead">
              MEGA QUANT is a multi-chain delta-neutral trading platform. Follow these steps to get started:
            </p>

            <div className="docs-steps">
              <div className="docs-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h3>Manage Nodes</h3>
                  <p>Configure RPC endpoints for blockchain networks you want to trade on.</p>
                </div>
              </div>

              <div className="docs-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h3>Account Generation</h3>
                  <p>Generate an HD wallet or import existing accounts with private keys.</p>
                </div>
              </div>

              <div className="docs-step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h3>API Configuration</h3>
                  <p>Set up API keys for price feeds and external data sources.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Manage Nodes Section */}
          <section id="manage-nodes" className="docs-section">
            <h2>Manage Nodes</h2>
            <p>
              Click <strong>MANAGE NODES</strong> in the navbar to configure your blockchain RPC endpoints.
              You can add custom RPC URLs for any supported chain.
            </p>

            <div className="docs-info-box">
              <h4>Supported Chains</h4>
              <ul>
                <li><strong>Ethereum:</strong> Mainnet and Sepolia testnet</li>
                <li><strong>Arbitrum:</strong> Layer 2 scaling solution</li>
                <li><strong>Polygon:</strong> Low-cost EVM-compatible chain</li>
                <li><strong>Optimism:</strong> Optimistic rollup L2</li>
                <li><strong>Base:</strong> Coinbase's L2 network</li>
                <li><strong>BSC:</strong> Binance Smart Chain</li>
              </ul>
            </div>

            <div className="docs-code-block">
              <div className="code-header">Example RPC Configuration</div>
              <pre><code>{`{
  "ethereum": "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
  "arbitrum": "https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY",
  "polygon": "https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY"
}`}</code></pre>
            </div>
          </section>

          {/* Account Generation Section */}
          <section id="account-generation" className="docs-section">
            <h2>Account Generation</h2>
            <p>
              MEGA QUANT supports two types of account management:
            </p>

            <div className="docs-feature-grid">
              <div className="docs-feature-card">
                <h3>HD Wallet Generation</h3>
                <p>
                  Generate a hierarchical deterministic (HD) wallet using a BIP39 12-word seed phrase.
                  This is MetaMask-compatible - you can import the same seed phrase to MetaMask and
                  access the same accounts.
                </p>
                <ul>
                  <li>One-time seed phrase display (save it securely!)</li>
                  <li>Derive unlimited accounts from the same seed</li>
                  <li>Standard BIP44 derivation path: <code>m/44'/60'/0'/0/{'{index}'}</code></li>
                </ul>
              </div>

              <div className="docs-feature-card">
                <h3>Import Private Key</h3>
                <p>
                  Import existing accounts by providing their private keys. Useful for integrating
                  wallets you already manage elsewhere.
                </p>
                <ul>
                  <li>Import any Ethereum-compatible private key</li>
                  <li>Encrypted at rest with your master password</li>
                  <li>Works alongside HD wallet accounts</li>
                </ul>
              </div>
            </div>

            <div className="docs-warning-box">
              <strong>Security:</strong> All private keys and seed phrases are encrypted using AES-256-GCM
              with your master password before being stored. Never share your seed phrase or private keys!
            </div>
          </section>

          {/* API Configuration Section */}
          <section id="api-config" className="docs-section">
            <h2>API Configuration</h2>
            <p>
              Click <strong>API CONFIG</strong> in the navbar to set up external API integrations:
            </p>

            <ul>
              <li><strong>Alchemy API:</strong> For enhanced RPC access and token balance queries</li>
              <li><strong>Etherscan API:</strong> For transaction verification and contract interaction</li>
              <li><strong>CoinGecko API:</strong> For real-time token price data</li>
            </ul>

            <p>
              These APIs enable advanced features like portfolio tracking, price feeds, and analytics.
            </p>
          </section>

          {/* DeltaTrade Overview */}
          <section id="deltatrade-overview" className="docs-section">
            <h1>DeltaTrade API Reference</h1>
            <p className="docs-lead">
              The <code>DeltaTrade</code> class is the core of MEGA QUANT's multi-chain trading infrastructure.
              It provides a unified interface for executing trades across multiple chains and protocols.
            </p>

            <div className="docs-info-box">
              <h4>Key Concepts</h4>
              <ul>
                <li><strong>Execution:</strong> A single trading session with tracked P&L</li>
                <li><strong>Chain Proxy:</strong> Interface to interact with a specific blockchain</li>
                <li><strong>Protocol Proxy:</strong> Interface to interact with a specific DEX (e.g., Uniswap V3)</li>
                <li><strong>Inventory Tracking:</strong> Automatic capture of token balances before and after trades</li>
              </ul>
            </div>

            <div className="docs-code-block">
              <div className="code-header">Import (Local Development)</div>
              <pre><code>{`import { createDeltaTrade, DeltaTrade } from '@backend/lib/trading';`}</code></pre>
            </div>

            <div className="docs-info-box">
              <h4>Local Development</h4>
              <p>
                The <code>@backend</code> path alias is configured in <code>tsconfig.json</code> and <code>vite.config.ts</code>
                to point to <code>./backend/src/</code>. This allows you to work with the trading library locally without
                publishing to npm.
              </p>
            </div>
          </section>

          {/* Initialization Section */}
          <section id="deltatrade-initialization" className="docs-section">
            <h2>Initialization</h2>
            <p>
              Use the <code>createDeltaTrade</code> factory function to create and initialize a new trading execution:
            </p>

            <div className="docs-code-block">
              <div className="code-header">Function Signature</div>
              <pre><code>{`async function createDeltaTrade(
  executionType: string,
  strategyId: string,
  privateKey: string,
  chains?: string[]
): Promise<DeltaTrade>`}</code></pre>
            </div>

            <div className="docs-params">
              <h4>Parameters</h4>
              <ul>
                <li><code>executionType</code> - Type of execution (e.g., "live", "backtest", "paper")</li>
                <li><code>strategyId</code> - Unique identifier for your trading strategy</li>
                <li><code>privateKey</code> - Private key of the trading account</li>
                <li><code>chains</code> - Optional array of chain names to initialize (default: all major chains)</li>
              </ul>
            </div>

            <div className="docs-code-block">
              <div className="code-header">Example</div>
              <pre><code>{`// Initialize with specific chains
const dt = await createDeltaTrade(
  'live',
  'arbitrage-strategy-001',
  '0x...',
  ['ethereum', 'arbitrum', 'polygon']
);

// Initialize with default chains (ethereum, arbitrum, polygon, optimism, base)
const dt = await createDeltaTrade(
  'live',
  'arbitrage-strategy-001',
  '0x...'
);`}</code></pre>
            </div>

            <div className="docs-info-box">
              <h4>What Happens During Initialization</h4>
              <ol>
                <li>Creates a new execution record in the database</li>
                <li>Initializes chain proxies for requested chains</li>
                <li>Captures starting inventory (token balances) across all chains</li>
                <li>Returns a ready-to-use <code>DeltaTrade</code> instance</li>
              </ol>
            </div>
          </section>

          {/* Strategy Editor Usage Section */}
          <section id="strategy-editor-usage" className="docs-section">
            <h2>Strategy Editor Usage</h2>
            <p className="docs-lead">
              When writing strategies in the <strong>Strategy Editor</strong>, DeltaTrade is automatically available
              as a global object. <strong>No imports needed!</strong>
            </p>

            <div className="docs-info-box">
              <h4>Fast In-Memory Execution</h4>
              <p>
                Your strategy code runs in a Web Worker that communicates with the backend server. When you deploy
                a strategy, the backend:
              </p>
              <ol>
                <li>Decrypts the private keys for your selected accounts <strong>once</strong></li>
                <li>Keeps them in memory for the duration of the strategy execution</li>
                <li>Creates a DeltaTrade instance that stays in backend memory</li>
                <li>All trades use the in-memory instance for <strong>fast transaction signing</strong></li>
                <li>When you close/stop, private keys are cleared from memory</li>
              </ol>
              <p>
                This architecture provides both <strong>security</strong> (keys never leave backend) and
                <strong>speed</strong> (no database lookups during trading).
              </p>
            </div>

            <div className="docs-warning-box">
              <strong>Per-Chain Accounts:</strong> You can use different accounts for different chains!
              When deploying, you select which account to use for Ethereum, which for Arbitrum, etc.
              Each chain gets its own private key loaded in memory.
            </div>

            <div className="docs-code-block">
              <div className="code-header">Strategy Editor Function Signature</div>
              <pre><code>{`async function createDeltaTrade(
  executionType: string,
  strategyId: string,
  chainConfigs: Array<{
    chainName: string,    // e.g., 'ethereum', 'arbitrum'
    accountId: string     // Account ID from account manager
  }>
): Promise<DeltaTrade>`}</code></pre>
            </div>

            <h3>Example 1: Single Chain Trading</h3>
            <div className="docs-code-block">
              <div className="code-header">Simple Ethereum Strategy</div>
              <pre><code>{`// No imports needed - createDeltaTrade is globally available!

// Initialize DeltaTrade with chain-specific accounts
const dt = await createDeltaTrade(
  'live',                    // Execution type
  'eth-trading-bot',         // Strategy ID
  [
    {
      chainName: 'ethereum',
      accountId: 'my-eth-account-uuid'  // From account manager
    }
  ]
);

console.log('DeltaTrade initialized!');

try {
  // Check balances
  const ethBalance = await dt.ethereum.getNativeBalance();
  console.log(\`ETH Balance: \${ethBalance}\`);

  // Execute a swap on Ethereum
  const swapResult = await dt.ethereum.uniswapV3.swap({
    tokenIn: 'USDC',
    tokenOut: 'ETH',
    amountIn: '1000',
    slippage: 0.5
  });

  console.log(\`Swap TX: \${swapResult.txHash}\`);
  console.log(\`Got: \${swapResult.tokenOutAmount} ETH\`);

} catch (error) {
  console.error('Strategy error:', error.message);
} finally {
  // Always close to calculate P&L
  const result = await dt.close();
  console.log(\`Net P&L: $\${result.netPnl.toFixed(2)}\`);
}`}</code></pre>
            </div>

            <h3>Example 2: Multi-Chain with Different Accounts</h3>
            <div className="docs-code-block">
              <div className="code-header">Cross-Chain Arbitrage</div>
              <pre><code>{`// Initialize with different accounts for each chain
const dt = await createDeltaTrade(
  'live',
  'cross-chain-arb',
  [
    { chainName: 'ethereum', accountId: 'eth-account-uuid' },
    { chainName: 'arbitrum', accountId: 'arb-account-uuid' },
    { chainName: 'polygon', accountId: 'polygon-account-uuid' }
  ]
);

console.log('Multi-chain strategy started');

// Buy on Ethereum
console.log('Buying on Ethereum...');
const buyResult = await dt.ethereum.uniswapV3.swap({
  tokenIn: 'USDC',
  tokenOut: 'WETH',
  amountIn: '5000'
});

console.log(\`Bought \${buyResult.tokenOutAmount} WETH\`);

// TODO: Bridge WETH to Arbitrum
// (bridging logic would go here)

// Sell on Arbitrum
console.log('Selling on Arbitrum...');
const sellResult = await dt.arbitrum.uniswapV3.swap({
  tokenIn: 'WETH',
  tokenOut: 'USDC',
  amountIn: buyResult.tokenOutAmount
});

console.log(\`Sold for \${sellResult.tokenOutAmount} USDC\`);

// Calculate profit
const result = await dt.close();
console.log(\`
  Total P&L: $\${result.totalPnl.toFixed(2)}
  Gas Costs: $\${result.totalGasCost.toFixed(2)}
  Net Profit: $\${result.netPnl.toFixed(2)}
\`);`}</code></pre>
            </div>

            <h3>Example 3: Periodic Trading Bot</h3>
            <div className="docs-code-block">
              <div className="code-header">Strategy with Timing & Loops</div>
              <pre><code>{`const dt = await createDeltaTrade(
  'live',
  'periodic-trader',
  [
    { chainName: 'ethereum', accountId: 'my-eth-account-uuid' }
  ]
);

console.log('Starting periodic trading bot...');

// Helper function to execute a trade
async function executeTrade() {
  try {
    const gasPrice = await dt.ethereum.getGasPrice();
    console.log(\`Current gas price: \${gasPrice} Gwei\`);

    // Only trade if gas is reasonable
    if (parseFloat(gasPrice) < 50) {
      const result = await dt.ethereum.uniswapV3.swap({
        tokenIn: 'USDC',
        tokenOut: 'ETH',
        amountIn: '100'
      });
      console.log(\`Trade executed: \${result.txHash}\`);
    } else {
      console.log('Gas too high, skipping trade');
    }
  } catch (error) {
    console.error('Trade failed:', error.message);
  }
}

// Execute trade every 5 minutes
const interval = setInterval(async () => {
  await executeTrade();
}, 5 * 60 * 1000);

// Run for 1 hour, then close
setTimeout(async () => {
  clearInterval(interval);
  console.log('Stopping bot and calculating P&L...');
  const result = await dt.close();
  console.log(\`Session P&L: $\${result.netPnl.toFixed(2)}\`);
}, 60 * 60 * 1000);`}</code></pre>
            </div>

            <div className="docs-info-box">
              <h4>Best Practices</h4>
              <ul>
                <li><strong>Always close:</strong> Call <code>dt.close()</code> when done to calculate P&L</li>
                <li><strong>Error handling:</strong> Wrap trades in try/catch blocks</li>
                <li><strong>Gas checks:</strong> Monitor gas prices before executing trades</li>
                <li><strong>Balance checks:</strong> Verify sufficient balance before swaps</li>
                <li><strong>Logging:</strong> Use console.log liberally to track strategy behavior</li>
              </ul>
            </div>
          </section>

          {/* Chain Proxies Section */}
          <section id="chain-proxies" className="docs-section">
            <h2>Chain Proxies</h2>
            <p>
              Each initialized chain is accessible via a chain proxy property on the <code>DeltaTrade</code> instance:
            </p>

            <div className="docs-code-block">
              <div className="code-header">Available Chain Proxies</div>
              <pre><code>{`dt.ethereum  // Ethereum mainnet
dt.arbitrum  // Arbitrum One
dt.polygon   // Polygon PoS
dt.optimism  // Optimism
dt.base      // Base
dt.bsc       // Binance Smart Chain
dt.sepolia   // Sepolia testnet`}</code></pre>
            </div>

            <h3>ChainProxy Methods</h3>

            <div className="docs-method">
              <h4><code>async getNativeBalance(): Promise&lt;bigint&gt;</code></h4>
              <p>Get the wallet's native token balance (ETH, MATIC, BNB, etc.)</p>
              <div className="docs-code-block">
                <pre><code>{`const ethBalance = await dt.ethereum.getNativeBalance();
console.log(\`ETH balance: \${ethers.formatEther(ethBalance)}\`);`}</code></pre>
              </div>
            </div>

            <div className="docs-method">
              <h4><code>async getTokenBalance(tokenAddress: string): Promise&lt;bigint&gt;</code></h4>
              <p>Get the wallet's ERC20 token balance</p>
              <div className="docs-code-block">
                <pre><code>{`const usdcBalance = await dt.ethereum.getTokenBalance('0xA0b8...'); // USDC
console.log(\`USDC balance: \${ethers.formatUnits(usdcBalance, 6)}\`);`}</code></pre>
              </div>
            </div>

            <div className="docs-method">
              <h4><code>async getGasPrice(): Promise&lt;bigint&gt;</code></h4>
              <p>Get current gas price on the chain</p>
              <div className="docs-code-block">
                <pre><code>{`const gasPrice = await dt.ethereum.getGasPrice();
console.log(\`Gas price: \${ethers.formatUnits(gasPrice, 'gwei')} Gwei\`);`}</code></pre>
              </div>
            </div>
          </section>

          {/* Protocol Proxies Section */}
          <section id="protocol-proxies" className="docs-section">
            <h2>Protocol Proxies</h2>
            <p>
              Each chain proxy provides access to supported DEX protocols:
            </p>

            <h3>Uniswap V3</h3>
            <p>
              Access Uniswap V3 protocol on any supported chain:
            </p>

            <div className="docs-code-block">
              <div className="code-header">Accessing Uniswap V3</div>
              <pre><code>{`// Ethereum Uniswap V3
dt.ethereum.uniswapV3

// Arbitrum Uniswap V3
dt.arbitrum.uniswapV3

// Polygon Uniswap V3
dt.polygon.uniswapV3`}</code></pre>
            </div>

            <div className="docs-method">
              <h4><code>async swap(params: SwapParams): Promise&lt;SwapResult&gt;</code></h4>
              <p>Execute a token swap on Uniswap V3</p>

              <div className="docs-code-block">
                <div className="code-header">SwapParams Interface</div>
                <pre><code>{`interface SwapParams {
  tokenIn: string      // Token symbol (e.g., "USDC") or address
  tokenOut: string     // Token symbol (e.g., "ETH") or address
  amountIn: string     // Amount in human-readable format (e.g., "100")
  slippage?: number    // Percentage, default 0.5%
  deadline?: number    // Seconds from now, default 300 (5 min)
}`}</code></pre>
              </div>

              <div className="docs-code-block">
                <div className="code-header">SwapResult Interface</div>
                <pre><code>{`interface SwapResult {
  success: boolean
  txHash: string
  blockNumber: number
  tokenInAmount: string
  tokenOutAmount: string
  gasUsed: number
  gasPriceGwei: string
  timestamp: number
}`}</code></pre>
              </div>
            </div>
          </section>

          {/* Trading Flow Section */}
          <section id="trading-flow" className="docs-section">
            <h2>Trading Flow</h2>
            <p>
              A typical trading session follows this flow:
            </p>

            <div className="docs-flow">
              <div className="flow-step">
                <div className="flow-icon">1</div>
                <h4>Create Execution</h4>
                <p>Use <code>createDeltaTrade()</code> to initialize</p>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <div className="flow-icon">2</div>
                <h4>Execute Trades</h4>
                <p>Use chain and protocol proxies to execute trades</p>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <div className="flow-icon">3</div>
                <h4>Close Execution</h4>
                <p>Call <code>dt.close()</code> to calculate P&L</p>
              </div>
            </div>

            <div className="docs-method">
              <h4><code>async close(): Promise&lt;ExecutionResult&gt;</code></h4>
              <p>
                Close the execution, capture ending inventory, and calculate profit/loss.
              </p>

              <div className="docs-code-block">
                <div className="code-header">ExecutionResult Interface</div>
                <pre><code>{`interface ExecutionResult {
  executionId: string
  status: string
  startingInventory: TokenBalance[]
  endingInventory: TokenBalance[]
  totalPnl: number           // Total P&L in USD
  totalGasCost: number       // Total gas costs in USD
  netPnl: number            // Net P&L (totalPnl - totalGasCost)
}`}</code></pre>
              </div>

              <div className="docs-code-block">
                <div className="code-header">Example</div>
                <pre><code>{`const result = await dt.close();

console.log(\`Execution \${result.executionId} closed\`);
console.log(\`Total P&L: $\${result.totalPnl.toFixed(2)}\`);
console.log(\`Gas Costs: $\${result.totalGasCost.toFixed(2)}\`);
console.log(\`Net P&L: $\${result.netPnl.toFixed(2)}\`);`}</code></pre>
              </div>
            </div>
          </section>

          {/* Examples Section */}
          <section id="examples" className="docs-section">
            <h2>Code Examples</h2>

            <h3>Example 1: Simple Swap on Ethereum</h3>
            <div className="docs-code-block">
              <pre><code>{`import { createDeltaTrade } from '@backend/lib/trading';

async function simpleSwap() {
  // Initialize DeltaTrade
  const dt = await createDeltaTrade(
    'live',
    'simple-swap-001',
    process.env.PRIVATE_KEY!,
    ['ethereum']
  );

  try {
    // Swap 1000 USDC for ETH on Ethereum
    const result = await dt.ethereum.uniswapV3.swap({
      tokenIn: 'USDC',
      tokenOut: 'ETH',
      amountIn: '1000',
      slippage: 0.5  // 0.5% slippage tolerance
    });

    console.log('Swap successful!');
    console.log(\`TX Hash: \${result.txHash}\`);
    console.log(\`Got \${result.tokenOutAmount} ETH\`);
    console.log(\`Gas used: \${result.gasUsed}\`);

  } finally {
    // Always close the execution to track P&L
    const executionResult = await dt.close();
    console.log(\`Net P&L: $\${executionResult.netPnl.toFixed(2)}\`);
  }
}

simpleSwap();`}</code></pre>
            </div>

            <h3>Example 2: Multi-Chain Arbitrage</h3>
            <div className="docs-code-block">
              <pre><code>{`import { createDeltaTrade } from '@backend/lib/trading';

async function arbitrage() {
  // Initialize with multiple chains
  const dt = await createDeltaTrade(
    'live',
    'arbitrage-001',
    process.env.PRIVATE_KEY!,
    ['ethereum', 'arbitrum']
  );

  try {
    // Buy on Ethereum (where it's cheaper)
    const buyResult = await dt.ethereum.uniswapV3.swap({
      tokenIn: 'USDC',
      tokenOut: 'WETH',
      amountIn: '10000',
      slippage: 0.5
    });
    console.log(\`Bought \${buyResult.tokenOutAmount} WETH on Ethereum\`);

    // TODO: Bridge WETH from Ethereum to Arbitrum
    // (bridging logic would go here)

    // Sell on Arbitrum (where it's more expensive)
    const sellResult = await dt.arbitrum.uniswapV3.swap({
      tokenIn: 'WETH',
      tokenOut: 'USDC',
      amountIn: buyResult.tokenOutAmount,
      slippage: 0.5
    });
    console.log(\`Sold for \${sellResult.tokenOutAmount} USDC on Arbitrum\`);

  } finally {
    // Calculate profit
    const result = await dt.close();
    console.log(\`Arbitrage complete!\`);
    console.log(\`Net profit: $\${result.netPnl.toFixed(2)}\`);
  }
}

arbitrage();`}</code></pre>
            </div>

            <h3>Example 3: Check Balances Across Chains</h3>
            <div className="docs-code-block">
              <pre><code>{`import { createDeltaTrade } from '@backend/lib/trading';
import { ethers } from 'ethers';

async function checkBalances() {
  const dt = await createDeltaTrade(
    'paper',
    'balance-check',
    process.env.PRIVATE_KEY!,
    ['ethereum', 'arbitrum', 'polygon']
  );

  // Check native balances
  const ethBalance = await dt.ethereum.getNativeBalance();
  const arbBalance = await dt.arbitrum.getNativeBalance();
  const maticBalance = await dt.polygon.getNativeBalance();

  console.log('Native Balances:');
  console.log(\`  Ethereum: \${ethers.formatEther(ethBalance)} ETH\`);
  console.log(\`  Arbitrum: \${ethers.formatEther(arbBalance)} ETH\`);
  console.log(\`  Polygon: \${ethers.formatEther(maticBalance)} MATIC\`);

  // Check USDC balances (example addresses)
  const usdcEth = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const usdcArb = '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8';
  const usdcPol = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

  const usdcBalanceEth = await dt.ethereum.getTokenBalance(usdcEth);
  const usdcBalanceArb = await dt.arbitrum.getTokenBalance(usdcArb);
  const usdcBalancePol = await dt.polygon.getTokenBalance(usdcPol);

  console.log('\\nUSDC Balances:');
  console.log(\`  Ethereum: \${ethers.formatUnits(usdcBalanceEth, 6)} USDC\`);
  console.log(\`  Arbitrum: \${ethers.formatUnits(usdcBalanceArb, 6)} USDC\`);
  console.log(\`  Polygon: \${ethers.formatUnits(usdcBalancePol, 6)} USDC\`);

  // Close (no trades executed, so P&L will be 0)
  await dt.close();
}

checkBalances();`}</code></pre>
            </div>

            <h3>Example 4: Error Handling</h3>
            <div className="docs-code-block">
              <pre><code>{`import { createDeltaTrade } from '@backend/lib/trading';

async function robustSwap() {
  const dt = await createDeltaTrade(
    'live',
    'robust-swap-001',
    process.env.PRIVATE_KEY!,
    ['ethereum']
  );

  try {
    // Check balance before swapping
    const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const balance = await dt.ethereum.getTokenBalance(usdcAddress);
    const balanceFormatted = ethers.formatUnits(balance, 6);

    if (parseFloat(balanceFormatted) < 1000) {
      throw new Error('Insufficient USDC balance');
    }

    // Check gas price
    const gasPrice = await dt.ethereum.getGasPrice();
    const gasPriceGwei = ethers.formatUnits(gasPrice, 'gwei');
    console.log(\`Current gas price: \${gasPriceGwei} Gwei\`);

    if (parseFloat(gasPriceGwei) > 100) {
      console.warn('Gas price is high! Consider waiting...');
    }

    // Execute swap with error handling
    const result = await dt.ethereum.uniswapV3.swap({
      tokenIn: 'USDC',
      tokenOut: 'ETH',
      amountIn: '1000',
      slippage: 1.0,  // Higher slippage tolerance for volatile markets
      deadline: 600   // 10 minute deadline
    });

    console.log('Swap successful!');
    console.log(\`TX: \${result.txHash}\`);

  } catch (error) {
    console.error('Swap failed:', error.message);
    // Handle specific errors
    if (error.message.includes('insufficient funds')) {
      console.error('Not enough tokens to complete swap');
    } else if (error.message.includes('slippage')) {
      console.error('Price moved too much, increase slippage tolerance');
    }
  } finally {
    // Always close execution
    await dt.close();
  }
}

robustSwap();`}</code></pre>
            </div>
          </section>

          {/* Footer */}
          <div className="docs-footer">
            <p>
              Built with MEGA QUANT - Make Ethereum Great Again
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
