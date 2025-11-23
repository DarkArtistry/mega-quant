# Component Refactoring Summary

## Overview
Refactored AccountManager and APIManager to clarify separation of concerns between global network configuration, global API credentials, and per-strategy private keys.

## Architecture Decision

### Before
- **AccountManager**: Managed private keys + network associations (confusing)
- **APIManager**: Had RPC provider dropdown (redundant)
- **StrategyDeploymentModal**: Didn't exist (private keys had no proper home)

### After
- **AccountManager**: Manages **global network RPC configuration only**
- **APIManager**: Manages **global Alchemy API credentials only**
- **StrategyDeploymentModal**: Manages **per-strategy, per-blockchain private keys**

This creates a clear hierarchy:
1. **Global Network Config** (AccountManager) → Which RPC to use for each network
2. **Global API Credentials** (APIManager) → Alchemy App ID + API Key
3. **Strategy-Specific Keys** (StrategyDeploymentModal) → Private keys per strategy per blockchain

---

## 1. AccountManager Refactoring

### File: `/src/components/AccountManager/AccountManager.tsx`

#### Interface Changes

**Old Interface:**
```typescript
export interface Account {
  address: string;
  privateKey: string;
  networks: number[];
}

export interface AccountManagerProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onAccountsUpdate: (accounts: Account[]) => void;
}
```

**New Interface:**
```typescript
export interface NetworkRPCConfig {
  networkId: number;
  rpcProvider: 'default' | 'alchemy' | 'custom';
  customRpcUrl?: string;
}

export interface AccountManagerProps {
  isOpen: boolean;
  onClose: () => void;
  networkConfigs: NetworkRPCConfig[];
  onConfigsUpdate: (configs: NetworkRPCConfig[]) => void;
}
```

#### Functional Changes

**Removed:**
- Private key input (single/multiple modes)
- Private key validation
- Address derivation
- Account management

**Added:**
- RPC provider selection per network (Default/Alchemy/Custom)
- Custom RPC URL input and validation
- Network-level configuration only

#### UI Changes

**Old UI:**
- "Unified Key" vs "Quantum Keys" toggle
- Private key input fields
- Derived address display
- Connected accounts list

**New UI:**
- Network selection grid (unchanged)
- Per-network RPC provider buttons:
  - **Default**: Uses network's default RPC from config
  - **Alchemy**: Uses Alchemy with credentials from APIManager
  - **Custom**: User-provided RPC URL
- RPC endpoint display based on selection
- Save button (renamed from "Add Account")

#### Modal Title Change
- **Old**: "🔐 ACCOUNT MANAGER"
- **New**: "⚙️ NETWORK RPC CONFIGURATION"

---

## 2. APIManager Refactoring

### File: `/src/components/APIManager/APIManager.tsx`

#### Interface Changes

**Old Interface:**
```typescript
export interface APIConfig {
  rpcProvider: string;          // Dropdown value
  appId: string;
  apiKey: string;
  etherscanApiKey: string;
  coinMarketCapApiKey: string;
}
```

**New Interface:**
```typescript
export interface APIConfig {
  alchemyAppId: string;         // Renamed from appId
  alchemyApiKey: string;        // Renamed from apiKey
  etherscanApiKey?: string;     // Now optional
  coinMarketCapApiKey?: string; // Now optional
}
```

#### UI Changes

**Removed:**
- RPC Provider dropdown (was redundant, only had "Alchemy" option)

**Added:**
- Provider header with Alchemy logo and description
- Field hints explaining purpose of each key
- Visual divider between required and optional keys

**Layout:**
```
⚡ Alchemy
Configure Alchemy API credentials for RPC access across all networks

[Alchemy App ID *]
  → Find your App ID in the Alchemy dashboard

[Alchemy API Key *]
  → Your Alchemy API key will be used for networks configured with Alchemy RPC

--- Optional API Keys ---

[Etherscan API Key (Optional)]
  → For enhanced transaction and contract data

[CoinMarketCap API Key (Optional)]
  → For real-time price data and market information
```

---

## 3. StrategyDeploymentModal (Already Implemented)

### File: `/src/components/StrategyDeploymentModal/StrategyDeploymentModal.tsx`

**Purpose**: Deploy strategies with per-strategy, per-blockchain configuration

**Features:**
- Strategy name and description
- Multi-network selection
- **Private key input per network** (strategy-specific)
- RPC endpoint override per network (strategy-specific)
- Token addresses per network

**Key Distinction**:
- Private keys are **per-strategy, per-network**
- Strategy A on Ethereum can use key X
- Strategy B on Ethereum can use key Y
- Complete isolation between strategies

---

## User Workflow

### Initial Setup

1. **Configure Network RPCs** (AccountManager)
   ```
   - Select which networks to use (e.g., Ethereum, Arbitrum, Polygon)
   - For each network, choose:
     - Default RPC (from network config)
     - Alchemy RPC (requires API Manager setup)
     - Custom RPC (enter URL)
   ```

2. **Configure API Credentials** (APIManager)
   ```
   - Enter Alchemy App ID
   - Enter Alchemy API Key
   - (Optional) Etherscan API Key
   - (Optional) CoinMarketCap API Key
   ```

### Strategy Deployment

