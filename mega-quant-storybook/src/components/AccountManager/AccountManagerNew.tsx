import React, { useState, useEffect } from 'react';
import { SUPPORTED_NETWORKS, Network } from '../../config/networks';
import { HDNodeWallet } from 'ethers';
import './AccountManager.css';

export interface NetworkRPCConfig {
  networkId: number;
  rpcProvider: 'default' | 'alchemy' | 'custom';
  customRpcUrl?: string;
}

export interface Account {
  id: string;
  name: string;
  address: string;
  accountType?: 'hd' | 'imported';
  hdWalletId?: string | null;
  hdWalletName?: string;
  derivationIndex?: number | null;
  derivationPath?: string | null;
  privateKey: string;
}

export interface HDWallet {
  id: string;
  name: string;
  accountCount: number;
  created_at: string;
}

export interface AccountManagerProps {
  isOpen: boolean;
  onClose: () => void;
  networkConfigs: NetworkRPCConfig[];
  onConfigsUpdate: (configs: NetworkRPCConfig[]) => void;
  accounts: Account[];
  onAccountsUpdate: (accounts: Account[]) => void;
  masterPassword: string; // Need password for API calls
}

export const AccountManagerNew: React.FC<AccountManagerProps> = ({
  isOpen,
  onClose,
  networkConfigs,
  onConfigsUpdate,
  accounts,
  onAccountsUpdate,
  masterPassword
}) => {
  // Network configuration state
  const [selectedNetworks, setSelectedNetworks] = useState<number[]>([]);
  const [rpcConfigs, setRpcConfigs] = useState<Record<number, NetworkRPCConfig>>({});

  // UI state
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'generate' | 'import'>('generate');
  const [loading, setLoading] = useState(false);

  // Generate Account (HD Wallet) state
  const [hdWallets, setHdWallets] = useState<HDWallet[]>([]);
  const [newWalletName, setNewWalletName] = useState('');
  const [generatedMnemonic, setGeneratedMnemonic] = useState<string | null>(null);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [copiedMnemonic, setCopiedMnemonic] = useState(false);

  // Derive account state
  const [selectedHdWallet, setSelectedHdWallet] = useState<string>('');
  const [newDerivedAccountName, setNewDerivedAccountName] = useState('');

  // Import Account (Private Key) state
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountPrivateKey, setNewAccountPrivateKey] = useState('');
  const [showNewAccountKey, setShowNewAccountKey] = useState(false);

  // Account list state
  const [accountsList, setAccountsList] = useState<Account[]>([]);
  const [showAccountKeys, setShowAccountKeys] = useState<Record<string, boolean>>({});
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Initialize from existing configs
  useEffect(() => {
    if (isOpen && networkConfigs && networkConfigs.length > 0) {
      const selected = networkConfigs.map(c => c.networkId);
      setSelectedNetworks(selected);

      const configs: Record<number, NetworkRPCConfig> = {};
      networkConfigs.forEach(config => {
        configs[config.networkId] = { ...config };
      });
      setRpcConfigs(configs);
    }
  }, [isOpen, networkConfigs]);

  // Initialize accounts and HD wallets
  useEffect(() => {
    if (isOpen && accounts) {
      setAccountsList([...accounts]);

      // Fetch HD wallets
      fetchHdWallets();
    }
  }, [isOpen, accounts]);

  // Fetch HD wallets from backend
  const fetchHdWallets = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/hd-wallets/list');
      const data = await response.json();

      if (data.success) {
        setHdWallets(data.wallets);
      }
    } catch (error: any) {
      console.error('Failed to fetch HD wallets:', error);
    }
  };

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSelectedNetworks([]);
      setRpcConfigs({});
      setError('');
      setActiveTab('generate');
      setGeneratedMnemonic(null);
      setNewWalletName('');
      setNewAccountName('');
      setNewAccountPrivateKey('');
      setShowNewAccountKey(false);
      setShowAccountKeys({});
      setShowMnemonic(false);
      setCopiedMnemonic(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getNetwork = (networkId: number): Network | undefined => {
    return SUPPORTED_NETWORKS.find(n => n.id === networkId);
  };

  // ============================================================================
  // NETWORK CONFIGURATION HANDLERS
  // ============================================================================

  const toggleNetwork = (networkId: number) => {
    setSelectedNetworks(prev => {
      if (prev.includes(networkId)) {
        const newNetworks = prev.filter(id => id !== networkId);
        const newConfigs = { ...rpcConfigs };
        delete newConfigs[networkId];
        setRpcConfigs(newConfigs);
        return newNetworks;
      } else {
        const network = getNetwork(networkId);
        if (!network) return prev;

        setRpcConfigs(prev => ({
          ...prev,
          [networkId]: {
            networkId,
            rpcProvider: 'default',
            customRpcUrl: undefined,
          },
        }));
        return [...prev, networkId];
      }
    });
  };

  const selectAllMainnets = () => {
    const mainnets = SUPPORTED_NETWORKS.filter(n => !n.testnet);
    setSelectedNetworks(mainnets.map(n => n.id));

    const newConfigs: Record<number, NetworkRPCConfig> = {};
    mainnets.forEach(network => {
      newConfigs[network.id] = {
        networkId: network.id,
        rpcProvider: 'default',
        customRpcUrl: undefined,
      };
    });
    setRpcConfigs(newConfigs);
  };

  const selectAllTestnets = () => {
    const testnets = SUPPORTED_NETWORKS.filter(n => n.testnet);
    setSelectedNetworks(testnets.map(n => n.id));

    const newConfigs: Record<number, NetworkRPCConfig> = {};
    testnets.forEach(network => {
      newConfigs[network.id] = {
        networkId: network.id,
        rpcProvider: 'default',
        customRpcUrl: undefined,
      };
    });
    setRpcConfigs(newConfigs);
  };

  const clearSelection = () => {
    setSelectedNetworks([]);
    setRpcConfigs({});
  };

  const updateRpcProvider = (networkId: number, provider: 'default' | 'alchemy' | 'custom') => {
    setRpcConfigs(prev => ({
      ...prev,
      [networkId]: {
        ...prev[networkId],
        rpcProvider: provider,
        customRpcUrl: provider === 'custom' ? prev[networkId]?.customRpcUrl : undefined,
      },
    }));
  };

  const updateCustomRpcUrl = (networkId: number, url: string) => {
    setRpcConfigs(prev => ({
      ...prev,
      [networkId]: {
        ...prev[networkId],
        customRpcUrl: url,
      },
    }));
  };

  const validateRpcUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'wss:' || parsed.protocol === 'ws:';
    } catch {
      return false;
    }
  };

  // ============================================================================
  // HD WALLET (GENERATE ACCOUNT) HANDLERS
  // ============================================================================

  /**
   * Generate a new HD wallet with 12-word mnemonic
   */
  const handleGenerateHdWallet = async () => {
    setError('');

    if (!newWalletName || newWalletName.length < 3) {
      setError('ERROR: WALLET NAME REQUIRED (minimum 3 characters)');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/hd-wallets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: masterPassword,
          walletName: newWalletName
        })
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedMnemonic(data.mnemonic);
        setShowMnemonic(true);

        // Auto-derive first account (index 0)
        await deriveFirstAccountFromNewWallet(data.walletId, newWalletName);

        // Refresh HD wallets list
        await fetchHdWallets();

        // Reset form
        setNewWalletName('');
      } else {
        setError(`ERROR: ${data.error || 'Failed to generate HD wallet'}`);
      }
    } catch (error: any) {
      setError(`ERROR: ${error.message || 'Failed to generate HD wallet'}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Auto-derive first account (index 0) from newly created HD wallet
   */
  const deriveFirstAccountFromNewWallet = async (walletId: string, walletName: string) => {
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(',', '');

    const accountName = `${walletName} #1`;

    try {
      const response = await fetch('http://localhost:3001/api/hd-wallets/derive-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: masterPassword,
          walletId,
          accountName,
          derivationIndex: 0
        })
      });

      const data = await response.json();

      if (data.success) {
        // Refresh accounts list
        await refreshAccounts();
        console.log(`✅ Auto-derived first account: ${accountName}`);
      } else {
        console.warn(`Failed to auto-derive first account: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to auto-derive first account:', error);
    }
  };

  /**
   * Derive next account from existing HD wallet
   */
  const handleDeriveAccount = async () => {
    setError('');

    if (!selectedHdWallet) {
      setError('ERROR: Please select an HD wallet');
      return;
    }

    if (!newDerivedAccountName || newDerivedAccountName.length < 3) {
      setError('ERROR: Account name required (minimum 3 characters)');
      return;
    }

    setLoading(true);

    try {
      // Get next derivation index
      const indexResponse = await fetch(`http://localhost:3001/api/hd-wallets/${selectedHdWallet}/next-index`);
      const indexData = await indexResponse.json();

      if (!indexData.success) {
        throw new Error('Failed to get next derivation index');
      }

      const nextIndex = indexData.nextIndex;

      // Derive account
      const response = await fetch('http://localhost:3001/api/hd-wallets/derive-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: masterPassword,
          walletId: selectedHdWallet,
          accountName: newDerivedAccountName,
          derivationIndex: nextIndex
        })
      });

      const data = await response.json();

      if (data.success) {
        // Refresh accounts list
        await refreshAccounts();
        await fetchHdWallets();

        // Reset form
        setNewDerivedAccountName('');
        setSelectedHdWallet('');

        console.log(`✅ Derived account: ${newDerivedAccountName} at index ${nextIndex}`);
      } else {
        setError(`ERROR: ${data.error || 'Failed to derive account'}`);
      }
    } catch (error: any) {
      setError(`ERROR: ${error.message || 'Failed to derive account'}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh accounts list from backend
   */
  const refreshAccounts = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/config-encrypted/accounts/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: masterPassword })
      });

      const data = await response.json();

      if (data.success) {
        setAccountsList(data.accounts);
        onAccountsUpdate(data.accounts);
      }
    } catch (error) {
      console.error('Failed to refresh accounts:', error);
    }
  };

  /**
   * Copy mnemonic to clipboard
   */
  const handleCopyMnemonic = async () => {
    if (!generatedMnemonic) return;

    try {
      await navigator.clipboard.writeText(generatedMnemonic);
      setCopiedMnemonic(true);
      setTimeout(() => setCopiedMnemonic(false), 2000);
    } catch (error) {
      console.error('Failed to copy mnemonic:', error);
      setError('ERROR: Failed to copy to clipboard');
    }
  };

  // ============================================================================
  // IMPORT ACCOUNT (PRIVATE KEY) HANDLERS
  // ============================================================================

  /**
   * Validate private key format
   */
  const validatePrivateKey = (key: string): boolean => {
    const cleanKey = key.startsWith('0x') ? key.slice(2) : key;
    return /^[0-9a-fA-F]{64}$/.test(cleanKey);
  };

  /**
   * Derive address from private key using ethers.js
   */
  const deriveAddress = (privateKey: string): string => {
    try {
      if (!privateKey) return '';
      const hdNode = HDNodeWallet.fromExtendedKey(privateKey);
      return hdNode.address;
    } catch {
      try {
        // Try direct import
        const { Wallet } = require('ethers');
        const wallet = new Wallet(privateKey);
        return wallet.address;
      } catch {
        return '';
      }
    }
  };

  /**
   * Add imported account with private key
   */
  const handleAddImportedAccount = async () => {
    setError('');

    if (!newAccountName.trim()) {
      setError('ERROR: ACCOUNT NAME REQUIRED');
      return;
    }

    if (newAccountName.length < 3 || newAccountName.length > 50) {
      setError('ERROR: ACCOUNT NAME MUST BE 3-50 CHARACTERS');
      return;
    }

    if (!newAccountPrivateKey) {
      setError('ERROR: PRIVATE KEY REQUIRED');
      return;
    }

    if (!validatePrivateKey(newAccountPrivateKey)) {
      setError('ERROR: INVALID PRIVATE KEY FORMAT');
      return;
    }

    const address = deriveAddress(newAccountPrivateKey);
    if (!address) {
      setError('ERROR: COULD NOT DERIVE ADDRESS FROM PRIVATE KEY');
      return;
    }

    // Check for duplicate names
    if (accountsList.some(acc => acc.name.toLowerCase() === newAccountName.trim().toLowerCase())) {
      setError('ERROR: ACCOUNT NAME ALREADY EXISTS');
      return;
    }

    // Check for duplicate private keys
    if (accountsList.some(acc => acc.privateKey === newAccountPrivateKey)) {
      setError('ERROR: THIS PRIVATE KEY IS ALREADY ADDED');
      return;
    }

    setLoading(true);

    try {
      const accountId = `account-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const response = await fetch('http://localhost:3001/api/config-encrypted/accounts/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: masterPassword,
          id: accountId,
          name: newAccountName.trim(),
          address,
          privateKey: newAccountPrivateKey
        })
      });

      const data = await response.json();

      if (data.success) {
        // Refresh accounts list
        await refreshAccounts();

        // Reset form
        setNewAccountName('');
        setNewAccountPrivateKey('');
        setShowNewAccountKey(false);

        console.log(`✅ Added imported account: ${newAccountName}`);
      } else {
        setError(`ERROR: ${data.error || 'Failed to add account'}`);
      }
    } catch (error: any) {
      setError(`ERROR: ${error.message || 'Failed to add account'}`);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // ACCOUNT MANAGEMENT HANDLERS
  // ============================================================================

  /**
   * Delete account
   */
  const handleDeleteAccount = async (accountId: string) => {
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/config-encrypted/accounts/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: masterPassword,
          accountId
        })
      });

      const data = await response.json();

      if (data.success) {
        await refreshAccounts();
        await fetchHdWallets();
      } else {
        setError(`ERROR: ${data.error || 'Failed to delete account'}`);
      }
    } catch (error: any) {
      setError(`ERROR: ${error.message || 'Failed to delete account'}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Copy address to clipboard
   */
  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
      setError('ERROR: Failed to copy address to clipboard');
    }
  };

  /**
   * Save all configurations
   */
  const handleSaveConfigs = () => {
    setError('');

    // Validate custom RPC URLs
    for (const networkId of selectedNetworks) {
      const config = rpcConfigs[networkId];
      const network = getNetwork(networkId);

      if (!config) {
        setError(`ERROR: CONFIGURATION MISSING FOR ${network?.displayName}`);
        return;
      }

      if (config.rpcProvider === 'custom') {
        if (!config.customRpcUrl) {
          setError(`ERROR: CUSTOM RPC URL REQUIRED FOR ${network?.displayName}`);
          return;
        }
        if (!validateRpcUrl(config.customRpcUrl)) {
          setError(`ERROR: INVALID RPC URL FOR ${network?.displayName}`);
          return;
        }
      }
    }

    // Convert to array and save
    const configsArray = selectedNetworks.map(networkId => rpcConfigs[networkId]);
    onConfigsUpdate(configsArray);
    onAccountsUpdate(accountsList);
    onClose();
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="account-manager-modal" style={{ maxWidth: '1000px' }}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">
            <span className="modal-icon">⚙</span>
            NETWORK RPC CONFIGURATION
          </h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Content */}
        <div className="modal-content">
          {/* Network Selection - collapsed by default, expand on click */}
          <details className="form-section" style={{ marginBottom: '2rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#00ff9f' }}>
              📡 Network Selection ({selectedNetworks.length} selected)
            </summary>

            <div style={{ marginTop: '1rem' }}>
              <div className="section-header">
                <label className="form-label">Select and Manage Networks</label>
                <div className="quick-actions">
                  <button className="quick-action-btn" onClick={selectAllMainnets}>
                    Mainnets
                  </button>
                  <button className="quick-action-btn" onClick={selectAllTestnets}>
                    Testnets
                  </button>
                  <button className="quick-action-btn" onClick={clearSelection}>
                    Clear
                  </button>
                </div>
              </div>

              <div className="networks-grid">
                {SUPPORTED_NETWORKS.map(network => (
                  <div
                    key={network.id}
                    className={`network-item ${selectedNetworks.includes(network.id) ? 'selected' : ''}`}
                    onClick={() => toggleNetwork(network.id)}
                    style={{ '--network-color': network.color } as React.CSSProperties}
                  >
                    {network.logoUrl ? (
                      <img src={network.logoUrl} alt={network.displayName} className="network-logo" />
                    ) : (
                      <span className="network-icon">{network.icon}</span>
                    )}
                    <span className="network-name">{network.displayName}</span>
                    {network.testnet && <span className="testnet-badge">TEST</span>}
                  </div>
                ))}
              </div>

              {/* RPC Configuration per Network */}
              {selectedNetworks.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <label className="form-label">RPC Configuration</label>
                  <div className="rpc-configs">
                    {selectedNetworks.map(networkId => {
                      const network = getNetwork(networkId);
                      const config = rpcConfigs[networkId];
                      if (!network || !config) return null;

                      return (
                        <div key={networkId} className="rpc-config-card">
                          <div
                            className="rpc-config-header"
                            style={{ borderLeft: `4px solid ${network.color}` }}
                          >
                            {network.logoUrl ? (
                              <img src={network.logoUrl} alt={network.displayName} className="config-network-logo" />
                            ) : (
                              <span className="config-network-icon">{network.icon}</span>
                            )}
                            <span className="config-network-name">{network.displayName}</span>
                          </div>

                          <div className="rpc-provider-selection">
                            <label className="config-label">RPC Provider</label>
                            <div className="provider-buttons">
                              <button
                                className={`provider-btn ${config.rpcProvider === 'default' ? 'active' : ''}`}
                                onClick={() => updateRpcProvider(networkId, 'default')}
                              >
                                Default
                              </button>
                              <button
                                className={`provider-btn ${config.rpcProvider === 'alchemy' ? 'active' : ''}`}
                                onClick={() => updateRpcProvider(networkId, 'alchemy')}
                              >
                                Alchemy
                              </button>
                              <button
                                className={`provider-btn ${config.rpcProvider === 'custom' ? 'active' : ''}`}
                                onClick={() => updateRpcProvider(networkId, 'custom')}
                              >
                                Custom
                              </button>
                            </div>
                          </div>

                          <div className="current-rpc-display">
                            <label className="config-label">
                              {config.rpcProvider === 'default' && 'Default RPC Endpoint'}
                              {config.rpcProvider === 'alchemy' && 'Alchemy RPC (configured in API Manager)'}
                              {config.rpcProvider === 'custom' && 'Custom RPC Endpoint'}
                            </label>
                            {config.rpcProvider === 'default' && (
                              <div className="rpc-endpoint-display">{network.rpcUrl}</div>
                            )}
                            {config.rpcProvider === 'alchemy' && (
                              <div className="rpc-endpoint-info">
                                Will use Alchemy with APP ID and API Key from API Manager
                              </div>
                            )}
                            {config.rpcProvider === 'custom' && (
                              <input
                                type="text"
                                className="config-input"
                                placeholder="https://your-rpc-endpoint.com"
                                value={config.customRpcUrl || ''}
                                onChange={(e) => updateCustomRpcUrl(networkId, e.target.value)}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </details>

          {/* Account Management */}
          <div className="form-section">
            <label className="form-label" style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>
              👤 Account Management
            </label>

            {/* Tab Switcher */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '1.5rem',
              borderBottom: '2px solid rgba(0, 255, 159, 0.2)'
            }}>
              <button
                onClick={() => setActiveTab('generate')}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: activeTab === 'generate' ? 'rgba(0, 255, 159, 0.2)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'generate' ? '3px solid #00ff9f' : 'none',
                  color: activeTab === 'generate' ? '#00ff9f' : '#8b9dc3',
                  fontWeight: activeTab === 'generate' ? 700 : 400,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                <span style={{ marginRight: '0.5rem' }}>🌱</span>
                GENERATE ACCOUNT (Seed Phrase)
              </button>
              <button
                onClick={() => setActiveTab('import')}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: activeTab === 'import' ? 'rgba(0, 255, 159, 0.2)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'import' ? '3px solid #00ff9f' : 'none',
                  color: activeTab === 'import' ? '#00ff9f' : '#8b9dc3',
                  fontWeight: activeTab === 'import' ? 700 : 400,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                <span style={{ marginRight: '0.5rem' }}>🔑</span>
                IMPORT ACCOUNT (Private Key)
              </button>
            </div>

            {/* Generate Account Tab */}
            {activeTab === 'generate' && (
              <div>
                {/* Create New HD Wallet */}
                <div className="account-add-card" style={{ marginBottom: '2rem' }}>
                  <div className="account-add-header">
                    <span className="account-icon">🌱</span>
                    <span>Create New HD Wallet</span>
                  </div>

                  <div className="account-input-group">
                    <label className="config-label">Wallet Name *</label>
                    <input
                      type="text"
                      className="config-input"
                      placeholder="e.g., Main Wallet"
                      value={newWalletName}
                      onChange={(e) => setNewWalletName(e.target.value)}
                      maxLength={50}
                      disabled={loading}
                    />
                  </div>

                  <button
                    className="add-account-btn"
                    onClick={handleGenerateHdWallet}
                    disabled={loading || !newWalletName}
                  >
                    <span>🌱</span>
                    <span>{loading ? 'Generating...' : 'Generate HD Wallet'}</span>
                  </button>

                  {/* Show generated mnemonic */}
                  {generatedMnemonic && (
                    <div style={{
                      marginTop: '1.5rem',
                      padding: '1.5rem',
                      background: 'rgba(255, 165, 0, 0.1)',
                      border: '2px solid rgba(255, 165, 0, 0.5)',
                      borderRadius: '8px'
                    }}>
                      <div style={{ marginBottom: '1rem', color: '#FFA500', fontWeight: 700 }}>
                        ⚠ IMPORTANT: Save Your Seed Phrase
                      </div>
                      <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#8b9dc3' }}>
                        This is your 12-word recovery phrase. Write it down and store it safely.
                        You'll need this to recover your accounts. We cannot recover it for you.
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '0.75rem',
                        marginBottom: '1rem',
                        padding: '1rem',
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '6px'
                      }}>
                        {generatedMnemonic.split(' ').map((word, index) => (
                          <div
                            key={index}
                            style={{
                              padding: '0.5rem',
                              background: 'rgba(0, 255, 159, 0.1)',
                              border: '1px solid rgba(0, 255, 159, 0.3)',
                              borderRadius: '4px',
                              fontSize: '0.9rem',
                              fontFamily: 'monospace',
                              color: '#00ff9f'
                            }}
                          >
                            <span style={{ color: '#8b9dc3', marginRight: '0.5rem' }}>{index + 1}.</span>
                            {word}
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={handleCopyMnemonic}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'rgba(0, 255, 159, 0.2)',
                          border: '1px solid #00ff9f',
                          borderRadius: '4px',
                          color: '#00ff9f',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {copiedMnemonic ? '✓ Copied!' : '📋 Copy to Clipboard'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Derive Account from Existing HD Wallet */}
                {hdWallets.length > 0 && (
                  <div className="account-add-card">
                    <div className="account-add-header">
                      <span className="account-icon">➕</span>
                      <span>Derive Account from Existing HD Wallet</span>
                    </div>

                    <div className="account-input-group">
                      <label className="config-label">Select HD Wallet *</label>
                      <select
                        className="config-input"
                        value={selectedHdWallet}
                        onChange={(e) => setSelectedHdWallet(e.target.value)}
                        disabled={loading}
                      >
                        <option value="">-- Select a wallet --</option>
                        {hdWallets.map(wallet => (
                          <option key={wallet.id} value={wallet.id}>
                            {wallet.name} ({wallet.accountCount} {wallet.accountCount === 1 ? 'account' : 'accounts'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="account-input-group">
                      <label className="config-label">Account Name *</label>
                      <input
                        type="text"
                        className="config-input"
                        placeholder="e.g., Main Wallet #2"
                        value={newDerivedAccountName}
                        onChange={(e) => setNewDerivedAccountName(e.target.value)}
                        maxLength={50}
                        disabled={loading}
                      />
                    </div>

                    <button
                      className="add-account-btn"
                      onClick={handleDeriveAccount}
                      disabled={loading || !selectedHdWallet || !newDerivedAccountName}
                    >
                      <span>➕</span>
                      <span>{loading ? 'Deriving...' : 'Derive Next Account'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Import Account Tab */}
            {activeTab === 'import' && (
              <div>
                <div className="account-add-card">
                  <div className="account-add-header">
                    <span className="account-icon">🔑</span>
                    <span>Import Account with Private Key</span>
                  </div>

                  <div className="account-input-group">
                    <label className="config-label">Account Name *</label>
                    <input
                      type="text"
                      className="config-input"
                      placeholder="Enter account name (3-50 characters)"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      maxLength={50}
                      disabled={loading}
                    />
                  </div>

                  <div className="account-input-group">
                    <label className="config-label">Private Key *</label>
                    <div className="input-with-toggle">
                      <input
                        type={showNewAccountKey ? 'text' : 'password'}
                        className="config-input"
                        placeholder="0x..."
                        value={newAccountPrivateKey}
                        onChange={(e) => setNewAccountPrivateKey(e.target.value)}
                        disabled={loading}
                      />
                      <button
                        className="toggle-visibility-btn"
                        onClick={() => setShowNewAccountKey(!showNewAccountKey)}
                      >
                        {showNewAccountKey ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                    {newAccountPrivateKey && validatePrivateKey(newAccountPrivateKey) && (
                      <div className="derived-address">
                        <span>Derived Address: {deriveAddress(newAccountPrivateKey)}</span>
                        <button
                          className="copy-address-btn"
                          onClick={() => handleCopyAddress(deriveAddress(newAccountPrivateKey))}
                          title="Copy address to clipboard"
                        >
                          {copiedAddress === deriveAddress(newAccountPrivateKey) ? '✓' : '📋'}
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    className="add-account-btn"
                    onClick={handleAddImportedAccount}
                    disabled={loading}
                  >
                    <span>➕</span>
                    <span>{loading ? 'Adding...' : 'Import Account'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Existing Accounts List */}
            {accountsList.length > 0 && (
              <div className="accounts-list" style={{ marginTop: '2rem' }}>
                <div className="accounts-list-header">
                  <span>All Accounts ({accountsList.length})</span>
                </div>
                {accountsList.map(account => (
                  <div key={account.id} className="account-item">
                    <div className="account-item-header">
                      <div className="account-item-name">
                        <span className="account-icon">
                          {account.accountType === 'hd' ? '🌱' : '🔑'}
                        </span>
                        <span>{account.name}</span>
                        {account.accountType === 'hd' && account.hdWalletName && (
                          <span style={{
                            marginLeft: '0.5rem',
                            fontSize: '0.8rem',
                            color: '#8b9dc3',
                            fontStyle: 'italic'
                          }}>
                            ({account.hdWalletName} • #{account.derivationIndex})
                          </span>
                        )}
                      </div>
                      <button
                        className="delete-account-btn"
                        onClick={() => handleDeleteAccount(account.id)}
                        title="Delete account"
                        disabled={loading}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="account-item-details">
                      <div className="account-detail-row">
                        <span className="detail-label">Address:</span>
                        <div className="detail-value-with-copy">
                          <span className="detail-value">{account.address}</span>
                          <button
                            className="copy-btn"
                            onClick={() => handleCopyAddress(account.address)}
                            title="Copy address to clipboard"
                          >
                            {copiedAddress === account.address ? '✓' : '📋'}
                          </button>
                        </div>
                      </div>
                      {account.derivationPath && (
                        <div className="account-detail-row">
                          <span className="detail-label">Path:</span>
                          <span className="detail-value" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            {account.derivationPath}
                          </span>
                        </div>
                      )}
                      <div className="account-detail-row">
                        <span className="detail-label">Private Key:</span>
                        <div className="detail-value-with-toggle">
                          <span className="detail-value">
                            {showAccountKeys[account.id]
                              ? account.privateKey
                              : '••••••••••••••••••••••••••••••••••••••••'}
                          </span>
                          <button
                            className="toggle-visibility-btn-small"
                            onClick={() => setShowAccountKeys(prev => ({
                              ...prev,
                              [account.id]: !prev[account.id],
                            }))}
                          >
                            {showAccountKeys[account.id] ? '👁️' : '👁️‍🗨️'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="error-banner">
              <span className="error-icon">⚠</span>
              <span className="error-text">{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="save-btn" onClick={handleSaveConfigs} disabled={loading}>
            <span className="save-icon">💾</span>
            <span>{loading ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
