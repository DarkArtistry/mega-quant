/**
 * TypeScript interfaces for EIL cross-chain transfers
 */

export interface TransferParams {
  fromChainId: number
  toChainId: number
  token: string // 'ETH' or 'USDC'
  amount: string // Wei/smallest unit
  fromAddress: string
  toAddress: string // Recipient address (defaults to fromAddress on destination chain)
  sessionPassword?: string // For decrypting private key to create smart account
}

export interface TransferEstimate {
  fromChain: string
  toChain: string
  token: string
  amount: string
  estimatedTime: string // e.g., "~30 seconds"
  fees: {
    sourceChain: string // ETH amount
    destinationChain: string // ETH amount
    total: string // ETH amount
  }
  recipient: string
}

export interface TransferStatus {
  status: 'pending' | 'signing' | 'locking' | 'voucher_created' | 'redeeming' | 'complete' | 'failed'
  message: string
  txHash?: string
  blockNumber?: number
  timestamp: number
}

export interface TransferResult {
  success: boolean
  processing?: boolean // True if transaction is still processing (SDK timeout)
  txHash?: string
  voucherHash?: string
  fromChain: number
  toChain: number
  amount: string
  token: string
  error?: string
  message?: string // Status message for user
}

export interface ChainConfig {
  chainId: number
  name: string
  rpcUrl: string
}
