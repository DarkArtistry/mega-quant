/**
 * Strategy Account Loading Service
 *
 * Loads and decrypts the accounts configured for a strategy
 * This allows strategies to execute without exposing private keys in code
 */

import { getDatabase } from '../db/index.js'
import { deriveKey, decrypt } from '../utils/crypto.js'

// Map network IDs to chain names
const NETWORK_ID_TO_CHAIN_NAME: Record<number, string> = {
  1: 'ethereum',
  8453: 'base',
  11155111: 'sepolia',
  84532: 'base-sepolia'
}

/**
 * Load private keys for all accounts configured for a strategy
 *
 * Loads from in-memory store (populated at unlock).
 * No password needed - app must be unlocked first.
 *
 * @param strategyId - The strategy ID
 * @returns Record mapping chain names to private keys (e.g., { 'ethereum': '0x...', 'base': '0x...' })
 */
import { accountKeyStore } from './account-key-store.js'

export function loadStrategyAccounts(strategyId: string): Record<string, string> {
  try {
    const db = getDatabase()

    if (!accountKeyStore.isAppUnlocked()) {
      throw new Error('App is locked. Please unlock the app before running strategies.')
    }

    // Get strategy account mappings (just the mapping, not the keys)
    const mappings = db.prepare(`
      SELECT
        sam.network_id,
        sam.account_id
      FROM strategy_account_mappings sam
      WHERE sam.strategy_id = ?
    `).all(strategyId) as Array<{
      network_id: number
      account_id: string
    }>

    if (mappings.length === 0) {
      console.warn(`[StrategyAccounts] No accounts configured for strategy ${strategyId}`)
      return {}
    }

    // Load private keys from memory for each network
    const chainPrivateKeys: Record<string, string> = {}

    for (const mapping of mappings) {
      const chainName = NETWORK_ID_TO_CHAIN_NAME[mapping.network_id]

      if (!chainName) {
        console.warn(`[StrategyAccounts] Unknown network ID: ${mapping.network_id}, skipping`)
        continue
      }

      // Get account from memory
      const account = accountKeyStore.getAccount(mapping.account_id)

      if (!account) {
        console.error(`[StrategyAccounts] ❌ Account ${mapping.account_id} not found in memory`)
        continue
      }

      chainPrivateKeys[chainName] = account.privateKey
      console.log(`[StrategyAccounts] ✅ Loaded account "${account.accountName}" (${account.address}) for ${chainName}`)
    }

    if (Object.keys(chainPrivateKeys).length === 0) {
      throw new Error(`Failed to load any accounts for strategy ${strategyId}`)
    }

    return chainPrivateKeys

  } catch (error: any) {
    console.error('[StrategyAccounts] Error loading strategy accounts:', error.message)
    throw new Error(`Failed to load strategy accounts: ${error.message}`)
  }
}

/**
 * Get account mappings for a strategy (without private keys)
 * Useful for UI to display which accounts are configured
 */
export function getStrategyAccountMappings(strategyId: string): Array<{
  networkId: number
  networkName: string
  accountId: string
  accountName: string
  address: string
}> {
  const db = getDatabase()

  const mappings = db.prepare(`
    SELECT
      sam.network_id,
      sam.account_id,
      a.name as account_name,
      a.address
    FROM strategy_account_mappings sam
    INNER JOIN accounts a ON sam.account_id = a.id
    WHERE sam.strategy_id = ?
  `).all(strategyId) as Array<{
    network_id: number
    account_id: string
    account_name: string
    address: string
  }>

  return mappings.map(m => ({
    networkId: m.network_id,
    networkName: NETWORK_ID_TO_CHAIN_NAME[m.network_id] || `Network ${m.network_id}`,
    accountId: m.account_id,
    accountName: m.account_name,
    address: m.address
  }))
}

/**
 * Set account mapping for a strategy network
 */
export function setStrategyAccountMapping(
  strategyId: string,
  networkId: number,
  accountId: string
): void {
  const db = getDatabase()

  db.prepare(`
    INSERT INTO strategy_account_mappings (strategy_id, network_id, account_id)
    VALUES (?, ?, ?)
    ON CONFLICT(strategy_id, network_id)
    DO UPDATE SET account_id = excluded.account_id, updated_at = CURRENT_TIMESTAMP
  `).run(strategyId, networkId, accountId)

  console.log(`[StrategyAccounts] Set account ${accountId} for strategy ${strategyId} network ${networkId}`)
}

/**
 * Remove account mapping for a strategy network
 */
export function removeStrategyAccountMapping(strategyId: string, networkId: number): void {
  const db = getDatabase()

  db.prepare(`
    DELETE FROM strategy_account_mappings
    WHERE strategy_id = ? AND network_id = ?
  `).run(strategyId, networkId)

  console.log(`[StrategyAccounts] Removed account mapping for strategy ${strategyId} network ${networkId}`)
}
