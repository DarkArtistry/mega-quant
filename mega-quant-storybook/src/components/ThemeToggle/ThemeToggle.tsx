import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import './ThemeToggle.css';
import { FaSun, FaMoon } from 'react-icons/fa';
import { BsSunFill, BsMoonStarsFill } from 'react-icons/bs';

export interface ThemeToggleProps {
  variant?: 'default' | 'compact' | 'labeled';
  showLabel?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'default',
  showLabel = false,
  className = ''
}) => {
  const { theme, toggleTheme } = useTheme();

  // Compact variant for header/toolbar integration
  if (variant === 'compact') {
    return (
      <button
        className={`theme-toggle-compact ${className}`}
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      >
        <span className="toggle-icon">
          {theme === 'light' ? <BsSunFill className="cyber-icon-small" /> : <BsMoonStarsFill className="cyber-icon-small" />}
        </span>
        <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
      </button>
    );
  }

  // Labeled variant with text
  if (variant === 'labeled' || showLabel) {
    return (
      <div className={`theme-toggle-labeled ${className}`}>
        <span className="theme-toggle-label">Theme</span>
        <button
          className={`theme-toggle ${theme}`}
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
          <span className="theme-toggle-switch">
            <FaSun className="theme-icon sun-icon cyber-icon-small" style={{ position: 'absolute' }} />
            <FaMoon className="theme-icon moon-icon cyber-icon-small" style={{ position: 'absolute' }} />
          </span>
        </button>
      </div>
    );
  }

  // Default toggle switch
  return (
    <button
      className={`theme-toggle ${theme} ${className}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      <span className="theme-toggle-switch">
        <FaSun className="theme-icon sun-icon cyber-icon-small" style={{ position: 'absolute' }} />
        <FaMoon className="theme-icon moon-icon cyber-icon-small" style={{ position: 'absolute' }} />
      </span>
    </button>
  );
};

// Standalone toggle without context (for use outside provider)
export const StandaloneThemeToggle: React.FC<{
  theme: 'light' | 'dark';
  onChange: (theme: 'light' | 'dark') => void;
  variant?: 'default' | 'compact' | 'labeled';
  className?: string;
}> = ({ theme, onChange, variant = 'default', className = '' }) => {

  const handleToggle = () => {
    onChange(theme === 'light' ? 'dark' : 'light');
  };

  if (variant === 'compact') {
    return (
      <button
        className={`theme-toggle-compact ${className}`}
        onClick={handleToggle}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      >
        <span className="toggle-icon">
          {theme === 'light' ? <BsSunFill className="cyber-icon-small" /> : <BsMoonStarsFill className="cyber-icon-small" />}
        </span>
        <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
      </button>
    );
  }

  if (variant === 'labeled') {
    return (
      <div className={`theme-toggle-labeled ${className}`}>
        <span className="theme-toggle-label">Theme</span>
        <button
          className={`theme-toggle ${theme}`}
          onClick={handleToggle}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
          <span className="theme-toggle-switch">
            <FaSun className="theme-icon sun-icon cyber-icon-small" style={{ position: 'absolute' }} />
            <FaMoon className="theme-icon moon-icon cyber-icon-small" style={{ position: 'absolute' }} />
          </span>
        </button>
      </div>
    );
  }

  return (
    <button
      className={`theme-toggle ${theme} ${className}`}
      onClick={handleToggle}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      <span className="theme-toggle-switch">
        <FaSun className="theme-icon sun-icon cyber-icon-small" style={{ position: 'absolute' }} />
        <FaMoon className="theme-icon moon-icon cyber-icon-small" style={{ position: 'absolute' }} />
      </span>
    </button>
  );
};