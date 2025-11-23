import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import axios from 'axios'
import { spawn, ChildProcess } from 'child_process'
import { createRequire } from 'module'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Backend API configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001'
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

let mainWindow: BrowserWindow | null = null
let backendProcess: ChildProcess | null = null

// Function to start the backend server
function startBackendServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting backend server...')

    // Determine if we're in development or production
    const isDev = process.env.VITE_DEV_SERVER_URL !== undefined

    if (isDev) {
      // Development mode: use ts-node to run TypeScript directly as child process
      const backendPath = path.join(__dirname, '../../backend/src/server.ts')
      backendProcess = spawn('tsx', [backendPath], {
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, NODE_ENV: 'development' }
      })

      backendProcess.on('error', (error) => {
        console.error('❌ Backend server failed to start:', error)
        reject(error)
      })

      backendProcess.on('exit', (code, signal) => {
        console.log(`Backend server exited with code ${code} and signal ${signal}`)
        backendProcess = null
      })

      // Wait for server to start
      setTimeout(async () => {
        try {
          await axios.get('http://localhost:3001/health')
          console.log('✅ Backend server is running!')
          resolve()
        } catch (error) {
          console.log('✅ Backend server started (no health check available)')
          resolve()
        }
      }, 2000)
    } else {
      // Production mode: Spawn backend using bundled Node.js binary
      // We bundle Node.js to ensure the app is completely self-contained
      // and doesn't depend on user's system Node.js installation
      console.log('📦 Starting backend server with bundled Node.js...')

      const backendDir = path.join(process.resourcesPath, 'backend')
      const serverPath = path.join(backendDir, 'dist/server.js')
      const nodeBinaryPath = path.join(process.resourcesPath, 'nodejs/bin/node')

      console.log('Backend directory:', backendDir)
      console.log('Server path:', serverPath)
      console.log('Node binary path:', nodeBinaryPath)

      // Spawn using bundled Node.js binary
      backendProcess = spawn(nodeBinaryPath, ['dist/server.js'], {
        cwd: backendDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'production'
        }
      })

      // Capture and log backend output
      if (backendProcess.stdout) {
        backendProcess.stdout.on('data', (data) => {
          console.log('[Backend]', data.toString())
        })
      }
      if (backendProcess.stderr) {
        backendProcess.stderr.on('data', (data) => {
          console.error('[Backend Error]', data.toString())
        })
      }

      backendProcess.on('error', (error) => {
        console.error('❌ Backend process error:', error)
        // Don't reject - continue anyway
      })

      backendProcess.on('exit', (code, signal) => {
        console.log(`Backend server exited with code ${code} and signal ${signal}`)
        backendProcess = null
      })

      // Wait for server to start
      setTimeout(async () => {
        try {
          await axios.get('http://localhost:3001/health')
          console.log('✅ Backend server is running and responding!')
          resolve()
        } catch (error) {
          console.log('⚠️  Backend server health check failed, but continuing...')
          resolve()
        }
      }, 3000)
    }
  })
}

