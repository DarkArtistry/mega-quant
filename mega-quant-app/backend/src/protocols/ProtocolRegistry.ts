/**
 * Protocol Registry
 *
 * Central registry for all protocol adapters.
 * Manages protocol instances and provides lookup functionality.
 */

import { IProtocolAdapter } from './IProtocolAdapter.js'
import { UniswapV3Adapter } from './UniswapV3Adapter.js'
import { UniswapV4Adapter } from './UniswapV4Adapter.js'
import { OneInchAdapter } from './OneInchAdapter.js'

export class ProtocolRegistry {
  private adapters: Map<string, IProtocolAdapter> = new Map()

  constructor() {
    // Register protocol adapters (Uniswap V3/V4 and 1inch only)
    this.registerAdapter(new UniswapV3Adapter())
    this.registerAdapter(new UniswapV4Adapter())
    this.registerAdapter(new OneInchAdapter())

    console.log(`[ProtocolRegistry] Registered ${this.adapters.size} protocol adapters`)
  }

  /**
   * Register a protocol adapter
   */
  registerAdapter(adapter: IProtocolAdapter): void {
    this.adapters.set(adapter.protocolId, adapter)
    console.log(`[ProtocolRegistry] Registered: ${adapter.name} (${adapter.protocolId})`)
  }

  /**
   * Get adapter by protocol ID
   */
  getAdapter(protocolId: string): IProtocolAdapter | null {
    return this.adapters.get(protocolId) || null
  }

  /**
   * Get all registered adapters
   */
  getAllAdapters(): IProtocolAdapter[] {
    return Array.from(this.adapters.values())
  }

  /**
   * Find adapter by router address
   *
   * @param networkId - Chain ID
   * @param routerAddress - Router/contract address
   * @returns Protocol adapter that uses this router, or null
   */
  getAdapterForRouter(networkId: number, routerAddress: string): IProtocolAdapter | null {
    const routerLower = routerAddress.toLowerCase()

    for (const adapter of this.adapters.values()) {
      const routers = adapter.getRouterAddresses(networkId)
      if (routers.includes(routerLower)) {
        return adapter
      }
    }

    return null
  }

  /**
   * Get all protocol IDs
   */
  getProtocolIds(): string[] {
    return Array.from(this.adapters.keys())
  }

  /**
   * Check if a protocol is registered
   */
  hasProtocol(protocolId: string): boolean {
    return this.adapters.has(protocolId)
  }
}

// Singleton instance
export const protocolRegistry = new ProtocolRegistry()
