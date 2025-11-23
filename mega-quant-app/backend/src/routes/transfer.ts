/**
 * Direct Transfer API Routes
 * Handles immediate transfers using existing wallet accounts
 */

import express from 'express'
import { directTransferService } from '../lib/transfer/DirectTransferService.js'

const router = express.Router()

/**
 * POST /api/transfer/direct
 * Execute a direct transfer (same-chain only)
 */
router.post('/direct', async (req, res) => {
  try {
    const { fromAddress, toAddress, amount, chainId, tokenAddress, sessionPassword } = req.body

    console.log('[Transfer] Executing direct transfer:', {
      fromAddress,
      toAddress,
      amount,
      chainId,
      tokenAddress: tokenAddress || 'ETH (native)'
    })

    // Validate required fields
    if (!fromAddress || !toAddress || !amount || !chainId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fromAddress, toAddress, amount, chainId'
      })
    }

    if (!sessionPassword) {
      return res.status(400).json({
        success: false,
        error: 'Session password required for signing transaction'
      })
    }

    // Execute transfer
    const result = await directTransferService.transfer({
      fromAddress,
      toAddress,
      amount,
      chainId,
      tokenAddress,
      sessionPassword
    })

    if (result.success) {
      console.log('[Transfer] ✅ Transfer successful:', result.txHash)
      res.json({
        success: true,
        result
      })
    } else {
      console.error('[Transfer] ❌ Transfer failed:', result.error)
      res.status(400).json({
        success: false,
        error: result.error
      })
    }
  } catch (error: any) {
    console.error('[Transfer] Transfer error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Transfer failed'
    })
  }
})

/**
 * POST /api/transfer/estimate
 * Estimate gas cost for a transfer
 */
router.post('/estimate', async (req, res) => {
  try {
    const { fromAddress, toAddress, amount, chainId, tokenAddress } = req.body

    console.log('[Transfer] Estimating gas for transfer:', {
      fromAddress,
      toAddress,
      amount,
      chainId,
      tokenAddress: tokenAddress || 'ETH (native)'
    })

    // Validate required fields
    if (!fromAddress || !toAddress || !amount || !chainId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fromAddress, toAddress, amount, chainId'
      })
    }

    const estimate = await directTransferService.estimateGas({
      fromAddress,
      toAddress,
      amount,
      chainId,
      tokenAddress
    })

    console.log('[Transfer] Gas estimate:', estimate)

    res.json({
      success: true,
      estimate
    })
  } catch (error: any) {
    console.error('[Transfer] Gas estimation error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Gas estimation failed'
    })
  }
})

export default router
