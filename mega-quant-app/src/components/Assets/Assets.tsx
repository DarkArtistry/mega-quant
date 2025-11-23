import React, { useState, useEffect } from 'react';
import { IoWallet, IoRefresh, IoTrendingUp } from 'react-icons/io5';
import { getNetworkById } from '../../config/networks';
import TransferModal from './TransferModal';
import './Assets.css';

interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  icon: string;
}

interface TokenBalance {
  token: Token;
  balance: string;
  usdValue: number;
  loading: boolean;
}

interface NetworkAssets {
  networkId: number;
  networkName: string;
  networkColor: string;
  balances: TokenBalance[];
  totalUsdValue: number;
}

interface AssetsProps {
  sessionPassword?: string;
}

// Token definitions for each network
const TOKENS_BY_NETWORK: Record<number, Token[]> = {
  1: [ // Ethereum
    {
      symbol: 'ETH',
      name: 'Ethereum',
      address: '0x0000000000000000000000000000000000000000', // Native token
      decimals: 18,
      icon: '⟠'
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      decimals: 6,
      icon: '💵'
    }
  ],
  8453: [ // Base
    {
      symbol: 'ETH',
      name: 'Ethereum',
      address: '0x0000000000000000000000000000000000000000', // Native token
      decimals: 18,
      icon: '⟠'
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      decimals: 6,
      icon: '💵'
    }
  ]
};

interface Account {
  id: string;
  name: string;
  address: string;
}

