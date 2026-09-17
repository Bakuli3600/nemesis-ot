/**
 * Browser E2E Test Configuration
 *
 * Run with: pnpm test:browser
 * Or: vitest run --config vitest.browser.config.ts
 *
 * This launches Chrome with:
 * - MetaMask preserved via user data directory
 * - Cognitia Shield loaded as unpacked extension
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@cognitia/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
      '@cognitia/shared': path.resolve(__dirname, 'packages/shared/src/index.ts'),
      '@cognitia/decoder': path.resolve(__dirname, 'packages/decoder/src/index.ts'),
      '@cognitia/risk-engine': path.resolve(__dirname, 'packages/risk-engine/src/index.ts'),
      '@cognitia/simulator': path.resolve(__dirname, 'packages/simulator/src/index.ts'),
      '@cognitia/state-diff': path.resolve(__dirname, 'packages/state-diff/src/index.ts'),
      '@cognitia/threat-intel': path.resolve(__dirname, 'packages/threat-intel/src/index.ts'),
      '@cognitia/exposure': path.resolve(__dirname, 'packages/exposure/src/index.ts'),
      '@cognitia/ui': path.resolve(__dirname, 'packages/ui/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/browser/**/*.test.ts'],
    setupFiles: ['./tests/browser/e2e.setup.ts'],
    // Browser tests may take longer
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
