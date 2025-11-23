# Improvements Based on Official EIL SDK Tests

## 📖 **Source**

Analyzed: https://github.com/CodeBeachClub/stitchSDK/blob/main/tests/protocols.spec.ts

## 🔍 **Key Findings**

### **1. ApproveAction for Voucher is NOT Needed** ❌

**Official tests pattern:**
```typescript
builder.createBatch(ARB).addVoucherRequest({
  tokens: [{ token: USDC, amount: supplyAmount }],
  destinationChainId: BASE,
});
// NO ApproveAction before addVoucherRequest!
```

**Our current code:**
```typescript
.addAction(new ApproveAction({
  token: multichainToken,
  spender: '0xdcaFF3CF6ae607Ed39B02ef61696606EF6D17068', // VoucherRegistry
  value: BigInt(amount)
}))
.addVoucherRequest({ ... })
```

**Why remove it:**
- SDK handles voucher approval internally
- Adding manual approval may cause double-approval or conflicts
- All official tests work without it

---

### **2. `ref` Parameter Not Used** ❌

**Official tests:**
```typescript
.addVoucherRequest({
  tokens: [{ token: USDC, amount: supplyAmount }],
  destinationChainId: BASE,
  // NO ref parameter
});
```

**Our current code:**
```typescript
.addVoucherRequest({
  tokens: [...],
  destinationChainId: BigInt(toChainId),
  ref: voucherRef  // Not in official tests
})
```

**Impact:** Likely harmless but unnecessary. SDK probably generates refs internally.

---

### **3. API Method: `createBatch` vs `startBatch`** ⚠️

**Official tests:**
```typescript
builder.createBatch(ARB)
  .addVoucherRequest({ ... });

builder.createBatch(BASE)
  .useAllVouchers()
  .addAction(...)
  .addAction(...);
```

**Our current code:**
```typescript
builder.startBatch(BigInt(fromChainId))
  .addVoucherRequest({ ... })
  .endBatch()

builder.startBatch(BigInt(toChainId))
  .useAllVouchers()
  ...
  .endBatch()
```

**Differences:**
- Official uses `createBatch` (no `endBatch` visible in tests)
- We use `startBatch` + `endBatch`
- Both might work, but official pattern is simpler

---

### **4. Paymaster Not Used in Tests** ℹ️

Official tests **don't use paymaster override**:
```typescript
// Tests fund account with ETH for first transaction
await fund(clientArb, account.addressOn(ARB), 1000000000000000000n);

// NO paymaster override shown
```

**Our code has paymaster:**
```typescript
const pmOverride = {
  paymaster: '0xc7F3D98ed15c483C0f666d9F3EA0Dc7abEe77ca2',
  ...
}
```

**Resolution:** Keep it! You got this from EIL team specifically for gas-free transactions. Tests use a different approach (funding with ETH).

---

### **5. Token Transfer Pattern** ✅

**Official tests pattern for destination chain:**
```typescript
builder
  .createBatch(BASE)
  .useAllVouchers()
  .addAction(new ApproveAction({  // Only approve for DESTINATION protocol
    token: USDC,
    spender: aavePool.addressOn(BASE),  // Approve Aave, not VoucherRegistry
    value: maxUint256,
  }))
  .addAction(new AaveSupplyAction(...))  // Then interact with protocol
```

**Our code:**
```typescript
builder
  .startBatch(BigInt(toChainId))
  .useAllVouchers()
  .addAction(new FunctionCallAction({  // Direct ERC20 transfer
    target: destTokenAddress,
    functionName: 'transfer',
    args: [toAddress, BigInt(amount)],
    ...
  }))
```

**Analysis:**
- Official tests approve DESTINATION protocol (Aave, Morpho, etc.), not voucher
- Our pattern is simpler (just transfer USDC to recipient)
- Both are valid - depends on use case

---

## ✅ **Recommended Changes**

### **Change 1: Remove Voucher ApproveAction**

```diff
builder
  .startBatch(BigInt(fromChainId))
  .overrideUserOp(pmOverride)
- // CRITICAL: Approve voucher contract to spend USDC before requesting voucher
- .addAction(new ApproveAction({
-   token: multichainToken,
-   spender: '0xdcaFF3CF6ae607Ed39B02ef61696606EF6D17068',
-   value: BigInt(amount)
- }))
  .addVoucherRequest({
    tokens: [{
      token: multichainToken,
      amount: BigInt(amount)
    }],
    destinationChainId: BigInt(toChainId),
-   ref: voucherRef
  })
  .endBatch()
```

### **Change 2: Remove `ref` Parameter**

```diff
.addVoucherRequest({
  tokens: [{
    token: multichainToken,
    amount: BigInt(amount)
  }],
  destinationChainId: BigInt(toChainId),
- ref: voucherRef
})
```

### **Change 3: Consider `createBatch` API**

```diff
- builder.startBatch(BigInt(fromChainId))
+ builder.createBatch(BigInt(fromChainId))
  ...
- .endBatch()

- builder.startBatch(BigInt(toChainId))
+ builder.createBatch(BigInt(toChainId))
  ...
- .endBatch()
  .useAccount(smartAccount)
```

---

## 🧪 **Testing Priority**

1. **High Priority**: Remove ApproveAction for voucher - likely causing issues
2. **Medium Priority**: Remove `ref` parameter - probably harmless but unnecessary
3. **Low Priority**: Try `createBatch` - `startBatch` might work fine

---

## 📝 **Simplified Pattern (Based on Official Tests)**

```typescript
// SOURCE CHAIN: Request voucher
builder
  .createBatch(fromChainId)
  .overrideUserOp(pmOverride)  // Your paymaster config (not in tests but from EIL team)
  .addVoucherRequest({
    tokens: [{ token: multichainToken, amount: BigInt(amount) }],
    destinationChainId: toChainId,
  })

// DESTINATION CHAIN: Use voucher + transfer
builder
  .createBatch(toChainId)
  .useAllVouchers()
  .addAction(new FunctionCallAction({
    target: destTokenAddress,
    functionName: 'transfer',
    args: [toAddress, BigInt(amount)],
    abi: erc20TransferAbi,
    value: 0n
  }))
  .useAccount(smartAccount)

const executor = await builder.buildAndSign()
await executor.execute(...)
```

---

## 💡 **Why Our Current Checksum Error Happened**

The `ApproveAction` we added is probably the issue! If the SDK doesn't expect manual approval of the VoucherRegistry, passing the wrong checksummed address could cause the error we saw.

**Hypothesis:** Removing the ApproveAction will fix most issues because:
1. SDK handles voucher approval internally
2. We were adding an unnecessary/conflicting approval
3. The checksum error was triggered by our manual ApproveAction

---

## 🚀 **Next Steps**

1. **Remove ApproveAction for voucher** (lines 495-499 in EilService.ts)
2. **Remove `ref` parameter** (line 506)
3. **Test transfer** - should work much better!
4. **Optional**: Try `createBatch` instead of `startBatch` if issues persist

---

**The official tests are the ground truth - our code added too much manual intervention!** 🎯
