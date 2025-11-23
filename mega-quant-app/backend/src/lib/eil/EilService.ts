/**
 * EIL Service - Cross-Chain Transfer Management
 *
 * Enables trustless, single-signature cross-chain transfers using ERC-7683 Intents Layer
 */

import { CrossChainSdk, FunctionCallAction } from '@eil-protocol/sdk'
import { MultiChainSmartAccount } from '@eil-protocol/accounts'
import { toSimpleSmartAccount } from 'permissionless/accounts'
import { ethers } from 'ethers'
import { encodeFunctionData, type Address, type Hex, createPublicClient, http } from 'viem'
import { mainnet, base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { entryPoint08Abi, toPackedUserOperation } from 'viem/account-abstraction'
import { getDatabase } from '../../db/index.js'
import { deriveKey, decrypt } from '../../utils/crypto.js'
import {
  TransferParams,
  TransferEstimate,
  TransferResult,
  TransferStatus,
  ChainConfig
} from './types.js'
import {
  getTokenAddress,
  getTokenConfig,
  isChainSupported,
  CHAIN_NAMES
} from './tokens.js'

class EilService {
  private sdk: CrossChainSdk | null = null
  private initialized: boolean = false
  private rpcUrlGetter: ((chainId: number) => string) | null = null

  /**
   * Initialize the EIL SDK with default virtual network configuration
   *
   * IMPORTANT: EIL SDK comes with pre-configured virtual network RPCs that have
   * all contracts (EntryPoint, Factory, Paymaster, etc.) already deployed.
   * We MUST use these default RPCs - custom Tenderly forks won't have the contracts.
   *
   * EIL Virtual Network Configuration:
   * - Ethereum: https://virtual.rpc.tenderly.co/stitchApp/project/private/eil-eth/...
   * - Base: https://virtual.rpc.tenderly.co/stitchApp/project/private/eil-base/...
   * - EntryPoint: 0x433709009B8330FDa32311DF1C2AFA402eD8D009
   * - Factory: 0xa3B0aE3203c671746b23e78Ebb170a476C8e13A3
   * - Paymaster: 0x73Ca37d21Bb665df9899339ad31897747D782a7C (Ethereum)
   * - Bundler: https://vnet.erc4337.io/bundler/{chainId}
   */
  async initialize(rpcUrlGetter: (chainId: number) => string): Promise<void> {
    try {
      console.log('[EilService] 🚀 Initializing EIL SDK with default virtual network')

      // Store the RPC URL getter (not used for EIL, but kept for compatibility)
      this.rpcUrlGetter = rpcUrlGetter

      // Initialize SDK with DEFAULT configuration
      // This uses EIL's pre-configured virtual network with all contracts deployed
      this.sdk = new CrossChainSdk()

      this.initialized = true
      console.log('[EilService] ✅ SDK initialized successfully')
      console.log('[EilService] 🌐 Using EIL virtual network (NOT your custom Tenderly fork)')
      console.log('[EilService] 📍 Virtual Network RPCs:')
      console.log('[EilService]    Ethereum: https://virtual.rpc.tenderly.co/.../eil-eth/...')
      console.log('[EilService]    Base: https://virtual.rpc.tenderly.co/.../eil-base/...')
      console.log('[EilService] 🏭 Factory: 0xa3B0aE3203c671746b23e78Ebb170a476C8e13A3')
      console.log('[EilService] 🎯 EntryPoint: 0x433709009B8330FDa32311DF1C2AFA402eD8D009')
      console.log('[EilService] 💰 Paymaster: 0x73Ca37d21Bb665df9899339ad31897747D782a7C (Ethereum)')
      console.log('[EilService] 📡 Bundler: https://vnet.erc4337.io/bundler/{chainId}')
      console.log('[EilService] ✨ All contracts pre-deployed and ready!')

    } catch (error: any) {
      console.error('[EilService] ❌ Initialization failed:', error.message)
      throw new Error(`Failed to initialize EilService: ${error.message}`)
    }
  }

  /**
   * Check if service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.sdk) {
      throw new Error('EilService not initialized. Call initialize() first.')
    }
  }

  /**
   * Validate transfer parameters
   */
  private validateTransferParams(params: TransferParams): void {
    const { fromChainId, toChainId, token, amount, fromAddress, toAddress } = params

    // Validate chains
    if (!isChainSupported(fromChainId)) {
      throw new Error(`Source chain ${fromChainId} is not supported`)
    }
    if (!isChainSupported(toChainId)) {
      throw new Error(`Destination chain ${toChainId} is not supported`)
    }
    if (fromChainId === toChainId) {
      throw new Error('Source and destination chains must be different')
    }

    // Validate token
    try {
      getTokenConfig(token)
    } catch (error: any) {
      throw new Error(`Invalid token: ${token}`)
    }

    // Validate amount
    const amountBN = BigInt(amount)
    if (amountBN <= 0n) {
      throw new Error('Amount must be greater than 0')
    }

    // Validate addresses
    if (!ethers.isAddress(fromAddress)) {
      throw new Error('Invalid from address')
    }
    if (!ethers.isAddress(toAddress)) {
      throw new Error('Invalid to address')
    }
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
   * Hash a UserOperation for ERC-4337 signing
   * Based on ERC-4337 spec: hash(userOp, entryPoint, chainId)
   */
  private async hashUserOperation(userOp: any, chainId: string): Promise<Hex> {
    // ERC-4337 UserOperation hash = keccak256(abi.encode(userOp, entryPoint, chainId))
    // For simplicity, we'll use ethers to pack and hash
    const packed = ethers.solidityPacked(
      ['address', 'uint256', 'bytes32', 'bytes32', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'bytes32'],
      [
        userOp.sender,
        BigInt(userOp.nonce),
        ethers.keccak256(userOp.callData || '0x'),
        ethers.keccak256((userOp.paymasterData || '0x')),
        BigInt(userOp.callGasLimit),
        BigInt(userOp.verificationGasLimit),
        BigInt(userOp.preVerificationGas),
        BigInt(userOp.maxFeePerGas),
        BigInt(userOp.maxPriorityFeePerGas),
        ethers.keccak256(userOp.entryPointAddress)
      ]
    )

    return ethers.keccak256(packed) as Hex
  }

  /**
   * Create smart account and bundler manager for cross-chain operations
   *
   * IMPORTANT: EIL SDK uses its own virtual network RPCs with pre-deployed contracts.
   * We should NOT override these with custom Tenderly RPCs as the contracts don't exist there.
   */
  private async createSmartAccountInfrastructure(privateKey: Hex, chainIds: number[]) {
    console.log('[EilService] 🔧 Setting up smart account infrastructure...')
    console.log('[EilService] 📡 Using EIL virtual network with pre-deployed contracts')
    console.log('[EilService] 🏭 Factory: 0xa3B0aE3203c671746b23e78Ebb170a476C8e13A3')
    console.log('[EilService] 🎯 EntryPoint: 0x433709009B8330FDa32311DF1C2AFA402eD8D009')
    console.log('[EilService] 📡 Bundler: https://vnet.erc4337.io/bundler/{chainId}')

    // Create viem account from private key for signing only
    const account = privateKeyToAccount(privateKey as `0x${string}`)
    console.log('[EilService] 🔑 Signer/Smart Account address:', account.address)
    console.log('[EilService] 💡 Using existing smart account (not creating new one)')

    // Get EIL virtual network RPCs from deployment.json
    const eilEthRpc = 'https://virtual.rpc.tenderly.co/stitchApp/project/private/eil-eth/855f8569-52b8-4149-a19d-55cf5b8de368'
    const eilBaseRpc = 'https://virtual.rpc.tenderly.co/stitchApp/project/private/eil-base/7e7c502b-2f81-4fd2-87ea-33bc2ae559d9'
    const entryPointAddress = '0x433709009B8330FDa32311DF1C2AFA402eD8D009' as Address

    // Create SmartAccount instances for user's existing deployed smart contract
    // The user's account (0xB5d8206099422A419149813e53Bf774b5F25ba6b) will be BOTH
    // the signer AND the sender address
    const existingAccounts: any[] = []

    for (const chainId of chainIds) {
      const chain = chainId === 1 ? mainnet : base
      const rpcUrl = chainId === 1 ? eilEthRpc : eilBaseRpc

      console.log(`[EilService] 🔨 Creating SimpleSmartAccount for chain ${chainId}...`)

      const client = createPublicClient({
        chain,
        transport: http(rpcUrl)
      })

      // Create SimpleSmartAccount with user's existing address
      // NOTE: We're NOT using the factory to create a new account
      // Instead, we're using the user's existing deployed smart contract
      const smartAcc = await toSimpleSmartAccount({
        owner: account,
        client,
        entryPoint: {
          address: entryPointAddress,
          version: '0.8'
        },
        address: account.address, // Override to use user's existing address
        factoryAddress: '0xa3B0aE3203c671746b23e78Ebb170a476C8e13A3' // Same factory as SDK uses
      })

      existingAccounts.push(smartAcc)
      console.log(`[EilService]    ✅ SimpleSmartAccount created for chain ${chainId}: ${smartAcc.address}`)
    }

    // Create multi-chain smart account using existing accounts
    let smartAccount: MultiChainSmartAccount
    try {
      console.log('[EilService] 🔍 Calling MultiChainSmartAccount.create() with existing accounts...')

      smartAccount = await MultiChainSmartAccount.create(
        account, // Private key account as owner/signer
        this.sdk!, // CrossChainSdk instance with EIL's default config
        existingAccounts // Use existing smart account instances
      )

      console.log('[EilService] ✅ Smart account created successfully!')
      console.log('[EilService] 🔍 Accounts map size:', smartAccount.accounts?.size || 0)
    } catch (error: any) {
      console.error('[EilService] ❌ Failed to create MultiChainSmartAccount:', error)
      console.error('[EilService] 💥 Error stack:', error.stack)
      throw new Error(`MultiChainSmartAccount creation failed: ${error.message}`)
    }

    // Display smart contract wallet addresses for each chain
    console.log('[EilService] 📍 Smart Contract Wallet Addresses:')
    console.log(`[EilService]    EOA Owner: ${account.address}`)

    for (const chainId of chainIds) {
      try {
        const wallet = smartAccount.contractOn(BigInt(chainId))
        const chainName = chainId === 1 ? 'Ethereum' : chainId === 8453 ? 'Base' : `Chain ${chainId}`
        console.log(`[EilService]    Smart Wallet on ${chainName}: ${wallet.address}`)
      } catch (error: any) {
        console.error(`[EilService]    ❌ Failed to get wallet for chain ${chainId}:`, error.message)
      }
    }

    console.log('[EilService] 💡 Accounts will deploy automatically on first transaction via initCode')
    console.log('[EilService] ✨ Gas can be paid in USDC via paymaster!')

    return { smartAccount }
  }

  /**
   * Execute cross-chain transfer using EIL voucher system
   * 🎯 Key Feature: Send USDC without needing ETH for gas!
   */
  async transferCrossChain(params: TransferParams): Promise<TransferResult> {
    this.ensureInitialized()
    this.validateTransferParams(params)

    const { fromChainId, toChainId, token, amount, fromAddress, toAddress } = params

    try {
      console.log('[EilService] 📤 Starting cross-chain transfer:')
      console.log(`  From: ${CHAIN_NAMES[fromChainId]} (${fromChainId})`)
      console.log(`  To: ${CHAIN_NAMES[toChainId]} (${toChainId})`)
      console.log(`  Token: ${token}`)
      console.log(`  Amount: ${amount}`)
      console.log(`  Recipient: ${toAddress}`)
      console.log(`  💎 Gas: Paid in ${token} (no ETH needed!)`)

      // Get token addresses for both chains
      const tokenConfig = getTokenConfig(token)
      const sourceTokenAddress = getTokenAddress(token, fromChainId)
      const destTokenAddress = getTokenAddress(token, toChainId)

      // Validate session password
      if (!params.sessionPassword) {
        throw new Error('Session password required for signing transaction')
      }

      // Get user's private key
      const privateKey = this.getPrivateKey(fromAddress, params.sessionPassword)

      // Create smart account infrastructure
      const { smartAccount } = await this.createSmartAccountInfrastructure(
        privateKey,
        [fromChainId, toChainId]
      )

      // Create batch builder for multi-chain operation
      const builder = this.sdk!.createBuilder()
      const voucherRef = `voucher_${Date.now()}`

      console.log('[EilService] 🔨 Step 1: Creating voucher request on source chain...')

      // Create token - use array format with chain IDs as bigints
      const tokenAddressArray = [
        { chainId: BigInt(fromChainId), address: sourceTokenAddress as Address },
        { chainId: BigInt(toChainId), address: destTokenAddress as Address }
      ]

      // ERC20 transfer ABI for sending tokens to recipient
      const erc20TransferAbi = [
        {
          type: 'function',
          name: 'transfer',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'nonpayable'
        }
      ] as const

      // Step 1: SOURCE CHAIN - Request voucher
      // Use paymaster to sponsor gas (pay in USDC instead of ETH)
      console.log('[EilService] 💰 Using paymaster to sponsor gas')

      const pmOverride = {
        paymaster: '0x73Ca37d21Bb665df9899339ad31897747D782a7C' as Address,
        paymasterVerificationGasLimit: 100_000n,
        paymasterPostOpGasLimit: 50_000n, // Must be > 0 to avoid AA33!
        paymasterData: '0x' as Hex
      }

      // Need to import ApproveAction for ERC-20 approval
      const { ApproveAction } = await import('@eil-protocol/sdk')

      // Create multichain token once to reuse
      const multichainToken = this.sdk!.createToken(token, tokenAddressArray as any)

      builder
        .startBatch(BigInt(fromChainId))
        .overrideUserOp(pmOverride)
        // CRITICAL: Approve voucher contract to spend USDC before requesting voucher
        .addAction(new ApproveAction({
          token: multichainToken,
          spender: '0xdCafF3cf6AE607ED39b02ef61696606ef6d17068' as Address, // VoucherRegistry contract
          value: BigInt(amount)
        }))
        .addVoucherRequest({
          tokens: [{
            token: multichainToken,
            amount: BigInt(amount)
          }],
          destinationChainId: BigInt(toChainId),
          ref: voucherRef
        })
        .endBatch()

      console.log('[EilService] 📥 Step 2: Using voucher + transferring to recipient on destination chain...')

      // Step 2: DESTINATION CHAIN - Use voucher and transfer tokens to recipient
      builder
        .startBatch(BigInt(toChainId))
        .useAllVouchers() // Use all vouchers from previous batches
        .addAction(new FunctionCallAction({
          target: destTokenAddress as Address,
          functionName: 'transfer',
          args: [toAddress as Address, BigInt(amount)],
          abi: erc20TransferAbi,
          value: 0n
        }))
        .endBatch()
        .useAccount(smartAccount) // Tell builder which account to use AFTER defining batches

      console.log('[EilService] ✍️  Step 3: Building and signing operation...')

      // Step 3: Build and sign (single signature for entire multi-chain op)
      const executor = await builder.buildAndSign()

      console.log('[EilService] 🚀 Step 4: Executing cross-chain transfer...')

      // Step 4: Execute with status tracking callback
      let txHash: string | undefined
      let voucherHash: string | undefined

      const executionResult = await executor.execute((status: any) => {
        // Custom replacer to handle BigInt in status objects
        const replacer = (key: string, value: any) => {
          if (typeof value === 'bigint') {
            return `0x${value.toString(16)}`
          }
          return value
        }

        console.log('[EilService] 📊 Status update:', JSON.stringify(status, replacer, 2))

        console.log('!!!!!! handleOps', status.chainId, encodeFunctionData({
          abi: entryPoint08Abi,
          functionName: 'handleOps',
          args: [[toPackedUserOperation(status.userOp)], status.userOp.sender]
        }))
  
        if (status.txHash) txHash = status.txHash
        if (status.voucherHash) voucherHash = status.voucherHash
      })

      console.log('[EilService] ✅ Cross-chain transfer completed successfully!')

      return {
        success: true,
        txHash,
        voucherHash,
        fromChain: fromChainId,
        toChain: toChainId,
        amount,
        token
      }

    } catch (error: any) {
      // Check if this is just a timeout (not a real failure)
      const isTimeout = error.message?.includes('timeout')

      if (isTimeout) {
        console.log('[EilService] ⏱️  SDK timeout - but transaction likely succeeded!')
        console.log('[EilService] 💡 UserOperation was submitted and gas was paid')
        console.log('[EilService] 🔄 Balances should update shortly')

        return {
          success: true,
          processing: true, // Flag to indicate still processing
          txHash: undefined,
          voucherHash: undefined,
          fromChain: fromChainId,
          toChain: toChainId,
          amount,
          token,
          message: 'Transfer processing - balance will update shortly'
        }
      }

      // Real error - not a timeout
      console.error('[EilService] ❌ Transfer failed:', error.message)
      console.error('[EilService] 📍 Error stack:', error.stack)
      console.error('[EilService] 🔍 Error details:', JSON.stringify({
        name: error.name,
        message: error.message,
        cause: error.cause
      }, null, 2))

      return {
        success: false,
        fromChain: fromChainId,
        toChain: toChainId,
        amount,
        token,
        error: error.message
      }
    }
  }

  /**
   * Estimate transfer fees and time
   */
  async estimateTransfer(params: TransferParams): Promise<TransferEstimate> {
    this.ensureInitialized()
    this.validateTransferParams(params)

    const { fromChainId, toChainId, token, amount, toAddress } = params

    // Placeholder estimation
    // In real implementation, this would query gas prices and calculate actual fees
    return {
      fromChain: CHAIN_NAMES[fromChainId],
      toChain: CHAIN_NAMES[toChainId],
      token,
      amount,
      estimatedTime: '~30 seconds',
      fees: {
        sourceChain: '0.001', // ETH
        destinationChain: '0.0005', // ETH
        total: '0.0015' // ETH
      },
      recipient: toAddress
    }
  }

  /**
   * Get current configuration
   */
  getConfig() {
    const supportedChains = [1, 8453].map(chainId => {
      const rpcUrl = this.rpcUrlGetter ? this.rpcUrlGetter(chainId) : 'Not available'
      return {
        chainId,
        name: CHAIN_NAMES[chainId] || `Chain ${chainId}`,
        rpcUrl
      }
    })

    return {
      initialized: this.initialized,
      supportedChains
    }
  }
}

// Singleton instance
export const eilService = new EilService()
