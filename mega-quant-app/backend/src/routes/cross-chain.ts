/**
 * Cross-Chain Transfer API Routes
 * Handles EIL-based cross-chain transfers between Ethereum and Base
 */

import express from 'express'
import { eilService } from '../lib/eil/EilService.js'
import { TransferParams } from '../lib/eil/types.js'

const router = express.Router()

/**
 * POST /api/cross-chain/transfer
 * Execute a cross-chain transfer
 *
 * Body: {
 *   fromChainId: number,      // Source chain (1 = Ethereum, 8453 = Base)
 *   toChainId: number,         // Destination chain
 *   token: string,             // 'ETH' or 'USDC'
 *   amount: string,            // Amount in wei/smallest unit
 *   fromAddress: string,       // Sender address
 *   toAddress?: string,        // Recipient (defaults to fromAddress)
 *   usePaymaster?: boolean     // If true (default), use paymaster (gas-free). If false, pay gas in ETH
 * }
 */
router.post('/transfer', async (req, res) => {
  try {
    const { fromChainId, toChainId, token, amount, fromAddress, toAddress, sessionPassword, usePaymaster } = req.body

    // Validation
    if (!fromChainId || !toChainId || !token || !amount || !fromAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fromChainId, toChainId, token, amount, fromAddress'
      })
    }

    if (!sessionPassword) {
      return res.status(400).json({
        success: false,
        error: 'Session password required for signing cross-chain transaction'
      })
    }

    // Default recipient to sender's address if not provided
    const recipientAddress = toAddress || fromAddress

    const params: TransferParams = {
      fromChainId,
      toChainId,
      token,
      amount,
      fromAddress,
      toAddress: recipientAddress,
      sessionPassword,
      usePaymaster: usePaymaster !== undefined ? usePaymaster : true // Default to true (paymaster enabled)
    }

    console.log('[CrossChain] Executing transfer:', {
      ...params,
      sessionPassword: '***' // Don't log password
    })

    // Execute transfer
    const result = await eilService.transferCrossChain(params)

    if (result.success) {
      res.json({
        success: true,
        message: 'Transfer completed successfully',
        result
      })
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Transfer failed'
      })
    }
  } catch (error: any) {
    console.error('[CrossChain] Transfer error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    })
  }
})

/**
 * POST /api/cross-chain/estimate
 * Estimate fees and time for a cross-chain transfer
 *
 * Body: Same as /transfer
 */
router.post('/estimate', async (req, res) => {
  try {
    const { fromChainId, toChainId, token, amount, fromAddress, toAddress, usePaymaster } = req.body

    // Validation
    if (!fromChainId || !toChainId || !token || !amount || !fromAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      })
    }

    const recipientAddress = toAddress || fromAddress

    const params: TransferParams = {
      fromChainId,
      toChainId,
      token,
      amount,
      fromAddress,
      toAddress: recipientAddress,
      usePaymaster: usePaymaster !== undefined ? usePaymaster : true // Default to true
    }

    console.log('[CrossChain] Estimating transfer:', params)

    // Get estimate
    const estimate = await eilService.estimateTransfer(params)

    res.json({
      success: true,
      estimate
    })
  } catch (error: any) {
    console.error('[CrossChain] Estimation error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    })
  }
})

/**
 * GET /api/cross-chain/config
 * Get current EIL service configuration
 */
router.get('/config', (req, res) => {
  try {
    const config = eilService.getConfig()

    res.json({
      success: true,
      config
    })
  } catch (error: any) {
    console.error('[CrossChain] Config error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router
