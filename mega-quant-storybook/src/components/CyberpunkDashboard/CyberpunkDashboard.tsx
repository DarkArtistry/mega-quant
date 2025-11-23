import React, { useState, useEffect } from 'react';
import { SUPPORTED_NETWORKS } from '../../config/networks';
import { Account, AccountManager, NetworkRPCConfig } from '../AccountManager/AccountManager';
import { APIConfig, APIManager } from '../APIManager/APIManager';
import { SetupPasswordModal } from '../SetupPasswordModal/SetupPasswordModal';
import { UnlockAppModal } from '../UnlockAppModal/UnlockAppModal';
import { Navbar } from '../Navbar/Navbar';
import { TradingViewContainer } from '../TradingViewContainer/TradingViewContainer';
import { StrategyEditor } from '../StrategyEditor/StrategyEditor';
import { StrategyCard } from '../StrategyCard/StrategyCard';
import { StrategyDeploymentModal } from '../StrategyDeploymentModal/StrategyDeploymentModal';
import { Documentation } from '../Documentation/Documentation';
import { Strategy, StrategyDeploymentConfig, StrategyChainConfig, TradingViewPanel, ConsoleLog } from '../../types/strategy';
import { TradingPanelConfig } from '../TradingViewContainer/TradingViewContainer';
import type { ElectronAPI } from '../../types/electron';
import './CyberpunkDashboard.css';

export interface CyberpunkDashboardProps {
  theme?: 'dark'; // Always dark for cyberpunk
  sessionPassword?: string;
}

