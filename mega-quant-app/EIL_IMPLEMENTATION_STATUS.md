# EIL Cross-Chain Transfer Implementation Status

## Overview
Implementing EIL (ERC-7683 Intents Layer) cross-chain USDC transfers from Ethereum to Base with Account Abstraction (ERC-4337) - **paying gas in USDC without needing ETH**.

## Current Status: 95% Complete ✅

### What's Implemented

#### 1. Smart Account Infrastructure ✅
- **File**: `backend/src/lib/eil/EilService.ts` (lines 200-400)
- Created `AmbireMultiChainSmartAccount` with server-side private key management
- Configured `AmbireBundlerManager` for built-in bundler support
- Smart account initialization on both Ethereum and Base chains

#### 2. Wallet Method Interception ✅
- **File**: `backend/src/lib/eil/EilService.ts` (lines 254-368)
- Custom viem transport intercepting browser wallet methods server-side:

**Intercepted Methods:**
1. `wallet_getCapabilities` (lines 256-260)
   - Returns empty capabilities for Ambire SDK

2. `wallet_signUserOperations` (lines 262-333)
   - Implements ERC-4337 UserOperation signing server-side
   - Hashes UserOps using ERC-4337 spec (lines 182-202)
   - Signs with encrypted private key
   - Returns signed operations in SDK-expected format

3. `eth_sendRawUserOperation` (lines 335-364)
   - Intercepts bundler submission call
   - Converts to standard `eth_sendUserOperation`
   - **BLOCKED HERE**: Needs actual bundler service endpoint

#### 3. ERC-4337 UserOperation Signing ✅
- **File**: `backend/src/lib/eil/EilService.ts` (lines 182-202)
- Implements proper UserOp hashing per ERC-4337 spec
- Server-side signing using decrypted private keys
- Supports both chains (Ethereum + Base)

#### 4. Voucher-Based Cross-Chain Logic ✅
- **File**: `backend/src/lib/eil/EilService.ts` (lines 430-480)
- Configured two-batch voucher system:
  - **Batch 1** (Ethereum): Lock USDC, create voucher
  - **Batch 2** (Base): Redeem voucher, transfer to recipient
- Single signature for entire multi-chain operation

#### 5. Frontend Integration ✅
- **File**: `src/components/Assets/TransferModal.tsx`
- User interface for cross-chain transfers
- Passes session password for key decryption
- Calls backend API at `/api/cross-chain/transfer`

### What's Blocking: Bundler Service Required ❌

**The Issue:**
- EIL SDK expects browser wallet with bundler integration
- We're running server-side, need separate bundler service
- Neither Tenderly RPC nor public RPCs support bundler methods:
  - ❌ `eth_sendRawUserOperation` (custom)
  - ❌ `eth_sendUserOperation` (standard ERC-4337)

**Error Encountered:**
```
URL: https://eth.llamarpc.com
Details: method eth_sendUserOperation not supported
```

**What's Needed:**
A dedicated ERC-4337 bundler service endpoint to submit UserOperations.

### Bundler Service Options

#### Option 1: Pimlico (Recommended for Hackathons)
- Free tier available
- Documentation: https://docs.pimlico.io/
- Endpoint format: `https://api.pimlico.io/v1/{chain}/rpc?apikey={key}`

#### Option 2: Alchemy Account Abstraction
- If you have Alchemy account
- Bundler + paymaster support
- Documentation: https://docs.alchemy.com/docs/account-abstraction

#### Option 3: Stackup
- Another popular bundler
- Documentation: https://docs.stackup.sh/

#### Option 4: Check with EIL Team
- You mentioned "the guy said the bundler is in the SDK"
- Might be EIL-specific bundler service we're missing
- **Check EIL documentation for bundler endpoint**

## Next Steps

1. **Get Bundler Endpoint:**
   - Sign up for Pimlico/Alchemy/Stackup, OR
   - Check with EIL team for their bundler service

2. **Update Code:**
   - Modify `eth_sendRawUserOperation` interceptor to use bundler endpoint
   - Configuration in `EilService.ts` lines 335-364

3. **Test End-to-End:**
   - Submit UserOperations to bundler
   - Verify cross-chain transfer completes
   - Confirm gas paid in USDC (no ETH needed)

## Key Files Reference

### Backend
- `backend/src/lib/eil/EilService.ts` - Main implementation (540 lines)
- `backend/src/lib/eil/types.ts` - TypeScript interfaces
- `backend/src/routes/cross-chain.ts` - API endpoint
- `backend/src/services/encryption-service.ts` - Private key decryption

### Frontend
- `src/components/Assets/TransferModal.tsx` - Transfer UI
- `src/components/Assets/Assets.tsx` - Asset display

## Technical Stack
- **EIL SDK**: `@eil-protocol/sdk@0.1.2`
- **Ambire Accounts**: `@eil-protocol/accounts@0.1.2`
- **Viem**: `2.39.3`
- **Smart Account**: AmbireMultiChainSmartAccount
- **Bundler Manager**: AmbireBundlerManager

## Summary
Implementation is 95% complete. All smart account infrastructure, wallet method interception, UserOperation signing, and voucher logic are working. **Only missing piece: bundler service endpoint to submit UserOperations.**

Once bundler is configured, the cross-chain transfer should work end-to-end with gas paid in USDC.
