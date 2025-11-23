import { describe, it, expect } from 'vitest';
import { createPublicClient, http, webSocketProvider } from 'viem';
import * as chains from 'viem/chains';

/**
 * RPC Diagnostic Test Suite
 *
 * This test diagnoses which chains support pending transaction monitoring
 * and identifies working RPC endpoints for each chain.
 *
 * Critical information for the arbitrage module to know which chains
 * can be monitored in real-time.
 */

// Skip by default, run with: RUN_RPC_DIAGNOSTIC=true pnpm test
const shouldRunDiagnostic = process.env.RUN_RPC_DIAGNOSTIC === 'true';

(shouldRunDiagnostic ? describe : describe.skip)('RPC Endpoint Diagnostics', () => {

  /**
   * Test each major chain to determine:
   * 1. If it has public RPC endpoints
   * 2. If WebSocket is supported
   * 3. If pending transactions can be monitored
   * 4. What the actual errors are
   */
  it('diagnoses RPC support for major EVM chains', async () => {
    const testChains = [
      { chain: chains.mainnet, name: 'Ethereum' },
      { chain: chains.base, name: 'Base' },
      { chain: chains.arbitrum, name: 'Arbitrum' },
      { chain: chains.optimism, name: 'Optimism' },
      { chain: chains.polygon, name: 'Polygon' },
      { chain: chains.bsc, name: 'BSC' },
      { chain: chains.avalanche, name: 'Avalanche' },
    ];

    const results: Array<{
      name: string;
      chainId: number;
      httpWorks: boolean;
      wsWorks: boolean;
      pendingTxSupport: boolean;
      publicRpcs: string[];
      errors: string[];
    }> = [];

    for (const { chain, name } of testChains) {
      console.log(`\n=== Testing ${name} (${chain.id}) ===`);

      const result = {
        name,
        chainId: chain.id,
        httpWorks: false,
        wsWorks: false,
        pendingTxSupport: false,
        publicRpcs: chain.rpcUrls.default.http,
        errors: [] as string[],
      };

      // Test HTTP RPC
      if (chain.rpcUrls.default.http.length > 0) {
        const httpUrl = chain.rpcUrls.default.http[0];
        console.log(`Testing HTTP: ${httpUrl}`);

        try {
          const client = createPublicClient({
            chain,
            transport: http(httpUrl, { timeout: 5_000 }),
          });

          // Try to get block number
          const blockNumber = await client.getBlockNumber();
          console.log(`  ✅ HTTP works - Latest block: ${blockNumber}`);
          result.httpWorks = true;

          // Test pending transactions via HTTP polling
          try {
            let receivedTx = false;
            const unwatch = client.watchPendingTransactions({
              poll: true,
              pollingInterval: 2_000,
              onTransactions: () => {
                receivedTx = true;
              },
            });

            // Wait briefly to see if we get any transactions
            await new Promise(resolve => setTimeout(resolve, 5_000));
            unwatch();

            if (receivedTx) {
              console.log(`  ✅ Pending TX monitoring works (HTTP polling)`);
              result.pendingTxSupport = true;
            } else {
              console.log(`  ⚠️ No pending transactions received (may be low activity)`);
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.log(`  ❌ Pending TX monitoring failed: ${msg}`);
            result.errors.push(`Pending TX: ${msg}`);
          }

        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          console.log(`  ❌ HTTP connection failed: ${msg}`);
          result.errors.push(`HTTP: ${msg}`);
        }
      }

      // Test WebSocket RPC (if available)
      if (chain.rpcUrls.default.webSocket && chain.rpcUrls.default.webSocket.length > 0) {
        const wsUrl = chain.rpcUrls.default.webSocket[0];
        console.log(`Testing WebSocket: ${wsUrl}`);

        try {
          const client = createPublicClient({
            chain,
            transport: webSocketProvider(wsUrl, { timeout: 5_000 }),
          });

          // Try to get block number via WebSocket
          const blockNumber = await client.getBlockNumber();
          console.log(`  ✅ WebSocket works - Latest block: ${blockNumber}`);
          result.wsWorks = true;

          // Test pending transactions via WebSocket
          try {
            let receivedTx = false;
            const unwatch = client.watchPendingTransactions({
              onTransactions: () => {
                receivedTx = true;
              },
            });

            // Wait briefly
            await new Promise(resolve => setTimeout(resolve, 5_000));
            unwatch();

            if (receivedTx) {
              console.log(`  ✅ Pending TX monitoring works (WebSocket)`);
              result.pendingTxSupport = true;
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.log(`  ❌ WebSocket pending TX failed: ${msg}`);
            result.errors.push(`WS Pending: ${msg}`);
          }

        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          console.log(`  ❌ WebSocket connection failed: ${msg}`);
          result.errors.push(`WebSocket: ${msg}`);
        }
      } else {
        console.log(`  ℹ️ No WebSocket endpoints configured in viem`);
      }

      results.push(result);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY: Chain Support for Pending Transaction Monitoring');
    console.log('='.repeat(60));

    const workingChains = results.filter(r => r.pendingTxSupport);
    const httpOnlyChains = results.filter(r => r.httpWorks && !r.wsWorks);
    const wsChains = results.filter(r => r.wsWorks);

    console.log(`\n✅ Chains with pending TX support: ${workingChains.length}/${results.length}`);
    workingChains.forEach(r => {
      console.log(`  - ${r.name}: ${r.wsWorks ? 'WebSocket' : 'HTTP polling'}`);
    });

    console.log(`\n📡 HTTP-only chains: ${httpOnlyChains.length}`);
    httpOnlyChains.forEach(r => {
      console.log(`  - ${r.name}`);
    });

    console.log(`\n🔌 WebSocket support: ${wsChains.length}/${results.length}`);
    wsChains.forEach(r => {
      console.log(`  - ${r.name}`);
    });

    console.log('\n❌ Chains with issues:');
    results.filter(r => !r.httpWorks).forEach(r => {
      console.log(`  - ${r.name}: No working RPC`);
      r.errors.forEach(e => console.log(`    Error: ${e}`));
    });

    console.log('\n📊 Detailed Results:');
    console.table(results.map(r => ({
      Chain: r.name,
      'Chain ID': r.chainId,
      HTTP: r.httpWorks ? '✅' : '❌',
      WebSocket: r.wsWorks ? '✅' : '❌',
      'Pending TX': r.pendingTxSupport ? '✅' : '❌',
      'Public RPCs': r.publicRpcs.length,
    })));

    // Assertions
    expect(workingChains.length).toBeGreaterThan(0); // At least one chain should work

    // Return results for documentation
    return results;
  }, { timeout: 120_000 }); // 2 minute timeout for all chains

  /**
   * Test Chainlist.org API to see what endpoints are available
   */
  it('checks Chainlist for available RPC endpoints', async () => {
    console.log('\n=== Fetching chains from Chainlist ===');

    try {
      const response = await fetch('https://chainid.network/chains.json');
      const chains = await response.json();

      // Focus on our target chains
      const targetChainIds = [1, 8453, 42161, 10, 137, 56];
      const targetChains = chains.filter((c: any) => targetChainIds.includes(c.chainId));

      console.log(`\nFound ${targetChains.length} target chains in Chainlist`);

      targetChains.forEach((chain: any) => {
        console.log(`\n${chain.name} (${chain.chainId}):`);

        // Count RPC types
        const httpRpcs = chain.rpc?.filter((r: string) => r.startsWith('http')) || [];
        const wsRpcs = chain.rpc?.filter((r: string) => r.startsWith('ws')) || [];

        console.log(`  HTTP RPCs: ${httpRpcs.length}`);
        console.log(`  WebSocket RPCs: ${wsRpcs.length}`);

        // Show first few of each
        if (httpRpcs.length > 0) {
          console.log(`  Sample HTTP: ${httpRpcs.slice(0, 2).join(', ')}`);
        }
        if (wsRpcs.length > 0) {
          console.log(`  Sample WS: ${wsRpcs.slice(0, 2).join(', ')}`);
        }

        // Check for special requirements
        if (chain.rpc?.some((r: string) => r.includes('API_KEY'))) {
          console.log(`  ⚠️ Some RPCs require API keys`);
        }
      });

      // Summary
      const withWebSocket = targetChains.filter((c: any) =>
        c.rpc?.some((r: string) => r.startsWith('ws'))
      );

      console.log(`\n📊 Summary:`);
      console.log(`  Chains with WebSocket: ${withWebSocket.length}/${targetChains.length}`);

    } catch (error) {
      console.error('Failed to fetch from Chainlist:', error);
    }
  });
});