3. **Deploy Strategy** (StrategyDeploymentModal)
   ```
   - Enter strategy name
   - Select blockchains for this strategy
   - For each blockchain:
     - Enter private key (specific to this strategy)
     - Override RPC if needed (default uses AccountManager config)
     - Specify tokens to track
   - Deploy
   ```

---

## Data Flow

```
┌─────────────────────────────────────────────────────┐
│  AccountManager                                      │
│  ⚙️ Network RPC Configuration                        │
│                                                      │
│  Ethereum:     [Alchemy]                            │
│  Arbitrum:     [Default]                            │
│  Polygon:      [Custom: https://...]               │
└──────────────────────┬──────────────────────────────┘
                       │ Global network RPC settings
                       ▼
┌─────────────────────────────────────────────────────┐
│  APIManager                                          │
│  ⚡ Alchemy Credentials                              │
│                                                      │
│  App ID:  abc123                                    │
│  API Key: •••••••                                   │
└──────────────────────┬──────────────────────────────┘
                       │ Global API credentials
                       ▼
┌─────────────────────────────────────────────────────┐
│  StrategyDeploymentModal                            │
│  ⚡ Deploy Strategy: "Arbitrage Bot"                │
│                                                      │
│  Ethereum:                                          │
│    Private Key: 0x1234... (strategy-specific)      │
│    RPC: [Use Alchemy from AccountManager]          │
│    Tokens: WETH, USDC                               │
│                                                      │
│  Arbitrum:                                          │
│    Private Key: 0x5678... (different key!)         │
│    RPC: [Override: https://custom-arb-rpc.com]     │
│    Tokens: WETH, USDC                               │
└─────────────────────────────────────────────────────┘
```

---

## Breaking Changes

### For Components Using AccountManager

**Old Usage:**
```typescript
<AccountManager
  isOpen={isOpen}
  onClose={onClose}
  accounts={accounts}
  onAccountsUpdate={handleAccountsUpdate}
/>
```

**New Usage:**
```typescript
<AccountManager
  isOpen={isOpen}
  onClose={onClose}
  networkConfigs={networkConfigs}
  onConfigsUpdate={handleConfigsUpdate}
/>
```

### For Components Using APIManager

**Old Data Structure:**
```typescript
{
  rpcProvider: 'alchemy',
  appId: 'abc123',
  apiKey: 'xyz789',
  etherscanApiKey: 'eth123',
  coinMarketCapApiKey: 'cmc456'
}
```

**New Data Structure:**
```typescript
{
  alchemyAppId: 'abc123',      // renamed
  alchemyApiKey: 'xyz789',     // renamed
  etherscanApiKey: 'eth123',   // now optional
  coinMarketCapApiKey: 'cmc456' // now optional
}
```

---

## Migration Guide

### For Existing Accounts Data

If you have existing `Account[]` data stored:

```typescript
// Old data
const oldAccounts: Account[] = [
  {
    address: '0x123...',
    privateKey: '0xabc...',
    networks: [1, 137, 42161]
  }
];

// Migration: Extract network list, discard private keys
const networkConfigs: NetworkRPCConfig[] = [
  { networkId: 1, rpcProvider: 'default' },
  { networkId: 137, rpcProvider: 'default' },
  { networkId: 42161, rpcProvider: 'default' }
];

// Note: Private keys should be re-entered per-strategy
// during strategy deployment
```

### For Existing API Config Data

```typescript
// Old data
const oldConfig: OldAPIConfig = {
  rpcProvider: 'alchemy', // discarded
  appId: 'abc123',
  apiKey: 'xyz789',
  etherscanApiKey: 'eth123',
  coinMarketCapApiKey: 'cmc456'
};

// Migration: Rename fields
const newConfig: APIConfig = {
  alchemyAppId: oldConfig.appId,
  alchemyApiKey: oldConfig.apiKey,
  etherscanApiKey: oldConfig.etherscanApiKey,
  coinMarketCapApiKey: oldConfig.coinMarketCapApiKey
};
```

---

## Future Extensibility

### Adding New RPC Providers (e.g., Infura, QuickNode)

1. **AccountManager**: Add new provider option to `rpcProvider` type:
   ```typescript
   rpcProvider: 'default' | 'alchemy' | 'infura' | 'quicknode' | 'custom'
   ```

2. **APIManager**: Add new credential section:
   ```typescript
   interface APIConfig {
     alchemyAppId: string;
     alchemyApiKey: string;
     infuraProjectId?: string;     // NEW
     infuraApiKey?: string;        // NEW
     quicknodeEndpoint?: string;   // NEW
     // ...
   }
   ```

3. **AccountManager UI**: Add new provider button to each network config

This keeps the architecture clean and scalable!

---

## Files Modified

1. ✅ `/src/components/AccountManager/AccountManager.tsx` - Complete refactor
2. ✅ `/src/components/APIManager/APIManager.tsx` - Simplified
3. ⏸️ `/src/components/AccountManager/AccountManager.css` - May need style updates
4. ⏸️ `/src/components/APIManager/APIManager.css` - May need style updates for new elements

**Note**: CSS files may need minor updates to style new elements like provider buttons and dividers.

---

**Last Updated**: 2025-11-05
**Author**: Claude Code (Anthropic)
