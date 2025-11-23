import React, { useState } from 'react';
import { Account, AccountManager, NetworkRPCConfig } from '../AccountManager/AccountManager';
import { APIConfig, APIManager } from '../APIManager/APIManager';
import './Navbar.css';

export interface NavbarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  connectedChains?: number;
  tabs?: Array<{ id: string; label: string }>;
  networkConfigs?: NetworkRPCConfig[];
  onConfigsUpdate?: (configs: NetworkRPCConfig[]) => void;
  accounts?: Account[];
  onAccountsUpdate?: (accounts: Account[]) => void;
  apiConfig?: APIConfig;
  onAPIConfigUpdate?: (config: APIConfig) => void;
  masterPassword?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab = 'dashboard',
  onTabChange,
  connectedChains = 0,
  tabs = [
    { id: 'dashboard', label: 'Trading' },
    { id: 'analysis', label: 'Analysis' }
  ],
  networkConfigs = [],
  onConfigsUpdate,
  accounts = [],
  onAccountsUpdate,
  apiConfig,
  onAPIConfigUpdate,
  masterPassword
}) => {
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [showAccountManager, setShowAccountManager] = useState(false);

  console.log('🔍 Navbar - masterPassword:', masterPassword ? 'EXISTS' : 'NULL/UNDEFINED');

  const handleManageNodesClick = () => {
    console.log('🔘 Manage Nodes clicked, masterPassword:', masterPassword ? 'EXISTS' : 'NULL/UNDEFINED');
    if (!masterPassword) {
      console.error('❌ Cannot open Account Manager: masterPassword is not available');
      alert('Error: Session password not available. Please reload the app.');
      return;
    }
    setShowAccountManager(true);
  };

  return (
    <>
      <nav className="cyber-nav">
        <div className="cyber-logo">
          <div className="cyber-logo-icon">▲</div>
          <div className="cyber-logo-text">
            <div className="cyber-logo-title">MEGA QUANT</div>
            <div className="cyber-logo-subtitle">Make Ethereum Great Again</div>
          </div>
        </div>

        <div className="cyber-nav-menu">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`cyber-nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => onTabChange?.(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'rgba(0, 255, 255, 0.1)',
            border: '1px solid rgba(0, 255, 255, 0.3)',
            clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)'
          }}>
            <div className={`cyber-status-indicator ${connectedChains > 0 ? 'online' : 'warning'}`}
                 style={{ width: '8px', height: '8px' }}></div>
            <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Connected to {connectedChains} {connectedChains === 1 ? 'Chain' : 'Chains'}
            </span>
          </div>

          <button
            className="cyber-button api-config-btn"
            onClick={() => setShowApiConfig(true)}
          >
            API CONFIG
          </button>

          <button
            className="cyber-button"
            onClick={handleManageNodesClick}
          >
            MANAGE NODES
          </button>
        </div>
      </nav>

      {/* Account Manager Modal */}
      {masterPassword && (
        <AccountManager
          isOpen={showAccountManager}
          onClose={() => setShowAccountManager(false)}
          networkConfigs={networkConfigs}
          onConfigsUpdate={onConfigsUpdate || (() => {})}
          accounts={accounts}
          onAccountsUpdate={onAccountsUpdate || (() => {})}
          masterPassword={masterPassword}
        />
      )}

      {/* API Configuration Modal */}
      <APIManager
        isOpen={showApiConfig}
        onClose={() => setShowApiConfig(false)}
        config={apiConfig}
        onConfigUpdate={onAPIConfigUpdate}
      />
    </>
  );
};
