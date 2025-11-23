/**
 * Transaction enrichment utilities.
 *
 * Builds user-friendly summaries and metadata from decoded transactions so the
 * UI and analytics layers can present meaningful insights without duplicating
 * formatting logic.
 */

import { formatUnits } from 'viem';
import type { DecodedTransaction, EnrichedTransaction, MempoolTransaction } from './types';
import { TransactionDecoder } from './decoder';

/**
 * Generates summaries, labels, and metadata for decoded transactions.
 */
export class TransactionEnricher {
  constructor(private readonly decoder: TransactionDecoder) {}

  /**
   * Decodes and decorates a mempool transaction with contextual metadata.
   */
  async enrich(transaction: MempoolTransaction): Promise<EnrichedTransaction> {
    const decoded = await this.decoder.decode(transaction);
    const summary = this.buildSummary(decoded);
    const labels = this.buildLabels(decoded);
    const metadata = this.buildMetadata(decoded);

    return {
      ...decoded,
      summary,
      labels,
      metadata,
    };
  }

  private buildSummary(transaction: DecodedTransaction): string | null {
    const protocolName = transaction.protocol?.protocol.name;

    if (protocolName && transaction.method) {
      return `${protocolName} • ${transaction.method}`;
    }

    if (transaction.method) {
      return transaction.method;
    }

    if (transaction.value > 0n && transaction.to) {
      return `Transfer ${this.formatValue(transaction.value)} to ${transaction.to}`;
    }

    return null;
  }

  private buildLabels(transaction: DecodedTransaction): string[] {
    const labels: string[] = [];
    if (transaction.protocol?.protocol.name) {
      labels.push(`protocol:${transaction.protocol.protocol.name}`);
    }
    if (transaction.protocol?.protocol.category) {
      labels.push(`category:${transaction.protocol.protocol.category}`);
    }
    if (transaction.method) {
      labels.push(`method:${transaction.method}`);
    }
    if (transaction.value > 0n) {
      labels.push('transfer');
    }
    return labels;
  }

  private buildMetadata(transaction: DecodedTransaction): Record<string, unknown> {
    return {
      protocolName: transaction.protocol?.protocol.name ?? null,
      protocolCategory: transaction.protocol?.protocol.category ?? null,
      protocolConfidence: transaction.protocol?.confidence ?? null,
      formattedValueEth: this.formatValue(transaction.value),
      hasCalldata: transaction.input !== '0x',
      functionSignature: transaction.functionSignature,
      rawMethodSignature: transaction.rawMethodSignature,
    };
  }

  private formatValue(value: bigint): string {
    if (value === 0n) {
      return '0';
    }
    try {
      return formatUnits(value, 18);
    } catch {
      return value.toString();
    }
  }
}
