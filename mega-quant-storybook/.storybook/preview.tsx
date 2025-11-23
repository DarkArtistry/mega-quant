import React, { useEffect } from 'react';
import type { Preview } from '@storybook/react';
import { mockElectronAPIs } from './electron-mocks';
import '../src/components/Analysis/Analysis.css';
import '../src/components/ThemeToggle/ThemeToggle.css';

// Apply Electron mocks globally
if (typeof window !== 'undefined') {
  Object.assign(window, mockElectronAPIs);
}

// Global decorator to handle theme switching
const ThemeDecorator = (Story, context) => {
  const theme = context.globals.theme || 'dark';

  useEffect(() => {
    // Apply theme to document for global styles
    document.documentElement.setAttribute('data-theme', theme);
    document.body.className = `theme-${theme}`;

    // Update CSS variables based on theme
    if (theme === 'light') {
      document.documentElement.style.setProperty('--bg-primary', '#ffffff');
      document.documentElement.style.setProperty('--bg-secondary', '#f8f9fa');
      document.documentElement.style.setProperty('--bg-card', '#ffffff');
      document.documentElement.style.setProperty('--text-primary', '#1a1a1a');
      document.documentElement.style.setProperty('--text-secondary', '#606060');
      document.documentElement.style.setProperty('--text-tertiary', '#909090');
      document.documentElement.style.setProperty('--border-color', '#e0e0e0');
      document.documentElement.style.setProperty('--accent-primary', '#5a67d8');
      document.documentElement.style.setProperty('--accent-secondary', '#9f46e4');
      document.documentElement.style.setProperty('--positive', '#10b981');
      document.documentElement.style.setProperty('--negative', '#ef4444');
    } else {
      document.documentElement.style.setProperty('--bg-primary', '#0a0a0a');
      document.documentElement.style.setProperty('--bg-secondary', '#141414');
      document.documentElement.style.setProperty('--bg-card', '#1a1a1a');
      document.documentElement.style.setProperty('--text-primary', '#ffffff');
      document.documentElement.style.setProperty('--text-secondary', '#a0a0a0');
      document.documentElement.style.setProperty('--text-tertiary', '#707070');
      document.documentElement.style.setProperty('--border-color', '#2a2a2a');
      document.documentElement.style.setProperty('--accent-primary', '#667eea');
      document.documentElement.style.setProperty('--accent-secondary', '#764ba2');
      document.documentElement.style.setProperty('--positive', '#4ade80');
      document.documentElement.style.setProperty('--negative', '#f87171');
    }
  }, [theme]);

  return (
    <div style={{
      minHeight: '100vh',
      background: theme === 'light' ? '#f8f9fa' : '#0a0a0a',
      color: theme === 'light' ? '#1a1a1a' : '#ffffff',
      transition: 'background 0.3s ease',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <Story />
    </div>
  );
};

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0a0a0a' },
        { name: 'light', value: '#f8f9fa' },
      ],
    },
    layout: 'fullscreen',
  },
  decorators: [ThemeDecorator],
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components',
      defaultValue: 'dark',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'dark', title: 'Dark Theme', icon: 'moon' },
          { value: 'light', title: 'Light Theme', icon: 'sun' },
        ],
        showName: true,
        dynamicTitle: true,
      },
    },
  },
};

export default preview;