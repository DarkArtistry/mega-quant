/**
 * Price Service
 * Fetches token prices in USD for P&L calculations using CoinMarketCap API
 */

import axios from 'axios'

interface TokenPrice {
  symbol: string
  priceUsd: number
  timestamp: number
}

class PriceService {
  private cache: Map<string, TokenPrice> = new Map()
  private CACHE_TTL = 60 * 1000 // 1 minute
  private cmcApiKey: string | null = null

  /**
   * Set CoinMarketCap API key
   */
  setCoinMarketCapApiKey(apiKey: string | null): void {
    this.cmcApiKey = apiKey
    console.log(`[PriceService] CoinMarketCap API key ${apiKey ? 'configured' : 'cleared'}`)
  }

  /**
   * Get USD price for a token using CoinMarketCap API
   */
  async getTokenPriceUSD(symbol: string): Promise<number> {
    const cacheKey = symbol.toUpperCase()

    // Check cache
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.priceUsd
    }

    try {
      // Get CoinMarketCap slug for the token
      const cmcSymbol = this.getCoinMarketCapSymbol(symbol)

      // Use CoinMarketCap API if key is available
      if (this.cmcApiKey) {
        const response = await axios.get(
          'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest',
          {
            headers: {
              'X-CMC_PRO_API_KEY': this.cmcApiKey,
              'Accept': 'application/json'
            },
            params: {
              symbol: cmcSymbol,
              convert: 'USD'
            },
            timeout: 5000
          }
        )

        const data = response.data?.data?.[cmcSymbol]
        const priceUsd = data?.quote?.USD?.price || 0

        // Update cache
        this.cache.set(cacheKey, {
          symbol,
          priceUsd,
          timestamp: Date.now()
        })

        return priceUsd
      } else {
        console.warn(`[PriceService] No CoinMarketCap API key configured, using fallback price for ${symbol}`)
        return this.getFallbackPrice(symbol)
      }
    } catch (error: any) {
      console.warn(`[PriceService] Failed to fetch price for ${symbol}:`, error.message)

      // Fallback to cached price if available (even if expired)
      if (cached) {
        console.warn(`[PriceService] Using stale cache for ${symbol}`)
        return cached.priceUsd
      }

      // Fallback prices for common tokens
      return this.getFallbackPrice(symbol)
    }
  }

  /**
   * Get multiple token prices in parallel
   */
  async getMultiplePricesUSD(symbols: string[]): Promise<Record<string, number>> {
    const prices: Record<string, number> = {}

    const results = await Promise.allSettled(
      symbols.map(symbol => this.getTokenPriceUSD(symbol))
    )

    symbols.forEach((symbol, index) => {
      const result = results[index]
      prices[symbol] = result.status === 'fulfilled' ? result.value : 0
    })

    return prices
  }

  /**
   * Map token symbols to CoinMarketCap symbols
   */
  private getCoinMarketCapSymbol(symbol: string): string {
    const mapping: Record<string, string> = {
      'WETH': 'ETH', // WETH trades at same price as ETH
      'ETH': 'ETH',
      'USDC': 'USDC',
      'USDT': 'USDT',
      'DAI': 'DAI',
      'WBTC': 'BTC' // WBTC trades at same price as BTC
    }

    return mapping[symbol.toUpperCase()] || symbol.toUpperCase()
  }

  /**
   * Fallback prices for common tokens (approximate values)
   */
  private getFallbackPrice(symbol: string): number {
    const fallbacks: Record<string, number> = {
      'WETH': 3200,
      'ETH': 3200,
      'USDC': 1,
      'USDT': 1,
      'DAI': 1,
      'WBTC': 95000
    }

    return fallbacks[symbol.toUpperCase()] || 0
  }

  /**
   * Clear price cache
   */
  clearCache(): void {
    this.cache.clear()
  }
}

// Singleton instance
export const priceService = new PriceService()
