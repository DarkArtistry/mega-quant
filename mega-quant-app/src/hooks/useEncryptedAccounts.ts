/**
 * React Hook for Encrypted Account Management
 * Uses the backend encrypted storage API
 */

import { useState, useEffect, useCallback } from 'react';
import * as accountStorage from '../utils/accountStorage';

export interface Account {
  id: string;
  name: string;
  address: string;
  private_key: string;
}

interface UseEncryptedAccountsReturn {
  accounts: Account[];
  loading: boolean;
  error: string | null;
  loadAccounts: () => Promise<void>;
  addAccount: (account: Omit<Account, 'id'> & { privateKey: string }) => Promise<void>;
  deleteAccount: (accountId: string) => Promise<void>;
  clearAllAccounts: () => Promise<void>;
}

/**
 * Hook for managing accounts with encrypted backend storage
 *
 * @param password - Master password for encryption/decryption
 * @param autoLoad - Whether to automatically load accounts on mount
 *
 * @example
 * ```tsx
 * const { accounts, addAccount, loading, error } = useEncryptedAccounts(masterPassword);
 *
 * // Add a new account
 * await addAccount({
 *   name: 'My Account',
 *   address: '0x...',
 *   privateKey: '0x...'
 * });
 * ```
 */
export function useEncryptedAccounts(
  password: string,
  autoLoad: boolean = true
): UseEncryptedAccountsReturn {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load all accounts from encrypted database
   */
  const loadAccounts = useCallback(async () => {
    if (!password) {
      setError('Password is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const loadedAccounts = await accountStorage.getAccounts(password);
      setAccounts(loadedAccounts);
    } catch (err: any) {
      setError(err.message || 'Failed to load accounts');
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  }, [password]);

  /**
   * Add a new account to encrypted database
   */
  const addAccount = useCallback(
    async (account: Omit<Account, 'id'> & { privateKey: string }) => {
      if (!password) {
        throw new Error('Password is required');
      }

      setLoading(true);
      setError(null);

      try {
        const accountId = `account-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        await accountStorage.addAccount(password, {
          id: accountId,
          name: account.name,
          address: account.address,
          privateKey: account.privateKey,
        });

        // Reload accounts to reflect changes
        await loadAccounts();
      } catch (err: any) {
        setError(err.message || 'Failed to add account');
        console.error('Failed to add account:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [password, loadAccounts]
  );

  /**
   * Delete an account from encrypted database
   */
  const deleteAccount = useCallback(
    async (accountId: string) => {
      if (!password) {
        throw new Error('Password is required');
      }

      setLoading(true);
      setError(null);

      try {
        await accountStorage.deleteAccount(password, accountId);
        // Reload accounts to reflect changes
        await loadAccounts();
      } catch (err: any) {
        setError(err.message || 'Failed to delete account');
        console.error('Failed to delete account:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [password, loadAccounts]
  );

  /**
   * Clear all accounts from encrypted database
   */
  const clearAllAccounts = useCallback(async () => {
    if (!password) {
      throw new Error('Password is required');
    }

    setLoading(true);
    setError(null);

    try {
      await accountStorage.clearAllAccounts(password);
      setAccounts([]);
    } catch (err: any) {
      setError(err.message || 'Failed to clear accounts');
      console.error('Failed to clear accounts:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [password]);

  // Auto-load accounts on mount if enabled
  useEffect(() => {
    if (autoLoad && password) {
      loadAccounts();
    }
  }, [autoLoad, password, loadAccounts]);

  return {
    accounts,
    loading,
    error,
    loadAccounts,
    addAccount,
    deleteAccount,
    clearAllAccounts,
  };
}
