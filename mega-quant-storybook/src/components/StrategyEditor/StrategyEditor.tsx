import React, { useState, useRef, useEffect, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { TradingAPI } from '../../services/TradingAPI';
import * as ta from 'technicalindicators';
import './StrategyEditor.css';

export interface ConsoleLog {
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: number;
}

export interface StrategyEditorProps {
  initialCode?: string;
  onCodeChange?: (code: string) => void;
  accounts?: Array<{ privateKey: string; networks: number[] }>;
  apiKey?: string;
  onRunStrategy?: () => void;
  consoleLogs?: ConsoleLog[];
  onConsoleLogsChange?: (logs: ConsoleLog[]) => void;
  strategyId?: string | null;
  existingWorker?: Worker;
  onWorkerCreated?: (strategyId: string, worker: Worker) => void;
  onWorkerStopped?: (strategyId: string) => void;
  onAddLogToStrategy?: (strategyId: string, log: ConsoleLog) => void;
  onStartWorker?: (strategyId: string) => void;
}

const DEFAULT_CODE = `// MEGA QUANT Trading Strategy Template
// Available APIs: mqApi, ethers, ta (technical indicators)

async function tradingStrategy() {
  console.log('▶ Strategy started...');

  // Get wallet address for Ethereum mainnet (network ID: 1)
  try {
    const wallet = mqApi.getWallet(1);
    console.log('Wallet address:', wallet.address);

    // Get ETH balance
    const ethBalance = await mqApi.getBalance('ETH', 1);
    console.log('ETH Balance:', ethBalance);

    // Get current price (mock for now)
    const price = await mqApi.getPrice('0x...', 1);
    console.log('Current price:', price.toFixed(2));

    // Technical Analysis Example
    // Calculate Simple Moving Average
    const prices = [100, 102, 101, 105, 107, 110, 108, 112];
    const sma = ta.SMA.calculate({ period: 3, values: prices });
    console.log('SMA:', sma);

    // Calculate RSI
    const rsi = ta.RSI.calculate({ period: 14, values: prices });
    console.log('RSI:', rsi);

    // Trading logic example
    if (rsi[rsi.length - 1] < 30) {
      console.log('✓ Signal: OVERSOLD - Consider buying');
    } else if (rsi[rsi.length - 1] > 70) {
      console.log('✕ Signal: OVERBOUGHT - Consider selling');
    } else {
      console.log('• Signal: NEUTRAL');
    }

    // Utilities
    const oneEther = mqApi.utils.parseEther('1.0');
    console.log('1 ETH in wei:', oneEther.toString());

  } catch (error) {
    console.error('✕ Error:', error.message);
  }

  return 'Strategy completed';
}

// Run the strategy
tradingStrategy()
  .then(result => console.log('✓', result))
  .catch(error => console.error('✕ Error:', error.message));
`;

export const StrategyEditor: React.FC<StrategyEditorProps> = ({
  initialCode = DEFAULT_CODE,
  onCodeChange,
  accounts = [],
  apiKey = '',
  onRunStrategy,
  consoleLogs: controlledLogs,
  onConsoleLogsChange,
  strategyId,
  existingWorker,
  onWorkerCreated,
  onWorkerStopped,
  onAddLogToStrategy,
  onStartWorker
}) => {
  const [code, setCode] = useState(initialCode);
  const [internalLogs, setInternalLogs] = useState<ConsoleLog[]>([]);
  const consoleRef = useRef<HTMLDivElement>(null);

  // Determine if currently running based on existing worker
  const isRunning = !!existingWorker;

  // Use controlled logs if provided, otherwise use internal state
  const logs = controlledLogs !== undefined ? controlledLogs : internalLogs;

  // Keep a ref to the latest logs to avoid closure issues
  const logsRef = useRef<ConsoleLog[]>(logs);
  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  const setLogs = (newLogs: ConsoleLog[] | ((prev: ConsoleLog[]) => ConsoleLog[])) => {
    const updatedLogs = typeof newLogs === 'function' ? newLogs(logsRef.current) : newLogs;
    if (onConsoleLogsChange) {
      onConsoleLogsChange(updatedLogs);
    } else {
      setInternalLogs(updatedLogs);
    }
  };

  // Update code when initialCode prop changes
  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  // Create TradingAPI instance
  const tradingAPI = useMemo(() => {
    return new TradingAPI(accounts, apiKey);
  }, [accounts, apiKey]);

  // Auto-scroll console to bottom
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (onCodeChange) {
      onCodeChange(newCode);
    }
  };

  const addLog = (type: ConsoleLog['type'], message: string) => {
    setLogs(prev => [...prev, {
      type,
      message,
      timestamp: Date.now()
    }]);
  };

  const handleRun = () => {
    // If already running, stop it
    if (existingWorker) {
      handleStop();
      return;
    }

    if (!strategyId) {
      addLog('error', '❌ No strategy selected');
      return;
    }

    // Call the callback if provided to update strategy status
    if (onRunStrategy) {
      onRunStrategy();
    }

    // Use the shared worker creation function from dashboard
    if (onStartWorker) {
      onStartWorker(strategyId);
    }
  };

  const handleStop = () => {
    if (existingWorker && strategyId) {
      existingWorker.postMessage({ type: 'stop' });
      // Worker will send 'stopped' message and parent will handle cleanup
    }
  };

  const handleClear = () => {
    // Actually clear all logs
    if (onConsoleLogsChange) {
      onConsoleLogsChange([]);
    } else {
      setInternalLogs([]);
    }
  };

  const handleReset = () => {
    setCode('');
    // Actually clear all logs
    if (onConsoleLogsChange) {
      onConsoleLogsChange([]);
    } else {
      setInternalLogs([]);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  return (
    <div className="strategy-editor">
      <div className="editor-header">
        <div className="editor-title">
          <span className="title-icon">⚡</span>
          <span className="title-text">Strategy Editor</span>
        </div>
        <div className="editor-actions">
          <button
            className="editor-btn clear-btn"
            onClick={handleClear}
            title="Clear console output"
          >
            <span className="btn-icon">✕</span>
            <span className="btn-text">Clear Console</span>
          </button>
          <button
            className="editor-btn reset-btn"
            onClick={handleReset}
            title="Reset to template"
          >
            <span className="btn-icon">↻</span>
            <span className="btn-text">Reset</span>
          </button>
          <button
            className={`editor-btn ${isRunning ? 'stop-btn' : 'run-btn'}`}
            onClick={handleRun}
          >
            <span className="btn-icon">{isRunning ? '⏹' : '▶'}</span>
            <span className="btn-text">{isRunning ? 'Stop' : 'Run'}</span>
          </button>
        </div>
      </div>

      <div className="editor-content">
        {/* Code Editor */}
        <div className="code-editor-section">
          <div className="section-header">
            <span className="section-title">JavaScript Code</span>
          </div>
          <div className="code-editor-wrapper">
            <CodeMirror
              value={code}
              height="100%"
              theme="dark"
              extensions={[javascript()]}
              onChange={(value) => handleCodeChange(value)}
              className="code-mirror-editor"
              basicSetup={{
                lineNumbers: true,
                highlightActiveLineGutter: true,
                highlightActiveLine: true,
                foldGutter: true,
                dropCursor: true,
                allowMultipleSelections: true,
                indentOnInput: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: true,
                rectangularSelection: true,
                highlightSelectionMatches: true,
              }}
            />
          </div>
        </div>

        {/* Console Output */}
        <div className="console-section">
          <div className="section-header">
            <span className="section-title">Console Output</span>
          </div>
          <div className="console-output" ref={consoleRef}>
            {logs.length === 0 ? (
              <div className="console-empty">
                <span className="empty-icon">›</span>
                <span className="empty-text">Console output will appear here...</span>
              </div>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className={`console-line ${log.type}`}>
                  <span className="console-timestamp">[{formatTimestamp(log.timestamp)}]</span>
                  <span className="console-type">{log.type.toUpperCase()}</span>
                  <span className="console-message">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
