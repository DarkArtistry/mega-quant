# Paymaster Toggle Feature

## 🎯 **Overview**

Added a frontend toggle that lets users choose between two gas payment modes for cross-chain transfers:

1. **💰 Gas-Free (Paymaster)** - Official EIL paymaster pays gas in USDC (no ETH needed)
2. **💳 Self-Pay (ETH Required)** - User pays gas in ETH (traditional method)

---

## ✅ **Implementation Complete**

### **Frontend Changes**

**File**: `src/components/CrossChainTransfer/CrossChainTransfer.tsx`

**Added**:
1. `usePaymaster` field to `TransferForm` interface
2. State management with default `usePaymaster: true`
3. Radio button toggle in UI (lines 394-425):
   ```tsx
   <div className="form-group">
     <label className="form-label">
       <span className="label-icon">⛽</span>
       Gas Payment
     </label>
     <div className="recipient-options">
       <label className="radio-label">
         <input
           type="radio"
           checked={form.usePaymaster}
           onChange={() => setForm({ ...form, usePaymaster: true })}
         />
         <span>💰 Gas-Free (Paymaster)</span>
       </label>
       <label className="radio-label">
         <input
           type="radio"
           checked={!form.usePaymaster}
           onChange={() => setForm({ ...form, usePaymaster: false })}
         />
         <span>💳 Self-Pay (ETH Required)</span>
       </label>
     </div>
     <div className="info-box">
       {form.usePaymaster ? (
         <span>✅ No ETH needed! Gas will be paid in {form.token}</span>
       ) : (
         <span>⚠️ Ensure you have sufficient ETH on {fromChain} for gas</span>
       )}
     </div>
   </div>
   ```

4. Include `usePaymaster` in API request (line 185)

---

### **Backend Changes**

#### **1. Types**

**File**: `backend/src/lib/eil/types.ts`

```typescript
export interface TransferParams {
  fromChainId: number
  toChainId: number
  token: string
  amount: string
  fromAddress: string
  toAddress: string
  sessionPassword?: string
  usePaymaster?: boolean // If true, use EIL paymaster (gas-free). If false, pay gas in ETH
}
```

---

#### **2. API Routes**

**File**: `backend/src/routes/cross-chain.ts`

**Changes**:
- Extract `usePaymaster` from request body
- Default to `true` if not specified
- Pass to `EilService.transferCrossChain()`

**Updated endpoints**:
- `POST /api/cross-chain/transfer` - accepts `usePaymaster` parameter
- `POST /api/cross-chain/estimate` - accepts `usePaymaster` parameter

**Example request**:
```json
{
  "fromChainId": 1,
  "toChainId": 8453,
  "token": "USDC",
  "amount": "1000000",
  "fromAddress": "0x...",
  "toAddress": "0x...",
  "usePaymaster": true  // <-- NEW PARAMETER
}
```

---

#### **3. EilService Logic**

**File**: `backend/src/lib/eil/EilService.ts`

**Key changes**:

1. **Extract parameter** (line 416):
   ```typescript
   const { fromChainId, toChainId, token, amount, fromAddress, toAddress, usePaymaster = true } = params
   ```

2. **Logging** (line 425):
   ```typescript
   console.log(`💎 Gas Mode: ${usePaymaster ? `Paymaster (${token}-sponsored, no ETH needed)` : 'Self-pay (requires ETH)'}`)
   ```

3. **Conditional paymaster config** (lines 474-493):
   ```typescript
   let pmOverride: any = undefined

   if (usePaymaster) {
     console.log('[EilService] 💰 Using paymaster to sponsor gas')

     pmOverride = {
       paymaster: '0xc7F3D98ed15c483C0f666d9F3EA0Dc7abEe77ca2' as Address,
       paymasterVerificationGasLimit: 100_000n,
       paymasterPostOpGasLimit: 10_000_000n,
     }

     console.log('[EilService] 💰 Paymaster:', pmOverride.paymaster)
     console.log('[EilService] 💰 Gas will be paid in USDC (no ETH needed)')
   } else {
     console.log('[EilService] 💳 Self-pay mode: You will pay gas in ETH')
     console.log('[EilService] ⚠️  Ensure you have sufficient ETH on source chain for gas')
   }
   ```

