/**
 * Cross-Chain Transfer Component
 * Enables trustless ETH and USDC transfers between Ethereum and Base using EIL
 */

import React, { useState, useEffect } from 'react'
import './CrossChainTransfer.css'

interface Account {
  id: string
  name: string
  address: string
  account_type: string
}

interface TransferForm {
  fromChain: number
  toChain: number
  token: 'ETH' | 'USDC'
  amount: string
  fromAddress: string
  toAddress: string
  useDefaultRecipient: boolean
}

interface TransferEstimate {
  fromChain: string
  toChain: string
  token: string
  amount: string
  estimatedTime: string
  fees: {
    sourceChain: string
    destinationChain: string
    total: string
  }
  recipient: string
}

const CHAINS = [
  { id: 1, name: 'Ethereum', icon: '⟠' },
  { id: 8453, name: 'Base', icon: '🔵' }
]

const TOKENS = [
  { symbol: 'ETH', name: 'Ethereum', icon: '⟠', decimals: 18 },
  { symbol: 'USDC', name: 'USD Coin', icon: '💵', decimals: 6 }
]

export default function CrossChainTransfer() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [form, setForm] = useState<TransferForm>({
    fromChain: 1,
    toChain: 8453,
    token: 'ETH',
    amount: '',
    fromAddress: '',
    toAddress: '',
    useDefaultRecipient: true
  })
  const [estimate, setEstimate] = useState<TransferEstimate | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Fetch accounts on mount
  useEffect(() => {
    fetchAccounts()
  }, [])

  // Update from address when account changes
  useEffect(() => {
    if (selectedAccount) {
      setForm(prev => ({
        ...prev,
        fromAddress: selectedAccount.address,
        toAddress: prev.useDefaultRecipient ? selectedAccount.address : prev.toAddress
      }))
    }
  }, [selectedAccount])

  // Update recipient when useDefaultRecipient changes
  useEffect(() => {
    if (form.useDefaultRecipient && selectedAccount) {
      setForm(prev => ({
        ...prev,
        toAddress: selectedAccount.address
      }))
    }
  }, [form.useDefaultRecipient, selectedAccount])

  const fetchAccounts = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/config/accounts')
      const data = await response.json()
      if (data.success && data.accounts && data.accounts.length > 0) {
        setAccounts(data.accounts)
        setSelectedAccount(data.accounts[0])
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err)
      setError('Failed to load accounts')
    }
  }

  const handleSwapChains = () => {
    setForm(prev => ({
      ...prev,
      fromChain: prev.toChain,
      toChain: prev.fromChain
    }))
  }

  const handleGetEstimate = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError('Please enter an amount')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Convert amount to wei/smallest unit
      const token = TOKENS.find(t => t.symbol === form.token)!
      const amountInSmallestUnit = (parseFloat(form.amount) * Math.pow(10, token.decimals)).toString()

      const response = await fetch('http://localhost:3001/api/cross-chain/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromChainId: form.fromChain,
          toChainId: form.toChain,
          token: form.token,
          amount: amountInSmallestUnit,
          fromAddress: form.fromAddress,
          toAddress: form.toAddress
        })
      })

      const data = await response.json()

      if (data.success) {
        setEstimate(data.estimate)
        setShowPreview(true)
      } else {
        setError(data.error || 'Failed to get estimate')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get estimate')
    } finally {
      setLoading(false)
    }
  }

  const handleTransfer = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError('Please enter an amount')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Convert amount to wei/smallest unit
      const token = TOKENS.find(t => t.symbol === form.token)!
      const amountInSmallestUnit = (parseFloat(form.amount) * Math.pow(10, token.decimals)).toString()

      const response = await fetch('http://localhost:3001/api/cross-chain/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromChainId: form.fromChain,
          toChainId: form.toChain,
          token: form.token,
          amount: amountInSmallestUnit,
          fromAddress: form.fromAddress,
          toAddress: form.toAddress
        })
      })

      const data = await response.json()

      if (data.success) {
        if (data.processing) {
          // SDK timed out but transaction is processing
          setSuccess(`Transfer processing! 🔄 Your balance will update shortly.`)
          setShowPreview(false)
          setForm(prev => ({ ...prev, amount: '' }))

          // Auto-refresh balances after 10 seconds to show updated amounts
          setTimeout(() => {
            window.dispatchEvent(new Event('refresh-balances'))
          }, 10000)
        } else {
          // Transfer completed successfully
          setSuccess(`Transfer completed successfully! 🎉`)
          setShowPreview(false)
          setForm(prev => ({ ...prev, amount: '' }))

          // Refresh balances immediately
          window.dispatchEvent(new Event('refresh-balances'))
        }
      } else {
        setError(data.error || 'Transfer failed')
      }
    } catch (err: any) {
      setError(err.message || 'Transfer failed')
    } finally {
      setLoading(false)
    }
  }

  const fromChainName = CHAINS.find(c => c.id === form.fromChain)?.name || ''
  const toChainName = CHAINS.find(c => c.id === form.toChain)?.name || ''

  return (
    <div className="cross-chain-transfer">
      <div className="transfer-header">
        <h1 className="transfer-title">
          <span className="title-icon">🌉</span>
          Cross-Chain Bridge
        </h1>
        <p className="transfer-subtitle">
          Transfer ETH and USDC between Ethereum and Base with a single signature
        </p>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {error}
          <button className="alert-close" onClick={() => setError(null)}>×</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span className="alert-icon">✅</span>
          {success}
          <button className="alert-close" onClick={() => setSuccess(null)}>×</button>
        </div>
      )}

      {!showPreview ? (
        <div className="transfer-form">
          {/* Account Selection */}
          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">👤</span>
              Wallet Account
            </label>
            <select
              className="form-select"
              value={selectedAccount?.address || ''}
              onChange={(e) => {
                const account = accounts.find(a => a.address === e.target.value)
                if (account) setSelectedAccount(account)
              }}
            >
              {accounts.map(account => (
                <option key={account.id} value={account.address}>
                  {account.name} ({account.address.slice(0, 6)}...{account.address.slice(-4)})
                </option>
              ))}
            </select>
          </div>

          {/* Source Chain */}
          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">📤</span>
              From Chain
            </label>
            <select
              className="form-select"
              value={form.fromChain}
              onChange={(e) => setForm({ ...form, fromChain: parseInt(e.target.value) })}
            >
              {CHAINS.filter(c => c.id !== form.toChain).map(chain => (
                <option key={chain.id} value={chain.id}>
                  {chain.icon} {chain.name}
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <div className="swap-button-container">
            <button className="swap-button" onClick={handleSwapChains} title="Swap chains">
              ⇅
            </button>
          </div>

          {/* Destination Chain */}
          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">📥</span>
              To Chain
            </label>
            <select
              className="form-select"
              value={form.toChain}
              onChange={(e) => setForm({ ...form, toChain: parseInt(e.target.value) })}
            >
              {CHAINS.filter(c => c.id !== form.fromChain).map(chain => (
                <option key={chain.id} value={chain.id}>
                  {chain.icon} {chain.name}
                </option>
              ))}
            </select>
          </div>

          {/* Token Selection */}
          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">💰</span>
              Token
            </label>
            <div className="token-buttons">
              {TOKENS.map(token => (
                <button
                  key={token.symbol}
                  className={`token-button ${form.token === token.symbol ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, token: token.symbol as 'ETH' | 'USDC' })}
                >
                  <span className="token-icon">{token.icon}</span>
                  <span className="token-name">{token.symbol}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">🔢</span>
              Amount
            </label>
            <input
              type="number"
              className="form-input"
              placeholder="0.0"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              step="0.000001"
              min="0"
            />
          </div>

          {/* Recipient Options */}
          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">📮</span>
              Recipient
            </label>
            <div className="recipient-options">
              <label className="radio-label">
                <input
                  type="radio"
                  checked={form.useDefaultRecipient}
                  onChange={() => setForm({ ...form, useDefaultRecipient: true })}
                />
                <span>My wallet on {toChainName}</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  checked={!form.useDefaultRecipient}
                  onChange={() => setForm({ ...form, useDefaultRecipient: false })}
                />
                <span>Different address</span>
              </label>
            </div>

            {!form.useDefaultRecipient && (
              <input
                type="text"
                className="form-input"
                placeholder="0x..."
                value={form.toAddress}
                onChange={(e) => setForm({ ...form, toAddress: e.target.value })}
              />
            )}
          </div>

          {/* Action Buttons */}
          <div className="form-actions">
            <button
              className="btn btn-primary"
              onClick={handleGetEstimate}
              disabled={loading || !form.amount || parseFloat(form.amount) <= 0}
            >
              {loading ? 'Loading...' : 'Preview Transfer'}
            </button>
          </div>
        </div>
      ) : (
        <div className="transfer-preview">
          <h2 className="preview-title">Transfer Preview</h2>

          {estimate && (
            <div className="preview-details">
              <div className="preview-row">
                <span className="preview-label">From:</span>
                <span className="preview-value">{estimate.fromChain}</span>
              </div>
              <div className="preview-row">
                <span className="preview-label">To:</span>
                <span className="preview-value">{estimate.toChain}</span>
              </div>
              <div className="preview-row">
                <span className="preview-label">Amount:</span>
                <span className="preview-value">{form.amount} {form.token}</span>
              </div>
              <div className="preview-row">
                <span className="preview-label">Recipient:</span>
                <span className="preview-value">
                  {estimate.recipient.slice(0, 6)}...{estimate.recipient.slice(-4)}
                </span>
              </div>
              <div className="preview-divider"></div>
              <div className="preview-row">
                <span className="preview-label">Estimated Time:</span>
                <span className="preview-value">{estimate.estimatedTime}</span>
              </div>
              <div className="preview-row">
                <span className="preview-label">Total Fees:</span>
                <span className="preview-value">{estimate.fees.total} ETH</span>
              </div>
            </div>
          )}

          <div className="preview-info">
            <p className="info-text">
              ⚠️ <strong>Note:</strong> Cross-chain transfers require smart account setup (Phase 5).
              This is a preview of the upcoming feature.
            </p>
          </div>

          <div className="preview-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setShowPreview(false)}
            >
              Back
            </button>
            <button
              className="btn btn-primary"
              onClick={handleTransfer}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Confirm Transfer'}
            </button>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="info-card">
        <h3 className="info-title">
          <span className="info-icon">ℹ️</span>
          How It Works
        </h3>
        <ul className="info-list">
          <li>✅ <strong>Single Signature</strong> - Sign once for entire cross-chain operation</li>
          <li>✅ <strong>Trustless</strong> - No traditional bridge, uses ERC-7683 voucher system</li>
          <li>✅ <strong>Fast</strong> - Transfers complete in ~30 seconds</li>
          <li>✅ <strong>Atomic</strong> - Either all chains succeed or all revert</li>
        </ul>
      </div>
    </div>
  )
}
