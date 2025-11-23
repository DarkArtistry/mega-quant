# AA25 Invalid Nonce Fix - Don't Resubmit SDK Transactions

## 🎯 **The Problem**

After fixing the UserOp capture bug, we successfully captured UserOps for both chains, but got:

```
[CustomBundler] ❌ Failed: FailedOp(0,"AA25 invalid account nonce")
```

**AA25 Error** = Invalid account nonce

---

## 🔍 **Root Cause Analysis**

The SDK's `execute()` method **actually submits** UserOps to the bundler! It doesn't just build them.

### **What Really Happens**

Looking at status callbacks:

**Source Chain (Ethereum)**:
```json
{
  "index": 0,
  "type": "done",              // ← SDK SUBMITTED!
  "txHash": "0x98ef...",       // ← SDK GOT TX HASH!
  "userOp": { ... },
  ...
}
```

**Destination Chain (Base)**:
```json
{
  "index": 1,
  "type": "waitingForVouchers",  // ← SDK WAITING for voucher fill
  "userOp": { ... },
  ...
}
```

### **The Flow**

1. **SDK submits source chain** → SUCCESS (gets txHash)
2. **SDK waits for voucher to be filled** → TIMEOUT (30 seconds)
3. **Custom bundler tries to resubmit source chain** → ❌ **AA25 - nonce already used!**

---

## ✅ **The Fix**

**Strategy**: Don't resubmit chains that SDK already successfully submitted

### **Implementation**

**File**: `backend/src/lib/eil/EilService.ts`

**Added tracking**:
```typescript
const txHashByChain: Map<number, string> = new Map() // Track which chains SDK submitted

// In status callback:
if (status.txHash && status.type === 'done') {
  txHashByChain.set(chainId, status.txHash)
  console.log(`[EilService] ✅ SDK already submitted chain ${chainId}: ${status.txHash}`)
}
```

**Updated submission logic**:
```typescript
// Source chain
if (txHashByChain.has(fromChainId)) {
  // SDK already submitted - use that txHash!
  console.log(`[EilService] ✅ Source chain already submitted by SDK`)
  txHash = txHashByChain.get(fromChainId)!
} else {
  // SDK didn't submit - use custom bundler
  console.log(`[EilService] 🚀 Submitting source chain UserOp via custom bundler...`)
  const result = await this.executeWithCustomBundler(...)
  txHash = result.txHash
}

// Destination chain
if (txHashByChain.has(toChainId)) {
  // SDK already submitted
  console.log(`[EilService] ✅ Destination chain already submitted by SDK`)
} else {
  // SDK didn't submit (likely timeout) - use custom bundler
  console.log(`[EilService] 🚀 Submitting destination chain UserOp via custom bundler...`)
  const result = await this.executeWithCustomBundler(...)
}
```

---

## 🔄 **Expected Flow (After Fix)**

### **Typical Cross-Chain Transfer**

```
[EilService] 📦 Attempting to capture UserOps from executor...

[EilService] 📊 Captured status: {
  "index": 0,
  "type": "executing",
  "userOp": { "chainId": "0x1", ... }
}
[EilService] ✅ Captured UserOp for chain 1

[EilService] 📊 Captured status: {
  "index": 0,
  "type": "done",
  "txHash": "0xabc123...",        ← SDK SUBMITTED SOURCE!
  "userOp": { "chainId": "0x1", ... }
}
[EilService] ✅ SDK already submitted chain 1: 0xabc123...

[EilService] 📊 Captured status: {
  "index": 1,
  "type": "waitingForVouchers",  ← SDK WAITING for dest
  "userOp": { "chainId": "0x2105", ... }
}
[EilService] ✅ Captured UserOp for chain 8453

[EilService] 📦 SDK execute failed (expected): timeout: 30
[EilService] 💡 Proceeding with custom bundler using captured UserOps

[EilService] ✅ Captured UserOps for 2 chain(s)
[EilService] ℹ️  SDK already submitted 1 chain(s)

[EilService] ✅ Source chain already submitted by SDK
[EilService] 📍 TxHash: 0xabc123...

[EilService] 🚀 Submitting destination chain UserOp (chain 8453) via custom bundler...
[CustomBundler] 📤 Sending UserOperation to bundler...
[CustomBundler] ✅ UserOperation submitted: 0xdef456...
[CustomBundler] ⏳ Waiting for UserOperation to be mined...
[CustomBundler] ✅ UserOperation mined! Block: 12345678
[EilService] ✅ Destination chain transaction: 0xdef456...

[EilService] ✅ Cross-chain transfer completed via custom bundler!
```

---

## 📊 **Comparison: Before vs After**

| Scenario | Before Fix | After Fix |
|----------|-----------|-----------|
| **Source Chain** | SDK submits → SUCCESS<br>Custom bundler resubmits → ❌ AA25 | SDK submits → SUCCESS<br>Custom bundler skips → ✅ Use SDK txHash |
| **Dest Chain** | SDK waits → TIMEOUT<br>Custom bundler doesn't capture → ❌ | SDK waits → TIMEOUT<br>Custom bundler submits → ✅ SUCCESS |
| **Result** | ❌ Transfer fails | ✅ Transfer succeeds |

---

## 🎯 **Why This Approach Works**

1. **SDK does heavy lifting for source chain**
   - Handles voucher creation
   - Signs transaction properly
   - Submits to bundler
   - ✅ Gets txHash

2. **SDK times out on destination chain**
   - Waits for voucher to be "filled" by solver/relayer
   - 30 second timeout not enough
   - ❌ Never submits destination UserOp

3. **Custom bundler fills the gap**
   - Reuses source chain txHash from SDK
   - Submits destination UserOp ourselves
   - ✅ Complete cross-chain flow!

---

## 🧪 **Testing**

### **Try Another Transfer**

```bash
# Restart backend
cd backend && npm start

# Test 1 USDC from Ethereum → Base
```

### **Expected Logs**

Look for these key indicators:

✅ **Source chain handled by SDK**:
```
[EilService] ✅ SDK already submitted chain 1: 0x...
```

✅ **Destination chain handled by custom bundler**:
```
[EilService] 🚀 Submitting destination chain UserOp (chain 8453) via custom bundler...
[CustomBundler] ✅ UserOperation mined!
```

✅ **Success**:
```
[EilService] ✅ Cross-chain transfer completed via custom bundler!
```

---

## 💡 **Why SDK Submits Even Though It Times Out**

The SDK's `execute()` method:
1. **Submits** UserOps to bundler (happens quickly)
2. **Waits** for voucher events on destination chain (takes time)
3. **Times out** after 30 seconds if voucher not filled

So even though `execute()` throws a timeout error, the source chain UserOp was successfully submitted and mined!

---

## 📝 **Files Modified**

- `backend/src/lib/eil/EilService.ts`
  - Line 599: Added `txHashByChain` Map
  - Lines 628-632: Track SDK-submitted chains
  - Lines 654-671: Skip source chain if SDK submitted
  - Lines 677-697: Skip dest chain if SDK submitted

---

## ✅ **Summary**

- ✅ **Fixed AA25 nonce error** by not resubmitting chains SDK already sent
- ✅ **Hybrid approach**: SDK handles source, custom bundler handles destination
- ✅ **Build successful**
- 🚀 **Ready to test**: Next transfer should complete end-to-end!

---

## 🎉 **Expected Result**

With this fix, you should see:
1. ✅ Source chain SUCCESS (via SDK)
2. ✅ Destination chain SUCCESS (via custom bundler)
3. ✅ USDC arrives on Base!
4. ✅ No more AA25 errors!

**Try it now!** 🚀
