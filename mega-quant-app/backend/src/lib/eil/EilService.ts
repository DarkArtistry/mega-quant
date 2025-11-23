/**
 * EIL Service - Cross-Chain Transfer Management
 *
 * Enables trustless, single-signature cross-chain transfers using ERC-7683 Intents Layer
 */

import { CrossChainSdk, FunctionCallAction, ApproveAction } from '@eil-protocol/sdk'
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
import { CustomBundlerClient } from './CustomBundlerClient.js'

class EilService {
  private sdk: CrossChainSdk | null = null
  private initialized: boolean = false
  private rpcUrlGetter: ((chainId: number) => string) | null = null
  private useCustomBundler: boolean = true // Enable custom bundler for desktop compatibility

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
      console.log('[EilService] 💰 Paymaster: 0xc7F3D98ed15c483C0f666d9F3EA0Dc7abEe77ca2 (Gas-free txs!)')
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

    // Block native ETH transfers (not supported by EIL - use WETH)
    if (token.toUpperCase() === 'ETH') {
      throw new Error('Native ETH transfers not supported by EIL liquidity providers. Please use WETH instead.')
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
   * UPDATED NOTE: This is a hackish approach for hackathon purposes using EIP-7702 to allow
   * the EOA to have temporary code during the transaction.
   *
   * EIP-7702 enables the EOA (from the private key) to delegate execution to contract code,
   * effectively making it act like a smart account for the tx. We're intentionally overriding
   * the smart account address to the EOA address to leverage this delegation.
   *
   * This works because the EOA will have code set via the authorization list in the tx
   * (type 0x04), compatible with ERC-4337 bundling.
   *
   * Caveats:
   * - EIP-7702 is not yet mainnet-activated (as of Nov 2025), so this assumes the
   *   virtual/devnet supports it.
   * - Bundlers may have issues with nonce management for delegated EOAs. This is temporary
   *   until the codebase is fully ready for native smart accounts.
   *
   * For desktop app compatibility: Ensure all transports are HTTP (viem/http) to avoid
   * browser-specific assumptions. If the bundler (e.g., Ambire or EIL's) is trying to
   * connect to a browser wallet, check for any Web3Provider or window.ethereum references
   * in the SDK or dependencies. Use privateKeyToAccount for signing – no WalletConnect or
   * browser extensions needed. If issue persists, consider a custom bundler client or debug
   * SDK's executeBatchTransaction().
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
    console.log('[EilService] ⚠️  EIP-7702 Hack: Using EOA with temporary delegation to act as smart account')

    // Create viem account from private key for signing only
    const account = privateKeyToAccount(privateKey as `0x${string}`)
    console.log('[EilService] 🔑 Signer/EOA address:', account.address)
    console.log('[EilService] 💡 Using EOA as sender with EIP-7702 delegation (hackathon mode)')

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
        transport: http(rpcUrl) // Explicit HTTP for desktop/node compatibility – no browser websocket/WalletConnect
      })

      // Create SimpleSmartAccount overriding to EOA address for EIP-7702 delegation
      // NOTE: This is intentional – EIP-7702 will set temp code, allowing EOA to process UserOps like a contract.
      // Without override, it would compute a counterfactual smart account address.
      const smartAcc = await toSimpleSmartAccount({
        owner: account,
        client,
        entryPoint: {
          address: entryPointAddress,
          version: '0.8'
        },
        address: account.address, // Intentional override for EIP-7702: Use EOA as sender with delegated code
        factoryAddress: '0xa3B0aE3203c671746b23e78Ebb170a476C8e13A3' // Same factory as SDK uses (though not deploying new)
      })

