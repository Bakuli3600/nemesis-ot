import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Workspace package aliases (resolve from TS source)
const workspaceAliases: Record<string, string> = {
  '@cognitia/core': resolve(__dirname, '../../packages/core/src/index.ts'),
  '@cognitia/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
  '@cognitia/decoder': resolve(__dirname, '../../packages/decoder/src/index.ts'),
  '@cognitia/risk-engine': resolve(__dirname, '../../packages/risk-engine/src/index.ts'),
  '@cognitia/simulator': resolve(__dirname, '../../packages/simulator/src/index.ts'),
  '@cognitia/state-diff': resolve(__dirname, '../../packages/state-diff/src/index.ts'),
  '@cognitia/threat-intel': resolve(__dirname, '../../packages/threat-intel/src/index.ts'),
  '@cognitia/exposure': resolve(__dirname, '../../packages/exposure/src/index.ts'),
  '@cognitia/ui': resolve(__dirname, '../../packages/ui/src/index.ts'),
  '@cognitia/security': resolve(__dirname, '../../packages/security/src/index.ts'),
};

// Cognitia Shield - Chrome MV3 Extension build
// Produces dist/ loadable via chrome://extensions -> Load unpacked
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: workspaceAliases,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
        interceptor: resolve(__dirname, 'src/inject/interceptor.ts'),
        sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
        popup: resolve(__dirname, 'src/popup/index.html'),
      },
      output: {
        // MV3 needs stable paths matching manifest.json exactly
        entryFileNames: (chunk) => {
          if (chunk.name === 'background') return 'src/background/index.js';
          if (chunk.name === 'content') return 'src/content/index.js';
          if (chunk.name === 'interceptor') return 'src/inject/interceptor.js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
