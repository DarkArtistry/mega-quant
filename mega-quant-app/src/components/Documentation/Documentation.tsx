import React, { useState, useEffect } from 'react';
import './Documentation.css';

// Helper function to copy code to clipboard
const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    // Could add a toast notification here
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
};

// Reusable CodeBlock component with copy button
interface CodeBlockProps {
  code: string;
  header?: string;
  language?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, header = 'Code Example', language = 'javascript' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    copyToClipboard(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="docs-code-block">
      <div className="code-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{header}</span>
        <button
          onClick={handleCopy}
          style={{
            background: copied ? '#4CAF50' : '#00ff00',
            color: '#000',
            border: 'none',
            padding: '4px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
        >
          {copied ? '✓ Copied!' : 'Copy Code'}
        </button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  );
};

export interface DocumentationProps {
  className?: string;
}

export const Documentation: React.FC<DocumentationProps> = ({ className }) => {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [expandedExample, setExpandedExample] = useState<string | null>('uniswap-v4');

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
        'dt-api',
        'chains',
        'protocols',
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

  const toggleExample = (exampleId: string) => {
    setExpandedExample(expandedExample === exampleId ? null : exampleId);
  };

  return (
    <div className={`documentation ${className || ''}`}>
      {/* Left Sidebar Navigation */}
      <nav className="docs-sidebar">
        <div className="docs-sidebar-header">
          <h2>Documentation</h2>
        </div>

        <div className="docs-nav-section">
          <h3>Quick Start</h3>
          <ul>
            <li>
              <a
                className={activeSection === 'getting-started' ? 'active' : ''}
                onClick={() => scrollToSection('getting-started')}
              >
                Getting Started
              </a>
            </li>
            <li>
              <a
                className={activeSection === 'dt-api' ? 'active' : ''}
                onClick={() => scrollToSection('dt-api')}
              >
                The dt Object
              </a>
            </li>
          </ul>
        </div>

        <div className="docs-nav-section">
          <h3>API Reference</h3>
          <ul>
            <li>
              <a
                className={activeSection === 'chains' ? 'active' : ''}
                onClick={() => scrollToSection('chains')}
              >
                Chains
              </a>
            </li>
            <li>
              <a
                className={activeSection === 'protocols' ? 'active' : ''}
                onClick={() => scrollToSection('protocols')}
              >
                Protocols
              </a>
            </li>
          </ul>
        </div>

        <div className="docs-nav-section">
          <h3>Examples</h3>
          <ul>
            <li>
              <a
                className={activeSection === 'examples' ? 'active' : ''}
                onClick={() => scrollToSection('examples')}
              >
                Trading Examples
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
            <h1>Strategy Editor - Quick Start</h1>
            <p className="docs-lead">
              Write trading strategies in JavaScript. The <code>dt</code> object is automatically available - no imports needed!
            </p>

            <div className="docs-steps">
              <div className="docs-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h3>Deploy a Strategy</h3>
                  <p>Click "Deploy Strategy" and select which accounts to use for each chain.</p>
                </div>
              </div>

              <div className="docs-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h3>Write Your Code</h3>
                  <p>Use <code>dt.base</code>, <code>dt.ethereum</code>, etc. to trade on different chains.</p>
                </div>
              </div>

              <div className="docs-step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h3>Click Run</h3>
                  <p>Your strategy executes with your configured accounts. Code auto-saves on Run.</p>
                </div>
              </div>
            </div>
          </section>

          {/* DT API Section */}
          <section id="dt-api" className="docs-section">
            <h2>The <code>dt</code> Object</h2>
            <p>
              The <code>dt</code> object is automatically initialized when you run a strategy.
              It gives you access to all configured chains and their trading protocols.
            </p>

            <div className="docs-info-box">
              <h4>Auto-Initialized</h4>
              <p>
                When you deploy a strategy and select accounts for each chain, <code>dt</code> is automatically
                created with those accounts loaded. Private keys stay secure in backend memory.
              </p>
            </div>

            <CodeBlock header="Example Usage" code={`// No imports! dt is already available

// Access available chains
dt.base         // Base L2 (mainnet)
dt.ethereum     // Ethereum mainnet

// Each chain has protocols
dt.base.uniswapV4      // Uniswap V4 on Base
dt.ethereum.uniswapV4  // Uniswap V4 on Ethereum
dt.ethereum.uniswapV3  // Uniswap V3 on Ethereum`} />
          </section>

          {/* Chains Section */}
          <section id="chains" className="docs-section">
            <h2>Available Chains</h2>
            <p>Access blockchain networks via chain proxies:</p>

            <CodeBlock header="Available Chains (Mainnet)" code={`dt.ethereum  // Ethereum mainnet
dt.base      // Base (Coinbase L2)`} />

            <div className="docs-info-box">
              <h4>Testnets (for development)</h4>
              <p>
                <code>dt.sepolia</code> and <code>dt['base-sepolia']</code> are also available for testing strategies before deploying to mainnet.
              </p>
            </div>

            <h3>Chain Methods</h3>

            <div className="docs-method">
              <h4><code>await dt.{'{chain}'}.getGasPrice()</code></h4>
              <p>Get current gas price in wei</p>
              <div className="docs-code-block">
                <pre><code>{`const gasPrice = await dt.base.getGasPrice()
const gasPriceGwei = Number(gasPrice) / 1e9
console.log(\`Gas: \${gasPriceGwei.toFixed(2)} gwei\`)`}</code></pre>
              </div>
            </div>

            <div className="docs-method">
              <h4><code>await dt.{'{chain}'}.getNativeBalance()</code></h4>
              <p>Get native token balance (ETH, MATIC, etc.)</p>
              <div className="docs-code-block">
                <pre><code>{`const balance = await dt.base.getNativeBalance()
console.log(\`Balance: \${balance} wei\`)`}</code></pre>
              </div>
            </div>

            <div className="docs-method">
              <h4><code>await dt.{'{chain}'}.getTokenBalance(address)</code></h4>
              <p>Get ERC20 token balance</p>
              <div className="docs-code-block">
                <pre><code>{`const usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
const balance = await dt.base.getTokenBalance(usdcAddress)
console.log(\`USDC: \${balance}\`)`}</code></pre>
              </div>
            </div>
          </section>

          {/* Protocols Section */}
          <section id="protocols" className="docs-section">
            <h2>Trading Protocols</h2>
            <p>Execute trades on supported DEXes:</p>

            <h3>Uniswap V4</h3>
            <p>Available on: <strong>Base</strong>, <strong>Ethereum</strong></p>

            <div className="docs-method">
              <h4><code>await dt.{'{chain}'}.uniswapV4.getQuote(params)</code></h4>
              <p>Get a quote for a swap without executing</p>
              <CodeBlock header="Parameters" code={`{
  tokenIn: 'ETH' | 'USDC' | 'WETH',  // Token to sell
  tokenOut: 'ETH' | 'USDC' | 'WETH', // Token to buy
  amountIn: '0.1',                    // Amount in human-readable format
  fee: 3000,                          // Fee tier (500, 3000, 10000)
  tickSpacing: 60                     // Tick spacing for the pool
}`} />
              <CodeBlock header="Example" code={`const quote = await dt.base.uniswapV4.getQuote({
  tokenIn: 'ETH',
  tokenOut: 'USDC',
  amountIn: '0.0001',
  fee: 3000,
  tickSpacing: 60
})

console.log(\`\${quote.amountOut} USDC\`)
console.log(\`Rate: \${quote.exchangeRate.toFixed(2)}\`)
console.log(\`Gas: $\${quote.gasCostUsd.toFixed(4)}\`)`} />
            </div>

            <div className="docs-method">
              <h4><code>await dt.{'{chain}'}.uniswapV4.swap(params)</code></h4>
              <p>Execute a swap on Uniswap V4</p>
              <CodeBlock header="Parameters" code={`{
  tokenIn: 'ETH' | 'USDC' | 'WETH',   // Token to sell
  tokenOut: 'ETH' | 'USDC' | 'WETH',  // Token to buy
  amountIn: '0.1',                     // Amount in human-readable format
  slippage: 1.0,                       // Slippage tolerance (1.0 = 1%)
  fee: 3000,                           // Fee tier
  tickSpacing: 60                      // Tick spacing
}`} />
              <CodeBlock header="Returns" code={`{
  amountIn: '0.0001',           // Actual amount in
  amountOut: '0.273682',        // Amount received
  gasUsed: 150000,              // Gas used
  gasCostUsd: 0.0234,           // Gas cost in USD
  explorerUrl: 'https://...',   // Clickable link to tx
  transactionHash: '0x...',     // Transaction hash
  blockNumber: 12345678,        // Block number
  success: true,                // Success flag
  timestamp: 1234567890         // Timestamp
}`} />
            </div>

            <h3>Uniswap V3</h3>
            <p>Available on: <strong>Ethereum</strong>, <strong>Base</strong></p>

            <div className="docs-method">
              <h4><code>await dt.{'{chain}'}.uniswapV3.swap(params)</code></h4>
              <p>Execute a swap on Uniswap V3</p>
              <CodeBlock header="Example (Ethereum)" code={`const result = await dt.ethereum.uniswapV3.swap({
  tokenIn: 'USDC',
  tokenOut: 'WETH',
  amountIn: '1000',
  slippage: 0.5  // 0.5% slippage
})

console.log(\`Got \${result.tokenOutAmount} WETH\`)
console.log(\`TX: \${result.txHash}\`)`} />
            </div>

            <h3>1inch Aggregator</h3>
            <p>Available on: <strong>Ethereum</strong>, <strong>Base</strong></p>
            <p className="docs-info-box">
              1inch aggregates quotes across 300+ DEXs to find the best execution price.
              It automatically routes through multiple protocols for optimal pricing.
            </p>

            <div className="docs-method">
              <h4><code>await dt.{'{chain}'}.oneInch.getQuote(params)</code></h4>
              <p>Get best quote across 300+ DEXs</p>
              <CodeBlock header="Parameters" code={`{
  tokenIn: 'ETH' | 'USDC' | 'WETH',  // Token to sell
  tokenOut: 'ETH' | 'USDC' | 'WETH', // Token to buy
  amountIn: '0.1'                     // Amount in human-readable format
}`} />
              <CodeBlock header="Example" code={`const quote = await dt.ethereum.oneInch.getQuote({
  tokenIn: 'ETH',
  tokenOut: 'USDC',
  amountIn: '1.0'
})

console.log(\`\${quote.amountOut} USDC\`)
console.log(\`Rate: \${quote.exchangeRate.toFixed(2)}\`)
console.log(\`Gas: $\${quote.gasCostUsd.toFixed(4)}\`)`} />
            </div>

            <div className="docs-method">
              <h4><code>await dt.{'{chain}'}.oneInch.swap(params)</code></h4>
              <p>Execute swap with best routing across DEXs</p>
              <CodeBlock header="Parameters" code={`{
  tokenIn: 'ETH' | 'USDC' | 'WETH',   // Token to sell
  tokenOut: 'ETH' | 'USDC' | 'WETH',  // Token to buy
  amountIn: '0.1',                     // Amount in human-readable format
  slippage: 1.0                        // Slippage tolerance (1.0 = 1%)
}`} />
              <CodeBlock header="Example" code={`const result = await dt.ethereum.oneInch.swap({
  tokenIn: 'ETH',
  tokenOut: 'USDC',
  amountIn: '1.0',
  slippage: 0.5
})

console.log(\`Swapped \${result.amountIn} ETH\`)
console.log(\`Got \${result.amountOut} USDC\`)
console.log(\`TX: \${result.explorerUrl}\`)`} />
            </div>
          </section>

          {/* Examples Section */}
          <section id="examples" className="docs-section">
            <h2>Trading Examples</h2>
            <p>Click to expand/collapse examples:</p>

            {/* Uniswap V4 Example */}
            <div className="docs-example-card">
              <div
                className="example-header"
                onClick={() => toggleExample('uniswap-v4')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <h3>
                  <span style={{ marginRight: '8px' }}>
                    {expandedExample === 'uniswap-v4' ? '▼' : '▶'}
                  </span>
                  Uniswap V4: ETH → USDC Swap on Base
                </h3>
              </div>
              {expandedExample === 'uniswap-v4' && (
                <div className="example-content">
                  <p>Complete workflow: Get quote → Check fees → Execute swap → View on explorer</p>
                  <CodeBlock header="Complete Example" code={`(async () => {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('🦄 Uniswap V4 - ETH/USDC on Base Mainnet')
  console.log('═══════════════════════════════════════════════════════════\\\n')

  const AMOUNT = '0.0001' // 0.0001 ETH

  // ─────────────────────────────────────
  // 1️⃣ GET QUOTE
  // ─────────────────────────────────────
  console.log('📊 Getting Quote...\\\n')

  const quote = await dt.base.uniswapV4.getQuote({
    tokenIn: 'ETH',
    tokenOut: 'USDC',
    amountIn: AMOUNT,
    fee: 3000,        // 0.3% fee tier
    tickSpacing: 60
  })

  console.log(\`   \${AMOUNT} ETH → \${quote.amountOut} USDC\`)
  console.log(\`   Rate: \${quote.exchangeRate.toFixed(2)} USDC per ETH\`)
  console.log(\`   Est. Gas: $\${(quote.gasCostUsd || 0).toFixed(4)}\\n\`)

  // ─────────────────────────────────────
  // 2️⃣ NETWORK FEES
  // ─────────────────────────────────────
  console.log('💰 Network Fees...\\\n')

  const gasPrice = await dt.base.getGasPrice()
  const gasPriceGwei = Number(gasPrice) / 1e9

  console.log(\`   Gas Price: \${gasPriceGwei.toFixed(2)} gwei\`)
  console.log(\`   Est. Swap Cost: ~$\${((150000 * Number(gasPrice) / 1e18) * 3000).toFixed(4)}\\n\`)

  // ─────────────────────────────────────
  // 3️⃣ EXECUTE SWAP
  // ─────────────────────────────────────
  console.log('💱 Executing Swap...\\\n')

  const result = await dt.base.uniswapV4.swap({
    tokenIn: 'ETH',
    tokenOut: 'USDC',
    amountIn: AMOUNT,
    slippage: 1.0,
    fee: 3000,
    tickSpacing: 60
  })

  // ─────────────────────────────────────
  // ✅ SUCCESS
  // ─────────────────────────────────────
  console.log('✅ SWAP SUCCESSFUL!\\\n')
  console.log('─'.repeat(63))
  console.log(\`   Amount In:  \${result.amountIn} ETH\`)
  console.log(\`   Amount Out: \${result.amountOut} USDC\`)
  console.log(\`   Gas Used:   \${result.gasUsed.toLocaleString()}\`)
  console.log(\`   Gas Cost:   \${result.gasCostUsd.toFixed(4)}\`)
  console.log('─'.repeat(63))

  // Clickable block explorer link
  console.log(\`\\n🔗 View Transaction on Block Explorer:\`)
  console.log(result.explorerUrl)
  console.log()

  console.log('═══════════════════════════════════════════════════════════')
})()`} />
                </div>
              )}
            </div>

            {/* 1inch Example */}
            <div className="docs-example-card">
              <div
                className="example-header"
                onClick={() => toggleExample('1inch')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <h3>
                  <span style={{ marginRight: '8px' }}>
                    {expandedExample === '1inch' ? '▼' : '▶'}
                  </span>
                  1inch: Complete Trading Demo on Base
                </h3>
              </div>
              {expandedExample === '1inch' && (
                <div className="example-content">
                  <p>Complete 1inch trading example with gas fees, quotes, and swap execution on Base mainnet</p>
                  <div className="docs-code-block">
                    <div className="code-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>1inch Trading Demo - Base Mainnet</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const code = `(async () => {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('🚀 MEGA QUANT - 1inch on Base Mainnet')
  console.log('    Complete Trading Demo')
  console.log('═══════════════════════════════════════════════════════════\\n')

  const AMOUNT = '0.0001' // 0.0001 ETH (~$0.27)

  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1️⃣ GET DETAILED NETWORK GAS FEES
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('⛽ Network Gas Information:')
    console.log('─────────────────────────────────────────────────────')

    const gasPrice = await dt.base.getGasPrice()
    const gasPriceGwei = Number(gasPrice) / 1e9
    const gasPriceWei = Number(gasPrice)

    // Estimate gas cost for a typical 1inch swap (300k gas)
    const estimatedGasUnits = 300000
    const gasCostWei = gasPriceWei * estimatedGasUnits
    const gasCostEth = gasCostWei / 1e18

    // Assuming ETH price ~$2700 (will be more accurate from quote)
    const estimatedGasCostUsd = gasCostEth * 2700

    console.log(\`   Gas Price:           \${gasPriceGwei.toFixed(4)} gwei\`)
    console.log(\`   Gas Price (wei):     \${gasPriceWei}\`)
    console.log(\`   Estimated Gas Units: \${estimatedGasUnits.toLocaleString()}\`)
    console.log(\`   Estimated Gas Cost:  \${gasCostEth.toFixed(8)} ETH\`)
    console.log(\`   Estimated Cost USD:  $\${estimatedGasCostUsd.toFixed(4)}\`)
    console.log('─────────────────────────────────────────────────────\\n')

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2️⃣ GET QUOTE FROM 1INCH AGGREGATOR
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('💰 Getting Quote from 1inch Aggregator:')
    console.log('─────────────────────────────────────────────────────')

    const quote = await dt.base.oneInch.getQuote({
      tokenIn: 'ETH',
      tokenOut: 'USDC',
      amountIn: AMOUNT
    })

    console.log(\`   Input:               \${AMOUNT} ETH\`)
    console.log(\`   Expected Output:     \${quote.amountOut} USDC\`)
    console.log(\`   Exchange Rate:       \${quote.exchangeRate.toFixed(2)} USDC/ETH\`)
    console.log(\`   Price Impact:        \${quote.priceImpact.toFixed(4)}%\`)
    console.log(\`   Minimum Output:      \${quote.amountOutMin} USDC (0.5% slippage)\`)
    console.log(\`   1inch Gas Estimate:  $\${(quote.gasCostUsd || 0).toFixed(4)}\`)
    console.log('─────────────────────────────────────────────────────\\n')

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3️⃣ EXECUTE SWAP VIA 1INCH
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('🔄 Executing Swap via 1inch:')
    console.log('─────────────────────────────────────────────────────')
    console.log(\`   Trading \${AMOUNT} ETH for USDC...\`)
    console.log(\`   Slippage tolerance: 0.5%\`)
    console.log('')

    const swapResult = await dt.base.oneInch.swap({
      tokenIn: 'ETH',
      tokenOut: 'USDC',
      amountIn: AMOUNT,
      slippage: 0.5  // 0.5% slippage tolerance
    })

    console.log('✅ SWAP SUCCESSFUL!')
    console.log('─────────────────────────────────────────────────────')
    console.log(\`   Transaction Hash:    \${swapResult.transactionHash}\`)
    console.log(\`   Block Number:        \${swapResult.blockNumber}\`)
    console.log(\`   Amount In:           \${swapResult.amountIn} ETH\`)
    console.log(\`   Amount Out:          \${swapResult.amountOut} USDC\`)
    console.log(\`   Actual Gas Used:     \${swapResult.gasUsed.toLocaleString()} units\`)
    console.log(\`   Actual Gas Cost:     $\${swapResult.gasCostUsd.toFixed(4)}\`)
    console.log(\`   Explorer:            \${swapResult.explorerUrl}\`)
    console.log('─────────────────────────────────────────────────────\\n')

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📊 TRADE SUMMARY
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const valueIn = parseFloat(AMOUNT) * quote.exchangeRate
    const valueOut = parseFloat(swapResult.amountOut)
    const slippage = ((valueIn - valueOut) / valueIn * 100).toFixed(4)
    const netValue = valueOut - swapResult.gasCostUsd

    console.log('📊 Trade Summary:')
    console.log('═════════════════════════════════════════════════════')
    console.log(\`   Expected Value:      $\${valueIn.toFixed(4)}\`)
    console.log(\`   Actual Value Out:    $\${valueOut.toFixed(4)}\`)
    console.log(\`   Actual Slippage:     \${slippage}%\`)
    console.log(\`   Gas Cost:            $\${swapResult.gasCostUsd.toFixed(4)}\`)
    console.log(\`   Net Value:           $\${netValue.toFixed(4)}\`)
    console.log('═════════════════════════════════════════════════════\\n')

    console.log('✅ Demo Complete! Check the transaction on BaseScan:')
    console.log(\`   \${swapResult.explorerUrl}\`)

  } catch (error) {
    console.error('❌ Error during swap:', error.message)
    console.error('\\n💡 Troubleshooting Tips:')
    console.error('1. Ensure you have ETH balance on Base mainnet')
    console.error('2. Check that 1inch API key is set correctly')
    console.error('3. Verify network connectivity')
    console.error('4. Try increasing the swap amount if liquidity is low')
  }
})()`;
                          copyToClipboard(code);
                          e.currentTarget.textContent = '✓ Copied!';
                          setTimeout(() => {
                            e.currentTarget.textContent = 'Copy Code';
                          }, 2000);
                        }}
                        style={{
                          background: '#00ff00',
                          color: '#000',
                          border: 'none',
                          padding: '4px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      >
                        Copy Code
                      </button>
                    </div>
                    <pre><code>{`(async () => {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('🚀 MEGA QUANT - 1inch on Base Mainnet')
  console.log('    Complete Trading Demo')
  console.log('═══════════════════════════════════════════════════════════\\n')

  const AMOUNT = '0.0001' // 0.0001 ETH (~$0.27)

  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1️⃣ GET DETAILED NETWORK GAS FEES
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('⛽ Network Gas Information:')
    console.log('─────────────────────────────────────────────────────')

    const gasPrice = await dt.base.getGasPrice()
    const gasPriceGwei = Number(gasPrice) / 1e9
    const gasPriceWei = Number(gasPrice)

    // Estimate gas cost for a typical 1inch swap (300k gas)
    const estimatedGasUnits = 300000
    const gasCostWei = gasPriceWei * estimatedGasUnits
    const gasCostEth = gasCostWei / 1e18

    // Assuming ETH price ~$2700 (will be more accurate from quote)
    const estimatedGasCostUsd = gasCostEth * 2700

    console.log(\`   Gas Price:           \${gasPriceGwei.toFixed(4)} gwei\`)
    console.log(\`   Gas Price (wei):     \${gasPriceWei}\`)
    console.log(\`   Estimated Gas Units: \${estimatedGasUnits.toLocaleString()}\`)
    console.log(\`   Estimated Gas Cost:  \${gasCostEth.toFixed(8)} ETH\`)
    console.log(\`   Estimated Cost USD:  $\${estimatedGasCostUsd.toFixed(4)}\`)
    console.log('─────────────────────────────────────────────────────\\n')

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2️⃣ GET QUOTE FROM 1INCH AGGREGATOR
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('💰 Getting Quote from 1inch Aggregator:')
    console.log('─────────────────────────────────────────────────────')

    const quote = await dt.base.oneInch.getQuote({
      tokenIn: 'ETH',
      tokenOut: 'USDC',
      amountIn: AMOUNT
    })

    console.log(\`   Input:               \${AMOUNT} ETH\`)
    console.log(\`   Expected Output:     \${quote.amountOut} USDC\`)
    console.log(\`   Exchange Rate:       \${quote.exchangeRate.toFixed(2)} USDC/ETH\`)
    console.log(\`   Price Impact:        \${quote.priceImpact.toFixed(4)}%\`)
    console.log(\`   Minimum Output:      \${quote.amountOutMin} USDC (0.5% slippage)\`)
    console.log(\`   1inch Gas Estimate:  $\${(quote.gasCostUsd || 0).toFixed(4)}\`)
    console.log('─────────────────────────────────────────────────────\\n')

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3️⃣ EXECUTE SWAP VIA 1INCH
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('🔄 Executing Swap via 1inch:')
    console.log('─────────────────────────────────────────────────────')
    console.log(\`   Trading \${AMOUNT} ETH for USDC...\`)
    console.log(\`   Slippage tolerance: 0.5%\`)
    console.log('')

    const swapResult = await dt.base.oneInch.swap({
      tokenIn: 'ETH',
      tokenOut: 'USDC',
      amountIn: AMOUNT,
      slippage: 0.5  // 0.5% slippage tolerance
    })

    console.log('✅ SWAP SUCCESSFUL!')
    console.log('─────────────────────────────────────────────────────')
    console.log(\`   Transaction Hash:    \${swapResult.transactionHash}\`)
    console.log(\`   Block Number:        \${swapResult.blockNumber}\`)
    console.log(\`   Amount In:           \${swapResult.amountIn} ETH\`)
    console.log(\`   Amount Out:          \${swapResult.amountOut} USDC\`)
    console.log(\`   Actual Gas Used:     \${swapResult.gasUsed.toLocaleString()} units\`)
    console.log(\`   Actual Gas Cost:     $\${swapResult.gasCostUsd.toFixed(4)}\`)
    console.log(\`   Explorer:            \${swapResult.explorerUrl}\`)
    console.log('─────────────────────────────────────────────────────\\n')

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📊 TRADE SUMMARY
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const valueIn = parseFloat(AMOUNT) * quote.exchangeRate
    const valueOut = parseFloat(swapResult.amountOut)
    const slippage = ((valueIn - valueOut) / valueIn * 100).toFixed(4)
    const netValue = valueOut - swapResult.gasCostUsd

    console.log('📊 Trade Summary:')
    console.log('═════════════════════════════════════════════════════')
    console.log(\`   Expected Value:      $\${valueIn.toFixed(4)}\`)
    console.log(\`   Actual Value Out:    $\${valueOut.toFixed(4)}\`)
    console.log(\`   Actual Slippage:     \${slippage}%\`)
    console.log(\`   Gas Cost:            $\${swapResult.gasCostUsd.toFixed(4)}\`)
    console.log(\`   Net Value:           $\${netValue.toFixed(4)}\`)
    console.log('═════════════════════════════════════════════════════\\n')

    console.log('✅ Demo Complete! Check the transaction on BaseScan:')
    console.log(\`   \${swapResult.explorerUrl}\`)

  } catch (error) {
    console.error('❌ Error during swap:', error.message)
    console.error('\\n💡 Troubleshooting Tips:')
    console.error('1. Ensure you have ETH balance on Base mainnet')
    console.error('2. Check that 1inch API key is set correctly')
    console.error('3. Verify network connectivity')
    console.error('4. Try increasing the swap amount if liquidity is low')
  }
})()`}</code></pre>
                  </div>
                </div>
              )}
            </div>

            {/* Gas Optimization Example */}
            <div className="docs-example-card">
              <div
                className="example-header"
                onClick={() => toggleExample('gas-check')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <h3>
                  <span style={{ marginRight: '8px' }}>
                    {expandedExample === 'gas-check' ? '▼' : '▶'}
                  </span>
                  Gas-Aware Trading
                </h3>
              </div>
              {expandedExample === 'gas-check' && (
                <div className="example-content">
                  <p>Only execute trades when gas prices are favorable</p>
                  <CodeBlock header="Gas-Aware Trading Example" code={`// Check gas before trading
const gasPrice = await dt.base.getGasPrice()
const gasPriceGwei = Number(gasPrice) / 1e9

console.log(\`Gas: \${gasPriceGwei.toFixed(2)} gwei\`)

// Only trade if gas is reasonable
if (gasPriceGwei < 5) {
  console.log('✓ Gas is low, executing trade...')

  const result = await dt.base.uniswapV4.swap({
    tokenIn: 'ETH',
    tokenOut: 'USDC',
    amountIn: '0.01',
    slippage: 1.0,
    fee: 3000,
    tickSpacing: 60
  })

  console.log(\`✅ Swap complete: \${result.amountOut} USDC\`)
} else {
  console.log('⚠ Gas too high, waiting...')
}`} />
                </div>
              )}
            </div>

            {/* Periodic Trading Example */}
            <div className="docs-example-card">
              <div
                className="example-header"
                onClick={() => toggleExample('periodic')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <h3>
                  <span style={{ marginRight: '8px' }}>
                    {expandedExample === 'periodic' ? '▼' : '▶'}
                  </span>
                  Periodic Trading Bot
                </h3>
              </div>
              {expandedExample === 'periodic' && (
                <div className="example-content">
                  <p>Execute trades on a schedule with setInterval</p>
                  <CodeBlock header="Periodic Trading Bot Example" code={`console.log('🤖 Starting periodic trading bot...')

let tradeCount = 0

// Trade every 5 minutes
const intervalId = setInterval(async () => {
  try {
    console.log(\`\\n📊 Trade #\${++tradeCount} - \${new Date().toLocaleTimeString()}\`)

    // Check gas
    const gasPrice = await dt.base.getGasPrice()
    const gasPriceGwei = Number(gasPrice) / 1e9

    if (gasPriceGwei > 10) {
      console.log('⏸ Gas too high, skipping...')
      return
    }

    // Execute trade
    const result = await dt.base.uniswapV4.swap({
      tokenIn: 'ETH',
      tokenOut: 'USDC',
      amountIn: '0.001',
      slippage: 1.0,
      fee: 3000,
      tickSpacing: 60
    })

    console.log(\`✅ Got \${result.amountOut} USDC\`)
    console.log(\`🔗 \${result.explorerUrl}\`)

  } catch (error) {
    console.error('❌ Trade failed:', error.message)
  }
}, 5 * 60 * 1000) // 5 minutes

// Stop after 1 hour
setTimeout(() => {
  clearInterval(intervalId)
  console.log(\`\\n⏹ Bot stopped after \${tradeCount} trades\`)
}, 60 * 60 * 1000)`} />
                </div>
              )}
            </div>
          </section>

          {/* Footer */}
          <div className="docs-footer">
            <p>Built with MEGA QUANT</p>
          </div>
        </div>
      </div>
    </div>
  );
};
