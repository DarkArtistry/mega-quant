import express from 'express'
import { liveDataService } from '../services/live-data.js'

const router = express.Router()

/**
 * POST /api/rpc/set-custom-urls
 * Manually set custom RPC URLs in memory (bypasses encryption)
 *
 * Body: {
 *   "1": "https://virtual.mainnet.eu.rpc.tenderly.co/...",
 *   "8453": "https://virtual.base.eu.rpc.tenderly.co/..."
 * }
 */
router.post('/set-custom-urls', (req, res) => {
  try {
    const customUrls = req.body

    if (!customUrls || typeof customUrls !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body. Expected object with network IDs as keys.'
      })
    }

    console.log('[RPC] Setting custom RPC URLs:', customUrls)

    // Set custom RPC URLs directly in liveDataService
    liveDataService.setCustomRpcUrls(customUrls)

    res.json({
      success: true,
      message: 'Custom RPC URLs set successfully',
      urls: customUrls
    })
  } catch (error: any) {
    console.error('[RPC] Error setting custom URLs:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/rpc/get-urls
 * Get all current RPC URLs
 */
router.get('/get-urls', (req, res) => {
  try {
    const urls = liveDataService.getAllRpcUrls()

    res.json({
      success: true,
      urls
    })
  } catch (error: any) {
    console.error('[RPC] Error getting URLs:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router
