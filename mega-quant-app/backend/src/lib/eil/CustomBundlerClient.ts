/**
 * Custom Bundler Client for Desktop Compatibility
 *
 * Bypasses browser wallet dependencies by directly submitting UserOperations
 * to the ERC-4337 bundler via HTTP. This ensures the desktop app doesn't
 * need window.ethereum or WalletConnect.
 *
 * EIL Bundler Endpoint: https://vnet.erc4337.io/bundler/{chainId}
 */

import axios from 'axios'
import { type Hex, type Address } from 'viem'

export interface UserOperation {
  sender: Address
  nonce: bigint
  initCode?: Hex
  callData: Hex
  callGasLimit: bigint
  verificationGasLimit: bigint
  preVerificationGas: bigint
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
  // v0.6 format (legacy)
  paymasterAndData?: Hex
  // v0.7 format (EIL uses this)
  paymaster?: Address
  paymasterData?: Hex
  paymasterVerificationGasLimit?: bigint
  paymasterPostOpGasLimit?: bigint
  signature: Hex
}

export interface BundlerResponse {
  jsonrpc: string
  id: number
  result?: string
  error?: {
    code: number
    message: string
    data?: any
  }
}

export interface UserOpReceipt {
  userOpHash: string
  txHash?: string
  blockNumber?: number
  success: boolean
  actualGasCost?: bigint
  actualGasUsed?: bigint
}

/**
 * Custom Bundler Client - Direct HTTP submission without browser dependencies
 */
export class CustomBundlerClient {
  private bundlerUrl: string
  private requestId: number = 1

  constructor(chainId: number) {
    // EIL's bundler endpoint for the virtual network
    this.bundlerUrl = `https://vnet.erc4337.io/bundler/${chainId}`
    console.log(`[CustomBundler] Initialized for chain ${chainId}`)
    console.log(`[CustomBundler] Bundler URL: ${this.bundlerUrl}`)
  }

  /**
   * Convert UserOperation to format expected by bundler
   * Handles both v0.6 (paymasterAndData) and v0.7 (separate paymaster fields) formats
   */
  private formatUserOperation(userOp: UserOperation): Record<string, any> {
    const formatted: Record<string, any> = {
      sender: userOp.sender,
      nonce: `0x${userOp.nonce.toString(16)}`,
      initCode: userOp.initCode || '0x',
      callData: userOp.callData,
      callGasLimit: `0x${userOp.callGasLimit.toString(16)}`,
      verificationGasLimit: `0x${userOp.verificationGasLimit.toString(16)}`,
      preVerificationGas: `0x${userOp.preVerificationGas.toString(16)}`,
      maxFeePerGas: `0x${userOp.maxFeePerGas.toString(16)}`,
      maxPriorityFeePerGas: `0x${userOp.maxPriorityFeePerGas.toString(16)}`,
      signature: userOp.signature
    }

    // Handle paymaster fields (v0.7 format used by EIL)
    if (userOp.paymaster) {
      // v0.7: Separate paymaster fields
      formatted.paymaster = userOp.paymaster
      formatted.paymasterVerificationGasLimit = userOp.paymasterVerificationGasLimit
        ? `0x${userOp.paymasterVerificationGasLimit.toString(16)}`
        : '0x0'
      formatted.paymasterPostOpGasLimit = userOp.paymasterPostOpGasLimit
        ? `0x${userOp.paymasterPostOpGasLimit.toString(16)}`
        : '0x0'
      formatted.paymasterData = userOp.paymasterData || '0x'

      console.log('[CustomBundler] 💰 Using v0.7 paymaster format')
      console.log('[CustomBundler]    Paymaster:', userOp.paymaster)
      console.log('[CustomBundler]    PaymasterData length:', userOp.paymasterData?.length || 0)
    } else if (userOp.paymasterAndData && userOp.paymasterAndData !== '0x') {
      // v0.6: Combined paymasterAndData
      formatted.paymasterAndData = userOp.paymasterAndData
      console.log('[CustomBundler] 💰 Using v0.6 paymasterAndData format')
    } else {
      // No paymaster
      formatted.paymasterAndData = '0x'
    }

    return formatted
  }

  /**
   * Submit UserOperation to bundler
   * Returns the userOpHash
   */
  async sendUserOperation(
    userOp: UserOperation,
    entryPoint: Address
  ): Promise<string> {
    try {
      console.log('[CustomBundler] 📤 Sending UserOperation to bundler...')
      console.log('[CustomBundler] Sender:', userOp.sender)
      console.log('[CustomBundler] EntryPoint:', entryPoint)

      const formattedUserOp = this.formatUserOperation(userOp)

      const payload = {
        jsonrpc: '2.0',
        id: this.requestId++,
        method: 'eth_sendUserOperation',
        params: [formattedUserOp, entryPoint]
      }

      console.log('[CustomBundler] 📡 Request payload:', JSON.stringify(payload, null, 2))

      const response = await axios.post<BundlerResponse>(
        this.bundlerUrl,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      )

      if (response.data.error) {
        throw new Error(
          `Bundler error: ${response.data.error.message} (code: ${response.data.error.code})`
        )
      }

      if (!response.data.result) {
        throw new Error('Bundler returned no result')
      }

      const userOpHash = response.data.result
      console.log('[CustomBundler] ✅ UserOperation submitted successfully')
      console.log('[CustomBundler] UserOp hash:', userOpHash)

      return userOpHash
    } catch (error: any) {
      console.error('[CustomBundler] ❌ Failed to send UserOperation:', error.message)

      if (error.response?.data) {
        console.error('[CustomBundler] Bundler response:', JSON.stringify(error.response.data, null, 2))
      }

      throw new Error(`Failed to submit UserOperation: ${error.message}`)
    }
  }

