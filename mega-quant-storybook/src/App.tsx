import React, { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { Analysis } from './components/Analysis/Analysis';
import { AccountManager } from './components/AccountManager/AccountManager';
import { Account } from './components/AccountManager/AccountManager';
import './styles/cyberpunk-theme.css';

function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showAccountManager, setShowAccountManager] = useState(false);

  const handleOpenAccountManager = () => {
    setShowAccountManager(true);
  };

  const handleCloseAccountManager = () => {
    setShowAccountManager(false);
  };

  const handleAccountsUpdate = (newAccounts: Account[]) => {
    setAccounts(newAccounts);
    localStorage.setItem('mega-quant-accounts', JSON.stringify(newAccounts));
  };

  // Load accounts from localStorage on mount
  React.useEffect(() => {
    const savedAccounts = localStorage.getItem('mega-quant-accounts');
    if (savedAccounts) {
      try {
        const parsedAccounts = JSON.parse(savedAccounts);
        setAccounts(parsedAccounts);
      } catch (error) {
        console.error('Failed to load saved accounts:', error);
      }
    }
  }, []);

  return (
    <ThemeProvider defaultTheme="dark">
      <div className="cyberpunk-theme grid scanlines">
        <Analysis
          totalBalance={150420.69}
          activeStrategies={3}
          winRate={68.5}
          totalPositionsValue={93002.5}
          maxDrawdown={12.3}
          totalTrades={1247}
          gasReserves={[
            { chain: 'Ethereum', symbol: 'ETH', balance: 2.45, usdValue: 4900, color: '#627EEA' },
            { chain: 'Base', symbol: 'ETH', balance: 1.2, usdValue: 2400, color: '#0052FF' },
            { chain: 'Arbitrum', symbol: 'ETH', balance: 3.1, usdValue: 6200, color: '#28A0F0' },
            { chain: 'Optimism', symbol: 'ETH', balance: 0.8, usdValue: 1600, color: '#FF0420' },
          ]}
          assets={[
            { chain: 'Ethereum', token: 'USDC', symbol: 'USDC', balance: 25000, usdValue: 25000, color: '#2775CA' },
            { chain: 'Ethereum', token: 'WETH', symbol: 'WETH', balance: 5.5, usdValue: 10037.50, color: '#627EEA' },
          ]}
          recentTrades={[
            {
              time: '14:32:15',
              pair: 'ETH/USDC',
              chain: 'Ethereum',
              protocol: 'Uniswap V3',
              tokenIn: { symbol: 'USDC', amount: 912.75 },
              tokenOut: { symbol: 'ETH', amount: 0.5 },
              gasPrice: 25.3,
              blockNumber: 18542301,
              txHash: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890'
            },
          ]}
        />

        <AccountManager
          isOpen={showAccountManager}
          onClose={handleCloseAccountManager}
          accounts={accounts}
          onAccountsUpdate={handleAccountsUpdate}
        />
      </div>
    </ThemeProvider>
  );
}

export default App;