4. **Conditional batch building** (lines 534-562):
   ```typescript
   const sourceBatch = builder.startBatch(BigInt(fromChainId))

   // Only apply paymaster if enabled
   if (usePaymaster && pmOverride) {
     sourceBatch.overrideUserOp(pmOverride)

     // Approve paymaster to spend USDC for gas
     sourceBatch.addAction(new ApproveAction({
       token: multichainToken,
       spender: pmOverride.paymaster,
       value: BigInt(amount) * 2n
     }))

     console.log('[EilService] ✅ Paymaster override applied')
     console.log('[EilService] ✅ Approval added for paymaster to spend USDC')
   }

   // Add voucher request (always needed)
   sourceBatch.addVoucherRequest({...}).endBatch()
   ```

---

## 🔄 **How It Works**

### **Gas-Free Mode (Paymaster Enabled)**

```
1. User toggles "💰 Gas-Free (Paymaster)"
2. Frontend sends usePaymaster: true
3. Backend creates paymaster override:
   - Paymaster: 0xc7F3D98ed15c483C0f666d9F3EA0Dc7abEe77ca2
   - VerificationGasLimit: 100k
   - PostOpGasLimit: 10M
4. Backend adds ApproveAction for paymaster to spend USDC
5. Paymaster pays gas, deducts cost from user's USDC balance
6. ✅ User needs ZERO ETH!
```

**Requirements**:
- ✅ User has USDC on source chain
- ❌ User does NOT need ETH

**Logs**:
```
[EilService] 💎 Gas Mode: Paymaster (USDC-sponsored, no ETH needed)
[EilService] 💰 Using paymaster to sponsor gas
[EilService] 💰 Paymaster: 0xc7F3D98ed15c483C0f666d9F3EA0Dc7abEe77ca2
[EilService] ✅ Paymaster override applied
[EilService] ✅ Approval added for paymaster to spend USDC
```

---

### **Self-Pay Mode (Paymaster Disabled)**

```
1. User toggles "💳 Self-Pay (ETH Required)"
2. Frontend sends usePaymaster: false
3. Backend skips paymaster override
4. Backend skips ApproveAction for paymaster
5. User's EOA pays gas in ETH (traditional method)
6. ⚠️ User must have ETH on source chain!
```

**Requirements**:
- ✅ User has USDC on source chain
- ✅ User has ETH on source chain for gas

**Logs**:
```
[EilService] 💎 Gas Mode: Self-pay (requires ETH)
[EilService] 💳 Self-pay mode: You will pay gas in ETH
[EilService] ⚠️  Ensure you have sufficient ETH on source chain for gas
```

---

## 🎨 **UI/UX**

### **Gas Payment Section**

Located below "Recipient" section, above "Action Buttons":

```
⛽ Gas Payment
  ○ 💰 Gas-Free (Paymaster)
  ● 💳 Self-Pay (ETH Required)

✅ No ETH needed! Gas will be paid in USDC
```

### **Info Messages**

**When Paymaster Enabled**:
```
✅ No ETH needed! Gas will be paid in USDC
```

**When Paymaster Disabled**:
```
⚠️ Ensure you have sufficient ETH on Ethereum for gas
```

---

## 🧪 **Testing**

### **Test Case 1: Gas-Free Mode**

```bash
# User has only USDC, no ETH
POST /api/cross-chain/transfer
{
  "fromChainId": 1,
  "toChainId": 8453,
  "token": "USDC",
  "amount": "1000000",
  "fromAddress": "0xB5d8206099422A419149813e53Bf774b5F25ba6b",
  "toAddress": "0x...",
  "sessionPassword": "...",
  "usePaymaster": true
}

# Expected: ✅ Transfer succeeds without ETH
```

