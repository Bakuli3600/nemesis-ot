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
      '@cognitia/security': path.resolve(__dirname, 'packages/security/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    // Browser E2E tests need the built extension and Chrome; they run via
    // `pnpm test:browser` (vitest.browser.config.ts), after `pnpm build`.
    exclude: ['**/node_modules/**', 'tests/browser/**'],
  },
});
