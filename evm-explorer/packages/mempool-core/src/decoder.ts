/**
 * Transaction decoding helpers.
 *
 * Responsible for resolving protocol + ABI information and decoding calldata.
 * The decoder tries manual/verified ABIs first, then gracefully falls back to
 * signature databases when metadata is incomplete.
 */

import { decodeFunctionData, type Hex, type Abi, type AbiFunction } from 'viem';
import type { ProtocolRegistry, ProtocolLookupResult } from '@evm-explorer/protocol-registry';
import type { DecodedTransaction, MempoolTransaction } from './types';

/**
 * Decodes raw mempool transactions into protocol-aware payloads.
 */
export class TransactionDecoder {
  constructor(private readonly protocolRegistry: ProtocolRegistry) {}

  /**
   * Enriches a transaction with decoded function metadata.
   */
  async decode(transaction: MempoolTransaction): Promise<DecodedTransaction> {
    const protocol = await this.lookupProtocol(transaction);
    const selector = this.getFunctionSelector(transaction.input);

    const result: DecodedTransaction = {
      ...transaction,
      protocol,
      method: null,
      functionSignature: selector,
      rawMethodSignature: null,
      args: null,
      abiName: null,
    };

    if (!transaction.to) {
      result.method = 'contractCreation';
      return result;
    }

    if (!transaction.input || transaction.input === '0x') {
      result.method = transaction.value > 0n ? 'nativeTransfer' : 'call';
      return result;
    }

    const decoded = await this.tryDecodeWithAbi(transaction);
    if (decoded) {
      result.rawMethodSignature = decoded.rawSignature ?? decoded.method ?? null;
      result.method = this.normalizeMethodName(decoded.method);
      result.args = decoded.args ?? null;
      result.abiName = decoded.abiName;
      return result;
    }

    const fallbackMethod = selector
      ? await this.protocolRegistry.getFunctionSignature(selector)
      : null;

    if (fallbackMethod) {
      result.rawMethodSignature = fallbackMethod;
      result.method = this.normalizeMethodName(fallbackMethod);
    }

    return result;
  }

  private async lookupProtocol(transaction: MempoolTransaction): Promise<ProtocolLookupResult | null> {
    const { to, chainId } = transaction;
    if (!to) {
      return null;
    }

    try {
      return this.protocolRegistry.lookup(to, chainId);
    } catch {
      return null;
    }
  }

  private getFunctionSelector(input: string | null | undefined): string | null {
    if (!input || input === '0x' || input.length < 10) {
      return null;
    }
    return input.slice(0, 10);
  }

  /**
   * Attempts to decode calldata with a resolved ABI.
   */
  private async tryDecodeWithAbi(
    transaction: MempoolTransaction
  ): Promise<{
    method: string | null;
    args: readonly unknown[] | null;
    abiName: string | null;
    rawSignature: string | null;
  } | null> {
    if (!transaction.to) {
      return null;
    }

    try {
      const abi = await this.protocolRegistry.getProtocolAbi(transaction.to, transaction.chainId);
      if (!abi) {
        return null;
      }

      const { functionName, args } = decodeFunctionData({
        abi,
        data: transaction.input as Hex,
      });

      const fnDefinition = this.extractFunctionDefinition(abi, functionName);

      return {
        method: functionName ?? null,
        args: args ?? null,
        abiName: fnDefinition?.name ?? null,
        rawSignature: fnDefinition ? this.buildSignatureFromAbiItem(fnDefinition) : null,
      };
    } catch {
      return null;
    }
  }

  private normalizeMethodName(method?: string | null): string | null {
    if (!method) {
      return null;
    }

    const parenIndex = method.indexOf('(');
    return parenIndex > 0 ? method.slice(0, parenIndex) : method;
  }

  private extractFunctionDefinition(
    abi: Abi,
    functionName?: string | null
  ): AbiFunction | null {
    if (!functionName) {
      return null;
    }

    const match = (abi as Abi).find(
      (entry): entry is AbiFunction =>
        entry.type === 'function' && 'name' in entry && entry.name === functionName
    );

    return match ?? null;
  }

  private buildSignatureFromAbiItem(item: AbiFunction): string {
    const inputs = Array.isArray(item.inputs)
      ? item.inputs.map((input) => input?.type || 'unknown')
      : [];

    return `${item.name}(${inputs.join(',')})`;
  }
}
