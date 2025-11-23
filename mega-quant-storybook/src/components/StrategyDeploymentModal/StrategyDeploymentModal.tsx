import React, { useState, useEffect } from 'react';
import { SUPPORTED_NETWORKS, Network } from '../../config/networks';
import { StrategyDeploymentConfig } from '../../types/strategy';
import { Account } from '../AccountManager/AccountManager';
import './StrategyDeploymentModal.css';

export interface StrategyDeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (config: StrategyDeploymentConfig) => void;
  accounts: Account[];
}

interface ChainConfig {
  chainId: number;
  accountId: string;
}

export const StrategyDeploymentModal: React.FC<StrategyDeploymentModalProps> = ({
  isOpen,
  onClose,
  onDeploy,
  accounts,
}) => {
  const [strategyName, setStrategyName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedNetworks, setSelectedNetworks] = useState<number[]>([]);
  const [chainConfigs, setChainConfigs] = useState<Record<number, ChainConfig>>({});
  const [error, setError] = useState<string>('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStrategyName('');
      setDescription('');
      setSelectedNetworks([]);
      setChainConfigs({});
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Get network by ID
  const getNetwork = (networkId: number): Network | undefined => {
    return SUPPORTED_NETWORKS.find(n => n.id === networkId);
  };

  // Toggle network selection
  const toggleNetwork = (networkId: number) => {
    setSelectedNetworks(prev => {
      if (prev.includes(networkId)) {
        const newNetworks = prev.filter(id => id !== networkId);
        // Remove chain config
        const newConfigs = { ...chainConfigs };
        delete newConfigs[networkId];
        setChainConfigs(newConfigs);
        return newNetworks;
      } else {
        const network = getNetwork(networkId);
        if (!network) return prev;

        // Initialize chain config
        setChainConfigs(prev => ({
          ...prev,
          [networkId]: {
            chainId: networkId,
            accountId: '',
          },
        }));
        return [...prev, networkId];
      }
    });
  };

  // Quick select helpers
  const selectAllMainnets = () => {
    const mainnets = SUPPORTED_NETWORKS.filter(n => !n.testnet);
    setSelectedNetworks(mainnets.map(n => n.id));

    const newConfigs: Record<number, ChainConfig> = {};
    mainnets.forEach(network => {
      newConfigs[network.id] = {
        chainId: network.id,
        accountId: '',
      };
    });
    setChainConfigs(newConfigs);
  };

  const selectAllTestnets = () => {
    const testnets = SUPPORTED_NETWORKS.filter(n => n.testnet);
    setSelectedNetworks(testnets.map(n => n.id));

    const newConfigs: Record<number, ChainConfig> = {};
    testnets.forEach(network => {
      newConfigs[network.id] = {
        chainId: network.id,
        accountId: '',
      };
    });
    setChainConfigs(newConfigs);
  };

  const clearSelection = () => {
    setSelectedNetworks([]);
    setChainConfigs({});
  };

  // Update chain config field
  const updateChainConfig = (chainId: number, field: keyof ChainConfig, value: any) => {
    setChainConfigs(prev => ({
      ...prev,
      [chainId]: {
        ...prev[chainId],
        [field]: value,
      },
    }));
  };

  // Get account by ID
  const getAccountById = (accountId: string): Account | undefined => {
    return accounts.find(acc => acc.id === accountId);
  };

  // Validate and deploy
  const handleDeploy = () => {
    setError('');

    // Validate strategy name
    if (!strategyName.trim()) {
      setError('ERROR: STRATEGY NAME REQUIRED');
      return;
    }

    if (strategyName.length < 3 || strategyName.length > 50) {
      setError('ERROR: STRATEGY NAME MUST BE 3-50 CHARACTERS');
      return;
    }

    // Validate networks selected
    if (selectedNetworks.length === 0) {
      setError('ERROR: NO NETWORKS SELECTED');
      return;
    }

    // Validate each chain config
    for (const chainId of selectedNetworks) {
      const config = chainConfigs[chainId];
      const network = getNetwork(chainId);

      if (!config) {
        setError(`ERROR: CONFIGURATION MISSING FOR ${network?.displayName}`);
        return;
      }

      // Validate account selection
      if (!config.accountId) {
        setError(`ERROR: ACCOUNT REQUIRED FOR ${network?.displayName}`);
        return;
      }

      const account = getAccountById(config.accountId);
      if (!account) {
        setError(`ERROR: INVALID ACCOUNT FOR ${network?.displayName}`);
        return;
      }
    }

    // Build deployment config
    const deploymentConfig: StrategyDeploymentConfig = {
      name: strategyName.trim(),
      description: description.trim() || undefined,
      chains: selectedNetworks.map(chainId => {
        const config = chainConfigs[chainId];
        const account = getAccountById(config.accountId)!;
        return {
          chainId,
          privateKey: account.privateKey,
          rpcEndpoint: undefined,
          tokens: [],
        };
      }),
    };

    onDeploy(deploymentConfig);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="strategy-deployment-modal">
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">⚡ DEPLOY STRATEGY</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Content */}
        <div className="modal-content">
          {/* Strategy Name */}
          <div className="form-section">
            <label className="form-label">Strategy Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter strategy name (3-50 characters)"
              value={strategyName}
              onChange={(e) => setStrategyName(e.target.value)}
              maxLength={50}
            />
          </div>

          {/* Description */}
          <div className="form-section">
            <label className="form-label">Description (Optional)</label>
            <textarea
              className="form-textarea"
              placeholder="Describe your strategy..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Network Selection */}
          <div className="form-section">
            <div className="section-header">
              <label className="form-label">Select Networks *</label>
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
                  <span className="network-icon">{network.icon}</span>
                  <span className="network-name">{network.displayName}</span>
                  {network.testnet && <span className="testnet-badge">TEST</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Chain Configurations */}
          {selectedNetworks.length > 0 && (
            <div className="form-section">
              <label className="form-label">Chain Configurations</label>
              <div className="chain-configs">
                {selectedNetworks.map(chainId => {
                  const network = getNetwork(chainId);
                  const config = chainConfigs[chainId];
                  if (!network || !config) return null;

                  return (
                    <div key={chainId} className="chain-config-card">
                      <div
                        className="chain-config-header"
                        style={{ borderLeft: `4px solid ${network.color}` }}
                      >
                        <span className="config-chain-icon">{network.icon}</span>
                        <span className="config-chain-name">{network.displayName}</span>
                      </div>

                      {/* Account Selection */}
                      <div className="config-field">
                        <label className="config-label">Select Account *</label>
                        {accounts.length === 0 ? (
                          <div className="no-accounts-warning">
                            <span className="warning-icon">⚠</span>
                            <span>No accounts available. Please create an account in Account Manager first.</span>
                          </div>
                        ) : (
                          <>
                            <select
                              className="config-select"
                              value={config.accountId}
                              onChange={(e) => updateChainConfig(chainId, 'accountId', e.target.value)}
                            >
                              <option value="">-- Select an account --</option>
                              {accounts.map(account => (
                                <option key={account.id} value={account.id}>
                                  {account.name} ({account.address.slice(0, 6)}...{account.address.slice(-4)})
                                </option>
                              ))}
                            </select>
                            {config.accountId && getAccountById(config.accountId) && (
                              <div className="selected-account-info">
                                <div className="account-info-row">
                                  <span className="info-label">Address:</span>
                                  <span className="info-value">{getAccountById(config.accountId)!.address}</span>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="deploy-btn" onClick={handleDeploy}>
            <span className="deploy-icon">🚀</span>
            <span>Deploy Strategy</span>
          </button>
        </div>
      </div>
    </div>
  );
};
