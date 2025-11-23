// Type definitions for window.electronAPI

export interface ElectronAPI {
  getVersion: () => Promise<string>
  getPath: (name: string) => Promise<string>

  strategy: {
    create: (strategyData: {
      name: string
      description?: string
      code: string
      execution_type: string
    }) => Promise<{
      success: boolean
      strategy?: any
      error?: string
    }>
    start: (strategyId: string) => Promise<{
      success: boolean
      strategy?: any
      error?: string
    }>
    stop: (strategyId: string) => Promise<{
      success: boolean
      strategy?: any
      error?: string
    }>
    list: () => Promise<{
      success: boolean
      strategies: any[]
      error?: string
    }>
    delete: (strategyId: string) => Promise<{
      success: boolean
      message?: string
      error?: string
    }>
  }

  trading: {
    createDeltaTrade: (params: {
      strategy_id: string
      execution_type: string
    }) => Promise<{
      success: boolean
      executionId?: string
      error?: string
    }>
    swap: (swapParams: any) => Promise<{
      success: boolean
      txHash?: string
      error?: string
    }>
    close: (executionId: string) => Promise<{
      success: boolean
      result?: any
      error?: string
    }>
  }

  portfolio: {
    getOverview: (strategy_id?: string) => Promise<{
      success: boolean
      overview?: {
        totalBalanceUsd: number
        winRate: number
        maxDrawdown: number
        sharpeRatio: number
      }
      error?: string
    }>
    getAssets: (chainId?: number) => Promise<{
      success: boolean
      assets: any[]
      error?: string
    }>
    getGasReserves: (wallet_address?: string) => Promise<{
      success: boolean
      gasReserves: any[]
      error?: string
    }>
    getRecentTrades: (params: {
      limit?: number
      strategy_id?: string
    }) => Promise<{
      success: boolean
      trades: any[]
      error?: string
    }>
  }

  execution: {
    list: (strategy_id?: string) => Promise<{
      success: boolean
      executions: any[]
      error?: string
    }>
    getDetails: (executionId: string) => Promise<{
      success: boolean
      execution?: any
      error?: string
    }>
    getTrades: (executionId: string) => Promise<{
      success: boolean
      trades: any[]
      error?: string
    }>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
