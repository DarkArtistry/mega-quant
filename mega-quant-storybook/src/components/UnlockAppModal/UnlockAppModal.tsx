import React, { useState } from 'react';
import './UnlockAppModal.css';

export interface UnlockAppModalProps {
  isOpen: boolean;
  onUnlockSuccess: (password: string) => void;
  onResetApp: () => void;
}

export const UnlockAppModal: React.FC<UnlockAppModalProps> = ({
  isOpen,
  onUnlockSuccess,
  onResetApp
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(5);

  const handleUnlock = async () => {
    setError('');

    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      // Check if running in Electron
      const isElectron = typeof window !== 'undefined' && window.electronAPI;

      if (isElectron) {
        const result = await window.electronAPI.security.unlock(password);

        if (result.success) {
          onUnlockSuccess(password);
        } else {
          setAttemptsLeft(prev => Math.max(0, prev - 1));
          setError(result.error || 'Invalid password');
          setPassword('');

          if (attemptsLeft <= 1) {
            setError('Too many failed attempts. Consider resetting the app if you forgot your password.');
          }
        }
      } else {
        // For testing in browser
        console.log('Unlock with password:', password);
        onUnlockSuccess(password);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to unlock');
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);

    try {
      const isElectron = typeof window !== 'undefined' && window.electronAPI;

      if (isElectron) {
        const result = await window.electronAPI.security.reset();

        if (result.success) {
          onResetApp();
        } else {
          setError('Failed to reset app');
        }
      } else {
        onResetApp();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset app');
    } finally {
      setIsLoading(false);
      setShowResetConfirm(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleUnlock();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="unlock-overlay">
      <div className="unlock-modal">
        {/* Header */}
        <div className="unlock-header">
          <div className="unlock-icon">🔓</div>
          <h1 className="unlock-title">UNLOCK VAULT</h1>
          <p className="unlock-subtitle">
            Enter your master password to access your data
          </p>
        </div>

        {/* Content */}
        <div className="unlock-content">
          <div className="password-group">
            <label className="password-label">Master Password</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className={`password-field ${error ? 'error' : ''}`}
                placeholder="Enter your master password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                onKeyPress={handleKeyPress}
                autoFocus
                disabled={isLoading}
              />
              <button
                className="visibility-toggle"
                onClick={() => setShowPassword(!showPassword)}
                type="button"
                disabled={isLoading}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {attemptsLeft < 5 && attemptsLeft > 0 && (
              <div className="attempts-warning">
                ⚠ {attemptsLeft} {attemptsLeft === 1 ? 'attempt' : 'attempts'} remaining
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="unlock-error">
              <span className="unlock-error-icon">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Unlock Button */}
          <button
            className={`unlock-button ${isLoading ? 'loading' : ''}`}
            onClick={handleUnlock}
            disabled={isLoading || !password}
          >
            {isLoading ? (
              <>
                <span className="spinner">⏳</span>
                <span>VERIFYING...</span>
              </>
            ) : (
              <>
                <span className="key-icon">🔑</span>
                <span>UNLOCK</span>
              </>
            )}
          </button>

          {/* Forgot Password */}
          <div className="forgot-password">
            <button
              className="forgot-link"
              onClick={() => setShowResetConfirm(true)}
              disabled={isLoading}
            >
              Forgot your password?
            </button>
          </div>
        </div>

        {/* Reset Confirmation */}
        {showResetConfirm && (
          <div className="reset-confirm-overlay">
            <div className="reset-confirm-modal">
              <div className="reset-confirm-header">
                <div className="reset-icon">⚠️</div>
                <h2>RESET APPLICATION</h2>
              </div>
              <div className="reset-confirm-content">
                <p className="reset-warning">
                  <strong>WARNING:</strong> Resetting the app will permanently delete:
                </p>
                <ul className="reset-list">
                  <li>All wallet accounts and private keys</li>
                  <li>All API configurations</li>
                  <li>All trading strategies</li>
                  <li>All historical data and settings</li>
                </ul>
                <p className="reset-final-warning">
                  This action <strong>CANNOT</strong> be undone. Are you absolutely sure?
                </p>
              </div>
              <div className="reset-confirm-footer">
                <button
                  className="cancel-reset-btn"
                  onClick={() => setShowResetConfirm(false)}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  className="confirm-reset-btn"
                  onClick={handleReset}
                  disabled={isLoading}
                >
                  {isLoading ? 'RESETTING...' : 'DELETE ALL DATA'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Background Animation */}
      <div className="unlock-background">
        <div className="grid-line horizontal"></div>
        <div className="grid-line vertical"></div>
        <div className="floating-particle particle-1"></div>
        <div className="floating-particle particle-2"></div>
        <div className="floating-particle particle-3"></div>
      </div>
    </div>
  );
};
