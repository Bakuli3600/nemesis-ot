import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Workspace package aliases (resolve from TS source) — kept in sync with
// apps/extension/vite.config.ts. Vite does not read package.json "main"
// workspace links reliably for TS entrypoints, so we alias explicitly.
const workspaceAliases: Record<string, string> = {
  '@cognitia/core': resolve(__dirname, '../../packages/core/src/index.ts'),
  '@cognitia/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
  '@cognitia/ui': resolve(__dirname, '../../packages/ui/src/index.ts'),
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: workspaceAliases,
  },
  server: {
    port: 5175,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
  },
});
