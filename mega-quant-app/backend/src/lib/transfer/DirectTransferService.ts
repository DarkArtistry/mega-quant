/**
 * Direct Transfer Service
 * Handles direct ETH and ERC20 token transfers using viem
 */

import { createWalletClient, createPublicClient, http, parseEther, formatEther, parseUnits, Address, Hex } from 'viem'
import { mainnet, base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { getDatabase } from '../../db/index.js'
import { deriveKey, decrypt } from '../../utils/crypto.js'

const ERC20_ABI = [
  {
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const

interface TransferParams {
  fromAddress: string
  toAddress: string
  amount: string // In smallest unit (wei for ETH, base units for tokens)
  chainId: number
  tokenAddress?: string // Optional - if not provided, assumes native ETH transfer
  sessionPassword: string
}

interface TransferResult {
  success: boolean
  txHash?: string
  error?: string
  chainId: number
  fromAddress: string
  toAddress: string
  amount: string
  token: string
}

class DirectTransferService {
  private rpcUrls: Record<number, string> = {}

  /**
   * Initialize with RPC URLs
   */
  initialize(rpcUrls: Record<number, string>) {
    this.rpcUrls = rpcUrls
    console.log('[DirectTransferService] Initialized with RPC URLs:', Object.keys(rpcUrls))
  }

  /**
   * Get chain configuration
   */
  private getChain(chainId: number) {
    switch (chainId) {
      case 1:
        return mainnet
      case 8453:
        return base
      default:
        throw new Error(`Unsupported chain ID: ${chainId}`)
    }
  }

  /**
   * Get RPC URL for chain
   */
  private getRpcUrl(chainId: number): string {
    const url = this.rpcUrls[chainId]
    if (!url) {
      throw new Error(`No RPC URL configured for chain ${chainId}`)
    }
    return url
  }

  /**
   * Get private key for address (decrypt from database)
   */
  private getPrivateKey(address: string, sessionPassword: string): Hex {
    try {
      const db = getDatabase()

      // Get encryption salt
      const saltRow = db.prepare(`
        SELECT key_salt FROM app_security WHERE id = 1
      `).get() as { key_salt: string } | undefined

      if (!saltRow?.key_salt) {
        throw new Error('No encryption salt found - app not initialized')
      }

      // Derive encryption key from password
      const encryptionKey = deriveKey(sessionPassword, saltRow.key_salt)

      // Get account from database by address
      const account = db.prepare(`
        SELECT
          address,
          private_key_encrypted,
          private_key_iv,
          private_key_tag
        FROM accounts
        WHERE LOWER(address) = LOWER(?)
      `).get(address) as {
        address: string
        private_key_encrypted: string
        private_key_iv: string
        private_key_tag: string
      } | undefined

      if (!account) {
        throw new Error(`No account found for address: ${address}`)
      }

      // Decrypt private key
      const privateKey = decrypt(
        account.private_key_encrypted,
        encryptionKey,
        account.private_key_iv,
        account.private_key_tag
      )

      // Ensure it starts with 0x
      return (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as Hex
    } catch (error: any) {
      throw new Error(`Failed to retrieve private key: ${error.message}`)
    }
  }

  /**
   * Transfer native ETH
   */
  private async transferETH(
    fromAddress: string,
    toAddress: string,
    amount: string,
    chainId: number,
    sessionPassword: string
  ): Promise<string> {
    const chain = this.getChain(chainId)
    const rpcUrl = this.getRpcUrl(chainId)

    // Get private key
    const privateKey = this.getPrivateKey(fromAddress, sessionPassword)
    const account = privateKeyToAccount(privateKey)

    // Create wallet client
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl)
    })

    // Send transaction
    const hash = await walletClient.sendTransaction({
      to: toAddress as Address,
      value: BigInt(amount),
      chain,
    })

    console.log(`[DirectTransferService] ETH transfer sent: ${hash}`)
    return hash
  }

  /**
   * Transfer ERC20 token
   */
  private async transferERC20(
    fromAddress: string,
    toAddress: string,
    amount: string,
    tokenAddress: string,
    chainId: number,
    sessionPassword: string
  ): Promise<string> {
    const chain = this.getChain(chainId)
    const rpcUrl = this.getRpcUrl(chainId)

    // Get private key
    const privateKey = this.getPrivateKey(fromAddress, sessionPassword)
    const account = privateKeyToAccount(privateKey)

    // Create wallet client
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl)
    })

    // Create public client for reading
    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl)
    })

    // Check balance first
    const balance = await publicClient.readContract({
      address: tokenAddress as Address,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [fromAddress as Address]
    })

    if (balance < BigInt(amount)) {
      throw new Error(`Insufficient token balance. Have: ${balance}, Need: ${amount}`)
    }

    // Send transfer transaction
    const hash = await walletClient.writeContract({
      address: tokenAddress as Address,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [toAddress as Address, BigInt(amount)],
      chain,
    })

    console.log(`[DirectTransferService] ERC20 transfer sent: ${hash}`)
    return hash
  }

  /**
   * Execute transfer (main entry point)
   */
  async transfer(params: TransferParams): Promise<TransferResult> {
    const { fromAddress, toAddress, amount, chainId, tokenAddress, sessionPassword } = params

    try {
      // Validate inputs
      if (!fromAddress || !toAddress || !amount || !chainId) {
        throw new Error('Missing required parameters')
      }

      if (fromAddress.toLowerCase() === toAddress.toLowerCase()) {
        throw new Error('Cannot send to yourself')
      }

      if (BigInt(amount) <= 0) {
        throw new Error('Amount must be greater than 0')
      }

      // Determine if ETH or ERC20 transfer
      const isETH = !tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000'

      let txHash: string

      if (isETH) {
        console.log(`[DirectTransferService] Transferring ${amount} wei ETH on chain ${chainId}`)
        txHash = await this.transferETH(fromAddress, toAddress, amount, chainId, sessionPassword)
      } else {
        console.log(`[DirectTransferService] Transferring ${amount} token units on chain ${chainId}`)
        txHash = await this.transferERC20(fromAddress, toAddress, amount, tokenAddress, chainId, sessionPassword)
      }

      return {
        success: true,
        txHash,
        chainId,
        fromAddress,
        toAddress,
        amount,
        token: isETH ? 'ETH' : tokenAddress
      }
    } catch (error: any) {
      console.error('[DirectTransferService] Transfer failed:', error)
      return {
        success: false,
        error: error.message || 'Transfer failed',
        chainId,
        fromAddress,
        toAddress,
        amount,
        token: tokenAddress || 'ETH'
      }
    }
  }

  /**
   * Estimate gas for transfer
   */
  async estimateGas(params: Omit<TransferParams, 'sessionPassword'>): Promise<{
    gasLimit: string
    gasPrice: string
    estimatedCost: string
  }> {
    const { fromAddress, toAddress, amount, chainId, tokenAddress } = params

    try {
      const chain = this.getChain(chainId)
      const rpcUrl = this.getRpcUrl(chainId)

      const publicClient = createPublicClient({
        chain,
        transport: http(rpcUrl)
      })

      // Get gas price
      const gasPrice = await publicClient.getGasPrice()

      // Estimate gas
      const isETH = !tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000'

      let gasLimit: bigint

      if (isETH) {
        gasLimit = 21000n // Standard ETH transfer
      } else {
        // ERC20 transfer typically uses ~65000 gas
        gasLimit = 65000n
      }

      const estimatedCost = gasLimit * gasPrice

      return {
        gasLimit: gasLimit.toString(),
        gasPrice: gasPrice.toString(),
        estimatedCost: estimatedCost.toString()
      }
    } catch (error: any) {
      console.error('[DirectTransferService] Gas estimation failed:', error)
      throw new Error(`Gas estimation failed: ${error.message}`)
    }
  }
}

export const directTransferService = new DirectTransferService()
