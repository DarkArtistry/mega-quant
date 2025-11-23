import React, { useState, useEffect } from 'react'
import { CyberpunkDashboard } from '@components/CyberpunkDashboard/CyberpunkDashboard'
import axios from 'axios'
import { IoWarning, IoLockClosed, IoLockOpen, IoKey, IoEye, IoEyeOff, IoHourglass, IoSettings, IoInformationCircle, IoWallet } from 'react-icons/io5'
import './App.css'

type AppState = 'checking' | 'setup' | 'locked' | 'unlocked'

function App() {
  const [appState, setAppState] = useState<AppState>('checking')
  const [masterPassword, setMasterPassword] = useState<string>('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showLockConfirm, setShowLockConfirm] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showVaultMenu, setShowVaultMenu] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [requestedTab, setRequestedTab] = useState<string | null>(null)

  // Check setup status on mount
  useEffect(() => {
    checkSetupStatus()
  }, [])

  const checkSetupStatus = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/security/setup-status')

      if (response.data.success) {
        if (response.data.isSetupComplete) {
          setAppState('locked')
        } else {
          setAppState('setup')
        }
      }
    } catch (error) {
      console.error('Failed to check setup status:', error)
      setAppState('setup') // Default to setup if can't connect
    }
  }

  const handleSetup = async () => {
    setError('')

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const response = await axios.post('http://localhost:3001/api/security/setup', {
        password
      })

      if (response.data.success) {
        setMasterPassword(password)
        setAppState('unlocked')
        setPassword('')
        setConfirmPassword('')
      } else {
        setError(response.data.error || 'Setup failed')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to setup password')
    } finally {
      setLoading(false)
    }
  }

  const handleUnlock = async () => {
    setError('')

    if (!password) {
      setError('Please enter your password')
      return
    }

    setLoading(true)

    try {
      const response = await axios.post('http://localhost:3001/api/security/unlock', {
        password
      })

      if (response.data.success) {
        setMasterPassword(password)
        setAppState('unlocked')
        setPassword('')
      } else {
        setError(response.data.error || 'Invalid password')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to unlock')
    } finally {
      setLoading(false)
    }
  }

  const handleLockClick = () => {
    setShowLockConfirm(true)
  }

  const handleLockConfirm = async () => {
    setShowLockConfirm(false)

    // TODO: Stop all web workers and strategies
    // This should be passed from CyberpunkDashboard via props
    // For now, we clear the password which prevents any new operations
    console.log('🔒 Locking vault - clearing password from memory')
    console.log('⚠️ All web workers should be terminated')
    console.log('⚠️ All strategies should be stopped')

    // Call backend to clear sensitive data from memory (accounts, API keys)
    try {
      const response = await axios.post('http://localhost:3001/api/security/lock')
      if (response.data.success) {
        console.log('✅ Backend: All sensitive data cleared from memory')
      }
    } catch (error) {
      console.error('Failed to lock backend:', error)
      // Continue with frontend lock even if backend fails
    }

    // Clear password from memory
    setMasterPassword('')
    setPassword('')
    setConfirmPassword('')
    setError('')

    // Lock the app
    setAppState('locked')

    console.log('✅ Vault locked - password cleared from memory')
  }

  const handleLockCancel = () => {
    setShowLockConfirm(false)
  }

  const handleChangePasswordClick = () => {
    setShowVaultMenu(false)
    setShowChangePassword(true)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmNewPassword('')
    setError('')
  }

  const handleChangePasswordSubmit = async () => {
    setError('')

    if (!currentPassword) {
      setError('Current password is required')
      return
    }

    if (!newPassword || newPassword.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }

    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match')
      return
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password')
      return
    }

    setLoading(true)

    try {
      const response = await axios.post('http://localhost:3001/api/security/change-password', {
        currentPassword,
        newPassword
      })

      if (response.data.success) {
        alert('✅ Password changed successfully!\n\n' + (response.data.warning || ''))

        // Update master password in memory
        setMasterPassword(newPassword)

        // Close modal
        setShowChangePassword(false)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmNewPassword('')
      } else {
        setError(response.data.error || 'Failed to change password')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePasswordCancel = () => {
    setShowChangePassword(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmNewPassword('')
    setError('')
  }

  const handleReset = async () => {
    const confirmed = window.confirm(
      '⚠️ WARNING: This will DELETE ALL DATA including accounts, strategies, and trades. This CANNOT be undone. Are you sure?'
    )

    if (!confirmed) return

    const doubleConfirm = window.confirm(
      '⚠️ FINAL WARNING: All your private keys and data will be PERMANENTLY DELETED. Continue?'
    )

    if (!doubleConfirm) return

    setLoading(true)

    try {
      const response = await axios.post('http://localhost:3001/api/security/reset', {
        confirmReset: 'DELETE_ALL_DATA'
      })

      if (response.data.success) {
        alert('App reset successfully. Please create a new password.')
        setMasterPassword('')
        setPassword('')
        setConfirmPassword('')
        setError('')
        setAppState('setup')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset app')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      if (appState === 'setup') {
        handleSetup()
      } else if (appState === 'locked') {
        handleUnlock()
      }
    }
  }

  // Loading state
  if (appState === 'checking') {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.loading}><IoHourglass /> Checking security status...</div>
        </div>
      </div>
    )
  }

  // Setup password (first time)
  if (appState === 'setup') {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.header}>
            <div style={styles.icon}><IoLockClosed /></div>
            <h1 style={styles.title}>SECURE YOUR VAULT</h1>
            <p style={styles.subtitle}>Create a master password to encrypt all sensitive data</p>
          </div>

          <div style={styles.content}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Master Password</label>
              <div style={styles.inputWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  style={styles.input}
                  placeholder="Enter your master password (8+ characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  autoFocus
                  disabled={loading}
                />
                <button
                  style={styles.toggleBtn}
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? <IoEye /> : <IoEyeOff />}
                </button>
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                style={styles.input}
                placeholder="Re-enter your master password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
              />
            </div>

            {error && (
              <div style={styles.error}>
                <span><IoWarning /></span>
                <span>{error}</span>
              </div>
            )}

            <div style={styles.warning}>
              <div style={styles.warningIcon}><IoWarning /></div>
              <div style={styles.warningText}>
                <strong>IMPORTANT:</strong> This password cannot be recovered. If you forget it,
                you will need to reset the app and lose all data. Write it down and store it securely.
              </div>
            </div>
          </div>

          <div style={styles.footer}>
            <button
              style={{
                ...styles.button,
                ...(loading || !password || !confirmPassword ? styles.buttonDisabled : {})
              }}
              onClick={handleSetup}
              disabled={loading || !password || !confirmPassword}
            >
              {loading ? (
                <>
                  <span><IoHourglass /></span>
                  <span>CREATING VAULT...</span>
                </>
              ) : (
                <>
                  <span><IoLockClosed /></span>
                  <span>SECURE MY DATA</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Unlock app (returning user)
  if (appState === 'locked') {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.header}>
            <div style={styles.icon}><IoLockOpen /></div>
            <h1 style={styles.title}>UNLOCK VAULT</h1>
            <p style={styles.subtitle}>Enter your master password to access your data</p>
          </div>

          <div style={styles.content}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Master Password</label>
              <div style={styles.inputWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  style={styles.input}
                  placeholder="Enter your master password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  autoFocus
                  disabled={loading}
                />
                <button
                  style={styles.toggleBtn}
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? <IoEye /> : <IoEyeOff />}
                </button>
              </div>
            </div>

            {error && (
              <div style={styles.error}>
                <span><IoWarning /></span>
                <span>{error}</span>
              </div>
            )}

            <button
              style={{
                ...styles.button,
                ...(loading || !password ? styles.buttonDisabled : {})
              }}
              onClick={handleUnlock}
              disabled={loading || !password}
            >
              {loading ? (
                <>
                  <span><IoHourglass /></span>
                  <span>VERIFYING...</span>
                </>
              ) : (
                <>
                  <span><IoKey /></span>
                  <span>UNLOCK</span>
                </>
              )}
            </button>

            <div style={styles.forgotPassword}>
              <button
                style={styles.forgotLink}
                onClick={handleReset}
                disabled={loading}
              >
                Forgot your password? Reset app (deletes all data)
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main app (unlocked)
  return (
    <div style={styles.appContainer}>
      {/* Lock button integrated into top bar */}
      <div style={styles.lockBar}>
        <div style={styles.lockBarLeft}>
          <div style={styles.statusDot}></div>
          <span style={styles.statusText}>VAULT UNLOCKED</span>
        </div>

        <div style={styles.vaultControls}>
          <button
            style={styles.vaultMenuButton}
            onClick={() => setShowVaultMenu(!showVaultMenu)}
            title="Vault Controls"
          >
            <span style={styles.lockIcon}><IoLockClosed /></span>
            <span>VAULT</span>
            <span style={styles.dropdownArrow}>{showVaultMenu ? '▲' : '▼'}</span>
          </button>

          {showVaultMenu && (
            <div style={styles.vaultDropdown}>
              <button
                style={styles.dropdownItem}
                onClick={() => {
                  setRequestedTab('assets')
                  setShowVaultMenu(false)
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 255, 255, 0.2)'
                  e.currentTarget.style.color = '#00ffff'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#ffffff'
                }}
              >
                <span><IoWallet /></span>
                <span>Digital Assets</span>
              </button>
              <button
                style={styles.dropdownItem}
                onClick={handleLockClick}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 0, 85, 0.2)'
                  e.currentTarget.style.color = '#ff0055'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#ffffff'
                }}
              >
                <span><IoLockClosed /></span>
                <span>Lock Vault</span>
              </button>
              <button
                style={styles.dropdownItem}
                onClick={handleChangePasswordClick}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 0, 85, 0.2)'
                  e.currentTarget.style.color = '#ff0055'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#ffffff'
                }}
              >
                <span><IoKey /></span>
                <span>Change Password</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={styles.dashboardContainer}>
        <CyberpunkDashboard
          sessionPassword={masterPassword}
          requestedTab={requestedTab}
          onTabChange={() => setRequestedTab(null)}
        />
      </div>

      {/* Lock Confirmation Modal */}
      {showLockConfirm && (
        <div style={styles.overlay}>
          <div style={styles.lockConfirmModal}>
            <div style={styles.lockConfirmHeader}>
              <div style={styles.lockConfirmIcon}><IoLockClosed /></div>
              <h2 style={styles.lockConfirmTitle}>LOCK VAULT?</h2>
            </div>

            <div style={styles.lockConfirmContent}>
              <div style={styles.lockWarning}>
                <div style={styles.lockWarningIcon}><IoWarning /></div>
                <div style={styles.lockWarningText}>
                  Locking the vault will immediately halt all operations
                </div>
              </div>

              <div style={styles.lockConsequences}>
                <div style={styles.consequenceTitle}>This will:</div>
                <div style={styles.consequenceList}>
                  <div style={styles.consequenceItem}>
                    <span style={styles.consequenceBullet}><IoKey /></span>
                    <div>
                      <div style={styles.consequenceLabel}>Clear Password from Memory</div>
                      <div style={styles.consequenceDesc}>
                        Private keys will become inaccessible until unlock
                      </div>
                    </div>
                  </div>

                  <div style={styles.consequenceItem}>
                    <span style={styles.consequenceBullet}><IoSettings /></span>
                    <div>
                      <div style={styles.consequenceLabel}>Pause All Trading Strategies</div>
                      <div style={styles.consequenceDesc}>
                        All running strategies will be stopped immediately
                      </div>
                    </div>
                  </div>

                  <div style={styles.consequenceItem}>
                    <span style={styles.consequenceBullet}><IoSettings /></span>
                    <div>
                      <div style={styles.consequenceLabel}>Terminate Web Workers</div>
                      <div style={styles.consequenceDesc}>
                        All background processes will be shut down
                      </div>
                    </div>
                  </div>

                  <div style={styles.consequenceItem}>
                    <span style={styles.consequenceBullet}><IoLockOpen /></span>
                    <div>
                      <div style={styles.consequenceLabel}>Require Re-Authentication</div>
                      <div style={styles.consequenceDesc}>
                        You must unlock and manually restart strategies to resume
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.lockNote}>
                <IoInformationCircle /> <strong>Note:</strong> Your encrypted data remains safe in the database
              </div>
            </div>

            <div style={styles.lockConfirmFooter}>
              <button
                style={styles.lockCancelBtn}
                onClick={handleLockCancel}
              >
                CANCEL
              </button>
              <button
                style={styles.lockConfirmBtn}
                onClick={handleLockConfirm}
              >
                <span><IoLockClosed /></span>
                <span>LOCK VAULT NOW</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.header}>
              <div style={styles.icon}><IoKey /></div>
              <h1 style={styles.title}>CHANGE PASSWORD</h1>
              <p style={styles.subtitle}>Update your master password</p>
            </div>

            <div style={styles.content}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Current Password</label>
                <input
                  type="password"
                  style={styles.input}
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoFocus
                  disabled={loading}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>New Password</label>
                <input
                  type="password"
                  style={styles.input}
                  placeholder="Enter new password (8+ characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Confirm New Password</label>
                <input
                  type="password"
                  style={styles.input}
                  placeholder="Re-enter new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              {error && (
                <div style={styles.error}>
                  <span><IoWarning /></span>
                  <span>{error}</span>
                </div>
              )}

              <div style={styles.warning}>
                <div style={styles.warningIcon}><IoWarning /></div>
                <div style={styles.warningText}>
                  <strong>IMPORTANT:</strong> After changing your password, you may need to
                  re-add your accounts for full security. The new password will be used
                  to encrypt all future data.
                </div>
              </div>
            </div>

            <div style={styles.footer}>
              <button
                style={{
                  ...styles.button,
                  background: 'rgba(139, 157, 195, 0.2)',
                  border: '1px solid rgba(139, 157, 195, 0.5)',
                  color: '#8b9dc3',
                  marginRight: '10px'
                }}
                onClick={handleChangePasswordCancel}
                disabled={loading}
              >
                CANCEL
              </button>
              <button
                style={{
                  ...styles.button,
                  ...(loading || !currentPassword || !newPassword || !confirmNewPassword
                    ? styles.buttonDisabled
                    : {})
                }}
                onClick={handleChangePasswordSubmit}
                disabled={loading || !currentPassword || !newPassword || !confirmNewPassword}
              >
                {loading ? (
                  <>
                    <span><IoHourglass /></span>
                    <span>CHANGING...</span>
                  </>
                ) : (
                  <>
                    <span><IoKey /></span>
                    <span>CHANGE PASSWORD</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    background: 'linear-gradient(135deg, rgba(10, 0, 30, 0.98) 0%, rgba(20, 0, 40, 0.98) 100%)',
    border: '2px solid #00ffff',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '500px',
    boxShadow: '0 0 40px rgba(0, 255, 255, 0.5)',
  },
  header: {
    padding: '30px 30px 20px',
    textAlign: 'center' as const,
    borderBottom: '1px solid rgba(0, 255, 255, 0.3)',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '10px',
  },
  title: {
    color: '#00ffff',
    fontSize: '24px',
    fontWeight: 700,
    margin: '0 0 10px 0',
    textTransform: 'uppercase' as const,
    letterSpacing: '2px',
  },
  subtitle: {
    color: '#a0a0ff',
    fontSize: '14px',
    margin: 0,
  },
  content: {
    padding: '30px',
  },
  inputGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    color: '#00ffff',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    marginBottom: '8px',
    letterSpacing: '1px',
  },
  inputWrapper: {
    position: 'relative' as const,
    display: 'flex',
  },
  input: {
    width: '100%',
    padding: '12px',
    background: 'rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(0, 255, 255, 0.4)',
    borderRadius: '4px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
  },
  toggleBtn: {
    position: 'absolute' as const,
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    padding: '4px',
  },
  error: {
    background: 'rgba(255, 0, 85, 0.2)',
    border: '1px solid #ff0055',
    borderRadius: '4px',
    padding: '12px',
    color: '#ff0055',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px',
  },
  warning: {
    background: 'rgba(255, 136, 0, 0.1)',
    border: '1px solid rgba(255, 136, 0, 0.5)',
    borderRadius: '4px',
    padding: '15px',
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
  },
  warningIcon: {
    fontSize: '24px',
    flexShrink: 0,
  },
  warningText: {
    color: '#ffa500',
    fontSize: '12px',
    lineHeight: '1.5',
  },
  footer: {
    padding: '20px 30px 30px',
  },
  button: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #00ffff, #ff00ff)',
    border: 'none',
    borderRadius: '4px',
    color: '#000',
    fontSize: '14px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    letterSpacing: '1px',
    transition: 'all 0.3s ease',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  forgotPassword: {
    marginTop: '20px',
    textAlign: 'center' as const,
  },
  forgotLink: {
    background: 'transparent',
    border: 'none',
    color: '#ff0055',
    fontSize: '12px',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  loading: {
    padding: '40px',
    textAlign: 'center' as const,
    color: '#00ffff',
    fontSize: '16px',
  },
  appContainer: {
    position: 'relative' as const,
    width: '100%',
    height: '100vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  lockBar: {
    position: 'relative' as const,
    width: '100%',
    height: '50px',
    background: 'linear-gradient(90deg, rgba(10, 0, 30, 0.98) 0%, rgba(20, 0, 40, 0.98) 100%)',
    borderBottom: '2px solid rgba(255, 0, 255, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 30px',
    zIndex: 9999,
    boxShadow: '0 4px 20px rgba(255, 0, 255, 0.3)',
    flexShrink: 0,
  },
  dashboardContainer: {
    flex: 1,
    overflow: 'auto',
    position: 'relative' as const,
  },
  lockBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#00ff88',
    boxShadow: '0 0 10px rgba(0, 255, 136, 0.8)',
    animation: 'pulse 2s ease-in-out infinite',
  },
  statusText: {
    color: '#00ff88',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '1.5px',
    textTransform: 'uppercase' as const,
  },
  vaultControls: {
    position: 'relative' as const,
  },
  vaultMenuButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 20px',
    background: 'linear-gradient(135deg, rgba(255, 0, 85, 0.3), rgba(255, 0, 255, 0.3))',
    border: '2px solid #ff0055',
    borderRadius: '4px',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '1.5px',
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
    boxShadow: '0 0 20px rgba(255, 0, 85, 0.4)',
  },
  lockIcon: {
    fontSize: '14px',
  },
  dropdownArrow: {
    fontSize: '10px',
    marginLeft: '4px',
  },
  vaultDropdown: {
    position: 'absolute' as const,
    top: '100%',
    right: 0,
    marginTop: '8px',
    background: 'linear-gradient(135deg, rgba(10, 0, 30, 0.98) 0%, rgba(20, 0, 40, 0.98) 100%)',
    border: '2px solid rgba(255, 0, 85, 0.5)',
    borderRadius: '4px',
    minWidth: '200px',
    boxShadow: '0 8px 32px rgba(255, 0, 85, 0.4)',
    zIndex: 10000,
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '12px 16px',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid rgba(255, 0, 85, 0.2)',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 600,
    textAlign: 'left' as const,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  lockConfirmModal: {
    background: 'linear-gradient(135deg, rgba(10, 0, 30, 0.98) 0%, rgba(20, 0, 40, 0.98) 100%)',
    border: '2px solid #ff0055',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '600px',
    boxShadow: '0 0 60px rgba(255, 0, 85, 0.6)',
  },
  lockConfirmHeader: {
    padding: '30px 30px 20px',
    textAlign: 'center' as const,
    borderBottom: '1px solid rgba(255, 0, 85, 0.3)',
  },
  lockConfirmIcon: {
    fontSize: '48px',
    marginBottom: '10px',
  },
  lockConfirmTitle: {
    color: '#ff0055',
    fontSize: '24px',
    fontWeight: 700,
    margin: 0,
    textTransform: 'uppercase' as const,
    letterSpacing: '2px',
  },
  lockConfirmContent: {
    padding: '30px',
  },
  lockWarning: {
    background: 'rgba(255, 136, 0, 0.15)',
    border: '1px solid rgba(255, 136, 0, 0.5)',
    borderRadius: '6px',
    padding: '15px',
    display: 'flex',
    gap: '12px',
    marginBottom: '25px',
    alignItems: 'center',
  },
  lockWarningIcon: {
    fontSize: '24px',
    flexShrink: 0,
  },
  lockWarningText: {
    color: '#ffa500',
    fontSize: '14px',
    fontWeight: 600,
    lineHeight: '1.4',
  },
  lockConsequences: {
    marginBottom: '20px',
  },
  consequenceTitle: {
    color: '#00ffff',
    fontSize: '14px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    marginBottom: '15px',
  },
  consequenceList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
  consequenceItem: {
    display: 'flex',
    gap: '12px',
    padding: '12px',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 0, 85, 0.2)',
    borderRadius: '4px',
  },
  consequenceBullet: {
    fontSize: '20px',
    flexShrink: 0,
  },
  consequenceLabel: {
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 700,
    marginBottom: '4px',
  },
  consequenceDesc: {
    color: '#a0a0ff',
    fontSize: '12px',
    lineHeight: '1.4',
  },
  lockNote: {
    background: 'rgba(0, 255, 255, 0.1)',
    border: '1px solid rgba(0, 255, 255, 0.3)',
    borderRadius: '4px',
    padding: '12px',
    color: '#00ffff',
    fontSize: '12px',
    lineHeight: '1.5',
  },
  lockConfirmFooter: {
    padding: '20px 30px 30px',
    display: 'flex',
    gap: '15px',
    justifyContent: 'flex-end',
  },
  lockCancelBtn: {
    padding: '12px 24px',
    background: 'rgba(139, 157, 195, 0.2)',
    border: '1px solid rgba(139, 157, 195, 0.5)',
    borderRadius: '4px',
    color: '#8b9dc3',
    fontSize: '13px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  lockConfirmBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #ff0055, #ff00ff)',
    border: 'none',
    borderRadius: '4px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 0 20px rgba(255, 0, 85, 0.5)',
  },
}

export default App
