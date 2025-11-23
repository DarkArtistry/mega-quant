import { defineConfig } from 'vitest/config';
import path from 'path';

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
    },
  },
});