### **Test Case 2: Self-Pay Mode**

```bash
# User has both USDC and ETH
POST /api/cross-chain/transfer
{
  "fromChainId": 1,
  "toChainId": 8453,
  "token": "USDC",
  "amount": "1000000",
  "fromAddress": "0xB5d8206099422A419149813e53Bf774b5F25ba6b",
  "toAddress": "0x...",
  "sessionPassword": "...",
  "usePaymaster": false
}

# Expected: ✅ Transfer succeeds, gas paid in ETH
```

### **Test Case 3: Default Behavior**

```bash
# usePaymaster not specified
POST /api/cross-chain/transfer
{
  "fromChainId": 1,
  "toChainId": 8453,
  "token": "USDC",
  "amount": "1000000",
  "fromAddress": "0x...",
  "toAddress": "0x...",
  "sessionPassword": "..."
  # usePaymaster omitted
}

# Expected: ✅ Defaults to usePaymaster: true (gas-free)
```

---

## 📊 **Comparison**

| Feature | Gas-Free (Paymaster) | Self-Pay (ETH) |
|---------|---------------------|----------------|
| **ETH Required** | ❌ No | ✅ Yes |
| **USDC Required** | ✅ Yes (for transfer + gas) | ✅ Yes (for transfer only) |
| **Gas Payment** | USDC (via paymaster) | ETH (traditional) |
| **Approval Needed** | Paymaster + VoucherRegistry | VoucherRegistry only |
| **UserOp Override** | ✅ Yes | ❌ No |
| **Use Case** | Users with no ETH | Users with ETH who prefer traditional method |
| **Default** | ✅ Yes | ❌ No |

---

## 🔧 **Files Modified**

### **Backend**
- ✅ `backend/src/lib/eil/types.ts` - Added `usePaymaster` to `TransferParams`
- ✅ `backend/src/routes/cross-chain.ts` - Accept and pass `usePaymaster` parameter
- ✅ `backend/src/lib/eil/EilService.ts` - Conditional paymaster logic

### **Frontend**
- ✅ `src/components/CrossChainTransfer/CrossChainTransfer.tsx` - UI toggle and state management

---

## 📝 **API Changes**

### **New Parameter**

**Name**: `usePaymaster`
**Type**: `boolean` (optional)
**Default**: `true`
**Description**: If true, use EIL paymaster (gas-free, paid in USDC). If false, pay gas in ETH.

### **Endpoints Updated**

1. `POST /api/cross-chain/transfer`
2. `POST /api/cross-chain/estimate`

---

## 🎯 **Benefits**

1. **User Choice**: Let users decide how to pay for gas
2. **Flexibility**: Support both gas-free and traditional methods
3. **Backward Compatible**: Defaults to gas-free (current behavior)
4. **Clear UX**: Visual indicators show which mode is active
5. **Easy Testing**: Toggle between modes without code changes

---

## 🚀 **Status**

- ✅ **Backend implemented and tested**
- ✅ **Frontend UI complete**
- ✅ **API updated**
- ✅ **Default behavior preserved** (gas-free)
- 🧪 **Ready for end-to-end testing**

---

## 💡 **Future Enhancements**

1. **Auto-detect ETH balance**: Automatically suggest self-pay if user has ETH
2. **Cost comparison**: Show gas cost difference between modes
3. **Gas estimates**: Display estimated gas cost for self-pay mode
4. **Paymaster status**: Check if paymaster is available before enabling

---

## 🎉 **Summary**

The paymaster toggle feature gives users full control over how they pay for cross-chain transfer gas fees. Users can choose between gas-free transfers (using the EIL paymaster) or traditional ETH-based gas payment, all through a simple radio button toggle in the UI.

**Default**: Gas-free mode (paymaster enabled) for best UX! 🚀