// Function to stop the backend server
function stopBackendServer() {
  if (backendProcess) {
    console.log('🛑 Stopping backend server...')
    backendProcess.kill('SIGTERM')

    // Force kill after 5 seconds if it doesn't stop gracefully
    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        console.log('⚠️  Force killing backend server...')
        backendProcess.kill('SIGKILL')
      }
    }, 5000)

    backendProcess = null
  }
  // Note: In production mode, the server runs in the same process,
  // so it will be shut down when the app quits
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#0a0e1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    show: false, // Don't show until ready
  })

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    // Open DevTools in development
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Cleanup on close
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// App lifecycle
app.whenReady().then(async () => {
  // Start backend server first
  try {
    await startBackendServer()
  } catch (error) {
    console.error('Failed to start backend server:', error)
    // Continue anyway - user might be running backend separately
  }

  // Then create window
  createWindow()

  app.on('activate', () => {
    // On macOS, recreate window when dock icon is clicked and no windows are open
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Cleanup when app is quitting
app.on('before-quit', () => {
  console.log('App is quitting, stopping backend server...')
  stopBackendServer()
})

app.on('will-quit', () => {
  stopBackendServer()
})

// ============================================================================
// IPC Handlers - App
// ============================================================================

ipcMain.handle('app:getVersion', () => {
  return app.getVersion()
})

ipcMain.handle('app:getPath', (_, name: string) => {
  return app.getPath(name as any)
})

// ============================================================================
// IPC Handlers - Strategy Management
// ============================================================================

ipcMain.handle('strategy:create', async (_, strategyData) => {
  try {
    console.log('Creating strategy:', strategyData)
    const response = await api.post('/api/strategies', strategyData)
    return response.data
  } catch (error: any) {
    console.error('Error creating strategy:', error.message)
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
})

ipcMain.handle('strategy:list', async () => {
  try {
    const response = await api.get('/api/strategies')
    return response.data
  } catch (error: any) {
    console.error('Error listing strategies:', error.message)
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      strategies: []
    }
  }
})

ipcMain.handle('strategy:start', async (_, strategyId) => {
  try {
    console.log('Starting strategy:', strategyId)
    const response = await api.patch(`/api/strategies/${strategyId}`, {
      status: 'running'
    })
    return response.data
  } catch (error: any) {
    console.error('Error starting strategy:', error.message)
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
})

ipcMain.handle('strategy:stop', async (_, strategyId) => {
  try {
    console.log('Stopping strategy:', strategyId)
    const response = await api.patch(`/api/strategies/${strategyId}`, {
      status: 'stopped'
    })
    return response.data
  } catch (error: any) {
    console.error('Error stopping strategy:', error.message)
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
})

ipcMain.handle('strategy:delete', async (_, strategyId) => {
  try {
    console.log('Deleting strategy:', strategyId)
    const response = await api.delete(`/api/strategies/${strategyId}`)
    return response.data
  } catch (error: any) {
    console.error('Error deleting strategy:', error.message)
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
})

// ============================================================================
// IPC Handlers - Trading (DeltaTrade API)
// ============================================================================

ipcMain.handle('trading:createDeltaTrade', async (_, { strategy_id, execution_type }) => {
  try {
    console.log('Creating delta trade:', execution_type)
    const response = await api.post('/api/executions', {
      strategy_id,
      execution_type
    })
    return response.data
  } catch (error: any) {
    console.error('Error creating delta trade:', error.message)
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
})

ipcMain.handle('trading:swap', async (_, swapParams) => {
  try {
    console.log('Recording swap:', swapParams)
    const response = await api.post('/api/trades', swapParams)
    return response.data
  } catch (error: any) {
    console.error('Error recording swap:', error.message)
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
})

ipcMain.handle('trading:close', async (_, executionId) => {
  try {
    console.log('Closing execution:', executionId)
    const response = await api.post(`/api/executions/${executionId}/close`, {})
    return response.data
  } catch (error: any) {
    console.error('Error closing execution:', error.message)
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
})

// ============================================================================
// IPC Handlers - Portfolio
// ============================================================================

ipcMain.handle('portfolio:getOverview', async (_, strategy_id?) => {
  try {
    const params = strategy_id ? { strategy_id } : {}
    const response = await api.get('/api/portfolio/overview', { params })
    return response.data
  } catch (error: any) {
    console.error('Error fetching portfolio overview:', error.message)
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      overview: {
        totalBalanceUsd: 0,
        winRate: 0,
        maxDrawdown: 0,
        sharpeRatio: 0
      }
    }
  }
})

ipcMain.handle('portfolio:getAssets', async (_, chainId?) => {
  try {
    const params = chainId ? { chain_id: chainId } : {}
    const response = await api.get('/api/portfolio/assets', { params })
    return response.data
  } catch (error: any) {
    console.error('Error fetching assets:', error.message)
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      assets: []
    }
  }
})

ipcMain.handle('portfolio:getGasReserves', async (_, wallet_address?) => {
  try {
    const params = wallet_address ? { wallet_address } : {}
    const response = await api.get('/api/portfolio/gas-reserves', { params })
    return response.data
  } catch (error: any) {
    console.error('Error fetching gas reserves:', error.message)
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      gasReserves: []
    }
  }
})

ipcMain.handle('portfolio:getRecentTrades', async (_, { limit, strategy_id }) => {
  try {
    const params: any = {}
    if (limit) params.limit = limit
    if (strategy_id) params.strategy_id = strategy_id

    const response = await api.get('/api/portfolio/recent-trades', { params })
    return response.data
  } catch (error: any) {
    console.error('Error fetching recent trades:', error.message)
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      trades: []
    }
  }
})

// ============================================================================
// IPC Handlers - Executions
// ============================================================================

ipcMain.handle('execution:list', async (_, strategy_id?) => {
  try {
    const params = strategy_id ? { strategy_id } : {}
    const response = await api.get('/api/executions', { params })
    return response.data
  } catch (error: any) {
    console.error('Error listing executions:', error.message)
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      executions: []
    }
  }
})

ipcMain.handle('execution:getDetails', async (_, executionId) => {
  try {
    const response = await api.get(`/api/executions/${executionId}`)
    return response.data
  } catch (error: any) {
    console.error('Error fetching execution details:', error.message)
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
})

ipcMain.handle('execution:getTrades', async (_, executionId) => {
  try {
    const response = await api.get(`/api/executions/${executionId}/trades`)
    return response.data
  } catch (error: any) {
    console.error('Error fetching execution trades:', error.message)
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      trades: []
    }
  }
})

// ============================================================================
// IPC Handlers - Security (Password setup, unlock, etc.)
// ============================================================================

// Check if setup is complete
ipcMain.handle('security:checkSetup', async () => {
  try {
    const response = await api.get('/api/security/setup-status')
    return response.data
  } catch (error: any) {
    console.error('Error checking setup status:', error.message)
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      isSetupComplete: false
    }
  }
})

// Setup initial password
ipcMain.handle('security:setup', async (_, password) => {
  try {
    const response = await api.post('/api/security/setup', { password })
    return response.data
  } catch (error: any) {
    console.error('Error during setup:', error.message)
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      errors: error.response?.data?.errors || []
    }
  }
})

// Unlock app with password
ipcMain.handle('security:unlock', async (_, password) => {
  try {
    const response = await api.post('/api/security/unlock', { password })
    return response.data
  } catch (error: any) {
    console.error('Error during unlock:', error.message)
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
})

// Reset app (delete all data)
ipcMain.handle('security:reset', async () => {
  try {
    const response = await api.post('/api/security/reset', {
      confirmReset: 'DELETE_ALL_DATA'
    })
    return response.data
  } catch (error: any) {
    console.error('Error during reset:', error.message)
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
})

// Validate password strength
ipcMain.handle('security:validatePassword', async (_, password) => {
  try {
    const response = await api.post('/api/security/validate-password', { password })
    return response.data
  } catch (error: any) {
    console.error('Error validating password:', error.message)
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
})

// ============================================================================
// IPC Handlers - Configuration (API keys, accounts, network configs) - ENCRYPTED
// ============================================================================

// Get API configuration (encrypted)
ipcMain.handle('config:getApiConfig', async (_, password) => {
  try {
    const response = await api.post('/api/config-encrypted/api-config/get', { password })
    return response.data
  } catch (error: any) {
    console.error('Error fetching API config:', error.message)
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      config: {
        alchemy_app_id: '',
        alchemy_api_key: '',
        etherscan_api_key: '',
        coinmarketcap_api_key: ''
      }
    }
  }
})

// Update API configuration (encrypted)
ipcMain.handle('config:updateApiConfig', async (_, { password, ...configData }) => {
  try {
    const response = await api.post('/api/config-encrypted/api-config/update', {
      password,
      ...configData
    })
    return response.data
  } catch (error: any) {
    console.error('Error updating API config:', error.message)
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
})

// Get all accounts (encrypted)
ipcMain.handle('config:getAccounts', async (_, password) => {
  try {
    const response = await api.post('/api/config-encrypted/accounts/get', { password })
    return response.data
  } catch (error: any) {
    console.error('Error fetching accounts:', error.message)
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      accounts: []
    }
  }
})

// Add new account (encrypted)
ipcMain.handle('config:addAccount', async (_, { password, ...accountData }) => {
  try {
    const response = await api.post('/api/config-encrypted/accounts/add', {
      password,
      ...accountData
    })
    return response.data
  } catch (error: any) {
    console.error('Error adding account:', error.message)
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
})

// Delete account (encrypted)
ipcMain.handle('config:deleteAccount', async (_, { password, accountId }) => {
  try {
    const response = await api.post('/api/config-encrypted/accounts/delete', {
      password,
      accountId
    })
    return response.data
  } catch (error: any) {
    console.error('Error deleting account:', error.message)
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
})

// Clear all accounts (encrypted)
ipcMain.handle('config:clearAllAccounts', async (_, password) => {
  try {
    const response = await api.post('/api/config-encrypted/accounts/clear', { password })
    return response.data
  } catch (error: any) {
    console.error('Error clearing all accounts:', error.message)
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
})

// Get network RPC configurations (encrypted)
ipcMain.handle('config:getNetworkConfigs', async (_, password) => {
  try {
    const response = await api.post('/api/config-encrypted/network-configs/get', { password })
    return response.data
  } catch (error: any) {
    console.error('Error fetching network configs:', error.message)
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      configs: []
    }
  }
})

// Save network RPC configurations (encrypted)
ipcMain.handle('config:saveNetworkConfigs', async (_, { password, configs }) => {
  try {
    const response = await api.post('/api/config-encrypted/network-configs/save', {
      password,
      configs
    })
    return response.data
  } catch (error: any) {
    console.error('Error saving network configs:', error.message)
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
})

console.log('MEGA QUANT - Electron main process started')
console.log('API Base URL:', API_BASE_URL)
