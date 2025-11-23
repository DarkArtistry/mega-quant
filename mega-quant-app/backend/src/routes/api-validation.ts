import express from 'express'
import axios from 'axios'

const router = express.Router()

// Test Alchemy API key
router.post('/test-alchemy', async (req, res) => {
  try {
    const { apiKey } = req.body

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API key is required'
      })
    }

    // Test Alchemy API with a simple eth_blockNumber call on Ethereum mainnet
    const response = await axios.post(
      `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`,
      {
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      },
      {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    if (response.data.result) {
      // Convert hex block number to decimal for display
      const blockNumber = parseInt(response.data.result, 16)

      res.json({
        success: true,
        message: 'Alchemy API key is valid',
        data: {
          blockNumber,
          network: 'Ethereum Mainnet'
        }
      })
    } else if (response.data.error) {
      res.status(401).json({
        success: false,
        error: response.data.error.message || 'Invalid API key'
      })
    } else {
      res.status(500).json({
        success: false,
        error: 'Unexpected response from Alchemy'
      })
    }
  } catch (error: any) {
    console.error('Alchemy API test error:', error.message)

    if (error.response?.status === 401 || error.response?.status === 403) {
      res.status(401).json({
        success: false,
        error: 'Invalid API key or unauthorized access'
      })
    } else if (error.code === 'ECONNABORTED') {
      res.status(504).json({
        success: false,
        error: 'Request timeout - check your network connection'
      })
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to test Alchemy API'
      })
    }
  }
})

// Test Etherscan API key
router.post('/test-etherscan', async (req, res) => {
  try {
    const { apiKey } = req.body

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API key is required'
      })
    }

    // Test Etherscan API V2 with account balance check (Vitalik's address as test)
    const response = await axios.get('https://api.etherscan.io/v2/api', {
      params: {
        chainid: 1, // Ethereum Mainnet
        module: 'account',
        action: 'balance',
        address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // Vitalik
        tag: 'latest',
        apikey: apiKey
      },
      timeout: 5000
    })

    if (response.data.status === '1' && response.data.message === 'OK') {
      res.json({
        success: true,
        message: 'Etherscan API key is valid',
        data: {
          network: 'Ethereum Mainnet',
          rateLimit: response.data.result ? 'Standard tier' : 'Unknown'
        }
      })
    } else if (response.data.message === 'NOTOK') {
      res.status(401).json({
        success: false,
        error: response.data.result || 'Invalid API key'
      })
    } else {
      res.status(500).json({
        success: false,
        error: 'Unexpected response from Etherscan'
      })
    }
  } catch (error: any) {
    console.error('Etherscan API test error:', error.message)

    if (error.response?.data?.message === 'NOTOK') {
      res.status(401).json({
        success: false,
        error: error.response.data.result || 'Invalid API key'
      })
    } else if (error.code === 'ECONNABORTED') {
      res.status(504).json({
        success: false,
        error: 'Request timeout - check your network connection'
      })
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to test Etherscan API'
      })
    }
  }
})

// Test CoinMarketCap API key
router.post('/test-coinmarketcap', async (req, res) => {
  try {
    const { apiKey } = req.body

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API key is required'
      })
    }

    // Test CoinMarketCap API with cryptocurrency/listings/latest endpoint
    const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest', {
      params: {
        start: 1,
        limit: 1,
        convert: 'USD'
      },
      headers: {
        'X-CMC_PRO_API_KEY': apiKey
      },
      timeout: 5000
    })

    if (response.data.status?.error_code === 0 || response.data.data) {
      const creditInfo = response.headers['x-cmc-pro-api-key-credits-left'] || 'Unknown'

      res.json({
        success: true,
        message: 'CoinMarketCap API key is valid',
        data: {
          creditsLeft: creditInfo,
          planType: response.data.status?.credit_count ? 'Pro' : 'Basic'
        }
      })
    } else {
      res.status(401).json({
        success: false,
        error: response.data.status?.error_message || 'Invalid API key'
      })
    }
  } catch (error: any) {
    console.error('CoinMarketCap API test error:', error.message)

    if (error.response?.status === 401 || error.response?.status === 403) {
      res.status(401).json({
        success: false,
        error: error.response?.data?.status?.error_message || 'Invalid API key'
      })
    } else if (error.code === 'ECONNABORTED') {
      res.status(504).json({
        success: false,
        error: 'Request timeout - check your network connection'
      })
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to test CoinMarketCap API'
      })
    }
  }
})

// Test 1inch API key
router.post('/test-1inch', async (req, res) => {
  try {
    const { apiKey } = req.body

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API key is required'
      })
    }

    // Test 1inch API with a simple quote request on Ethereum (chainId: 1)
    // Small amount: 0.001 ETH to USDC
    const NATIVE_ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' // USDC on Ethereum
    const AMOUNT = '1000000000000000' // 0.001 ETH in wei

    const response = await axios.get('https://api.1inch.dev/swap/v6.0/1/quote', {
      params: {
        src: NATIVE_ETH,
        dst: USDC,
        amount: AMOUNT
      },
      headers: {
        Authorization: `Bearer ${apiKey}`,
        accept: 'application/json'
      },
      timeout: 10000
    })

    if (response.data.dstAmount) {
      // API key is valid and quote was successful
      res.json({
        success: true,
        message: '1inch API key is valid',
        data: {
          network: 'Ethereum Mainnet',
          apiVersion: 'v6.0',
          status: 'Active'
        }
      })
    } else {
      res.status(500).json({
        success: false,
        error: 'Unexpected response from 1inch API'
      })
    }
  } catch (error: any) {
    console.error('1inch API test error:', error.message)

    if (error.response?.status === 401 || error.response?.status === 403) {
      res.status(401).json({
        success: false,
        error: 'Invalid API key or unauthorized access'
      })
    } else if (error.response?.status === 429) {
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded - API key is valid but too many requests'
      })
    } else if (error.code === 'ECONNABORTED') {
      res.status(504).json({
        success: false,
        error: 'Request timeout - check your network connection'
      })
    } else {
      res.status(500).json({
        success: false,
        error: error.response?.data?.description || error.message || 'Failed to test 1inch API'
      })
    }
  }
})

export default router