  /**
   * Get UserOperation receipt (includes transaction hash)
   * Polls until the operation is included in a block
   */
  async getUserOperationReceipt(
    userOpHash: string,
    maxAttempts: number = 60,
    pollInterval: number = 2000
  ): Promise<UserOpReceipt> {
    console.log('[CustomBundler] 🔍 Polling for UserOperation receipt...')
    console.log('[CustomBundler] UserOp hash:', userOpHash)

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const payload = {
          jsonrpc: '2.0',
          id: this.requestId++,
          method: 'eth_getUserOperationReceipt',
          params: [userOpHash]
        }

        const response = await axios.post<BundlerResponse>(
          this.bundlerUrl,
          payload,
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        )

        if (response.data.error) {
          console.log(`[CustomBundler] Attempt ${attempt}/${maxAttempts}: Not yet mined`)
        } else if (response.data.result) {
          const receipt = response.data.result as any

          console.log('[CustomBundler] ✅ UserOperation mined!')
          console.log('[CustomBundler] Transaction hash:', receipt.receipt?.transactionHash)
          console.log('[CustomBundler] Block number:', receipt.receipt?.blockNumber)

          return {
            userOpHash,
            txHash: receipt.receipt?.transactionHash,
            blockNumber: receipt.receipt?.blockNumber,
            success: receipt.success || false,
            actualGasCost: receipt.actualGasCost ? BigInt(receipt.actualGasCost) : undefined,
            actualGasUsed: receipt.actualGasUsed ? BigInt(receipt.actualGasUsed) : undefined
          }
        }

        // Wait before next attempt
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, pollInterval))
        }
      } catch (error: any) {
        console.log(`[CustomBundler] Attempt ${attempt}/${maxAttempts}: Polling error, will retry...`)
      }
    }

    throw new Error(`UserOperation not mined after ${maxAttempts} attempts`)
  }

  /**
   * Estimate gas for a UserOperation
   */
  async estimateUserOperationGas(
    userOp: Partial<UserOperation>,
    entryPoint: Address
  ): Promise<{
    preVerificationGas: bigint
    verificationGasLimit: bigint
    callGasLimit: bigint
  }> {
    try {
      console.log('[CustomBundler] 📊 Estimating gas for UserOperation...')

      const formattedUserOp = {
        sender: userOp.sender,
        nonce: userOp.nonce ? `0x${userOp.nonce.toString(16)}` : '0x0',
        initCode: userOp.initCode || '0x',
        callData: userOp.callData || '0x',
        paymasterAndData: userOp.paymasterAndData || '0x',
        signature: userOp.signature || '0x',
        // Provide defaults for gas fields
        callGasLimit: '0x0',
        verificationGasLimit: '0x0',
        preVerificationGas: '0x0',
        maxFeePerGas: '0x0',
        maxPriorityFeePerGas: '0x0'
      }

      const payload = {
        jsonrpc: '2.0',
        id: this.requestId++,
        method: 'eth_estimateUserOperationGas',
        params: [formattedUserOp, entryPoint]
      }

      const response = await axios.post<BundlerResponse>(
        this.bundlerUrl,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      )

      if (response.data.error) {
        throw new Error(
          `Gas estimation error: ${response.data.error.message}`
        )
      }

      if (!response.data.result) {
        throw new Error('Bundler returned no gas estimate')
      }

      const result = response.data.result as any

      const gasEstimate = {
        preVerificationGas: BigInt(result.preVerificationGas || '0x0'),
        verificationGasLimit: BigInt(result.verificationGasLimit || result.verificationGas || '0x0'),
        callGasLimit: BigInt(result.callGasLimit || '0x0')
      }

      console.log('[CustomBundler] ✅ Gas estimate:', {
        preVerificationGas: gasEstimate.preVerificationGas.toString(),
        verificationGasLimit: gasEstimate.verificationGasLimit.toString(),
        callGasLimit: gasEstimate.callGasLimit.toString()
      })

      return gasEstimate
    } catch (error: any) {
      console.error('[CustomBundler] ❌ Gas estimation failed:', error.message)

      // Return safe defaults if estimation fails
      return {
        preVerificationGas: 50_000n,
        verificationGasLimit: 150_000n,
        callGasLimit: 200_000n
      }
    }
  }

  /**
   * Get supported EntryPoints
   */
  async getSupportedEntryPoints(): Promise<Address[]> {
    try {
      const payload = {
        jsonrpc: '2.0',
        id: this.requestId++,
        method: 'eth_supportedEntryPoints',
        params: []
      }

      const response = await axios.post<BundlerResponse>(
        this.bundlerUrl,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      )

      if (response.data.result) {
        const entryPoints = response.data.result as unknown as string[]
        console.log('[CustomBundler] Supported EntryPoints:', entryPoints)
        return entryPoints as Address[]
      }

      return []
    } catch (error: any) {
      console.error('[CustomBundler] Failed to get supported EntryPoints:', error.message)
      return []
    }
  }
}
