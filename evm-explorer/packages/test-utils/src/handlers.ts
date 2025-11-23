import { http, HttpResponse } from 'msw';
import { chainListResponse, defiLlamaProtocolsResponse } from './fixtures';

export const handlers = [
  // Chainlist API
  http.get('https://chainid.network/chains.json', () => {
    return HttpResponse.json(chainListResponse);
  }),

  // DefiLlama APIs
  http.get('https://api.llama.fi/protocols', () => {
    return HttpResponse.json(defiLlamaProtocolsResponse);
  }),

  // RPC endpoints
  http.post('https://eth.llamarpc.com', async ({ request }) => {
    const body = await request.json() as { method: string; params: unknown[] };
    
    switch (body.method) {
      case 'eth_blockNumber':
        return HttpResponse.json({
          jsonrpc: '2.0',
          id: 1,
          result: '0x1234567',
        });
      
      case 'eth_getBlockByNumber':
        return HttpResponse.json({
          jsonrpc: '2.0',
          id: 1,
          result: {
            number: '0x1234567',
            hash: '0x' + 'a'.repeat(64),
            transactions: [],
            timestamp: '0x' + Math.floor(Date.now() / 1000).toString(16),
          },
        });
      
      default:
        return HttpResponse.json({
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: -32601,
            message: 'Method not found',
          },
        });
    }
  }),
];