import { IoWarning, IoLockOpen, IoLockClosed, IoKey, IoEye, IoEyeOff, IoHourglass, IoSettings, IoInformationCircle, IoFlash, IoRocket, IoBarChart, IoWifi, IoCheckmarkCircle, IoClose, IoCheckmark } from 'react-icons/io5';
import React, { useState, useEffect } from 'react';
import './APIManager.css';

export interface APIConfig {
  alchemyAppId: string;
  alchemyApiKey: string;
  etherscanApiKey?: string;
  coinMarketCapApiKey?: string;
  oneInchApiKey?: string;
}

export interface APIManagerProps {
  isOpen: boolean;
  onClose: () => void;
  config?: APIConfig;
  onConfigUpdate?: (config: APIConfig) => void;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error'

interface TestState {
  status: TestStatus
  message?: string
}

export const APIManager: React.FC<APIManagerProps> = ({
  isOpen,
  onClose,
  config: initialConfig,
  onConfigUpdate
}) => {
  const [apiConfig, setApiConfig] = useState<APIConfig>(initialConfig || {
    alchemyAppId: '',
    alchemyApiKey: '',
    etherscanApiKey: '',
    coinMarketCapApiKey: '',
    oneInchApiKey: '',
  });

  // Update internal state when prop changes (async load)
  useEffect(() => {
    if (initialConfig) {
      setApiConfig(initialConfig);
    }
  }, [initialConfig]);

  const [alchemyTest, setAlchemyTest] = useState<TestState>({ status: 'idle' });
  const [etherscanTest, setEtherscanTest] = useState<TestState>({ status: 'idle' });
  const [cmcTest, setCmcTest] = useState<TestState>({ status: 'idle' });
  const [oneInchTest, setOneInchTest] = useState<TestState>({ status: 'idle' });

  const handleSave = () => {
    if (onConfigUpdate) {
      onConfigUpdate(apiConfig);
    }
    console.log('API Config saved:', apiConfig);
    onClose();
  };

  const testAlchemy = async () => {
    if (!apiConfig.alchemyApiKey) {
      setAlchemyTest({ status: 'error', message: 'Please enter an API key first' });
      return;
    }

    setAlchemyTest({ status: 'testing' });

    try {
      const response = await fetch('http://localhost:3001/api/validate/test-alchemy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiConfig.alchemyApiKey })
      });

      const data = await response.json();

      if (data.success) {
        setAlchemyTest({
          status: 'success',
          message: `✓ Valid! Block: ${data.data?.blockNumber || 'N/A'}`
        });
      } else {
        setAlchemyTest({ status: 'error', message: data.error || 'Test failed' });
      }
    } catch (error: any) {
      setAlchemyTest({ status: 'error', message: 'Network error - is backend running?' });
    }

    // Reset status after 5 seconds
    setTimeout(() => setAlchemyTest({ status: 'idle' }), 5000);
  };

  const testEtherscan = async () => {
    if (!apiConfig.etherscanApiKey) {
      setEtherscanTest({ status: 'error', message: 'Please enter an API key first' });
      return;
    }

    setEtherscanTest({ status: 'testing' });

    try {
      const response = await fetch('http://localhost:3001/api/validate/test-etherscan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiConfig.etherscanApiKey })
      });

      const data = await response.json();

      if (data.success) {
        setEtherscanTest({ status: 'success', message: `✓ Valid!` });
      } else {
        setEtherscanTest({ status: 'error', message: data.error || 'Test failed' });
      }
    } catch (error: any) {
      setEtherscanTest({ status: 'error', message: 'Network error - is backend running?' });
    }

