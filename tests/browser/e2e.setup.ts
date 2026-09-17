/**
 * E2E Browser Test Setup
 *
 * This setup launches Chrome with:
 * 1. A persistent user data directory (preserves MetaMask and other user extensions)
 * 2. Cognitia Shield loaded as an unpacked extension
 *
 * Usage: vitest run --config vitest.browser.config.ts
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { vi } from 'vitest';

// Configuration
const PROJECT_ROOT = resolve(__dirname, '../../');
const EXTENSION_DIR = join(PROJECT_ROOT, 'apps/extension/dist');
const USER_DATA_DIR = join(PROJECT_ROOT, 'tests/browser/.chrome-user-data');
const HEADLESS = process.env.HEADLESS !== 'false';

// Chrome launch arguments
function getChromeArgs(): string[] {
  const args = [
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-extensions-except',
    `--disable-component-update`,
    '--disable-sync',
    '--metrics-recording-only',
    '--safebrowsing-disable-auto-update',
    '--disable-dev-shm-usage',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--disable-features=MediaRouter,TranslateUI',
    '--disable-breakpad',
  ];

  // Use user data directory to preserve MetaMask
  args.push(`--user-data-dir=${USER_DATA_DIR}`);

  // Load Cognitia Shield extension
  args.push(`--load-extension=${EXTENSION_DIR}`);

  // Headless mode flags
  if (HEADLESS) {
    args.push('--headless=new', '--disable-gpu', '--remote-debugging-port=9222');
  }

  return args;
}

// Ensure extension is built
function ensureExtensionBuilt(): void {
  if (!existsSync(EXTENSION_DIR) || !existsSync(join(EXTENSION_DIR, 'manifest.json'))) {
    console.log('[E2E] Building extension...');
    try {
      execSync('pnpm --filter @cognitia/extension build', {
        cwd: PROJECT_ROOT,
        stdio: 'inherit',
      });
    } catch {
      throw new Error('Failed to build extension. Run: pnpm --filter @cognitia/extension build');
    }
  }
}

// Clean up user data on teardown (optional - comment out to preserve MetaMask state)
export function cleanupUserData(): void {
  if (existsSync(USER_DATA_DIR)) {
    rmSync(USER_DATA_DIR, { recursive: true, force: true });
  }
}

// Get Chrome binary path (works on macOS, Linux, Windows)
function getChromePath(): string {
  if (process.platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  }
  if (process.platform === 'linux') {
    return '/usr/bin/google-chrome';
  }
  // Windows
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  for (const path of possiblePaths) {
    if (existsSync(path)) return path;
  }
  return 'google-chrome'; // Hope it's in PATH
}

// Launch Chrome and return CDP URL
export async function launchChrome(): Promise<string> {
  ensureExtensionBuilt();

  // Clean previous user data for fresh state
  if (existsSync(USER_DATA_DIR)) {
    rmSync(USER_DATA_DIR, { recursive: true, force: true });
  }
  mkdirSync(USER_DATA_DIR, { recursive: true });

  const chromePath = getChromePath();
  const args = getChromeArgs();

  console.log(`[E2E] Launching Chrome...`);
  console.log(`[E2E] Extension: ${EXTENSION_DIR}`);
  console.log(`[E2E] User data: ${USER_DATA_DIR}`);
  console.log(`[E2E] Headless: ${HEADLESS}`);

  // Start Chrome with remote debugging (detached process)
  const cmd = `"${chromePath}" --remote-debugging-port=9222 ${args.join(' ')} &`;
  execSync(cmd, {
    cwd: PROJECT_ROOT,
    stdio: 'pipe',
  });

  // Wait for Chrome to be ready
  await new Promise((resolve) => setTimeout(resolve, 3000));

  return 'http://localhost:9222';
}

// Export for use in tests
export { HEADLESS, USER_DATA_DIR, EXTENSION_DIR };