export const Assets: React.FC<AssetsProps> = ({ sessionPassword }) => {
  const [networkAssets, setNetworkAssets] = useState<NetworkAssets[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ethPrice, setEthPrice] = useState<number>(0);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');

  // Transfer modal state
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferModalData, setTransferModalData] = useState<{
    token: Token & { address: string };
    sourceChain: { id: number; name: string; icon: string };
    maxAmount: string;
  } | null>(null);

  // Fetch accounts list
  const fetchAccounts = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/config/accounts');
      const data = await response.json();
      console.log('[Assets] Fetched accounts:', data);
      if (data.success && data.accounts && data.accounts.length > 0) {
        setAccounts(data.accounts);
        // Auto-select the first account
        if (!selectedAccount) {
          setSelectedAccount(data.accounts[0].address);
        }
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    }
  };

  // Fetch ETH price from backend (uses CoinMarketCap API)
  const fetchEthPrice = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/prices/ETH');
      const data = await response.json();
      if (data.success && data.price) {
        console.log('[Assets] ETH price fetched:', data.price);
        setEthPrice(data.price);
      } else {
        console.warn('[Assets] Failed to fetch ETH price, using fallback');
        setEthPrice(2500); // Fallback price
      }
    } catch (err) {
      console.error('Failed to fetch ETH price:', err);
      setEthPrice(2500); // Fallback price
    }
  };

  // Fetch balances for all networks
  const fetchBalances = async () => {
    // ✅ FIX: Don't fetch balances until an account is selected!
    if (!selectedAccount) {
      console.log('[Assets] ⚠️  Waiting for account selection before fetching balances...');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await fetchEthPrice();

      const networks = [1, 8453]; // Ethereum and Base
      const assetsData: NetworkAssets[] = [];

      for (const networkId of networks) {
        const network = getNetworkById(networkId);
        const tokens = TOKENS_BY_NETWORK[networkId] || [];

        if (!network) continue;

        const balances: TokenBalance[] = [];
        let totalUsdValue = 0;

        for (const token of tokens) {
          try {
            // Fetch balance from backend (filtered by selected account)
            const balance = await fetchTokenBalance(networkId, token.address, selectedAccount);
            const balanceNum = parseFloat(balance);

            // Calculate USD value
            let usdValue = 0;
            if (token.symbol === 'ETH') {
              usdValue = balanceNum * ethPrice;
            } else if (token.symbol === 'USDC') {
              usdValue = balanceNum; // USDC is 1:1 with USD
            }

            totalUsdValue += usdValue;

            balances.push({
              token,
              balance,
              usdValue,
              loading: false
            });
          } catch (err) {
            console.error(`Failed to fetch ${token.symbol} balance on ${network.name}:`, err);
            balances.push({
              token,
              balance: '0',
              usdValue: 0,
              loading: false
            });
          }
        }

        assetsData.push({
          networkId,
          networkName: network.displayName,
          networkColor: network.color,
          balances,
          totalUsdValue
        });
      }

      setNetworkAssets(assetsData);
    } catch (err: any) {
      console.error('Failed to fetch balances:', err);
      setError(err.message || 'Failed to load balances');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch token balance from backend
  const fetchTokenBalance = async (networkId: number, tokenAddress: string, accountAddress?: string): Promise<string> => {
    try {
      const url = accountAddress
        ? `http://localhost:3001/api/balances/${networkId}/${tokenAddress}?account=${accountAddress}`
        : `http://localhost:3001/api/balances/${networkId}/${tokenAddress}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        return data.balance;
      } else {
        throw new Error(data.error || 'Failed to fetch balance');
      }
    } catch (err) {
      console.error('Balance fetch error:', err);
      return '0';
    }
  };

  // Refresh balances
  const handleRefresh = () => {
    setRefreshing(true);
    fetchBalances();
  };

  // Handle token click to open transfer modal
  const handleTokenClick = (token: Token, networkId: number, balance: string) => {
    const network = getNetworkById(networkId);
    if (!network) return;

    setTransferModalData({
      token: {
        ...token,
        address: token.address // Ensure address is included
      },
      sourceChain: {
        id: networkId,
        name: network.displayName,
        icon: networkId === 1 ? '⟠' : '🔵'
      },
      maxAmount: balance
    });
    setTransferModalOpen(true);
  };

  useEffect(() => {
    fetchAccounts();
    fetchBalances();
  }, []);

  // Re-fetch balances when selected account changes
  useEffect(() => {
    if (accounts.length > 0) {
      fetchBalances();
    }
  }, [selectedAccount]);

  // Calculate total portfolio value
  const totalPortfolioValue = networkAssets.reduce((sum, network) => sum + network.totalUsdValue, 0);

  if (loading) {
    return (
      <div className="assets">
        <div className="assets__loading">
          <div className="assets__loading-spinner"></div>
          <p>Loading assets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="assets">
        <div className="assets__error">
          <p>Error: {error}</p>
          <button onClick={handleRefresh} className="assets__refresh-button">
            <IoRefresh /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="assets">
      {/* Header */}
      <div className="assets__header">
        <div className="assets__header-left">
          <IoWallet className="assets__header-icon" />
          <h1 className="assets__title">Digital Assets</h1>

          {/* Account Selector */}
          {accounts.length > 0 ? (
            <div className="assets__account-selector">
              <label className="assets__account-label">Wallet:</label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="assets__account-dropdown"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.address}>
                    {account.name} ({account.address.slice(0, 6)}...{account.address.slice(-4)})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="assets__no-accounts">
              <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>
                No accounts found. Please create an account in Manage Nodes.
              </span>
            </div>
          )}
        </div>
        <div className="assets__header-right">
          <div className="assets__total-value">
            <span className="assets__total-label">Account Value</span>
            <span className="assets__total-amount">
              <IoTrendingUp className="assets__trend-icon" />
              ${totalPortfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <button
            onClick={handleRefresh}
            className={`assets__refresh-button ${refreshing ? 'assets__refresh-button--spinning' : ''}`}
            disabled={refreshing}
          >
            <IoRefresh />
          </button>
        </div>
      </div>

      {/* Networks Grid */}
      <div className="assets__networks-grid">
        {networkAssets.map((network) => (
          <div key={network.networkId} className="assets__network-card">
            {/* Network Header */}
            <div
              className="assets__network-header"
              style={{ borderLeftColor: network.networkColor }}
            >
              <div className="assets__network-info">
                <h2 className="assets__network-name">{network.networkName}</h2>
                <span className="assets__network-id">Chain ID: {network.networkId}</span>
              </div>
              <div className="assets__network-total">
                <span className="assets__network-total-label">Total Value</span>
                <span className="assets__network-total-amount">
                  ${network.totalUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Token Balances */}
            <div className="assets__balances-container">
              {network.balances.map((balanceData) => (
                <div
                  key={balanceData.token.symbol}
                  className="assets__balance-card assets__balance-card--clickable"
                  onClick={() => handleTokenClick(balanceData.token, network.networkId, balanceData.balance)}
                  title={`Click to send ${balanceData.token.symbol}`}
                >
                  <div className="assets__balance-header">
                    <div className="assets__token-info">
                      <span className="assets__token-icon">{balanceData.token.icon}</span>
                      <div className="assets__token-details">
                        <span className="assets__token-symbol">{balanceData.token.symbol}</span>
                        <span className="assets__token-name">{balanceData.token.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="assets__balance-amounts">
                    <div className="assets__balance-primary">
                      {parseFloat(balanceData.balance).toLocaleString('en-US', {
                        minimumFractionDigits: 4,
                        maximumFractionDigits: 6
                      })}
                      <span className="assets__balance-symbol"> {balanceData.token.symbol}</span>
                    </div>
                    <div className="assets__balance-usd">
                      ${balanceData.usdValue.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </div>
                  </div>

                  {balanceData.token.symbol === 'ETH' && (
                    <div className="assets__price-info">
                      <span className="assets__price-label">Price:</span>
                      <span className="assets__price-value">
                        ${ethPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Transfer Modal */}
      {transferModalData && (
        <TransferModal
          isOpen={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          token={transferModalData.token}
          sourceChain={transferModalData.sourceChain}
          userAddress={selectedAccount}
          maxAmount={transferModalData.maxAmount}
          sessionPassword={sessionPassword}
        />
      )}
    </div>
  );
};

export default Assets;
