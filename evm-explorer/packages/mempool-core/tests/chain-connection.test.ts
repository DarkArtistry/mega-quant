import { describe, it, expect } from 'vitest';
import { ChainRegistry } from '../../chain-registry/src';
import { ProtocolRegistry } from '../../protocol-registry/src';
import { MempoolClient } from '../src/client';
import { createPublicClient, http } from 'viem';

/**
 * Chain Connection Diagnostic Test
 *
 * Tests actual chain connections to identify which chains support
 * pending transaction monitoring and which don't.
 */

const shouldRunDiagnostic = process.env.RUN_CHAIN_DIAGNOSTIC === 'true';

(shouldRunDiagnostic ? describe : describe.skip)('Chain Connection Diagnostics', () => {

  it('tests each chain for pending transaction support', async () => {
    console.log('\n' + '='.repeat(70));
    console.log('CHAIN CONNECTION DIAGNOSTIC - Testing Pending Transaction Support');
    console.log('='.repeat(70));

    const chainRegistry = new ChainRegistry({ maxEndpointsPerChain: 3 });
    await chainRegistry.initialize();

    // Test chains relevant for arbitrage
    const testChains = [
      { id: 1, name: 'Ethereum Mainnet', important: true },
      { id: 56, name: 'BSC', important: true },
      { id: 137, name: 'Polygon', important: true },
      { id: 8453, name: 'Base', important: true },
      { id: 42161, name: 'Arbitrum One', important: true },
      { id: 10, name: 'Optimism', important: true },
      { id: 43114, name: 'Avalanche', important: false },
      { id: 250, name: 'Fantom', important: false },
    ];

    const results: Array<{
      name: string;
      chainId: number;
      supported: boolean;
      rpcCount: number;
      wsSupport: boolean;
      httpSupport: boolean;
      pendingTxWorks: boolean;
      error?: string;
    }> = [];

    for (const chain of testChains) {
      console.log(`\n Testing ${chain.name} (Chain ID: ${chain.id})`);
      console.log('-'.repeat(50));

      const result = {
        name: chain.name,
        chainId: chain.id,
        supported: false,
        rpcCount: 0,
        wsSupport: false,
        httpSupport: false,
        pendingTxWorks: false,
        error: undefined as string | undefined,
      };

      try {
        // Check if chain is supported
        result.supported = chainRegistry.isChainSupported(chain.id);

        if (!result.supported) {
          console.log(`  ❌ Not supported by ChainRegistry`);
          result.error = 'Chain not supported';
          results.push(result);
          continue;
        }

        console.log(`  ✅ Chain is supported`);

        // Try to get RPC clients
        try {
          // Test WebSocket support
          console.log(`  Testing WebSocket connections...`);
          const wsClients = await chainRegistry.getMultiplePublicClients(chain.id, {
            clientCount: 1,
            includeWebSocket: true,
            preferDiverse: false,
          });

          if (wsClients && wsClients.length > 0) {
            result.wsSupport = true;
            console.log(`    ✅ WebSocket client obtained`);

            // Test if we can watch pending transactions
            try {
              let txReceived = false;
              const unwatch = wsClients[0].watchPendingTransactions({
                onTransactions: () => {
                  txReceived = true;
                },
                onError: (error) => {
                  console.log(`    WebSocket error:`, error);
                },
              });

              // Wait briefly
              await new Promise(resolve => setTimeout(resolve, 3000));
              unwatch();

              if (txReceived) {
                result.pendingTxWorks = true;
                console.log(`    ✅ Pending transactions work via WebSocket!`);
              } else {
                console.log(`    ⚠️ No pending transactions received (might be low activity)`);
              }
            } catch (error) {
              console.log(`    ❌ WebSocket pending tx failed:`, error);
            }
          }
        } catch (wsError) {
          console.log(`    ❌ WebSocket not available:`, wsError);
        }

        // Test HTTP if WebSocket failed
        if (!result.wsSupport) {
          console.log(`  Testing HTTP connections...`);
          try {
            const httpClients = await chainRegistry.getMultiplePublicClients(chain.id, {
              clientCount: 1,
              includeWebSocket: false,
            });

            if (httpClients && httpClients.length > 0) {
              result.httpSupport = true;
              console.log(`    ✅ HTTP client obtained`);

              // Test HTTP polling for pending transactions
              try {
                let txReceived = false;
                const unwatch = httpClients[0].watchPendingTransactions({
                  poll: true,
                  pollingInterval: 1000,
                  onTransactions: () => {
                    txReceived = true;
                  },
                  onError: (error) => {
                    console.log(`    HTTP polling error:`, error);
                  },
                });

                // Wait briefly
                await new Promise(resolve => setTimeout(resolve, 5000));
                unwatch();

                if (txReceived) {
                  result.pendingTxWorks = true;
                  console.log(`    ✅ Pending transactions work via HTTP polling!`);
                } else {
                  console.log(`    ⚠️ No pending transactions via HTTP (might be unsupported)`);
                }
              } catch (error) {
                console.log(`    ❌ HTTP polling failed:`, error);
              }
            }
          } catch (httpError) {
            console.log(`    ❌ HTTP connection failed:`, httpError);
            result.error = String(httpError);
          }
        }

      } catch (error) {
        console.log(`  ❌ Error testing chain:`, error);
        result.error = error instanceof Error ? error.message : String(error);
      }

      results.push(result);
    }

    // Cleanup
    chainRegistry.disconnectAll();

    // Summary Report
    console.log('\n\n' + '='.repeat(70));
    console.log('SUMMARY REPORT');
    console.log('='.repeat(70));

    const workingChains = results.filter(r => r.pendingTxWorks);
    const importantWorkingChains = results.filter(r =>
      r.pendingTxWorks && testChains.find(c => c.id === r.chainId)?.important
    );

    console.log(`\n✅ WORKING CHAINS (${workingChains.length}/${results.length}):`);
    workingChains.forEach(r => {
      const transport = r.wsSupport ? 'WebSocket' : 'HTTP Polling';
      console.log(`  - ${r.name} (${r.chainId}): ${transport}`);
    });

    console.log(`\n🎯 IMPORTANT CHAINS FOR ARBITRAGE:`);
    testChains.filter(c => c.important).forEach(chain => {
      const result = results.find(r => r.chainId === chain.id);
      if (result?.pendingTxWorks) {
        console.log(`  ✅ ${chain.name}: WORKING`);
      } else {
        console.log(`  ❌ ${chain.name}: NOT WORKING - ${result?.error || 'No pending tx support'}`);
      }
    });

    console.log(`\n📊 TRANSPORT SUPPORT:`);
    console.log(`  WebSocket chains: ${results.filter(r => r.wsSupport).length}`);
    console.log(`  HTTP-only chains: ${results.filter(r => r.httpSupport && !r.wsSupport).length}`);
    console.log(`  No support: ${results.filter(r => !r.httpSupport && !r.wsSupport).length}`);

    // Detailed table
    console.log('\n📋 DETAILED RESULTS:');
    console.table(results.map(r => ({
      Chain: r.name,
      ID: r.chainId,
      'In Registry': r.supported ? '✅' : '❌',
      WebSocket: r.wsSupport ? '✅' : '❌',
      HTTP: r.httpSupport ? '✅' : '❌',
      'Pending TX': r.pendingTxWorks ? '✅' : '⚠️',
      Error: r.error ? r.error.substring(0, 50) : '-',
    })));

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (workingChains.length === 0) {
      console.log('  ⚠️ No chains support pending transactions with public RPCs');
      console.log('  Consider using premium RPC providers (Alchemy, Infura, QuickNode)');
    } else {
      console.log(`  ✅ ${workingChains.length} chains support pending transaction monitoring`);
      if (importantWorkingChains.length < 3) {
        console.log('  ⚠️ Limited arbitrage capability - only few major chains working');
        console.log('  Consider adding API keys for better RPC access');
      }
    }

    // Test assertion
    expect(results.filter(r => r.supported).length).toBeGreaterThan(0);

    return results;
  }, { timeout: 120_000 });

  /**
   * Test direct connection to known working endpoints
   */
  it('tests specific known RPC endpoints', async () => {
    console.log('\n' + '='.repeat(70));
    console.log('TESTING KNOWN RPC ENDPOINTS');
    console.log('='.repeat(70));

    // Known public endpoints that might support pending transactions
    const endpoints = [
      {
        chain: 'Ethereum',
        chainId: 1,
        url: 'https://eth.llamarpc.com',
        type: 'http'
      },
      {
        chain: 'Ethereum',
        chainId: 1,
        url: 'https://rpc.ankr.com/eth',
        type: 'http'
      },
      {
        chain: 'Base',
        chainId: 8453,
        url: 'https://mainnet.base.org',
        type: 'http'
      },
      {
        chain: 'Arbitrum',
        chainId: 42161,
        url: 'https://arb1.arbitrum.io/rpc',
        type: 'http'
      },
      {
        chain: 'Polygon',
        chainId: 137,
        url: 'https://polygon-rpc.com',
        type: 'http'
      },
      {
        chain: 'BSC',
        chainId: 56,
        url: 'https://bsc-dataseed1.binance.org',
        type: 'http'
      },
    ];

    for (const endpoint of endpoints) {
      console.log(`\nTesting ${endpoint.chain} - ${endpoint.url}`);

      try {
        const client = createPublicClient({
          transport: http(endpoint.url, { timeout: 10_000 }),
        });

        // Test basic connectivity
        const blockNumber = await client.getBlockNumber();
        console.log(`  ✅ Connected - Block: ${blockNumber}`);

        // Test pending transaction support
        try {
          let receivedTx = false;

          // For chains that support eth_newPendingTransactionFilter
          const filter = await client.request({
            method: 'eth_newPendingTransactionFilter' as any,
          });

          console.log(`  ✅ Pending transaction filter created: ${filter}`);

          // Get some pending transactions
          const pendingTxs = await client.request({
            method: 'eth_getFilterChanges' as any,
            params: [filter],
          });

          if (pendingTxs && (pendingTxs as any[]).length > 0) {
            console.log(`  ✅ Received ${(pendingTxs as any[]).length} pending transactions!`);
            receivedTx = true;
          } else {
            console.log(`  ⚠️ No pending transactions (might need to wait longer)`);
          }

        } catch (pendingError) {
          // Try alternative method
          try {
            const txPool = await client.request({
              method: 'txpool_content' as any,
            });
            console.log(`  ✅ txpool_content works (alternative method)`);
          } catch {
            console.log(`  ❌ Pending transactions not supported:`, pendingError);
          }
        }

      } catch (error) {
        console.log(`  ❌ Connection failed:`, error);
      }
    }
  });
});