export const CyberpunkDashboard: React.FC<CyberpunkDashboardProps> = ({ sessionPassword: externalSessionPassword }) => {
  // Security state
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [sessionPassword, setSessionPassword] = useState<string | null>(externalSessionPassword || null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);

  const [showAccountManager, setShowAccountManager] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [networkConfigs, setNetworkConfigs] = useState<NetworkRPCConfig[]>([]);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [particles, setParticles] = useState<Array<{ id: number; left: number; delay: number }>>([]);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [apiConfig, setApiConfig] = useState<APIConfig>({
    alchemyAppId: '',
    alchemyApiKey: '',
    etherscanApiKey: '',
    coinMarketCapApiKey: '',
  });
  const [isStrategiesMinimized, setIsStrategiesMinimized] = useState(false);

  // Strategy management state
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [editorCode, setEditorCode] = useState<string>('');
  const [defaultTradingViews, setDefaultTradingViews] = useState<TradingPanelConfig[]>([]);

  // Worker management - map of strategyId to Worker instance
  const [strategyWorkers, setStrategyWorkers] = useState<Map<string, Worker>>(new Map());

  // Check if running in Electron
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  // Update sessionPassword when external prop changes
  useEffect(() => {
    if (externalSessionPassword) {
      console.log('[Security] External session password received');
      setSessionPassword(externalSessionPassword);
      setIsSetupComplete(true);
      setIsUnlocked(true);
    }
  }, [externalSessionPassword]);

  // Check setup status on mount
  useEffect(() => {
    const checkSetup = async () => {
      console.log('[Security] Checking setup status...');
      console.log('[Security] isElectron:', isElectron);

      if (!isElectron) {
        // For browser testing, prompt for password
        console.log('[Security] Not in Electron, prompting for password');
        const browserPassword = prompt('Enter master password for testing (or press OK for default):');
        const password = browserPassword || 'test-password-123';
        console.log('[Security] Browser password set:', password);
        setSessionPassword(password);
        console.log('[Security] Session password state updated');
        setIsSetupComplete(true);
        setIsUnlocked(true);
        setIsCheckingSetup(false);
        return;
      }

      try {
        console.log('[Security] Calling security.checkSetup()...');
        const result = await window.electronAPI.security.checkSetup();
        console.log('[Security] Setup check result:', result);

        setIsSetupComplete(result.isSetupComplete);

        if (!result.isSetupComplete) {
          console.log('[Security] Setup not complete, showing setup modal');
          setShowSetupModal(true);
        } else {
          console.log('[Security] Setup complete, showing unlock modal');
          setShowUnlockModal(true);
        }
      } catch (error) {
        console.error('[Security] Failed to check setup status:', error);
      } finally {
        setIsCheckingSetup(false);
      }
    };

    checkSetup();
  }, [isElectron]);

  // Handle setup complete
  const handleSetupComplete = (password: string) => {
    setSessionPassword(password);
    setIsSetupComplete(true);
    setIsUnlocked(true);
    setShowSetupModal(false);
  };

  // Handle unlock success
  const handleUnlockSuccess = (password: string) => {
    console.log('[Security] Unlock successful, password received');
    setSessionPassword(password);
    setIsUnlocked(true);
    setShowUnlockModal(false);
  };

  // Handle app reset
  const handleResetApp = () => {
    setSessionPassword(null);
    setIsSetupComplete(false);
    setIsUnlocked(false);
    setShowUnlockModal(false);
    setShowSetupModal(true);

    // Clear all state
    setAccounts([]);
    setNetworkConfigs([]);
    setApiConfig({
      alchemyAppId: '',
      alchemyApiKey: '',
      etherscanApiKey: '',
      coinMarketCapApiKey: '',
    });
    setStrategies([]);
  };

  const handleAPIConfigUpdate = async (config: APIConfig) => {
    setApiConfig(config);

    // Save to backend if running in Electron (encrypted with session password)
    if (isElectron && sessionPassword) {
      try {
        await window.electronAPI.config.updateApiConfig({
          password: sessionPassword,
          alchemyAppId: config.alchemyAppId,
          alchemyApiKey: config.alchemyApiKey,
          etherscanApiKey: config.etherscanApiKey,
          coinMarketCapApiKey: config.coinMarketCapApiKey,
        });
      } catch (error) {
        console.error('Failed to save API config:', error);
      }
    }
  };

  // Load API config from backend when unlocked
  useEffect(() => {
    const loadApiConfig = async () => {
      if (!isElectron || !isUnlocked || !sessionPassword) return;

      try {
        const result = await window.electronAPI.config.getApiConfig(sessionPassword);
        if (result.success && result.config) {
          setApiConfig({
            alchemyAppId: result.config.alchemy_app_id || '',
            alchemyApiKey: result.config.alchemy_api_key || '',
            etherscanApiKey: result.config.etherscan_api_key || '',
            coinMarketCapApiKey: result.config.coinmarketcap_api_key || '',
          });
        }
      } catch (error) {
        console.error('Failed to load API config:', error);
      }
    };

    loadApiConfig();
  }, [isElectron, isUnlocked, sessionPassword]);

  // Load accounts from backend when unlocked
  useEffect(() => {
    const loadAccounts = async () => {
      if (!isElectron || !isUnlocked || !sessionPassword) return;

      try {
        const result = await window.electronAPI.config.getAccounts(sessionPassword);
        if (result.success && result.accounts) {
          const loadedAccounts: Account[] = result.accounts.map((a: any) => ({
            id: a.id,
            name: a.name,
            address: a.address,
            privateKey: a.private_key,
          }));
          setAccounts(loadedAccounts);
        }
      } catch (error) {
        console.error('Failed to load accounts:', error);
      }
    };

    loadAccounts();
  }, [isElectron, isUnlocked, sessionPassword]);

  // Load network RPC configs from backend when unlocked
  useEffect(() => {
    const loadNetworkConfigs = async () => {
      if (!isElectron || !isUnlocked || !sessionPassword) return;

      try {
        const result = await window.electronAPI.config.getNetworkConfigs(sessionPassword);
        if (result.success && result.configs) {
          const loadedConfigs: NetworkRPCConfig[] = result.configs.map((c: any) => ({
            networkId: c.network_id,
            rpcProvider: c.rpc_provider,
            customRpcUrl: c.custom_rpc_url,
          }));
          setNetworkConfigs(loadedConfigs);
        }
      } catch (error) {
        console.error('Failed to load network configs:', error);
      }
    };

    loadNetworkConfigs();
  }, [isElectron, isUnlocked, sessionPassword]);

  // Load strategies from backend on mount
  useEffect(() => {
    const loadStrategies = async () => {
      if (!isElectron) {
        console.log('Not running in Electron, using mock data');
        return;
      }

      try {
        const result = await window.electronAPI.strategy.list();
        if (result.success && result.strategies) {
          // Convert backend strategies to frontend format
          const loadedStrategies: Strategy[] = result.strategies.map((s: any) => ({
            id: s.id,
            name: s.name,
            status: s.status || 'stopped',
            chains: {}, // TODO: Load chain configs from wallet_config table
            code: s.code || '',
            createdAt: new Date(s.created_at).getTime(),
            updatedAt: new Date(s.updated_at).getTime(),
            runtime: 0,
            totalProfit: 0,
            totalTrades: 0,
            description: s.description || '',
            tags: [],
            tradingViews: [],
            consoleLogs: [],
          }));
          setStrategies(loadedStrategies);
        }
      } catch (error) {
        console.error('Failed to load strategies:', error);
      }
    };

    loadStrategies();
  }, [isElectron]);

  // Generate random particles
  useEffect(() => {
    const particleArray = [];
    for (let i = 0; i < 20; i++) {
      particleArray.push({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 20
      });
    }
    setParticles(particleArray);
  }, []);

  const handleAccountsUpdate = async (newAccounts: Account[]) => {
    setAccounts(newAccounts);

    // Save to backend if running in Electron (encrypted with session password)
    if (isElectron && sessionPassword) {
      try {
        // First, get existing accounts from backend
        const existingResult = await window.electronAPI.config.getAccounts(sessionPassword);
        const existingAccounts = existingResult.success ? existingResult.accounts : [];

        // Find accounts to delete (in existing but not in new)
        const accountsToDelete = existingAccounts.filter(
          (existing: any) => !newAccounts.some(acc => acc.id === existing.id)
        );

        // Delete removed accounts
        for (const account of accountsToDelete) {
          await window.electronAPI.config.deleteAccount({
            password: sessionPassword,
            accountId: account.id
          });
        }

        // Find accounts to add (in new but not in existing)
        const accountsToAdd = newAccounts.filter(
          acc => !existingAccounts.some((existing: any) => existing.id === acc.id)
        );

        // Add new accounts
        for (const account of accountsToAdd) {
          await window.electronAPI.config.addAccount({
            password: sessionPassword,
            id: account.id,
            name: account.name,
            address: account.address,
            privateKey: account.privateKey,
          });
        }
      } catch (error) {
        console.error('Failed to save accounts:', error);
      }
    }
  };

  const handleNetworkConfigsUpdate = async (newConfigs: NetworkRPCConfig[]) => {
    setNetworkConfigs(newConfigs);

    // Save to backend if running in Electron (encrypted with session password)
    if (isElectron && sessionPassword) {
      try {
        await window.electronAPI.config.saveNetworkConfigs({
          password: sessionPassword,
          configs: newConfigs.map(config => ({
            networkId: config.networkId,
            rpcProvider: config.rpcProvider,
            customRpcUrl: config.customRpcUrl,
          })),
        });
      } catch (error) {
        console.error('Failed to save network configs:', error);
      }
    }
  };

  const handleOpenAccountManager = () => {
    setShowAccountManager(true);
  };

  const handleCloseAccountManager = () => {
    setShowAccountManager(false);
  };

  // Strategy handlers
  const handleOpenDeployModal = () => {
    setShowDeployModal(true);
  };

  const handleDeployStrategy = async (config: StrategyDeploymentConfig) => {
    // Prepare strategy data for backend
    const strategyData = {
      name: config.name,
      description: config.description || '',
      code: '', // Empty code initially
      execution_type: 'live', // or 'paper', 'backtest'
    };

    if (isElectron) {
      // Save to backend via Electron API
      try {
        const result = await window.electronAPI.strategy.create(strategyData);
        if (result.success && result.strategy) {
          // Convert backend strategy to frontend format
          const newStrategy: Strategy = {
            id: result.strategy.id,
            name: result.strategy.name,
            status: result.strategy.status || 'stopped',
            chains: config.chains.reduce((acc, chainConfig) => {
              const account = accounts.find(a => a.privateKey === chainConfig.privateKey);
              const strategyChainConfig: StrategyChainConfig = {
                chainId: chainConfig.chainId,
                privateKey: chainConfig.privateKey,
                address: account?.address || '',
                rpcEndpoint: chainConfig.rpcEndpoint,
                tokens: chainConfig.tokens,
                tradeCount: 0,
                totalProfit: 0,
                isActive: false,
                lastTradeTimestamp: undefined,
              };
              acc[chainConfig.chainId] = strategyChainConfig;
              return acc;
            }, {} as { [chainId: number]: StrategyChainConfig }),
            code: result.strategy.code || '',
            createdAt: new Date(result.strategy.created_at).getTime(),
            updatedAt: new Date(result.strategy.updated_at).getTime(),
            runtime: 0,
            totalProfit: 0,
            totalTrades: 0,
            description: result.strategy.description || '',
            tags: config.tags,
            tradingViews: [],
            consoleLogs: [],
          };

          setStrategies(prev => [...prev, newStrategy]);
          setSelectedStrategyId(newStrategy.id);
          setEditorCode('');
          console.log('Strategy deployed to backend:', newStrategy);
        } else {
          console.error('Failed to deploy strategy:', result.error);
        }
      } catch (error) {
        console.error('Error deploying strategy:', error);
      }
    } else {
      // Running in Storybook - use local state only
      const newStrategy: Strategy = {
        id: `strategy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: config.name,
        status: 'initialized',
        chains: config.chains.reduce((acc, chainConfig) => {
          const account = accounts.find(a => a.privateKey === chainConfig.privateKey);
          const strategyChainConfig: StrategyChainConfig = {
            chainId: chainConfig.chainId,
            privateKey: chainConfig.privateKey,
            address: account?.address || '',
            rpcEndpoint: chainConfig.rpcEndpoint,
            tokens: chainConfig.tokens,
            tradeCount: 0,
            totalProfit: 0,
            isActive: false,
            lastTradeTimestamp: undefined,
          };
          acc[chainConfig.chainId] = strategyChainConfig;
          return acc;
        }, {} as { [chainId: number]: StrategyChainConfig }),
        code: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        runtime: 0,
        totalProfit: 0,
        totalTrades: 0,
        description: config.description,
        tags: config.tags,
        tradingViews: [],
        consoleLogs: [],
      };

      setStrategies(prev => [...prev, newStrategy]);
      setSelectedStrategyId(newStrategy.id);
      setEditorCode('');
    }
  };

  const handleTradingViewsChange = (panels: TradingPanelConfig[]) => {
    if (selectedStrategyId) {
      // Update the selected strategy's trading views
      setStrategies(prev =>
        prev.map(s =>
          s.id === selectedStrategyId
            ? { ...s, tradingViews: panels, updatedAt: Date.now() }
            : s
        )
      );
    } else {
      // No strategy selected, use default trading views
      setDefaultTradingViews(panels);
    }
  };

  const handleConsoleLogsChange = (logs: ConsoleLog[]) => {
    if (selectedStrategyId) {
      // Update the selected strategy's console logs
      setStrategies(prev =>
        prev.map(s =>
          s.id === selectedStrategyId
            ? { ...s, consoleLogs: logs, updatedAt: Date.now() }
            : s
        )
      );
    }
  };

  const handleAddLogToStrategy = (strategyId: string, log: ConsoleLog) => {
    // Add a log to a specific strategy (used by workers running in background)
    setStrategies(prev =>
      prev.map(s =>
        s.id === strategyId
          ? { ...s, consoleLogs: [...(s.consoleLogs || []), log], updatedAt: Date.now() }
          : s
      )
    );
  };

  const handleSelectStrategy = (strategyId: string) => {
    const strategy = strategies.find(s => s.id === strategyId);
    if (strategy) {
      setSelectedStrategyId(strategyId);
      setEditorCode(strategy.code);
    }
  };

  const createWorkerForStrategy = (strategyId: string) => {
    // Get the strategy
    const strategy = strategies.find(s => s.id === strategyId);
    if (!strategy) {
      console.error('Strategy not found:', strategyId);
      return;
    }

    // Don't create if already running
    if (strategyWorkers.has(strategyId)) {
      console.log('Strategy already running:', strategyId);
      return;
    }

    // Clear console logs for this strategy
    setStrategies(prev =>
      prev.map(s =>
        s.id === strategyId
          ? { ...s, consoleLogs: [], updatedAt: Date.now() }
          : s
      )
    );

    try {
      // Create a new worker
      const worker = new Worker('/strategy-worker.js');

      // Set up message handlers
      worker.onmessage = (e) => {
        const { type, level, message, timestamp } = e.data;

        if (type === 'log') {
          // Add log to the strategy that owns this worker
          handleAddLogToStrategy(strategyId, {
            type: level as ConsoleLog['type'],
            message,
            timestamp: timestamp || Date.now()
          });
        } else if (type === 'completed') {
          // Strategy finished execution (but may have ongoing intervals)
        } else if (type === 'error') {
          handleWorkerStopped(strategyId);
        } else if (type === 'stopped') {
          handleWorkerStopped(strategyId);
        }
      };

      worker.onerror = (error) => {
        handleAddLogToStrategy(strategyId, {
          type: 'error',
          message: `❌ Worker error: ${error.message}`,
          timestamp: Date.now()
        });
        handleWorkerStopped(strategyId);
      };

      // Send code to worker for execution
      worker.postMessage({ type: 'execute', code: strategy.code });

      // Register the worker
      setStrategyWorkers(prev => {
        const newMap = new Map(prev);
        newMap.set(strategyId, worker);
        return newMap;
      });

      // Update strategy status to running
      setStrategies(prev =>
        prev.map(s =>
          s.id === strategyId
            ? { ...s, status: 'running' as const, updatedAt: Date.now() }
            : s
        )
      );

      console.log('Worker created for strategy:', strategyId);
    } catch (error: any) {
      handleAddLogToStrategy(strategyId, {
        type: 'error',
        message: `❌ Failed to create worker: ${error.message}`,
        timestamp: Date.now()
      });
    }
  };

  const handleStartStrategy = async (strategyId: string) => {
    // Update status in backend
    if (isElectron) {
      try {
        const result = await window.electronAPI.strategy.start(strategyId);
        if (!result.success) {
          console.error('Failed to start strategy in backend:', result.error);
        }
      } catch (error) {
        console.error('Error starting strategy:', error);
      }
    }

    // Start the worker for this strategy
    createWorkerForStrategy(strategyId);
  };

  const handleStopStrategy = async (strategyId: string) => {
    // Update status in backend
    if (isElectron) {
      try {
        const result = await window.electronAPI.strategy.stop(strategyId);
        if (!result.success) {
          console.error('Failed to stop strategy in backend:', result.error);
        }
      } catch (error) {
        console.error('Error stopping strategy:', error);
      }
    }

    // Actually stop the worker
    const worker = strategyWorkers.get(strategyId);
    if (worker) {
      worker.postMessage({ type: 'stop' });
      // Worker will send 'stopped' message and handleWorkerStopped will be called
    }
  };

  const handleDeleteStrategy = async (strategyId: string) => {
    // Delete from backend
    if (isElectron) {
      try {
        const result = await window.electronAPI.strategy.delete(strategyId);
        if (!result.success) {
          console.error('Failed to delete strategy from backend:', result.error);
          return; // Don't delete from local state if backend delete failed
        }
      } catch (error) {
        console.error('Error deleting strategy:', error);
        return;
      }
    }

    // Remove from local state
    setStrategies(prev => prev.filter(s => s.id !== strategyId));
    if (selectedStrategyId === strategyId) {
      setSelectedStrategyId(null);
      setEditorCode('');
    }

    // Stop worker if running
    const worker = strategyWorkers.get(strategyId);
    if (worker) {
      worker.terminate();
      setStrategyWorkers(prev => {
        const newMap = new Map(prev);
        newMap.delete(strategyId);
        return newMap;
      });
    }
  };

  const handleEditorCodeChange = (code: string) => {
    setEditorCode(code);
    // Update the selected strategy's code
    if (selectedStrategyId) {
      setStrategies(prev =>
        prev.map(s =>
          s.id === selectedStrategyId
            ? { ...s, code, updatedAt: Date.now() }
            : s
        )
      );
    }
  };

  const handleRunStrategy = () => {
    if (selectedStrategyId) {
      // Change status to running when run button is clicked
      setStrategies(prev =>
        prev.map(s =>
          s.id === selectedStrategyId
            ? { ...s, status: 'running' as const, updatedAt: Date.now() }
            : s
        )
      );
    }
  };

  const handleWorkerCreated = (strategyId: string, worker: Worker) => {
    setStrategyWorkers(prev => {
      const newMap = new Map(prev);
      newMap.set(strategyId, worker);
      return newMap;
    });
  };

  const handleWorkerStopped = (strategyId: string) => {
    setStrategyWorkers(prev => {
      const newMap = new Map(prev);
      const worker = newMap.get(strategyId);
      if (worker) {
        worker.terminate();
        newMap.delete(strategyId);
      }
      return newMap;
    });

    // Update strategy status to stopped
    setStrategies(prev =>
      prev.map(s =>
        s.id === strategyId
          ? { ...s, status: 'stopped' as const, updatedAt: Date.now() }
          : s
      )
    );
  };

  // Calculate active networks from network configs
  const activeNetworks = new Set<number>();
  networkConfigs.forEach(config => {
    activeNetworks.add(config.networkId);
  });

  const renderEmptyState = () => (
    <div className="cyber-empty-state">
      <h1 className="cyber-glitch-text">MEGA QUANT</h1>
      <p className="cyber-subtitle">Quantum Trading Terminal // Version 2.0.77</p>

      <div className="cyber-steps">
        <div className="cyber-step">
          <div className="cyber-step-number">01</div>
          <div className="cyber-step-title">Initialize Wallets</div>
          <div className="cyber-step-desc">
            Connect your quantum-encrypted wallets across the metaverse networks
          </div>
        </div>

        <div className="cyber-step">
          <div className="cyber-step-number">02</div>
          <div className="cyber-step-title">Select Networks</div>
          <div className="cyber-step-desc">
            Choose your target blockchain networks for cross-dimensional arbitrage
          </div>
        </div>

        <div className="cyber-step">
          <div className="cyber-step-number">03</div>
          <div className="cyber-step-title">Deploy Algorithms</div>
          <div className="cyber-step-desc">
            Execute neural-enhanced trading strategies with quantum computing power
          </div>
        </div>
      </div>

      <button
        className="cyber-cta-button"
        onClick={handleOpenAccountManager}
      >
        [ JACK IN ]
      </button>
    </div>
  );

  const renderAnalysisPage = () => (
    <div className="cyber-dashboard-grid">
      {/* Analysis Card */}
      <div className="cyber-card">
        <div className="cyber-card-header">
          <div className="cyber-card-title">Portfolio Analysis</div>
          <span className="cyber-card-icon glow-pink">◆</span>
        </div>
        <div>
          <div className="cyber-stat">
            <span className="cyber-stat-label">Portfolio Performance</span>
            <span className="cyber-stat-value" style={{ color: 'var(--neon-green)' }}>+12.5%</span>
          </div>
          <div className="cyber-stat">
            <span className="cyber-stat-label">24h Volume</span>
            <span className="cyber-stat-value">$0.00</span>
          </div>
          <div className="cyber-stat">
            <span className="cyber-stat-label">Active Positions</span>
            <span className="cyber-stat-value">000</span>
          </div>
          <div className="cyber-stat">
            <span className="cyber-stat-label">Risk Score</span>
            <span className="cyber-stat-value" style={{ color: 'var(--neon-yellow)' }}>MED</span>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="cyber-card">
        <div className="cyber-card-header">
          <div className="cyber-card-title">Performance Metrics</div>
          <span className="cyber-card-icon glow-cyan">📊</span>
        </div>
        <div>
          <div className="cyber-stat">
            <span className="cyber-stat-label">Win Rate</span>
            <span className="cyber-stat-value" style={{ color: 'var(--neon-green)' }}>0.0%</span>
          </div>
          <div className="cyber-stat">
            <span className="cyber-stat-label">Total Trades</span>
            <span className="cyber-stat-value">000</span>
          </div>
          <div className="cyber-stat">
            <span className="cyber-stat-label">Avg Profit/Trade</span>
            <span className="cyber-stat-value" style={{ color: 'var(--neon-green)' }}>$0.00</span>
          </div>
          <div className="cyber-stat">
            <span className="cyber-stat-label">Max Drawdown</span>
            <span className="cyber-stat-value" style={{ color: 'var(--neon-red)' }}>0.0%</span>
          </div>
        </div>
      </div>

      {/* Risk Analysis */}
      <div className="cyber-card">
        <div className="cyber-card-header">
          <div className="cyber-card-title">Risk Analysis</div>
          <span className="cyber-card-icon glow-green">⚠</span>
        </div>
        <div>
          <div className="cyber-stat">
            <span className="cyber-stat-label">Portfolio Beta</span>
            <span className="cyber-stat-value">0.00</span>
          </div>
          <div className="cyber-stat">
            <span className="cyber-stat-label">Volatility (30d)</span>
            <span className="cyber-stat-value">0.0%</span>
          </div>
          <div className="cyber-stat">
            <span className="cyber-stat-label">Sharpe Ratio</span>
            <span className="cyber-stat-value">0.00</span>
          </div>
          <div className="cyber-stat">
            <span className="cyber-stat-label">VaR (95%)</span>
            <span className="cyber-stat-value">$0.00</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderConnectedState = () => {
    // Helper to format runtime
    const formatRuntime = (ms: number): string => {
      if (ms === 0) return '0m';
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
      } else if (minutes > 0) {
        return `${minutes}m`;
      } else {
        return `${seconds}s`;
      }
    };

    // Helper to get primary chain name
    const getPrimaryChain = (strategy: Strategy): string => {
      const chainIds = Object.keys(strategy.chains);
      if (chainIds.length === 0) return 'No chains';
      if (chainIds.length === 1) {
        const chainId = Number(chainIds[0]);
        const network = SUPPORTED_NETWORKS.find(n => n.id === chainId);
        return network?.displayName || `Chain ${chainId}`;
      }
      return `${chainIds.length} chains`;
    };

    // Get trading views and console logs for selected strategy, or use defaults if none selected
    const selectedStrategy = selectedStrategyId ? strategies.find(s => s.id === selectedStrategyId) : null;
    const tradingViews = selectedStrategy ? (selectedStrategy.tradingViews || []) : defaultTradingViews;
    const consoleLogs = selectedStrategy ? (selectedStrategy.consoleLogs || []) : [];
    const currentWorker = selectedStrategyId ? strategyWorkers.get(selectedStrategyId) : undefined;

    return (
      <div className="cyber-trading-workspace">
        {/* Top Section - Active Strategies (horizontal) */}
        <div className={`cyber-active-strategies-wrapper ${isStrategiesMinimized ? 'minimized' : ''}`}>
          <div className="strategies-header">
            <div className="strategies-title">
              <span className="title-icon">⚡</span>
              <span className="title-text">Active Strategies</span>
              <span className="title-count">({strategies.length})</span>
            </div>
            <div className="strategies-header-actions">
              <button
                className="minimize-strategies-btn"
                onClick={() => setIsStrategiesMinimized(!isStrategiesMinimized)}
                title={isStrategiesMinimized ? 'Expand strategies' : 'Minimize strategies'}
              >
                {isStrategiesMinimized ? '□' : '—'}
              </button>
              <button className="add-strategy-btn" onClick={handleOpenDeployModal}>
                <span className="btn-icon">+</span>
                <span className="btn-text">Deploy Strategy</span>
              </button>
            </div>
          </div>
          {!isStrategiesMinimized && (
            <div className="strategies-scroll-container">
              {strategies.length > 0 ? (
                strategies.map((strategy) => {
                  // Derive status from worker existence
                  const hasWorker = strategyWorkers.has(strategy.id);
                  const displayStatus = hasWorker ? 'running' : (strategy.status === 'initialized' ? 'stopped' : strategy.status);

                  return (
                    <div
                      key={strategy.id}
                      onClick={() => handleSelectStrategy(strategy.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <StrategyCard
                        name={strategy.name}
                        status={displayStatus as 'running' | 'stopped' | 'error' | 'paused'}
                        profit={strategy.totalProfit}
                        runtime={formatRuntime(strategy.runtime)}
                        tradesExecuted={strategy.totalTrades}
                        chain={getPrimaryChain(strategy)}
                        onStart={() => handleStartStrategy(strategy.id)}
                        onStop={() => handleStopStrategy(strategy.id)}
                        onDelete={() => handleDeleteStrategy(strategy.id)}
                      />
                    </div>
                  );
                })
              ) : (
                <div className="no-strategies">
                  <span className="empty-icon">📊</span>
                  <span className="empty-text">No active strategies</span>
                  <span className="empty-hint">Deploy a strategy to get started</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Middle Section - Trading Views */}
        <div className="cyber-trading-views-section">
          <TradingViewContainer
            panels={tradingViews}
            onPanelsChange={handleTradingViewsChange}
          />
        </div>

        {/* Bottom Section - Strategy Editor */}
        <div className="cyber-strategy-editor-wrapper">
          <StrategyEditor
            initialCode={editorCode}
            onCodeChange={handleEditorCodeChange}
            accounts={[]}
            apiKey={apiConfig.alchemyApiKey}
            onRunStrategy={handleRunStrategy}
            consoleLogs={consoleLogs}
            onConsoleLogsChange={handleConsoleLogsChange}
            strategyId={selectedStrategyId}
            existingWorker={currentWorker}
            onWorkerCreated={handleWorkerCreated}
            onWorkerStopped={handleWorkerStopped}
            onAddLogToStrategy={handleAddLogToStrategy}
            onStartWorker={createWorkerForStrategy}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="cyberpunk-dashboard">
      {/* Background Effects */}
      <div className="cyber-grid-bg"></div>
      <div className="cyber-scanlines"></div>

      {/* Floating Particles */}
      <div className="cyber-particles">
        {particles.map(particle => (
          <div
            key={particle.id}
            className="cyber-particle"
            style={{
              left: `${particle.left}%`,
              animationDelay: `${particle.delay}s`,
              background: particle.id % 3 === 0 ? 'var(--neon-pink)' :
                        particle.id % 3 === 1 ? 'var(--neon-cyan)' :
                        'var(--neon-green)'
            }}
          />
        ))}
      </div>

      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        connectedChains={activeNetworks.size}
        networkConfigs={networkConfigs}
        onConfigsUpdate={handleNetworkConfigsUpdate}
        accounts={accounts}
        onAccountsUpdate={handleAccountsUpdate}
        apiConfig={apiConfig}
        onAPIConfigUpdate={handleAPIConfigUpdate}
        masterPassword={sessionPassword || undefined}
        tabs={[
          { id: 'dashboard', label: 'Trading' },
          { id: 'analysis', label: 'Analysis' },
          { id: 'docs', label: 'Docs' }
        ]}
      />
      {console.log('🔐 CyberpunkDashboard - sessionPassword:', sessionPassword ? 'EXISTS' : 'NULL')}

      {/* Main Content */}
      <main className="cyber-main">
        {activeTab === 'docs'
          ? <Documentation />
          : networkConfigs.length === 0
            ? renderEmptyState()
            : activeTab === 'analysis'
              ? renderAnalysisPage()
              : renderConnectedState()
        }
      </main>

      {/* Cyberpunk Account Manager Modal */}
      {sessionPassword && (
        <AccountManager
          isOpen={showAccountManager}
          onClose={handleCloseAccountManager}
          networkConfigs={networkConfigs}
          onConfigsUpdate={handleNetworkConfigsUpdate}
          accounts={accounts}
          onAccountsUpdate={handleAccountsUpdate}
          masterPassword={sessionPassword}
        />
      )}

      {/* API Configuration Modal */}
      <APIManager
        isOpen={showApiConfig}
        onClose={() => setShowApiConfig(false)}
        config={apiConfig}
        onConfigUpdate={handleAPIConfigUpdate}
      />

      {/* Strategy Deployment Modal */}
      <StrategyDeploymentModal
        isOpen={showDeployModal}
        onClose={() => setShowDeployModal(false)}
        onDeploy={handleDeployStrategy}
        accounts={accounts}
      />

      {/* Security Modals */}
      <SetupPasswordModal
        isOpen={showSetupModal}
        onSetupComplete={handleSetupComplete}
      />

      <UnlockAppModal
        isOpen={showUnlockModal}
        onUnlockSuccess={handleUnlockSuccess}
        onResetApp={handleResetApp}
      />
    </div>
  );
};