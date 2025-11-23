import express from 'express'
import { ethers } from 'ethers'
import { query } from '../db/index.js'
import { liveDataService } from '../services/live-data.js'

const router = express.Router()

// ERC20 ABI for balanceOf function
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
]

/**
 * GET /api/balances/:networkId/:tokenAddress
 * Fetch token balance for a specific network and token address
 *
 * For native tokens (ETH), use address '0x0000000000000000000000000000000000000000'
 * Returns the balance as a formatted string
 */
router.get('/:networkId/:tokenAddress', async (req, res) => {
  try {
    const { networkId, tokenAddress } = req.params
    const { account } = req.query // Optional account filter
    const networkIdNum = parseInt(networkId)

    // Get RPC URL from live data service (uses configured Alchemy/custom RPC if unlocked)
    const rpcUrl = liveDataService.getRpcUrl(networkIdNum)
    if (!rpcUrl) {
      return res.status(400).json({
        success: false,
        error: `Unsupported network ID: ${networkId}`
      })
    }

    console.log(`[Balances] Fetching balance for network ${networkId}, token ${tokenAddress}`)
    console.log(`[Balances] Using RPC: ${rpcUrl}`)
    if (account) {
      console.log(`[Balances] Filtering by account: ${account}`)
    }

    // Get accounts from database
    // If account filter is provided, only fetch that account; otherwise fetch all
    const accountsResult = account
      ? await query('SELECT address FROM accounts WHERE address = $1', [account])
      : await query('SELECT address FROM accounts', [])

    console.log(`[Balances] Found ${accountsResult.rows.length} accounts in database`)
    accountsResult.rows.forEach((acc, idx) => {
      console.log(`[Balances]   Account ${idx + 1}: ${acc.address}`)
    })

    if (accountsResult.rows.length === 0) {
      console.log('[Balances] ⚠️  No accounts found, returning 0 balance')
      return res.json({
        success: true,
        balance: '0',
        decimals: tokenAddress === '0x0000000000000000000000000000000000000000' ? 18 : 6
      })
    }

    // Create provider with configured RPC URL
    const provider = new ethers.JsonRpcProvider(rpcUrl)

    let totalBalance = 0n
    let decimals = 18

    // Check if it's a native token (ETH)
    const isNativeToken = tokenAddress === '0x0000000000000000000000000000000000000000'

    if (isNativeToken) {
      // Fetch native token balance (ETH)
      console.log(`[Balances] Fetching ETH balance for ${accountsResult.rows.length} accounts...`)
      for (const account of accountsResult.rows) {
        const balance = await provider.getBalance(account.address)
        console.log(`[Balances]   ${account.address}: ${ethers.formatEther(balance)} ETH`)
        totalBalance += balance
      }
      decimals = 18
    } else {
      // Fetch ERC20 token balance
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)

      // Get token decimals
      try {
        const decimalsBigInt = await tokenContract.decimals()
        decimals = Number(decimalsBigInt) // Convert BigInt to number
      } catch (err) {
        console.error('Error fetching token decimals:', err)
        decimals = 6 // Default to 6 for USDC-like tokens
      }

      // Fetch balance for each account
      console.log(`[Balances] Fetching ERC20 balance for ${accountsResult.rows.length} accounts...`)
      for (const account of accountsResult.rows) {
        try {
          const balance = await tokenContract.balanceOf(account.address)
          console.log(`[Balances]   ${account.address}: ${ethers.formatUnits(balance, decimals)}`)
          totalBalance += balance
        } catch (err) {
          console.error(`[Balances] ❌ Error fetching balance for ${account.address}:`, err)
        }
      }
    }

    console.log(`[Balances] ✅ Total aggregated balance: ${ethers.formatUnits(totalBalance, decimals)}`)

    // Format balance
    const formattedBalance = ethers.formatUnits(totalBalance, decimals)

    res.json({
      success: true,
      balance: formattedBalance,
      decimals,
      rawBalance: totalBalance.toString()
    })
  } catch (error: any) {
    console.error('Error fetching balance:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch balance'
    })
  }
})

/**
 * GET /api/balances/:networkId
 * Fetch all token balances for a specific network
 * Query params: addresses (comma-separated list of token addresses)
 */
router.get('/:networkId', async (req, res) => {
  try {
    const { networkId } = req.params
    const { addresses } = req.query
    const networkIdNum = parseInt(networkId)

    // Get RPC URL from live data service (uses configured Alchemy/custom RPC if unlocked)
    const rpcUrl = liveDataService.getRpcUrl(networkIdNum)
    if (!rpcUrl) {
      return res.status(400).json({
        success: false,
        error: `Unsupported network ID: ${networkId}`
      })
    }

    if (!addresses || typeof addresses !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing addresses parameter'
      })
    }

    const tokenAddresses = addresses.split(',')
    const balances: Record<string, any> = {}

    // Get all accounts for this network
    // Note: Accounts are network-agnostic in this system (same address works on all EVM chains)
    const accountsResult = await query(
      'SELECT address FROM accounts',
      []
    )

    if (accountsResult.rows.length === 0) {
      // No accounts, return 0 balances
      tokenAddresses.forEach(addr => {
        balances[addr] = {
          balance: '0',
          decimals: addr === '0x0000000000000000000000000000000000000000' ? 18 : 6
        }
      })
      return res.json({ success: true, balances })
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl)

    // Fetch balance for each token
    for (const tokenAddress of tokenAddresses) {
      try {
        let totalBalance = 0n
        let decimals = 18

        const isNativeToken = tokenAddress === '0x0000000000000000000000000000000000000000'

        if (isNativeToken) {
          for (const account of accountsResult.rows) {
            const balance = await provider.getBalance(account.address)
            totalBalance += balance
          }
          decimals = 18
        } else {
          const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)

          try {
            const decimalsBigInt = await tokenContract.decimals()
            decimals = Number(decimalsBigInt) // Convert BigInt to number
          } catch (err) {
            decimals = 6
          }

          for (const account of accountsResult.rows) {
            try {
              const balance = await tokenContract.balanceOf(account.address)
              totalBalance += balance
            } catch (err) {
              console.error(`Error fetching balance for ${account.address}:`, err)
            }
          }
        }

        balances[tokenAddress] = {
          balance: ethers.formatUnits(totalBalance, decimals),
          decimals,
          rawBalance: totalBalance.toString()
        }
      } catch (error: any) {
        console.error(`Error fetching balance for token ${tokenAddress}:`, error)
        balances[tokenAddress] = {
          balance: '0',
          decimals: 18,
          error: error.message
        }
      }
    }

    res.json({ success: true, balances })
  } catch (error: any) {
    console.error('Error fetching balances:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch balances'
    })
  }
})

export default router
