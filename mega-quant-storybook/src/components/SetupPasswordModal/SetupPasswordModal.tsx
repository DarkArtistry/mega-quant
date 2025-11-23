import React, { useState, useEffect } from 'react';
import './SetupPasswordModal.css';

export interface SetupPasswordModalProps {
  isOpen: boolean;
  onSetupComplete: (password: string) => void;
}

interface PasswordStrength {
  hasLength: boolean;
  hasLowercase: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export const SetupPasswordModal: React.FC<SetupPasswordModalProps> = ({
  isOpen,
  onSetupComplete
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [strength, setStrength] = useState<PasswordStrength>({
    hasLength: false,
    hasLowercase: false,
    hasUppercase: false,
    hasNumber: false,
    hasSpecial: false
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check password strength
  useEffect(() => {
    setStrength({
      hasLength: password.length >= 8,
      hasLowercase: /[a-z]/.test(password),
      hasUppercase: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^a-zA-Z0-9]/.test(password)
    });
  }, [password]);

  const isPasswordValid = () => {
    return Object.values(strength).every(v => v === true);
  };

  const doPasswordsMatch = () => {
    return password === confirmPassword && password.length > 0;
  };

  const canSubmit = () => {
    return isPasswordValid() && doPasswordsMatch() && !isLoading;
  };

  const handleSetup = async () => {
    setError('');

    if (!isPasswordValid()) {
      setError('Password does not meet all requirements');
      return;
    }

    if (!doPasswordsMatch()) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      // Check if running in Electron
      const isElectron = typeof window !== 'undefined' && window.electronAPI;

      if (isElectron) {
        const result = await window.electronAPI.security.setup(password);

        if (result.success) {
          onSetupComplete(password);
        } else {
          setError(result.error || 'Failed to setup password');
          if (result.errors && result.errors.length > 0) {
            setError(result.errors.join(', '));
          }
        }
      } else {
        // For testing in browser
        console.log('Setup password:', password);
        onSetupComplete(password);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to setup password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canSubmit()) {
      handleSetup();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="setup-password-overlay">
      <div className="setup-password-modal">
        {/* Header */}
        <div className="setup-header">
          <div className="setup-icon">🔐</div>
          <h1 className="setup-title">SECURE YOUR VAULT</h1>
          <p className="setup-subtitle">
            Create a master password to encrypt all sensitive data
          </p>
        </div>

        {/* Password Input */}
        <div className="setup-content">
          <div className="input-group">
            <label className="input-label">Master Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className="password-input"
                placeholder="Enter your master password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                autoFocus
              />
              <button
                className="toggle-visibility"
                onClick={() => setShowPassword(!showPassword)}
                type="button"
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {/* Password Strength Indicators */}
          <div className="strength-indicators">
            <div className="strength-title">Password Requirements:</div>
            <div className={`strength-item ${strength.hasLength ? 'valid' : ''}`}>
              <span className="check-icon">{strength.hasLength ? '✓' : '○'}</span>
              <span>At least 8 characters</span>
            </div>
            <div className={`strength-item ${strength.hasUppercase ? 'valid' : ''}`}>
              <span className="check-icon">{strength.hasUppercase ? '✓' : '○'}</span>
              <span>One uppercase letter (A-Z)</span>
            </div>
            <div className={`strength-item ${strength.hasLowercase ? 'valid' : ''}`}>
              <span className="check-icon">{strength.hasLowercase ? '✓' : '○'}</span>
              <span>One lowercase letter (a-z)</span>
            </div>
            <div className={`strength-item ${strength.hasNumber ? 'valid' : ''}`}>
              <span className="check-icon">{strength.hasNumber ? '✓' : '○'}</span>
              <span>One number (0-9)</span>
            </div>
            <div className={`strength-item ${strength.hasSpecial ? 'valid' : ''}`}>
              <span className="check-icon">{strength.hasSpecial ? '✓' : '○'}</span>
              <span>One special character (!@#$%^&*)</span>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="input-group">
            <label className="input-label">Confirm Password</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className={`password-input ${confirmPassword && !doPasswordsMatch() ? 'error' : ''}`}
                placeholder="Re-enter your master password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button
                className="toggle-visibility"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                type="button"
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {confirmPassword && doPasswordsMatch() && (
              <div className="password-match">✓ Passwords match</div>
            )}
            {confirmPassword && !doPasswordsMatch() && (
              <div className="password-mismatch">✕ Passwords do not match</div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Warning */}
          <div className="warning-box">
            <div className="warning-icon">⚠️</div>
            <div className="warning-text">
              <strong>IMPORTANT:</strong> This password cannot be recovered. If you forget it,
              you will need to reset the app and lose all data. Write it down and store it securely.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="setup-footer">
          <button
            className={`setup-button ${canSubmit() ? '' : 'disabled'}`}
            onClick={handleSetup}
            disabled={!canSubmit()}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner">⏳</span>
                <span>CREATING SECURE VAULT...</span>
              </>
            ) : (
              <>
                <span className="lock-icon">🔒</span>
                <span>SECURE MY DATA</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
