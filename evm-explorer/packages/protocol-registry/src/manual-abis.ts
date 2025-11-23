import type { Abi } from 'viem';

/**
 * ManualAbiRegistry contains manually curated ABIs for critical protocols
 * 
 * These ABIs are:
 * - Verified and tested
 * - Used for high-frequency protocols  
 * - Essential for accurate mempool decoding
 * 
 * Note: We store minimal ABIs with only commonly used functions
 * to reduce bundle size
 */
export class ManualAbiRegistry {
  /**
   * Common ERC20 ABI with standard functions
   */
  static readonly ERC20_ABI: Abi = [
    {
      type: 'function',
      name: 'transfer',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [{ type: 'bool' }],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'transferFrom',
      inputs: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [{ type: 'bool' }],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'approve',
      inputs: [
        { name: 'spender', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [{ type: 'bool' }],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'balanceOf',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ type: 'uint256' }],
      stateMutability: 'view',
    },
  ] as const;

  /**
   * Uniswap V2 Router ABI (minimal + getAmountsOut for price simulation)
   */
  static readonly UNISWAP_V2_ROUTER_ABI: Abi = [
    {
      type: 'function',
      name: 'getAmountsOut',
      inputs: [
        { name: 'amountIn', type: 'uint256' },
        { name: 'path', type: 'address[]' },
      ],
      outputs: [{ name: 'amounts', type: 'uint256[]' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'swapExactETHForTokens',
      inputs: [
        { name: 'amountOutMin', type: 'uint256' },
        { name: 'path', type: 'address[]' },
        { name: 'to', type: 'address' },
        { name: 'deadline', type: 'uint256' },
      ],
      outputs: [{ name: 'amounts', type: 'uint256[]' }],
      stateMutability: 'payable',
    },
    {
      type: 'function',
      name: 'swapExactTokensForTokens',
      inputs: [
        { name: 'amountIn', type: 'uint256' },
        { name: 'amountOutMin', type: 'uint256' },
        { name: 'path', type: 'address[]' },
        { name: 'to', type: 'address' },
        { name: 'deadline', type: 'uint256' },
      ],
      outputs: [{ name: 'amounts', type: 'uint256[]' }],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'swapExactTokensForETH',
      inputs: [
        { name: 'amountIn', type: 'uint256' },
        { name: 'amountOutMin', type: 'uint256' },
        { name: 'path', type: 'address[]' },
        { name: 'to', type: 'address' },
        { name: 'deadline', type: 'uint256' },
      ],
      outputs: [{ name: 'amounts', type: 'uint256[]' }],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'addLiquidity',
      inputs: [
        { name: 'tokenA', type: 'address' },
        { name: 'tokenB', type: 'address' },
        { name: 'amountADesired', type: 'uint256' },
        { name: 'amountBDesired', type: 'uint256' },
        { name: 'amountAMin', type: 'uint256' },
        { name: 'amountBMin', type: 'uint256' },
        { name: 'to', type: 'address' },
        { name: 'deadline', type: 'uint256' },
      ],
      outputs: [
        { name: 'amountA', type: 'uint256' },
        { name: 'amountB', type: 'uint256' },
        { name: 'liquidity', type: 'uint256' },
      ],
      stateMutability: 'nonpayable',
    },
  ] as const;

  /**
   * Uniswap V3 Router ABI (minimal)
   */
  static readonly UNISWAP_V3_ROUTER_ABI: Abi = [
    {
      type: 'function', 
      name: 'exactInputSingle',
      inputs: [
        {
          name: 'params',
          type: 'tuple',
          components: [
            { name: 'tokenIn', type: 'address' },
            { name: 'tokenOut', type: 'address' },
            { name: 'fee', type: 'uint24' },
            { name: 'recipient', type: 'address' },
            { name: 'deadline', type: 'uint256' },
            { name: 'amountIn', type: 'uint256' },
            { name: 'amountOutMinimum', type: 'uint256' },
            { name: 'sqrtPriceLimitX96', type: 'uint160' },
          ],
        },
      ],
      outputs: [{ name: 'amountOut', type: 'uint256' }],
      stateMutability: 'payable',
    },
    {
      type: 'function',
      name: 'multicall',
      inputs: [{ name: 'data', type: 'bytes[]' }],
      outputs: [{ name: 'results', type: 'bytes[]' }],
      stateMutability: 'payable',
    },
  ] as const;

  /**
   * 1inch Aggregation Router V5 ABI (minimal)
   */
  static readonly ONEINCH_V5_ROUTER_ABI: Abi = [
    {
      type: 'function',
      name: 'swap',
      inputs: [
        { name: 'executor', type: 'address' },
        {
          name: 'desc',
          type: 'tuple',
          components: [
            { name: 'srcToken', type: 'address' },
            { name: 'dstToken', type: 'address' },
            { name: 'srcReceiver', type: 'address' },
            { name: 'dstReceiver', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'minReturnAmount', type: 'uint256' },
            { name: 'flags', type: 'uint256' },
          ],
        },
        { name: 'permit', type: 'bytes' },
        { name: 'data', type: 'bytes' },
      ],
      outputs: [
        { name: 'returnAmount', type: 'uint256' },
        { name: 'spentAmount', type: 'uint256' },
      ],
      stateMutability: 'payable',
    },
  ] as const;

  /**
   * OpenSea Seaport ABI (minimal)
   */
  static readonly OPENSEA_SEAPORT_ABI: Abi = [
    {
      type: 'function',
      name: 'fulfillBasicOrder',
      inputs: [
        {
          name: 'parameters',
          type: 'tuple',
          components: [
            { name: 'considerationToken', type: 'address' },
            { name: 'considerationIdentifier', type: 'uint256' },
            { name: 'considerationAmount', type: 'uint256' },
            { name: 'offerer', type: 'address' },
            { name: 'zone', type: 'address' },
            { name: 'offerToken', type: 'address' },
            { name: 'offerIdentifier', type: 'uint256' },
            { name: 'offerAmount', type: 'uint256' },
            { name: 'basicOrderType', type: 'uint8' },
            { name: 'startTime', type: 'uint256' },
            { name: 'endTime', type: 'uint256' },
            { name: 'zoneHash', type: 'bytes32' },
            { name: 'salt', type: 'uint256' },
            { name: 'offererConduitKey', type: 'bytes32' },
            { name: 'fulfillerConduitKey', type: 'bytes32' },
            { name: 'totalOriginalAdditionalRecipients', type: 'uint256' },
            { name: 'additionalRecipients', type: 'tuple[]', components: [
              { name: 'amount', type: 'uint256' },
              { name: 'recipient', type: 'address' },
            ]},
            { name: 'signature', type: 'bytes' },
          ],
        },
      ],
      outputs: [{ name: 'fulfilled', type: 'bool' }],
      stateMutability: 'payable',
    },
  ] as const;

  /**
   * Manually curated ABIs mapped by protocol address and chain
   */
  private static readonly MANUAL_ABIS: Record<string, Abi> = {
    // Uniswap V2 Router (same address on multiple chains)
    '1:0x7a250d5630b4cf539739df2c5dacb4c659f2488d': ManualAbiRegistry.UNISWAP_V2_ROUTER_ABI,
    '137:0x7a250d5630b4cf539739df2c5dacb4c659f2488d': ManualAbiRegistry.UNISWAP_V2_ROUTER_ABI,
    '42161:0x7a250d5630b4cf539739df2c5dacb4c659f2488d': ManualAbiRegistry.UNISWAP_V2_ROUTER_ABI,
    '10:0x7a250d5630b4cf539739df2c5dacb4c659f2488d': ManualAbiRegistry.UNISWAP_V2_ROUTER_ABI,

    // PancakeSwap V2 Router (BSC - chain 56)
    '56:0x10ed43c718714eb63d5aa57b78b54704e256024e': ManualAbiRegistry.UNISWAP_V2_ROUTER_ABI,

    // Uniswap V3 SwapRouter02 (same address on most chains)
    '1:0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': ManualAbiRegistry.UNISWAP_V3_ROUTER_ABI,
    '137:0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': ManualAbiRegistry.UNISWAP_V3_ROUTER_ABI,
    '42161:0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': ManualAbiRegistry.UNISWAP_V3_ROUTER_ABI,
    '10:0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': ManualAbiRegistry.UNISWAP_V3_ROUTER_ABI,

    // Uniswap V3 SwapRouter02 on Base (different address)
    '8453:0x2626664c2603336e57b271c5c0b26f421741e481': ManualAbiRegistry.UNISWAP_V3_ROUTER_ABI,

    // 1inch V5 Router
    '1:0x1111111254eeb25477b68fb85ed929f73a960582': ManualAbiRegistry.ONEINCH_V5_ROUTER_ABI,
    '137:0x1111111254eeb25477b68fb85ed929f73a960582': ManualAbiRegistry.ONEINCH_V5_ROUTER_ABI,
    '42161:0x1111111254eeb25477b68fb85ed929f73a960582': ManualAbiRegistry.ONEINCH_V5_ROUTER_ABI,
    '10:0x1111111254eeb25477b68fb85ed929f73a960582': ManualAbiRegistry.ONEINCH_V5_ROUTER_ABI,
    '56:0x1111111254eeb25477b68fb85ed929f73a960582': ManualAbiRegistry.ONEINCH_V5_ROUTER_ABI,

    // OpenSea Seaport 1.6
    '1:0x00000000000000adc04c56bf30ac9d3c0aaf14dc': ManualAbiRegistry.OPENSEA_SEAPORT_ABI,
  };

  /**
   * Get manually curated ABI for a protocol
   * @param address - Contract address
   * @param chainId - Chain ID
   * @returns ABI or null if not manually curated
   */
  static getAbi(address: string, chainId: number): Abi | null {
    const key = `${chainId}:${address.toLowerCase()}`;
    return this.MANUAL_ABIS[key] || null;
  }

  /**
   * Check if we have a manual ABI for this protocol
   * @param address - Contract address
   * @param chainId - Chain ID
   * @returns true if manual ABI exists
   */
  static hasAbi(address: string, chainId: number): boolean {
    const key = `${chainId}:${address.toLowerCase()}`;
    return key in this.MANUAL_ABIS;
  }

  /**
   * Get all protocols with manual ABIs
   * @returns Array of {chainId, address} for protocols with manual ABIs
   */
  static getAllProtocolsWithAbis(): Array<{ chainId: number; address: string }> {
    return Object.keys(this.MANUAL_ABIS).map(key => {
      const [chainId, address] = key.split(':');
      return {
        chainId: parseInt(chainId, 10),
        address,
      };
    });
  }
}