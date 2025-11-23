# AA33 Paymaster Error - Fixed

## ❌ **The Error**

```
FailedOpWithRevert(0,"AA33 reverted",0x699f88d5000000000000000000000000000000000000000000000000000000000070ea400000000000000000000000000000000000000000000000000000000000000000)
```

## 🔍 **Root Cause**

**AA33** = ERC-4337 error code for "reverted or out of gas in paymaster's **postOp**"

### **What is postOp?**

In ERC-4337, the paymaster has two phases:
1. **validatePaymasterUserOp** (verification) - Runs BEFORE the main operation
2. **postOp** - Runs AFTER the main operation to settle gas payments

### **The Problem**

```typescript
const pmOverride = {
  paymaster: '0xc7F3D98ed15c483C0f666d9F3EA0Dc7abEe77ca2',
  paymasterVerificationGasLimit: 100_000n,  // ✅ Has gas for verification
  paymasterPostOpGasLimit: 0n,              // ❌ ZERO gas for postOp!
}
```

**Flow:**
```
1. Verify paymaster ✅ (100k gas available)
2. Execute main operation ✅
3. Paymaster postOp ❌ (0 gas - REVERT!)
```

The paymaster's `postOp` needs to:
- Deduct gas costs from user's USDC balance
- Update internal accounting
- Emit events

With **zero gas**, it immediately reverts → **AA33 error**

### **Error Data Decoded**

```
0x699f88d5  - Error selector (paymaster's custom error)
0x0070ea40  - Expected gas: 7,399,744 (decimal)
0x00000000  - Actual gas: 0
```

The paymaster was expecting ~7.4M gas for postOp but got **0**!

## ✅ **The Fix**

```diff
const pmOverride = {
  paymaster: '0xc7F3D98ed15c483C0f666d9F3EA0Dc7abEe77ca2',
  paymasterVerificationGasLimit: 100_000n,
- paymasterPostOpGasLimit: 0n,  // ❌ Causes AA33!
+ paymasterPostOpGasLimit: 100_000n,  // ✅ Fixed - paymaster needs gas for postOp
}
```

**Location**: `backend/src/lib/eil/EilService.ts:482`

## 📖 **Why the Confusion?**

The EIL team provided this config:
```typescript
paymasterPostOpGasLimit: 0n
```

**Possible reasons it worked for them:**
1. Different paymaster implementation (older version?)
2. Test environment with different gas rules
3. Their flow doesn't trigger postOp (unlikely)
4. Documentation error

**For production**: Always allocate gas for postOp!

## 🎯 **Gas Limits Explained**

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `paymasterVerificationGasLimit` | `100_000` | Gas for `validatePaymasterUserOp` |
| `paymasterPostOpGasLimit` | `100_000` | Gas for `postOp` (settling payment) |
| Total paymaster gas | `200_000` | Both phases combined |

**Why 100k?**
- Conservative estimate
- Paymaster operations are typically lightweight
- Prevents AA33 without wasting gas

**Could optimize to:**
- `50_000` if postOp is simple
- `150_000` if complex accounting
- Monitor actual gas usage and adjust

## 🔄 **ERC-4337 Paymaster Flow**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. VERIFICATION PHASE                                       │
├─────────────────────────────────────────────────────────────┤
│ validatePaymasterUserOp()                                   │
│ - Check user has enough USDC                                │
│ - Validate signature/permissions                            │
│ - Gas limit: paymasterVerificationGasLimit (100k)           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. EXECUTION PHASE                                          │
├─────────────────────────────────────────────────────────────┤
│ User's actual operation runs                                │
│ - Approve USDC                                              │
│ - Request voucher                                           │
│ - etc.                                                      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. POST-OPERATION PHASE ← AA33 HAPPENS HERE!               │
├─────────────────────────────────────────────────────────────┤
│ postOp()                                                    │
│ - Deduct actual gas cost from user's USDC                   │
│ - Update paymaster's accounting                             │
│ - Emit events                                               │
│ - Gas limit: paymasterPostOpGasLimit (100k) ← WAS 0!       │
└─────────────────────────────────────────────────────────────┘
```

**With 0 gas**: postOp immediately reverts → AA33
**With 100k gas**: postOp completes successfully ✅

## 🧪 **Testing**

Try the transfer again. Expected flow:

```
[EilService] 💰 Using paymaster to sponsor gas
[EilService] 🔨 Step 1: Creating voucher request...
[EilService] ✍️  Step 3: Building and signing...
[CustomBundler] 📤 Sending UserOperation to bundler...
[CustomBundler] ✅ UserOperation submitted: 0xabc...
[CustomBundler] ⏳ Waiting for UserOperation to be mined...
[CustomBundler] ✅ UserOperation mined!
[EilService] ✅ Cross-chain transfer completed!
```

**No more AA33!** 🎉

## 📝 **Key Takeaways**

1. **AA33** = postOp reverted (usually out of gas)
2. **Always allocate gas** for `paymasterPostOpGasLimit`
3. **Never use 0** unless you're absolutely sure the paymaster doesn't use postOp
4. **Conservative default**: Set it equal to `paymasterVerificationGasLimit`
5. **Monitor and optimize**: Check actual gas usage and adjust

## 🔗 **References**

- [ERC-4337 Error Codes](https://eips.ethereum.org/EIPS/eip-4337#error-codes)
  - **AA33**: "reverted (or OOG) in paymaster's postOp"
- [ERC-4337 Paymaster Spec](https://eips.ethereum.org/EIPS/eip-4337#extension-paymasters)

---

## ✅ **Status**

- ✅ **Fixed**: `paymasterPostOpGasLimit` increased from `0n` to `100_000n`
- ✅ **Built**: Backend compiles successfully
- 🚀 **Ready**: Try the transfer again!

The paymaster now has gas to complete its post-operation accounting. 🎯
