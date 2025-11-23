import type { Hash, Address, Hex } from 'viem';

export interface MockTransactionOptions {
  hash?: Hash;
  from?: Address;
  to?: Address | null;
  value?: bigint;
  gasPrice?: bigint;
  gas?: bigint;
  input?: Hex;
  nonce?: number;
  blockNumber?: bigint;
  blockHash?: Hash;
  transactionIndex?: number;
  type?: 'legacy' | 'eip2930' | 'eip1559';
}

export function mockTransaction(options: MockTransactionOptions = {}) {
  return {
    hash: options.hash || ('0x' + '0'.repeat(64) as Hash),
    from: options.from || ('0x' + '1'.repeat(40) as Address),
    to: options.to !== undefined ? options.to : ('0x' + '2'.repeat(40) as Address),
    value: options.value || 0n,
    gasPrice: options.gasPrice || 20000000000n,
    gas: options.gas || 21000n,
    input: options.input || '0x',
    nonce: options.nonce || 0,
    blockNumber: options.blockNumber || 1n,
    blockHash: options.blockHash || ('0x' + 'a'.repeat(64) as Hash),
    transactionIndex: options.transactionIndex || 0,
    type: options.type || 'legacy',
    timestamp: Date.now(),
  };
}

export function mockAddress(index = 0): Address {
  return ('0x' + index.toString().padStart(40, '0')) as Address;
}

export function mockHash(prefix = '0'): Hash {
  return ('0x' + prefix.repeat(64)) as Hash;
}