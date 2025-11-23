import type { StorybookConfig } from '@storybook/react-webpack5';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-links',
  ],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  staticDirs: ['../public'],
  webpackFinal: async (config) => {
    // Add support for TypeScript
    config.module?.rules?.push({
      test: /\.tsx?$/,
      use: [
        {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
      ],
      exclude: /node_modules/,
    });

    config.resolve?.extensions?.push('.ts', '.tsx');

    // Mock Electron for browser environment
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve?.fallback,
        electron: false,
        fs: false,
        path: false,
        crypto: false,
      },
    };

    return config;
  },
  docs: {
    autodocs: 'tag',
  },
};

export default config;