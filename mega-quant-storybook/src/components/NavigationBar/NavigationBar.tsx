import React from 'react';
import { StandaloneThemeToggle } from '../ThemeToggle/ThemeToggle';
import './NavigationBar.css';
import { MdSecurity } from 'react-icons/md';

export interface NavigationBarProps {
  theme?: 'light' | 'dark';
  onThemeChange?: (theme: 'light' | 'dark') => void;
  onManageAccounts: () => void;
  connectedAccounts: number;
  activeNetworks: number;
  activeTab?: 'dashboard' | 'strategies' | 'positions' | 'analytics';
  onTabChange?: (tab: string) => void;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  theme = 'dark',
  onThemeChange,
  onManageAccounts,
  connectedAccounts = 0,
  activeNetworks = 0,
  activeTab = 'dashboard',
  onTabChange
}) => {
  return (
    <nav className={`navigation-bar ${theme}`}>
      <div className="nav-left">
        <div className="nav-logo">
          <div className="nav-logo-icon">▲</div>
          <div>
            <div className="nav-logo-text">MEGA Quant</div>
            <div className="nav-logo-subtitle">Make Ethereum Great Again</div>
          </div>
        </div>

        <div className="nav-menu">
          <button
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => onTabChange?.('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`nav-item ${activeTab === 'strategies' ? 'active' : ''}`}
            onClick={() => onTabChange?.('strategies')}
          >
            Strategies
          </button>
          <button
            className={`nav-item ${activeTab === 'positions' ? 'active' : ''}`}
            onClick={() => onTabChange?.('positions')}
          >
            Positions
          </button>
          <button
            className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => onTabChange?.('analytics')}
          >
            Analytics
          </button>
        </div>
      </div>

      <div className="nav-right">
        <div className="nav-status">
          {connectedAccounts > 0 && (
            <div className="nav-status-item">
              <span className="status-dot online"></span>
              <span>{activeNetworks} Networks</span>
            </div>
          )}

          {connectedAccounts > 0 ? (
            <div className="account-badge">
              <div className="account-badge-icon">{connectedAccounts}</div>
              <span className="account-badge-text">
                {connectedAccounts} Account{connectedAccounts !== 1 ? 's' : ''}
              </span>
            </div>
          ) : (
            <div className="nav-status-item">
              <span className="status-dot warning"></span>
              <span>No Accounts</span>
            </div>
          )}
        </div>

        <div className="nav-actions">
          <button
            className="nav-button nav-button-primary"
            onClick={onManageAccounts}
          >
            <MdSecurity className="nav-button-icon cyber-icon-small" />
            Manage Accounts
          </button>

          {onThemeChange && (
            <StandaloneThemeToggle
              theme={theme}
              onChange={onThemeChange}
              variant="compact"
            />
          )}
        </div>
      </div>
    </nav>
  );
};