/**
 * Transfer Modal - Initiated from Assets page
 * Allows sending ETH/USDC to same or different network
 */

import React, { useState, useEffect } from 'react'
import './TransferModal.css'

interface TransferModalProps {
  isOpen: boolean
  onClose: () => void
  token: {
    symbol: string
    name: string
    icon: string
    decimals: number
    address: string
  }
  sourceChain: {
    id: number
    name: string
    icon: string
  }
  userAddress: string
  maxAmount: string // Available balance
  sessionPassword?: string
}

const NETWORKS = [
  { id: 1, name: 'Ethereum', icon: '⟠' },
  { id: 8453, name: 'Base', icon: '🔵' }
]

export default function TransferModal({
  isOpen,
  onClose,
  token,
  sourceChain,
  userAddress,
  maxAmount,
  sessionPassword
}: TransferModalProps) {
  const [amount, setAmount] = useState('')
  const [destinationChain, setDestinationChain] = useState(
    sourceChain.id === 1 ? 8453 : 1 // Default to opposite chain for cross-chain transfers
  )
  const [recipientAddress, setRecipientAddress] = useState(userAddress)
  const [useSameWallet, setUseSameWallet] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Reset when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAmount('')
      setRecipientAddress(userAddress)
      setUseSameWallet(true)
      setError(null)
      setSuccess(null)
      setDestinationChain(sourceChain.id === 1 ? 8453 : 1) // Default to cross-chain
    }
  }, [isOpen, userAddress, sourceChain.id])

  // Update recipient when useSameWallet changes
  useEffect(() => {
    if (useSameWallet) {
      setRecipientAddress(userAddress)
    }
  }, [useSameWallet, userAddress])

  const handleSetMax = () => {
    setAmount(maxAmount)
  }

  const handleTransfer = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Validate
      if (!amount || parseFloat(amount) <= 0) {
        throw new Error('Please enter a valid amount')
      }

      if (parseFloat(amount) > parseFloat(maxAmount)) {
        throw new Error('Insufficient balance')
      }

      if (!recipientAddress || recipientAddress.length !== 42) {
        throw new Error('Invalid recipient address')
      }

      if (!sessionPassword) {
        throw new Error('Session password required. Please unlock your account first.')
      }

      // Convert to smallest unit
      const amountInSmallestUnit = (
        parseFloat(amount) * Math.pow(10, token.decimals)
      ).toString()

      // Determine if cross-chain or same-chain
      const isCrossChain = sourceChain.id !== destinationChain

      if (isCrossChain) {
        // Use EIL cross-chain API with vouchers
        const response = await fetch('http://localhost:3001/api/cross-chain/transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromChainId: sourceChain.id,
            toChainId: destinationChain,
            token: token.symbol,
            amount: amountInSmallestUnit,
            fromAddress: userAddress,
            toAddress: recipientAddress,
            sessionPassword
          })
        })

        const data = await response.json()

        if (data.success) {
          setSuccess(`Cross-chain transfer initiated! 🌉\nTx: ${data.result?.txHash?.slice(0, 10) || 'pending'}...`)
          // Close modal after 3 seconds
          setTimeout(() => {
            onClose()
          }, 3000)
        } else {
          setError(data.error || 'Cross-chain transfer failed')
        }
      } else {
        // Same-chain direct transfer
        const response = await fetch('http://localhost:3001/api/transfer/direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromAddress: userAddress,
            toAddress: recipientAddress,
            amount: amountInSmallestUnit,
            chainId: sourceChain.id,
            tokenAddress: token.address === '0x0000000000000000000000000000000000000000' ? undefined : token.address,
            sessionPassword
          })
        })

        const data = await response.json()

        if (data.success) {
          setSuccess(`Transfer successful! 🎉\nTx: ${data.result.txHash.slice(0, 10)}...`)
          // Close modal after 3 seconds
          setTimeout(() => {
            onClose()
          }, 3000)
        } else {
          setError(data.error || 'Transfer failed')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Transfer failed')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const destNetwork = NETWORKS.find(n => n.id === destinationChain)
  const isCrossChain = sourceChain.id !== destinationChain

  return (
    <div className="transfer-modal-overlay" onClick={onClose}>
      <div className="transfer-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="transfer-modal-header">
          <h2 className="transfer-modal-title">
            <span className="title-icon">📤</span>
            Send {token.symbol}
          </h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <span className="alert-icon">✅</span>
            {success}
          </div>
        )}

        {/* Transfer Form */}
        <div className="transfer-modal-content">
          {/* Token & Source Chain (Read-only) */}
          <div className="form-section">
            <label className="form-label">From</label>
            <div className="chain-token-display">
              <div className="chain-info">
                <span className="chain-icon">{sourceChain.icon}</span>
                <span className="chain-name">{sourceChain.name}</span>
              </div>
              <div className="token-info">
                <span className="token-icon">{token.icon}</span>
                <span className="token-name">{token.symbol}</span>
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="form-section">
            <label className="form-label">
              Amount
              <span className="balance-label">
                Balance: {parseFloat(maxAmount).toFixed(6)} {token.symbol}
              </span>
            </label>
            <div className="amount-input-wrapper">
              <input
                type="number"
                className="amount-input"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.000001"
                min="0"
                max={maxAmount}
              />
              <button className="max-btn" onClick={handleSetMax}>
                MAX
              </button>
            </div>
          </div>

          {/* Destination Chain */}
          <div className="form-section">
            <label className="form-label">
              <span className="label-icon">📥</span>
              To Network
            </label>
            <div className="network-selector">
              {NETWORKS.map(network => (
                <button
                  key={network.id}
                  className={`network-btn ${destinationChain === network.id ? 'active' : ''}`}
                  onClick={() => setDestinationChain(network.id)}
                >
                  <span className="network-icon">{network.icon}</span>
                  <span className="network-name">{network.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Transfer type indicator */}
          {isCrossChain ? (
            <div className="cross-chain-badge">
              <span className="badge-icon">🌉</span>
              Cross-Chain Transfer (Not Yet Available)
            </div>
          ) : (
            <div className="cross-chain-badge" style={{ borderColor: '#00ff41', background: 'rgba(0, 255, 65, 0.1)' }}>
              <span className="badge-icon">✅</span>
              Same Network Transfer (Ready)
            </div>
          )}

          {/* Recipient */}
          <div className="form-section">
            <label className="form-label">
              <span className="label-icon">📮</span>
              Recipient
            </label>
            <div className="recipient-options">
              <label className="radio-option">
                <input
                  type="radio"
                  checked={useSameWallet}
                  onChange={() => setUseSameWallet(true)}
                />
                <span>My wallet on {destNetwork?.name}</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  checked={!useSameWallet}
                  onChange={() => setUseSameWallet(false)}
                />
                <span>Different address</span>
              </label>
            </div>

            {!useSameWallet && (
              <input
                type="text"
                className="address-input"
                placeholder="0x..."
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
              />
            )}

            {useSameWallet && (
              <div className="address-display">
                {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}
              </div>
            )}
          </div>

          {/* Transfer Summary */}
          <div className="transfer-summary">
            <div className="summary-row">
              <span className="summary-label">You send:</span>
              <span className="summary-value">
                {amount || '0'} {token.symbol} on {sourceChain.name}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Recipient gets:</span>
              <span className="summary-value">
                {amount || '0'} {token.symbol} on {destNetwork?.name}
              </span>
            </div>
            {isCrossChain && (
              <div className="summary-row">
                <span className="summary-label">Transfer time:</span>
                <span className="summary-value">~30 seconds</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleTransfer}
              disabled={loading || !amount || parseFloat(amount) <= 0}
            >
              {loading ? 'Sending...' : `Send ${token.symbol}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
