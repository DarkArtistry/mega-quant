import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App methods
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPath: (name: string) => ipcRenderer.invoke('app:getPath', name),

  // Strategy methods
  strategy: {
    create: (strategyData: any) => ipcRenderer.invoke('strategy:create', strategyData),
    start: (strategyId: string) => ipcRenderer.invoke('strategy:start', strategyId),
    stop: (strategyId: string) => ipcRenderer.invoke('strategy:stop', strategyId),
    list: () => ipcRenderer.invoke('strategy:list'),
    delete: (strategyId: string) => ipcRenderer.invoke('strategy:delete', strategyId),
  },

  // Trading methods (DeltaTrade API)
  trading: {
    createDeltaTrade: (executionType: string) =>
      ipcRenderer.invoke('trading:createDeltaTrade', executionType),
    swap: (swapParams: any) => ipcRenderer.invoke('trading:swap', swapParams),
    close: (executionId: string) => ipcRenderer.invoke('trading:close', executionId),
  },

  // Portfolio methods
  portfolio: {
    getOverview: () => ipcRenderer.invoke('portfolio:getOverview'),
    getAssets: (chainId?: number) => ipcRenderer.invoke('portfolio:getAssets', chainId),
    getGasReserves: () => ipcRenderer.invoke('portfolio:getGasReserves'),
    getRecentTrades: (limit?: number) =>
      ipcRenderer.invoke('portfolio:getRecentTrades', limit),
  },

  // Execution methods
  execution: {
    list: (strategyId?: string) => ipcRenderer.invoke('execution:list', strategyId),
    getDetails: (executionId: string) => ipcRenderer.invoke('execution:getDetails', executionId),
    getTrades: (executionId: string) => ipcRenderer.invoke('execution:getTrades', executionId),
  },

  // Security methods (Password setup, unlock)
  security: {
    checkSetup: () => ipcRenderer.invoke('security:checkSetup'),
    setup: (password: string) => ipcRenderer.invoke('security:setup', password),
    unlock: (password: string) => ipcRenderer.invoke('security:unlock', password),
    reset: () => ipcRenderer.invoke('security:reset'),
    validatePassword: (password: string) => ipcRenderer.invoke('security:validatePassword', password),
  },

  // Configuration methods (API keys, accounts, network configs) - ENCRYPTED
  config: {
    getApiConfig: (password: string) => ipcRenderer.invoke('config:getApiConfig', password),
    updateApiConfig: (configData: any) => ipcRenderer.invoke('config:updateApiConfig', configData),
    getAccounts: (password: string) => ipcRenderer.invoke('config:getAccounts', password),
    addAccount: (accountData: any) => ipcRenderer.invoke('config:addAccount', accountData),
    deleteAccount: (data: any) => ipcRenderer.invoke('config:deleteAccount', data),
    clearAllAccounts: (password: string) => ipcRenderer.invoke('config:clearAllAccounts', password),
    getNetworkConfigs: (password: string) => ipcRenderer.invoke('config:getNetworkConfigs', password),
    saveNetworkConfigs: (data: any) => ipcRenderer.invoke('config:saveNetworkConfigs', data),
  },
})

// Type definitions for TypeScript
export interface ElectronAPI {
  getVersion: () => Promise<string>
  getPath: (name: string) => Promise<string>
  strategy: {
    create: (strategyData: any) => Promise<{ success: boolean; id: string }>
    start: (strategyId: string) => Promise<{ success: boolean }>
    stop: (strategyId: string) => Promise<{ success: boolean }>
    list: () => Promise<any[]>
    delete: (strategyId: string) => Promise<{ success: boolean }>
  }
  trading: {
    createDeltaTrade: (executionType: string) => Promise<{ success: boolean; executionId: string }>
    swap: (swapParams: any) => Promise<{ success: boolean; txHash: string }>
    close: (executionId: string) => Promise<{ success: boolean; result: any }>
  }
  portfolio: {
    getOverview: () => Promise<any>
    getAssets: (chainId?: number) => Promise<any[]>
    getGasReserves: () => Promise<any[]>
    getRecentTrades: (limit?: number) => Promise<any[]>
  }
  execution: {
    list: (strategyId?: string) => Promise<any[]>
    getDetails: (executionId: string) => Promise<any>
    getTrades: (executionId: string) => Promise<any[]>
  }
  security: {
    checkSetup: () => Promise<{ success: boolean; isSetupComplete: boolean }>
    setup: (password: string) => Promise<{ success: boolean; error?: string; errors?: string[] }>
    unlock: (password: string) => Promise<{ success: boolean; error?: string; keySalt?: string }>
    reset: () => Promise<{ success: boolean }>
    validatePassword: (password: string) => Promise<{ success: boolean; valid: boolean; errors: string[] }>
  }
  config: {
    getApiConfig: (password: string) => Promise<{ success: boolean; config: any }>
    updateApiConfig: (configData: any) => Promise<{ success: boolean }>
    getAccounts: (password: string) => Promise<{ success: boolean; accounts: any[] }>
    addAccount: (accountData: any) => Promise<{ success: boolean }>
    deleteAccount: (data: any) => Promise<{ success: boolean }>
    clearAllAccounts: (password: string) => Promise<{ success: boolean }>
    getNetworkConfigs: (password: string) => Promise<{ success: boolean; configs: any[] }>
    saveNetworkConfigs: (data: any) => Promise<{ success: boolean }>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
