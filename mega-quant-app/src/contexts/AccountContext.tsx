import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Account } from '../components/AccountManager/AccountManager';

interface AccountContextType {
  accounts: Account[];
  addAccount: (account: Account) => void;
  removeAccount: (index: number) => void;
  updateAccounts: (accounts: Account[]) => void;
  getAccountsForNetwork: (networkId: number) => Account[];
  clearAllAccounts: () => void;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

const STORAGE_KEY = 'mega-quant-accounts';

// Encrypt/decrypt functions for basic security (in production, use proper encryption)
const encrypt = (data: string): string => {
  // Simple base64 encoding for demo - use proper encryption in production
  return btoa(encodeURIComponent(data));
};

const decrypt = (data: string): string => {
  try {
    return decodeURIComponent(atob(data));
  } catch {
    return '';
  }
};

export const AccountProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Load accounts from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const decrypted = decrypt(stored);
        const parsed = JSON.parse(decrypted);
        if (Array.isArray(parsed)) {
          setAccounts(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
      // Clear corrupted data
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Save accounts to localStorage whenever they change
  useEffect(() => {
    try {
      if (accounts.length > 0) {
        const encrypted = encrypt(JSON.stringify(accounts));
        localStorage.setItem(STORAGE_KEY, encrypted);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to save accounts:', error);
    }
  }, [accounts]);

  const addAccount = (account: Account) => {
    setAccounts(prev => {
      // Check if account already exists
      const existingIndex = prev.findIndex(acc => acc.privateKey === account.privateKey);
      if (existingIndex >= 0) {
        // Merge networks
        const updated = [...prev];
        updated[existingIndex].networks = [
          ...new Set([...updated[existingIndex].networks, ...account.networks])
        ];
        return updated;
      }
      return [...prev, account];
    });
  };

  const removeAccount = (index: number) => {
    setAccounts(prev => prev.filter((_, i) => i !== index));
  };

  const updateAccounts = (newAccounts: Account[]) => {
    setAccounts(newAccounts);
  };

  const getAccountsForNetwork = (networkId: number): Account[] => {
    return accounts.filter(account => account.networks.includes(networkId));
  };

  const clearAllAccounts = () => {
    setAccounts([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AccountContext.Provider value={{
      accounts,
      addAccount,
      removeAccount,
      updateAccounts,
      getAccountsForNetwork,
      clearAllAccounts
    }}>
      {children}
    </AccountContext.Provider>
  );
};

export const useAccounts = () => {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccounts must be used within an AccountProvider');
  }
  return context;
};