import express from 'express'
import { getDatabase } from '../db/index.js'

const router = express.Router()

// ============================================================================
// API Configs Routes
// ============================================================================

// Get API configuration
router.get('/api-config', (req, res) => {
  try {
    const db = getDatabase()
    const config = db.prepare(`
      SELECT
        alchemy_app_id,
        alchemy_api_key,
        etherscan_api_key,
        coinmarketcap_api_key,
        updated_at
      FROM api_configs
      WHERE id = 1
    `).get()

    res.json({
      success: true,
      config: config || {
        alchemy_app_id: '',
        alchemy_api_key: '',
        etherscan_api_key: '',
        coinmarketcap_api_key: ''
      }
    })
  } catch (error: any) {
    console.error('Error fetching API config:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch API configuration'
    })
  }
})

// Update API configuration
router.put('/api-config', (req, res) => {
  try {
    const { alchemyAppId, alchemyApiKey, etherscanApiKey, coinMarketCapApiKey } = req.body
    const db = getDatabase()

    db.prepare(`
      UPDATE api_configs
      SET
        alchemy_app_id = ?,
        alchemy_api_key = ?,
        etherscan_api_key = ?,
        coinmarketcap_api_key = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(
      alchemyAppId || null,
      alchemyApiKey || null,
      etherscanApiKey || null,
      coinMarketCapApiKey || null
    )

    res.json({
      success: true,
      message: 'API configuration updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating API config:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update API configuration'
    })
  }
})

// ============================================================================
// Accounts Routes
// ============================================================================

// Get all accounts
router.get('/accounts', (req, res) => {
  try {
    const db = getDatabase()
    const accounts = db.prepare(`
      SELECT id, name, address, account_type, created_at, updated_at
      FROM accounts
      ORDER BY created_at DESC
    `).all()

    console.log('[Config] Fetched accounts:', accounts)

    res.json({
      success: true,
      accounts: accounts || []
    })
  } catch (error: any) {
    console.error('Error fetching accounts:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch accounts'
    })
  }
})

// Add new account
router.post('/accounts', (req, res) => {
  try {
    const { id, name, address, privateKey } = req.body

    if (!id || !name || !address || !privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: id, name, address, privateKey'
      })
    }

    const db = getDatabase()

    // Check if account with same name already exists
    const existing = db.prepare('SELECT id FROM accounts WHERE name = ?').get(name)
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An account with this name already exists'
      })
    }

    db.prepare(`
      INSERT INTO accounts (id, name, address, private_key)
      VALUES (?, ?, ?, ?)
    `).run(id, name, address, privateKey)

    res.json({
      success: true,
      message: 'Account added successfully',
      account: { id, name, address }
    })
  } catch (error: any) {
    console.error('Error adding account:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add account'
    })
  }
})

// Delete account
router.delete('/accounts/:id', (req, res) => {
  try {
    const { id } = req.params
    const db = getDatabase()

    const result = db.prepare('DELETE FROM accounts WHERE id = ?').run(id)

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      })
    }

    res.json({
      success: true,
      message: 'Account deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting account:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete account'
    })
  }
})

// Clear all accounts
router.delete('/accounts', (req, res) => {
  try {
    const db = getDatabase()
    db.prepare('DELETE FROM accounts').run()

    res.json({
      success: true,
      message: 'All accounts cleared successfully'
    })
  } catch (error: any) {
    console.error('Error clearing accounts:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to clear accounts'
    })
  }
})

// ============================================================================
// Network RPC Configs Routes
// ============================================================================

// Get all network RPC configurations
router.get('/network-configs', (req, res) => {
  try {
    const db = getDatabase()
    const configs = db.prepare(`
      SELECT network_id, rpc_provider, custom_rpc_url, updated_at
      FROM network_rpc_configs
      ORDER BY network_id
    `).all()

    res.json({
      success: true,
      configs: configs || []
    })
  } catch (error: any) {
    console.error('Error fetching network configs:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch network configurations'
    })
  }
})

// Save network RPC configurations (replaces all configs)
router.post('/network-configs', (req, res) => {
  try {
    const { configs } = req.body

    if (!Array.isArray(configs)) {
      return res.status(400).json({
        success: false,
        error: 'configs must be an array'
      })
    }

    const db = getDatabase()

    // Use transaction to replace all configs atomically
    db.transaction(() => {
      // Clear existing configs
      db.prepare('DELETE FROM network_rpc_configs').run()

      // Insert new configs
      const insertStmt = db.prepare(`
        INSERT INTO network_rpc_configs (network_id, rpc_provider, custom_rpc_url)
        VALUES (?, ?, ?)
      `)

      for (const config of configs) {
        insertStmt.run(
          config.networkId,
          config.rpcProvider || 'default',
          config.customRpcUrl || null
        )
      }
    })()

    res.json({
      success: true,
      message: 'Network configurations saved successfully'
    })
  } catch (error: any) {
    console.error('Error saving network configs:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save network configurations'
    })
  }
})

export default router
