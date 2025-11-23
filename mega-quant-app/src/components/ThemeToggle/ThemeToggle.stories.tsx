import type { Meta, StoryObj } from '@storybook/react';
import { ThemeToggle, StandaloneThemeToggle } from './ThemeToggle';
import { ThemeProvider } from '../../contexts/ThemeContext';
import React, { useState } from 'react';

const meta = {
  title: 'MEGA Quant/ThemeToggle',
  component: ThemeToggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div style={{
          minHeight: '300px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          background: 'var(--bg-primary, #0a0a0a)'
        }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'compact', 'labeled'],
      description: 'Toggle style variant',
    },
    showLabel: {
      control: 'boolean',
      description: 'Show label for default variant',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
  },
};

export const Compact: Story = {
  args: {
    variant: 'compact',
  },
};

export const Labeled: Story = {
  args: {
    variant: 'labeled',
  },
};

export const DefaultWithLabel: Story = {
  args: {
    variant: 'default',
    showLabel: true,
  },
};

// Story demonstrating all variants together
export const AllVariants: Story = {
  render: () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      alignItems: 'center'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ color: 'var(--text-primary, #fff)', marginBottom: '8px' }}>
          Default Toggle
        </h3>
        <ThemeToggle variant="default" />
      </div>

      <div style={{ textAlign: 'center' }}>
        <h3 style={{ color: 'var(--text-primary, #fff)', marginBottom: '8px' }}>
          Compact (for headers)
        </h3>
        <ThemeToggle variant="compact" />
      </div>

      <div style={{ textAlign: 'center' }}>
        <h3 style={{ color: 'var(--text-primary, #fff)', marginBottom: '8px' }}>
          With Label
        </h3>
        <ThemeToggle variant="labeled" />
      </div>
    </div>
  ),
};

// Standalone version without context provider
export const Standalone: Story = {
  render: () => {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        alignItems: 'center',
        padding: '20px',
        borderRadius: '12px',
        background: theme === 'dark' ? '#1a1a1a' : '#f8f9fa',
        transition: 'all 0.3s ease'
      }}>
        <h3 style={{
          color: theme === 'dark' ? '#fff' : '#1a1a1a',
          marginBottom: '8px'
        }}>
          Standalone Toggle (no context)
        </h3>
        <StandaloneThemeToggle
          theme={theme}
          onChange={setTheme}
          variant="default"
        />
        <p style={{
          color: theme === 'dark' ? '#a0a0a0' : '#606060',
          fontSize: '14px',
          textAlign: 'center',
          maxWidth: '300px'
        }}>
          This version works without ThemeProvider, useful for isolated components
        </p>
      </div>
    );
  },
  decorators: [
    (Story) => (
      <div style={{
        minHeight: '300px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px'
      }}>
        <Story />
      </div>
    ),
  ],
};