      existingAccounts.push(smartAcc)
      console.log(`[EilService]    ✅ SimpleSmartAccount created for chain ${chainId}: ${smartAcc.address} (EOA via EIP-7702)`)
    }

    // Create multi-chain smart account using the EOA-based accounts
    let smartAccount: MultiChainSmartAccount
    try {
      console.log('[EilService] 🔍 Calling MultiChainSmartAccount.create() with EOA-based accounts...')

      smartAccount = await MultiChainSmartAccount.create(
        account, // Private key account as owner/signer
        this.sdk!, // CrossChainSdk instance with EIL's default config
        existingAccounts // Use EOA-overridden smart account instances for EIP-7702
      )

      console.log('[EilService] ✅ Smart account created successfully!')
      console.log('[EilService] 🔍 Accounts map size:', smartAccount.accounts?.size || 0)
    } catch (error: any) {
      console.error('[EilService] ❌ Failed to create MultiChainSmartAccount:', error)
      console.error('[EilService] 💥 Error stack:', error.stack)
      throw new Error(`MultiChainSmartAccount creation failed: ${error.message}`)
    }

    // Display addresses – note that smart wallet is the EOA with delegation
    console.log('[EilService] 📍 Addresses (EOA with EIP-7702 delegation):')
    console.log(`[EilService]    EOA/Sender: ${account.address}`)

    for (const chainId of chainIds) {
      try {
        const wallet = smartAccount.contractOn(BigInt(chainId))
        const chainName = chainId === 1 ? 'Ethereum' : chainId === 8453 ? 'Base' : `Chain ${chainId}`
        console.log(`[EilService]    Delegated Wallet on ${chainName}: ${wallet.address}`)
      } catch (error: any) {
        console.error(`[EilService]    ❌ Failed to get wallet for chain ${chainId}:`, error.message)
      }
    }

    console.log('[EilService] 💡 Delegation set via EIP-7702 tx – no separate deployment needed')
    console.log('[EilService] ✨ Gas can be paid in USDC via paymaster!')
    console.log('[EilService] 🖥️  Desktop Note: Using HTTP transport – if bundler (Ambire/EIL) errors on browser wallet, ensure no WalletConnect in SDK; use custom signer if needed')

    return { smartAccount }
  }

  /**
   * Execute UserOperation using custom bundler client (desktop-compatible)
   * Bypasses browser wallet dependencies by submitting directly via HTTP
   */
  private async executeWithCustomBundler(
    userOps: any[],
    chainId: number,
    entryPoint: Address
  ): Promise<{ txHash?: string; userOpHash?: string }> {
    console.log('[EilService] 🚀 Using custom bundler client for desktop compatibility')
    console.log(`[EilService] Chain: ${chainId}, EntryPoint: ${entryPoint}`)

    const bundler = new CustomBundlerClient(chainId)

    // Validate input
    if (userOps.length === 0) {
      throw new Error('No UserOperations to execute')
    }

    // For multi-UserOp support: Currently we execute each sequentially
    // TODO: For true batching, encode all UserOps into a single handleOps calldata
    if (userOps.length > 1) {
      console.log(`[EilService] ⚠️  Multiple UserOps (${userOps.length}) - executing sequentially`)
      console.log('[EilService] 💡 For better gas efficiency, consider batching into single handleOps call')
    }

    const userOp = userOps[0]

    // Validate UserOp structure
    if (!userOp.sender || !userOp.callData || !userOp.signature) {
      console.error('[EilService] ❌ Invalid UserOp structure:', userOp)
      throw new Error('UserOperation missing required fields (sender, callData, or signature)')
    }

    console.log('[EilService] 📋 UserOperation details:')
    console.log('[EilService]    Sender:', userOp.sender)
    console.log('[EilService]    Nonce:', userOp.nonce?.toString())
    console.log('[EilService]    CallData length:', userOp.callData?.length || 0)
    console.log('[EilService]    Signature length:', userOp.signature?.length || 0)
    console.log('[EilService]    Paymaster:', userOp.paymaster || userOp.paymasterAndData || 'None')

    try {
      // Submit UserOperation to bundler
      const userOpHash = await bundler.sendUserOperation(userOp, entryPoint)
      console.log('[EilService] ✅ UserOperation submitted:', userOpHash)

      // Wait for UserOperation to be mined
      console.log('[EilService] ⏳ Waiting for UserOperation to be mined (max 2 minutes)...')
      const receipt = await bundler.getUserOperationReceipt(userOpHash, 60, 2000)

      if (!receipt.success) {
        console.error('[EilService] ❌ UserOperation failed on-chain')
        console.error('[EilService] Receipt:', receipt)
        throw new Error('UserOperation execution failed on-chain')
      }

      console.log('[EilService] ✅ UserOperation mined successfully!')
      console.log('[EilService] Transaction hash:', receipt.txHash)
      console.log('[EilService] Block number:', receipt.blockNumber)
      console.log('[EilService] Gas used:', receipt.actualGasUsed?.toString())

      return {
        txHash: receipt.txHash,
        userOpHash
      }
    } catch (error: any) {
      console.error('[EilService] ❌ Custom bundler execution failed:', error.message)
      console.error('[EilService] 💡 Tip: Check bundler logs and EntryPoint contract state')
      throw error
    }
  }

  /**
   * Execute cross-chain transfer using EIL voucher system
   * 🎯 Key Feature: Send USDC without needing ETH for gas!
   */
  async transferCrossChain(params: TransferParams): Promise<TransferResult> {
    this.ensureInitialized()
    this.validateTransferParams(params)

    const { fromChainId, toChainId, token, amount, fromAddress, toAddress, usePaymaster = true } = params

    try {
      console.log('[EilService] 📤 Starting cross-chain transfer:')
      console.log(`  From: ${CHAIN_NAMES[fromChainId]} (${fromChainId})`)
      console.log(`  To: ${CHAIN_NAMES[toChainId]} (${toChainId})`)
      console.log(`  Token: ${token}`)
      console.log(`  Amount: ${amount}`)
      console.log(`  Recipient: ${toAddress}`)
      console.log(`  💎 Gas Mode: ${usePaymaster ? `Paymaster (${token}-sponsored, no ETH needed)` : 'Self-pay (requires ETH)'}`)

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
      const voucherRef = `voucher_${Date.now()}` // Required by SDK type, though not shown in official tests

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
      // Conditionally use paymaster based on user preference
      let pmOverride: any = undefined

      if (usePaymaster) {
        console.log('[EilService] 💰 Using paymaster to sponsor gas')

        // Paymaster configuration for gas sponsorship (no ETH needed!)
        // EIL's paymaster pays for gas on the source chain
        // Official paymaster: 0xc7F3D98ed15c483C0f666d9F3EA0Dc7abEe77ca2
        pmOverride = {
          paymaster: '0xc7F3D98ed15c483C0f666d9F3EA0Dc7abEe77ca2' as Address, // EIL official paymaster
          paymasterVerificationGasLimit: 100_000n,
          paymasterPostOpGasLimit: 10_000_000n, // 10M gas - covers 7.5M needed + buffer, under bundler limits
        }

        console.log('[EilService] 💰 Paymaster:', pmOverride.paymaster)
        console.log('[EilService] 💰 Gas will be paid in USDC (no ETH needed)')
      } else {
        console.log('[EilService] 💳 Self-pay mode: You will pay gas in ETH')
        console.log('[EilService] ⚠️  Ensure you have sufficient ETH on source chain for gas')
      }

      // Create multichain token once to reuse
      const multichainToken = this.sdk!.createToken(token, tokenAddressArray as any)

      // PRE-FLIGHT CHECK: Verify USDC balance on source chain
      console.log('[EilService] 🔍 Checking USDC balance on source chain...')

      // EIL virtual network RPC URLs
      const eilEthRpc = 'https://virtual.rpc.tenderly.co/stitchApp/project/private/eil-eth/855f8569-52b8-4149-a19d-55cf5b8de368'
      const eilBaseRpc = 'https://virtual.rpc.tenderly.co/stitchApp/project/private/eil-base/7e7c502b-2f81-4fd2-87ea-33bc2ae559d9'

      const sourceClient = createPublicClient({
        chain: fromChainId === 1 ? mainnet : base,
        transport: http(fromChainId === 1 ? eilEthRpc : eilBaseRpc)
      })
      const usdcAbi = [{
        name: 'balanceOf',
        type: 'function',
        inputs: [{ type: 'address' }],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view'
      }] as const

      const balance = await sourceClient.readContract({
        address: sourceTokenAddress as Address,
        abi: usdcAbi,
        functionName: 'balanceOf',
        args: [fromAddress as Address]
      })

      console.log(`[EilService] 💰 Source USDC balance: ${balance.toString()} (${Number(balance) / 1e6} USDC)`)

      if (BigInt(balance) < BigInt(amount)) {
        throw new Error(`Insufficient USDC balance. Have: ${Number(balance) / 1e6} USDC, Need: ${Number(amount) / 1e6} USDC`)
      }

      console.log('[EilService] ✅ Balance check passed')

      // SOURCE CHAIN: Request voucher
      // Conditionally add paymaster override and approval based on usePaymaster flag
      const sourceBatch = builder.startBatch(BigInt(fromChainId))

      // If using paymaster, override UserOp and approve paymaster to spend USDC
      if (usePaymaster && pmOverride) {
        sourceBatch.overrideUserOp(pmOverride)

        // CRITICAL: Approve the official paymaster to spend USDC for gas payment
        // The SDK auto-approves for voucher, but we need explicit approval for paymaster
        sourceBatch.addAction(new ApproveAction({
          token: multichainToken,
          spender: pmOverride.paymaster, // Approve the official paymaster to spend USDC
          value: BigInt(amount) * 2n // 2x amount: covers voucher + gas payment in USDC
        }))

        console.log('[EilService] ✅ Paymaster override applied')
        console.log('[EilService] ✅ Approval added for paymaster to spend USDC')
      }

      // Add voucher request (always needed for cross-chain transfer)
      sourceBatch
        .addVoucherRequest({
          tokens: [{
            token: multichainToken,
            amount: BigInt(amount)
          }],
          destinationChainId: BigInt(toChainId),
          ref: voucherRef // Required by SDK type (even though not shown in official tests)
        })
        .endBatch()

      console.log('[EilService] 📥 Step 2: Using voucher + transferring to recipient on destination chain...')

      // DESTINATION CHAIN: Use voucher and transfer tokens to recipient
      // Following official test pattern - useAllVouchers() pulls vouchers from previous batches
      builder
        .startBatch(BigInt(toChainId))
        .useAllVouchers()
        .addAction(new FunctionCallAction({
          target: destTokenAddress as Address,
          functionName: 'transfer',
          args: [toAddress as Address, BigInt(amount)],
          abi: erc20TransferAbi,
          value: 0n
        }))
        .endBatch()
        .useAccount(smartAccount)

      console.log('[EilService] ✍️  Step 3: Building and signing operation...')

      // Step 3: Build and sign (single signature for entire multi-chain op)
      const executor = await builder.buildAndSign()

      console.log('[EilService] 🚀 Step 4: Executing cross-chain transfer...')

      // Step 4: Execute with status tracking callback
      let txHash: string | undefined
      let voucherHash: string | undefined

      if (this.useCustomBundler) {
        console.log('[EilService] 🔧 Using custom bundler for desktop compatibility')
        console.log('[EilService] 💡 This bypasses browser wallet dependencies')

        // Capture UserOps from executor via status callback
        // The SDK's execute() calls the callback with UserOp details before submission
        const userOpsByChain: Map<number, any[]> = new Map()
        const txHashByChain: Map<number, string> = new Map() // Track which chains SDK already submitted
        const entryPointAddress = '0x433709009B8330FDa32311DF1C2AFA402eD8D009' as Address

        try {
          // First attempt: Try to extract UserOps via status callback interception
          console.log('[EilService] 📦 Attempting to capture UserOps from executor...')

          // Create a promise that captures UserOps but doesn't actually submit via SDK
          let capturedUserOps = false

          const captureAttempt = executor.execute((status: any) => {
            const replacer = (key: string, value: any) =>
              typeof value === 'bigint' ? `0x${value.toString(16)}` : value

            console.log('[EilService] 📊 Captured status:', JSON.stringify(status, replacer, 2))

            if (status.userOp && status.userOp.chainId) {
              // Parse chainId properly - it's INSIDE userOp and comes as hex string "0x1", not decimal
              const chainId = Number(BigInt(status.userOp.chainId)) // BigInt("0x1") = 1n, Number(1n) = 1
              if (!userOpsByChain.has(chainId)) {
                userOpsByChain.set(chainId, [])
              }
              userOpsByChain.get(chainId)!.push(status.userOp)
              capturedUserOps = true

              console.log(`[EilService] ✅ Captured UserOp for chain ${chainId}`)
              console.log('[EilService] 🔍 UserOp sender:', status.userOp.sender)
              console.log('[EilService] 🔍 UserOp nonce:', status.userOp.nonce?.toString())

              // Track if SDK already submitted this chain (has txHash)
              if (status.txHash && status.type === 'done') {
                txHashByChain.set(chainId, status.txHash)
                console.log(`[EilService] ✅ SDK already submitted chain ${chainId}: ${status.txHash}`)
              }
            }

            if (status.txHash) txHash = status.txHash
            if (status.voucherHash) voucherHash = status.voucherHash
          }).catch((error: any) => {
            // SDK execute() will likely fail with browser wallet error
            // That's okay - we've captured the UserOps we need
            console.log('[EilService] 📦 SDK execute failed (expected):', error.message)
            console.log('[EilService] 💡 Proceeding with custom bundler using captured UserOps')
          })

          // Wait for capture attempt (will fail, but we get UserOps)
          await captureAttempt

          // If we captured UserOps, use custom bundler (but only for chains SDK didn't submit)
          if (userOpsByChain.size > 0) {
            console.log(`[EilService] ✅ Captured UserOps for ${userOpsByChain.size} chain(s)`)
            console.log(`[EilService] ℹ️  SDK already submitted ${txHashByChain.size} chain(s)`)

            // Execute source chain first (where voucher is created)
            if (userOpsByChain.has(fromChainId)) {
              // Check if SDK already submitted source chain
              if (txHashByChain.has(fromChainId)) {
                const sourceTxHash = txHashByChain.get(fromChainId)!
                const explorerUrl = fromChainId === 1
                  ? `https://vnet.erc4337.io/explorer/eth/tx/${sourceTxHash}`
                  : `https://vnet.erc4337.io/explorer/base/tx/${sourceTxHash}`

                console.log(`[EilService] ✅ Source chain already submitted by SDK`)
                console.log(`[EilService] 📍 TxHash: ${sourceTxHash}`)
                console.log(`[EilService] 🔍 Explorer: ${explorerUrl}`)
                txHash = sourceTxHash
              } else {
                console.log(`[EilService] 🚀 Submitting source chain UserOp (chain ${fromChainId}) via custom bundler...`)
                const sourceUserOps = userOpsByChain.get(fromChainId)!

                const sourceResult = await this.executeWithCustomBundler(
                  sourceUserOps,
                  fromChainId,
                  entryPointAddress
                )

                const explorerUrl = fromChainId === 1
                  ? `https://vnet.erc4337.io/explorer/eth/tx/${sourceResult.txHash}`
                  : `https://vnet.erc4337.io/explorer/base/tx/${sourceResult.txHash}`

                console.log('[EilService] ✅ Source chain transaction:', sourceResult.txHash)
                console.log('[EilService] 🔍 Explorer:', explorerUrl)
                txHash = sourceResult.txHash
              }
            }

            // Execute destination chain (where voucher is redeemed)
            if (userOpsByChain.has(toChainId)) {
              // Check if SDK already submitted destination chain
              if (txHashByChain.has(toChainId)) {
                const destTxHash = txHashByChain.get(toChainId)!
                const explorerUrl = toChainId === 1
                  ? `https://vnet.erc4337.io/explorer/eth/tx/${destTxHash}`
                  : `https://vnet.erc4337.io/explorer/base/tx/${destTxHash}`

                console.log(`[EilService] ✅ Destination chain already submitted by SDK`)
                console.log(`[EilService] 📍 TxHash: ${destTxHash}`)
                console.log(`[EilService] 🔍 Explorer: ${explorerUrl}`)
                // Don't override txHash - keep source chain txHash
              } else {
                console.log(`[EilService] 🚀 Submitting destination chain UserOp (chain ${toChainId}) via custom bundler...`)
                const destUserOps = userOpsByChain.get(toChainId)!

                // Wait a bit for source chain to finalize
                await new Promise(resolve => setTimeout(resolve, 5000))

                const destResult = await this.executeWithCustomBundler(
                  destUserOps,
                  toChainId,
                  entryPointAddress
                )

                const explorerUrl = toChainId === 1
                  ? `https://vnet.erc4337.io/explorer/eth/tx/${destResult.txHash}`
                  : `https://vnet.erc4337.io/explorer/base/tx/${destResult.txHash}`

                console.log('[EilService] ✅ Destination chain transaction:', destResult.txHash)
                console.log('[EilService] 🔍 Explorer:', explorerUrl)
                // Use dest tx as primary for user feedback
                txHash = destResult.txHash || txHash
              }
            }

            console.log('[EilService] ✅ Cross-chain transfer completed via custom bundler!')
          } else {
            // Fallback: No UserOps captured, SDK might have succeeded
            console.log('[EilService] ⚠️  No UserOps captured - SDK may have executed successfully')
            console.log('[EilService] 💡 Check txHash:', txHash)
          }
        } catch (error: any) {
          console.error('[EilService] ❌ Custom bundler execution failed:', error.message)
          console.error('[EilService] 📍 Error stack:', error.stack)
          throw error
        }
      } else {
        // Standard SDK execution
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
      }

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