    setTimeout(() => setEtherscanTest({ status: 'idle' }), 5000);
  };

  const testCoinMarketCap = async () => {
    if (!apiConfig.coinMarketCapApiKey) {
      setCmcTest({ status: 'error', message: 'Please enter an API key first' });
      return;
    }

    setCmcTest({ status: 'testing' });

    try {
      const response = await fetch('http://localhost:3001/api/validate/test-coinmarketcap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiConfig.coinMarketCapApiKey })
      });

      const data = await response.json();

      if (data.success) {
        setCmcTest({
          status: 'success',
          message: `✓ Valid! Credits: ${data.data?.creditsLeft || 'N/A'}`
        });
      } else {
        setCmcTest({ status: 'error', message: data.error || 'Test failed' });
      }
    } catch (error: any) {
      setCmcTest({ status: 'error', message: 'Network error - is backend running?' });
    }

    setTimeout(() => setCmcTest({ status: 'idle' }), 5000);
  };

  const testOneInch = async () => {
    if (!apiConfig.oneInchApiKey) {
      setOneInchTest({ status: 'error', message: 'Please enter an API key first' });
      return;
    }

    setOneInchTest({ status: 'testing' });

    try {
      const response = await fetch('http://localhost:3001/api/validate/test-1inch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiConfig.oneInchApiKey })
      });

      const data = await response.json();

      if (data.success) {
        setOneInchTest({ status: 'success', message: `✓ Valid!` });
      } else {
        setOneInchTest({ status: 'error', message: data.error || 'Test failed' });
      }
    } catch (error: any) {
      setOneInchTest({ status: 'error', message: 'Network error - is backend running?' });
    }

    setTimeout(() => setOneInchTest({ status: 'idle' }), 5000);
  };

  if (!isOpen) return null;

  return (
    <div className="api-modal-overlay" onClick={onClose}>
      <div className="api-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="api-modal-header">
          <h2 className="api-modal-title">API Configuration</h2>
          <button className="api-modal-close-btn" onClick={onClose}>
            <IoClose />
          </button>
        </div>
        <div className="api-modal-body">
          <div className="api-provider-header">
            <div className="provider-logo">
              <span className="provider-icon"><IoFlash /></span>
              <span className="provider-name">Alchemy</span>
            </div>
            <div className="provider-description">
              Configure Alchemy API credentials for RPC access across all networks
            </div>
          </div>

          <div className="api-config-section">
            <label className="api-config-label">Alchemy App ID *</label>
            <input
              type="text"
              className="api-config-input"
              placeholder="Enter your Alchemy App ID"
              value={apiConfig.alchemyAppId}
              onChange={(e) => setApiConfig({ ...apiConfig, alchemyAppId: e.target.value })}
            />
            <div className="field-hint">
              Find your App ID in the Alchemy dashboard
            </div>
          </div>

          <div className="api-config-section">
            <label className="api-config-label">Alchemy API Key *</label>
            <div className="api-input-with-test">
              <input
                type="password"
                className="api-config-input"
                placeholder="Enter your Alchemy API Key"
                value={apiConfig.alchemyApiKey}
                onChange={(e) => {
                  setApiConfig({ ...apiConfig, alchemyApiKey: e.target.value });
                  setAlchemyTest({ status: 'idle' });
                }}
              />
              <button
                className={`test-api-btn ${alchemyTest.status}`}
                onClick={testAlchemy}
                disabled={alchemyTest.status === 'testing'}
              >
                {alchemyTest.status === 'testing' && <><IoHourglass /> Testing...</>}
                {alchemyTest.status === 'success' && <><IoCheckmark /> Valid</>}
                {alchemyTest.status === 'error' && <><IoClose /> Invalid</>}
                {alchemyTest.status === 'idle' && 'Test API Key'}
              </button>
            </div>
            {alchemyTest.message && (
              <div className={`test-message ${alchemyTest.status}`}>
                {alchemyTest.message}
              </div>
            )}
            <div className="field-hint">
              Your Alchemy API key will be used for networks configured with Alchemy RPC
            </div>
          </div>

          <div className="api-divider">
            <span className="divider-text">Optional API Keys</span>
          </div>

          <div className="api-config-section">
            <label className="api-config-label">Etherscan API Key (Optional)</label>
            <div className="api-input-with-test">
              <input
                type="password"
                className="api-config-input"
                placeholder="Enter your Etherscan API Key"
                value={apiConfig.etherscanApiKey || ''}
                onChange={(e) => {
                  setApiConfig({ ...apiConfig, etherscanApiKey: e.target.value });
                  setEtherscanTest({ status: 'idle' });
                }}
              />
              <button
                className={`test-api-btn ${etherscanTest.status}`}
                onClick={testEtherscan}
                disabled={etherscanTest.status === 'testing' || !apiConfig.etherscanApiKey}
              >
                {etherscanTest.status === 'testing' && <><IoHourglass /> Testing...</>}
                {etherscanTest.status === 'success' && <><IoCheckmark /> Valid</>}
                {etherscanTest.status === 'error' && <><IoClose /> Invalid</>}
                {etherscanTest.status === 'idle' && 'Test API Key'}
              </button>
            </div>
            {etherscanTest.message && (
              <div className={`test-message ${etherscanTest.status}`}>
                {etherscanTest.message}
              </div>
            )}
            <div className="field-hint">
              For enhanced transaction and contract data
            </div>
          </div>

          <div className="api-config-section">
            <label className="api-config-label">CoinMarketCap API Key (Optional)</label>
            <div className="api-input-with-test">
              <input
                type="password"
                className="api-config-input"
                placeholder="Enter your CoinMarketCap API Key"
                value={apiConfig.coinMarketCapApiKey || ''}
                onChange={(e) => {
                  setApiConfig({ ...apiConfig, coinMarketCapApiKey: e.target.value });
                  setCmcTest({ status: 'idle' });
                }}
              />
              <button
                className={`test-api-btn ${cmcTest.status}`}
                onClick={testCoinMarketCap}
                disabled={cmcTest.status === 'testing' || !apiConfig.coinMarketCapApiKey}
              >
                {cmcTest.status === 'testing' && <><IoHourglass /> Testing...</>}
                {cmcTest.status === 'success' && <><IoCheckmark /> Valid</>}
                {cmcTest.status === 'error' && <><IoClose /> Invalid</>}
                {cmcTest.status === 'idle' && 'Test API Key'}
              </button>
            </div>
            {cmcTest.message && (
              <div className={`test-message ${cmcTest.status}`}>
                {cmcTest.message}
              </div>
            )}
            <div className="field-hint">
              For real-time price data and market information
            </div>
          </div>

          <div className="api-config-section">
            <label className="api-config-label">1inch API Key (Optional)</label>
            <div className="api-input-with-test">
              <input
                type="password"
                className="api-config-input"
                placeholder="Enter your 1inch API Key"
                value={apiConfig.oneInchApiKey || ''}
                onChange={(e) => {
                  setApiConfig({ ...apiConfig, oneInchApiKey: e.target.value });
                  setOneInchTest({ status: 'idle' });
                }}
              />
              <button
                className={`test-api-btn ${oneInchTest.status}`}
                onClick={testOneInch}
                disabled={oneInchTest.status === 'testing' || !apiConfig.oneInchApiKey}
              >
                {oneInchTest.status === 'testing' && <><IoHourglass /> Testing...</>}
                {oneInchTest.status === 'success' && <><IoCheckmark /> Valid</>}
                {oneInchTest.status === 'error' && <><IoClose /> Invalid</>}
                {oneInchTest.status === 'idle' && 'Test API Key'}
              </button>
            </div>
            {oneInchTest.message && (
              <div className={`test-message ${oneInchTest.status}`}>
                {oneInchTest.message}
              </div>
            )}
            <div className="field-hint">
              For DEX aggregation across 300+ protocols
            </div>
          </div>
        </div>
        <div className="api-modal-footer">
          <button className="api-modal-btn cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="api-modal-btn save-btn" onClick={handleSave}>
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
