/**
 * Account Storage Utility
 * Provides encrypted account storage using the backend API
 * Accounts are stored in SQLite database with AES-256-GCM encryption
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

export interface Account {
  id: string;
  name: string;
  address: string;
  private_key: string;
}

export interface AccountStorageResponse {
  success: boolean;
  accounts?: Account[];
  account?: Partial<Account>;
  message?: string;
  error?: string;
}

/**
 * Fetch all accounts from encrypted database
 * @param password - Master password for decryption
 */
export async function getAccounts(password: string): Promise<Account[]> {
  try {
    const response = await axios.post<AccountStorageResponse>(
      `${API_BASE_URL}/api/config-encrypted/accounts/get`,
      { password }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch accounts');
    }

    return response.data.accounts || [];
  } catch (error: any) {
    console.error('Failed to fetch accounts:', error);
    throw new Error(error.response?.data?.error || error.message);
  }
}

/**
 * Add a new account to encrypted database
 * @param password - Master password for encryption
 * @param account - Account details (id, name, address, privateKey)
 */
export async function addAccount(
  password: string,
  account: {
    id: string;
    name: string;
    address: string;
    privateKey: string;
  }
): Promise<void> {
  try {
    const response = await axios.post<AccountStorageResponse>(
      `${API_BASE_URL}/api/config-encrypted/accounts/add`,
      {
        password,
        id: account.id,
        name: account.name,
        address: account.address,
        privateKey: account.privateKey,
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to add account');
    }

    console.log('✅ Account saved to encrypted database');
  } catch (error: any) {
    console.error('Failed to add account:', error);
    throw new Error(error.response?.data?.error || error.message);
  }
}

/**
 * Delete an account from encrypted database
 * @param password - Master password
 * @param accountId - Account ID to delete
 */
export async function deleteAccount(
  password: string,
  accountId: string
): Promise<void> {
  try {
    const response = await axios.post<AccountStorageResponse>(
      `${API_BASE_URL}/api/config-encrypted/accounts/delete`,
      { password, accountId }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete account');
    }

    console.log('✅ Account deleted from encrypted database');
  } catch (error: any) {
    console.error('Failed to delete account:', error);
    throw new Error(error.response?.data?.error || error.message);
  }
}

/**
 * Clear all accounts from encrypted database
 * @param password - Master password
 */
export async function clearAllAccounts(password: string): Promise<void> {
  try {
    const response = await axios.post<AccountStorageResponse>(
      `${API_BASE_URL}/api/config-encrypted/accounts/clear`,
      { password }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to clear accounts');
    }

    console.log('✅ All accounts cleared from encrypted database');
  } catch (error: any) {
    console.error('Failed to clear accounts:', error);
    throw new Error(error.response?.data?.error || error.message);
  }
}
