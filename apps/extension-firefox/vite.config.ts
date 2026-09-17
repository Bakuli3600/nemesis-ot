import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname_ = dirname(fileURLToPath(import.meta.url));

// Reuse the Chrome extension's React/Tailwind source; only the manifest and
// packaging differ for Firefox (AMO). Vite's root points at the Chrome app so
// the HTML inputs live inside the project root (Rollup requirement), while
// publicDir/outDir stay inside this Firefox app folder.
const chromeApp = resolve(__dirname_, '../extension');
const workspaceAliases: Record<string, string> = {
  '@cognitia/core': resolve(__dirname_, '../../packages/core/src/index.ts'),
  '@cognitia/shared': resolve(__dirname_, '../../packages/shared/src/index.ts'),
  '@cognitia/decoder': resolve(__dirname_, '../../packages/decoder/src/index.ts'),
  '@cognitia/risk-engine': resolve(__dirname_, '../../packages/risk-engine/src/index.ts'),
  '@cognitia/simulator': resolve(__dirname_, '../../packages/simulator/src/index.ts'),
  '@cognitia/state-diff': resolve(__dirname_, '../../packages/state-diff/src/index.ts'),
  '@cognitia/threat-intel': resolve(__dirname_, '../../packages/threat-intel/src/index.ts'),
  '@cognitia/exposure': resolve(__dirname_, '../../packages/exposure/src/index.ts'),
  '@cognitia/ui': resolve(__dirname_, '../../packages/ui/src/index.ts'),
  '@cognitia/security': resolve(__dirname_, '../../packages/security/src/index.ts'),
};

// Cognitia Shield - Firefox (Gecko) MV3 build
// Produces dist/ loadable via about:debugging -> Load Temporary Add-on
// and release/nemesis-firefox.zip ready for addons.mozilla.org.
export default defineConfig({
  root: chromeApp,
  publicDir: resolve(__dirname_, 'public'),
  plugins: [react()],
  resolve: {
    alias: workspaceAliases,
  },
  build: {
    outDir: resolve(__dirname_, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(chromeApp, 'src/background/index.ts'),
        content: resolve(chromeApp, 'src/content/index.ts'),
        interceptor: resolve(chromeApp, 'src/inject/interceptor.ts'),
        sidepanel: resolve(chromeApp, 'src/sidepanel/index.html'),
        popup: resolve(chromeApp, 'src/popup/index.html'),
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
