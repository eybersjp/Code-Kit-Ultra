import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@audit': path.resolve(__dirname, '../../packages/audit/src'),
      '@orchestrator': path.resolve(__dirname, '../../packages/orchestrator/src'),
      '@governance': path.resolve(__dirname, '../../packages/governance/src'),
      '@memory': path.resolve(__dirname, '../../packages/memory/src'),
      '@core': path.resolve(__dirname, '../../packages/core/src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      all: true,
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
