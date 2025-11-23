import { IoWarning, IoLockOpen, IoLockClosed, IoKey, IoEye, IoEyeOff, IoHourglass, IoSettings, IoInformationCircle, IoFlash, IoRocket, IoBarChart, IoWifi, IoCheckmarkCircle } from 'react-icons/io5';
import React, { useState } from 'react';
import { TradingPanel } from '../TradingPanel/TradingPanel';
import './TradingViewContainer.css';

export interface TradingPanelConfig {
  id: string;
  networkId?: number;
  protocolId?: string;
  pairSymbol?: string;
}

export interface TradingViewContainerProps {
  initialPanels?: TradingPanelConfig[];
  panels?: TradingPanelConfig[];
  onPanelsChange?: (panels: TradingPanelConfig[]) => void;
  alchemyApiKey?: string;
}

export const TradingViewContainer: React.FC<TradingViewContainerProps> = ({
  initialPanels = [],
  panels: controlledPanels,
  onPanelsChange,
  alchemyApiKey
}) => {
  const [internalPanels, setInternalPanels] = useState<TradingPanelConfig[]>(initialPanels);
  const [allMinimized, setAllMinimized] = useState<boolean>(false);

  // Use controlled panels if provided, otherwise use internal state
  const panels = controlledPanels !== undefined ? controlledPanels : internalPanels;
  const setPanels = (newPanels: TradingPanelConfig[] | ((prev: TradingPanelConfig[]) => TradingPanelConfig[])) => {
    const updatedPanels = typeof newPanels === 'function' ? newPanels(panels) : newPanels;
    if (onPanelsChange) {
      onPanelsChange(updatedPanels);
    } else {
      setInternalPanels(updatedPanels);
    }
  };

  const addPanel = () => {
    setPanels([...panels, { id: crypto.randomUUID() }]);
  };

  const removePanel = (id: string) => {
    setPanels(panels.filter(panel => panel.id !== id));
  };

  const updatePanelConfig = (panelId: string, config: { networkId?: number; protocolId?: string; pairSymbol?: string }) => {
    setPanels(panels.map(panel =>
      panel.id === panelId
        ? { ...panel, ...config }
        : panel
    ));
  };

  const toggleAllPanels = () => {
    setAllMinimized(!allMinimized);
  };

  return (
    <div className="trading-view-container">
      <div className="trading-view-header">
        <div className="trading-view-title">
          <span className="title-icon"><IoBarChart /></span>
          <span className="title-text">Trading Views</span>
          <span className="title-count">({panels.length})</span>
        </div>
        <div className="header-controls">
          <button
            className="toggle-all-btn"
            onClick={toggleAllPanels}
            title={allMinimized ? 'Expand All' : 'Minimize All'}
          >
            <span className="btn-icon">{allMinimized ? '□' : '—'}</span>
            <span className="btn-text">{allMinimized ? 'Expand All' : 'Minimize All'}</span>
          </button>
          <button className="add-panel-btn" onClick={addPanel}>
            <span className="btn-icon">+</span>
            <span className="btn-text">Add Trading View</span>
          </button>
        </div>
      </div>

      <div className="trading-panels-scroll">
        {panels.length === 0 ? (
          <div className="empty-trading-views">
            <div className="empty-icon"><IoBarChart /></div>
            <div className="empty-text">No Trading Views</div>
            <div className="empty-hint">Click "Add Trading View" to monitor trading pairs</div>
          </div>
        ) : (
          panels.map((panel) => (
            <TradingPanel
              key={panel.id}
              initialNetwork={panel.networkId}
              initialProtocol={panel.protocolId}
              initialPair={panel.pairSymbol}
              onRemove={() => removePanel(panel.id)}
              onConfigChange={(config) => updatePanelConfig(panel.id, config)}
              forceMinimized={allMinimized}
              alchemyApiKey={alchemyApiKey}
            />
          ))
        )}
      </div>
    </div>
  );
};
