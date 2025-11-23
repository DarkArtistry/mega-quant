import express from 'express'
import { priceService } from '../lib/trading/services/PriceService.js'

const router = express.Router()

/**
 * GET /api/prices/:symbol
 * Get USD price for a token symbol (e.g., ETH, USDC, BTC)
 */
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required'
      })
    }

    const price = await priceService.getTokenPriceUSD(symbol)

    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      price,
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('[Prices] Error fetching price:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/prices/batch
 * Get USD prices for multiple token symbols
 *
 * Body: {
 *   symbols: ['ETH', 'USDC', 'BTC']
 * }
 */
router.post('/batch', async (req, res) => {
  try {
    const { symbols } = req.body

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Symbols array is required'
      })
    }

    const prices = await priceService.getMultiplePricesUSD(symbols)

    res.json({
      success: true,
      prices,
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('[Prices] Error fetching prices:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router
