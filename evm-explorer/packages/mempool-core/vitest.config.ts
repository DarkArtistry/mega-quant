import { defineConfig } from 'vitest/config';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const viemEntry = require.resolve('viem');

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/*.test.ts', 'tests/**', 'node_modules/**'],
    },
  },
  resolve: {
    alias: {
      '@evm-explorer': path.resolve(__dirname, '../'),
      viem: viemEntry,
    },
  },
});
