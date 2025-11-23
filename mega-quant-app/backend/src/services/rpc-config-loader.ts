/**
 * RPC Configuration Loader
 *
 * Loads network RPC configurations from database and constructs proper RPC URLs
 * based on user's managed node configuration (Alchemy, Infura, or custom).
 */

import { getDatabase } from '../db/index.js'

export interface NetworkRpcConfig {
  networkId: number
  rpcProvider: string  // 'default', 'alchemy', 'infura', 'custom'
  customRpcUrl: string | null
}

/**
 * Load all network RPC configurations from database
 */
export function loadNetworkRpcConfigs(): NetworkRpcConfig[] {
  try {
    const db = getDatabase()
    const configs = db.prepare(`
      SELECT network_id, rpc_provider
      FROM network_rpc_configs
      ORDER BY network_id
    `).all() as any[]

    return configs.map(config => ({
      networkId: config.network_id,
      rpcProvider: config.rpc_provider || 'default',
      customRpcUrl: null // Cannot decrypt without encryption key
    }))
  } catch (error) {
    console.error('[RpcConfigLoader] Error loading network configs:', error)
    return []
  }
}

/**
 * Check if Alchemy API key is configured (encrypted) in database
 * Returns true if key exists but is encrypted, false otherwise
 */
export function hasEncryptedAlchemyApiKey(): boolean {
  try {
    const db = getDatabase()
    const config = db.prepare(`
      SELECT alchemy_api_key_encrypted
      FROM api_configs
      WHERE id = 1
    `).get() as { alchemy_api_key_encrypted: string | null } | undefined

    return !!config?.alchemy_api_key_encrypted
  } catch (error) {
    return false
  }
}

/**
 * Get Alchemy API key from database
 * Note: Always returns null since the key is encrypted
 * Use the unlock system to decrypt and provide the key
 */
export function getAlchemyApiKey(): string | null {
  // Always return null - the key must be decrypted via unlock system
  return null
}

/**
 * Build RPC URL for a network based on configuration
 */
export function buildRpcUrl(
  networkId: number,
  rpcProvider: string,
  alchemyApiKey: string | null,
  fallbackUrl: string
): string {
  // If provider is 'alchemy' and we have an API key, use Alchemy
  if (rpcProvider === 'alchemy' && alchemyApiKey) {
    const alchemyUrls: Record<number, string> = {
      1: `https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
      11155111: `https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`,
      8453: `https://base-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
      84532: `https://base-sepolia.g.alchemy.com/v2/${alchemyApiKey}`,
      10: `https://opt-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
      42161: `https://arb-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
      137: `https://polygon-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
    }

    const alchemyUrl = alchemyUrls[networkId]
    if (alchemyUrl) {
      console.log(`[RpcConfigLoader] Using Alchemy for network ${networkId}`)
      return alchemyUrl
    }
  }

  // TODO: Handle 'custom' provider with decrypted URL
  // For now, fall back to default
  console.log(`[RpcConfigLoader] Using fallback RPC for network ${networkId}`)
  return fallbackUrl
}

/**
 * Load all RPC URLs based on database configuration
 */
export function loadRpcUrls(fallbackUrls: Record<number, string>): Record<number, string> {
  const configs = loadNetworkRpcConfigs()
  const alchemyApiKey = getAlchemyApiKey()
  const hasEncryptedKey = hasEncryptedAlchemyApiKey()

  console.log(`[RpcConfigLoader] Loaded ${configs.length} network configurations`)
  if (hasEncryptedKey) {
    console.log(`[RpcConfigLoader] ⚠️  Alchemy API key is ENCRYPTED - send unlock message to decrypt`)
  } else {
    console.log(`[RpcConfigLoader] Alchemy API key: NOT CONFIGURED`)
  }

  const rpcUrls: Record<number, string> = { ...fallbackUrls }

  // Override with configured networks
  for (const config of configs) {
    const fallbackUrl = fallbackUrls[config.networkId]
    if (fallbackUrl) {
      rpcUrls[config.networkId] = buildRpcUrl(
        config.networkId,
        config.rpcProvider,
        alchemyApiKey,
        fallbackUrl
      )
    }
  }

  return rpcUrls
}
