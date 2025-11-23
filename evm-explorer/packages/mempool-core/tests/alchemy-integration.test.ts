import { describe, it, expect } from 'vitest';
import { createPublicClient, http, type PublicClient } from 'viem';

/**
 * Alchemy API Integration Test Suite
 *
 * Tests Alchemy's capabilities for mempool monitoring and arbitrage detection.
 * Uses the provided API key to test WebSocket and HTTPS endpoints.
 */

const shouldRunAlchemyTests = process.env.RUN_ALCHEMY_TESTS === 'true';
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || 'if_yDQS2cKCSwmE3raP7u';

// Alchemy endpoints for different chains
const ALCHEMY_ENDPOINTS = {
  ethereum: {
    chainId: 1,
    http: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    ws: `wss://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  },
  base: {
    chainId: 8453,
    http: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    ws: `wss://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  },
  arbitrum: {
    chainId: 42161,
    http: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    ws: `wss://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  },
  optimism: {
    chainId: 10,
    http: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    ws: `wss://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  },
  polygon: {
    chainId: 137,
    http: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    ws: `wss://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  },
};

(shouldRunAlchemyTests ? describe : describe.skip)('Alchemy API Integration Tests', () => {

  describe('HTTP Endpoint Tests', () => {
    /**
     * Test basic connectivity and pending transaction support via HTTP
     */
    it('tests HTTP endpoints for all supported chains', async () => {
      console.log('\n' + '='.repeat(70));
      console.log('TESTING ALCHEMY HTTP ENDPOINTS');
      console.log('='.repeat(70));

      const results: Array<{
        chain: string;
        chainId: number;
        connected: boolean;
        blockNumber: bigint | null;
        pendingTxFilter: boolean;
        error?: string;
      }> = [];

      for (const [chainName, config] of Object.entries(ALCHEMY_ENDPOINTS)) {
        console.log(`\nTesting ${chainName} (${config.chainId})`);
        console.log(`  Endpoint: ${config.http}`);

        const result = {
          chain: chainName,
          chainId: config.chainId,
          connected: false,
          blockNumber: null as bigint | null,
          pendingTxFilter: false,
          error: undefined as string | undefined,
        };

        try {
          const client = createPublicClient({
            transport: http(config.http, { timeout: 10_000 }),
          });

          // Test basic connectivity
          const blockNumber = await client.getBlockNumber();
          result.connected = true;
          result.blockNumber = blockNumber;
          console.log(`  ✅ Connected - Block #${blockNumber}`);

          // Test pending transaction filter support
          try {
            const filter = await client.request({
              method: 'eth_newPendingTransactionFilter' as any,
            });
            console.log(`  ✅ Pending transaction filter created: ${filter}`);
            result.pendingTxFilter = true;

            // Clean up
            await client.request({
              method: 'eth_uninstallFilter' as any,
              params: [filter],
            });
          } catch (filterError) {
            console.log(`  ⚠️ Pending filter not supported: ${filterError}`);
          }

          // Test Alchemy-specific methods
          try {
            // Test alchemy_getTokenBalances
            const tokenBalances = await client.request({
              method: 'alchemy_getTokenBalances' as any,
              params: ['0x0000000000000000000000000000000000000000', 'erc20'],
            });
            console.log(`  ✅ Alchemy-specific methods work`);
          } catch {
            console.log(`  ℹ️ Some Alchemy methods may not be available on this chain`);
          }

        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          console.log(`  ❌ Connection failed: ${msg}`);
          result.error = msg;
        }

        results.push(result);
      }

      // Summary
      console.log('\n' + '='.repeat(70));
      console.log('HTTP ENDPOINT SUMMARY');
      console.log('='.repeat(70));

      const connected = results.filter(r => r.connected);
      const withPendingFilter = results.filter(r => r.pendingTxFilter);

      console.log(`\n✅ Connected chains: ${connected.length}/${results.length}`);
      console.log(`📊 Chains with pending TX filter: ${withPendingFilter.length}/${results.length}`);

      console.table(results.map(r => ({
        Chain: r.chain,
        'Chain ID': r.chainId,
        Connected: r.connected ? '✅' : '❌',
        'Block #': r.blockNumber?.toString() || '-',
        'Pending Filter': r.pendingTxFilter ? '✅' : '❌',
        Error: r.error ? r.error.substring(0, 30) : '-',
      })));

      expect(connected.length).toBeGreaterThan(0);
    }, { timeout: 60_000 });

    /**
     * Test transaction fetching and analysis
     */
    it('fetches and analyzes recent transactions for MEV patterns', async () => {
      console.log('\n' + '='.repeat(70));
      console.log('TESTING TRANSACTION ANALYSIS');
      console.log('='.repeat(70));

      const client = createPublicClient({
        transport: http(ALCHEMY_ENDPOINTS.ethereum.http),
      });

      try {
        // Get the latest block
        const block = await client.getBlock({ includeTransactions: true });
        console.log(`\nAnalyzing block #${block.number} with ${block.transactions.length} transactions`);

        // Analyze transactions for patterns
        const patterns = {
          highGas: [] as any[],
          largeValue: [] as any[],
          dexInteractions: [] as any[],
        };

        const dexRouters = new Set([
          '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', // Uniswap V2
          '0xe592427a0aece92de3edee1f18e0157c05861564', // Uniswap V3
          '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f', // Sushiswap
        ]);

        for (const tx of block.transactions.slice(0, 20)) { // Analyze first 20
          // High gas transactions (potential frontrunning)
          if (tx.gasPrice && tx.gasPrice > 50000000000n) { // > 50 Gwei
            patterns.highGas.push({
              hash: tx.hash,
              gasPrice: Number(tx.gasPrice / 1000000000n),
            });
          }

          // Large value transactions
          if (tx.value > 10000000000000000000n) { // > 10 ETH
            patterns.largeValue.push({
              hash: tx.hash,
              value: Number(tx.value / 1000000000000000000n),
            });
          }

          // DEX interactions
          if (tx.to && dexRouters.has(tx.to.toLowerCase())) {
            patterns.dexInteractions.push({
              hash: tx.hash,
              to: tx.to,
            });
          }
        }

        console.log('\n📊 Pattern Analysis:');
        console.log(`  High Gas TXs (>50 Gwei): ${patterns.highGas.length}`);
        console.log(`  Large Value TXs (>10 ETH): ${patterns.largeValue.length}`);
        console.log(`  DEX Interactions: ${patterns.dexInteractions.length}`);

        if (patterns.highGas.length > 0) {
          console.log('\n⚡ High Gas Transactions:');
          patterns.highGas.slice(0, 3).forEach(tx => {
            console.log(`  ${tx.hash}: ${tx.gasPrice} Gwei`);
          });
        }

        if (patterns.dexInteractions.length > 0) {
          console.log('\n🔄 DEX Interactions Detected:');
          patterns.dexInteractions.slice(0, 3).forEach(tx => {
            console.log(`  ${tx.hash} -> ${tx.to}`);
          });
        }

      } catch (error) {
        console.log('❌ Error analyzing transactions:', error);
      }
    }, { timeout: 30_000 });
  });

  describe('Cross-Chain Capabilities', () => {
    /**
     * Test fetching data from multiple chains simultaneously
     */
    it('fetches block data from multiple chains in parallel', async () => {
      console.log('\n' + '='.repeat(70));
      console.log('TESTING CROSS-CHAIN CAPABILITIES');
      console.log('='.repeat(70));

      const chains = ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon'];
      const clients: Record<string, PublicClient> = {};

      // Create clients for each chain
      for (const chain of chains) {
        const config = ALCHEMY_ENDPOINTS[chain as keyof typeof ALCHEMY_ENDPOINTS];
        clients[chain] = createPublicClient({
          transport: http(config.http),
        });
      }

      console.log('\nFetching latest blocks from all chains...');

      try {
        // Fetch blocks in parallel
        const blockPromises = chains.map(async (chain) => ({
          chain,
          block: await clients[chain].getBlockNumber(),
        }));

        const results = await Promise.all(blockPromises);

        console.log('\n📊 Latest Block Numbers:');
        results.forEach(({ chain, block }) => {
          console.log(`  ${chain}: #${block}`);
        });

        // Test cross-chain latency
        console.log('\nTesting cross-chain query latency...');
        const latencyTests = await Promise.all(
          chains.map(async (chain) => {
            const start = Date.now();
            await clients[chain].getGasPrice();
            const latency = Date.now() - start;
            return { chain, latency };
          })
        );

        console.log('\n⚡ Query Latency:');
        latencyTests.forEach(({ chain, latency }) => {
          console.log(`  ${chain}: ${latency}ms`);
        });

        const avgLatency = latencyTests.reduce((sum, t) => sum + t.latency, 0) / latencyTests.length;
        console.log(`\nAverage latency: ${avgLatency.toFixed(2)}ms`);

      } catch (error) {
        console.log('❌ Error in cross-chain test:', error);
      }
    }, { timeout: 30_000 });
  });

  describe('Rate Limits and Performance', () => {
    /**
     * Test API rate limits and performance characteristics
     */
    it('tests rate limits with concurrent requests', async () => {
      console.log('\n' + '='.repeat(70));
      console.log('TESTING RATE LIMITS AND PERFORMANCE');
      console.log('='.repeat(70));

      const client = createPublicClient({
        transport: http(ALCHEMY_ENDPOINTS.ethereum.http),
      });

      // Test batch requests
      console.log('\nTesting batch request performance...');
      const batchSize = 20;
      const startTime = Date.now();

      try {
        const promises = Array(batchSize).fill(0).map(() =>
          client.getGasPrice()
        );

        await Promise.all(promises);
        const duration = Date.now() - startTime;

        console.log(`  ✅ ${batchSize} concurrent requests completed`);
        console.log(`  ⏱️ Total time: ${duration}ms`);
        console.log(`  📊 Average: ${(duration / batchSize).toFixed(2)}ms per request`);

      } catch (error) {
        console.log(`  ❌ Batch request failed:`, error);
      }

      // Test sustained request rate
      console.log('\nTesting sustained request rate...');
      let successCount = 0;
      let errorCount = 0;
      const testDuration = 5_000; // 5 seconds
      const endTime = Date.now() + testDuration;

      while (Date.now() < endTime) {
        try {
          await client.getBlockNumber();
          successCount++;
        } catch {
          errorCount++;
        }
        await new Promise(resolve => setTimeout(resolve, 50)); // 20 requests/sec max
      }

      console.log(`  ✅ Successful requests: ${successCount}`);
      console.log(`  ❌ Failed requests: ${errorCount}`);
      console.log(`  📊 Success rate: ${((successCount / (successCount + errorCount)) * 100).toFixed(2)}%`);
      console.log(`  ⚡ Requests/second: ${(successCount / (testDuration / 1000)).toFixed(2)}`);

    }, { timeout: 30_000 });
  });

  describe('Alchemy-Specific Features', () => {
    /**
     * Test Alchemy's enhanced API methods
     */
    it('tests Alchemy-specific enhanced methods', async () => {
      console.log('\n' + '='.repeat(70));
      console.log('TESTING ALCHEMY-SPECIFIC FEATURES');
      console.log('='.repeat(70));

      const client = createPublicClient({
        transport: http(ALCHEMY_ENDPOINTS.ethereum.http),
      });

      console.log('\nTesting Alchemy Enhanced APIs...');

      // Test various Alchemy-specific methods
      const tests = [
        {
          name: 'Block Receipts',
          method: async () => {
            const receipts = await client.request({
              method: 'alchemy_getBlockReceipts' as any,
              params: [{ blockNumber: 'latest' }],
            });
            return Array.isArray(receipts);
          },
        },
        {
          name: 'Asset Transfers',
          method: async () => {
            const transfers = await client.request({
              method: 'alchemy_getAssetTransfers' as any,
              params: [{
                fromBlock: '0x0',
                toBlock: 'latest',
                fromAddress: '0x0000000000000000000000000000000000000000',
                maxCount: '0x1',
              }],
            });
            return transfers !== null;
          },
        },
        {
          name: 'Transaction Receipts',
          method: async () => {
            const block = await client.getBlock();
            if (block.transactions.length > 0) {
              const receipts = await client.request({
                method: 'eth_getTransactionReceipt' as any,
                params: [block.transactions[0]],
              });
              return receipts !== null;
            }
            return false;
          },
        },
      ];

      for (const test of tests) {
        try {
          const result = await test.method();
          console.log(`  ${result ? '✅' : '❌'} ${test.name}`);
        } catch (error) {
          console.log(`  ❌ ${test.name}: ${error}`);
        }
      }

      console.log('\n💡 Summary:');
      console.log('  Alchemy provides enhanced APIs beyond standard JSON-RPC');
      console.log('  These APIs enable more efficient data fetching');
      console.log('  Particularly useful for arbitrage and MEV detection');

    }, { timeout: 30_000 });
  });
});