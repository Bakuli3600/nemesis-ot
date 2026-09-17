#!/usr/bin/env node
/**
 * Launch Chrome with Cognitia Shield extension loaded
 * Preserves user's existing extensions (including MetaMask)
 *
 * Usage:
 *   pnpm launch-browser          # Headless mode for tests
 *   HEADLESS=false pnpm launch-browser  # Visible browser window
 *
 * This script:
 * 1. Builds the extension if needed
 * 2. Creates a fresh user data directory (or uses existing to preserve MetaMask)
 * 3. Launches Chrome with --load-extension pointing to Cognitia Shield
 * 4. Opens the demo dApp
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const PROJECT_ROOT = resolve(__dirname, '.');
const EXTENSION_DIR = join(PROJECT_ROOT, 'apps/extension/dist');
const DEMO_APP_PORT = 5175;
const DEMO_APP_URL = `http://localhost:${DEMO_APP_PORT}`;
const USER_DATA_DIR = join(PROJECT_ROOT, 'tests/browser/.chrome-user-data');

// Check command line args
const args = process.argv.slice(2);
const HEADLESS = !args.includes('--visible') && process.env.HEADLESS !== 'false';
const PRESERVE_PROFILE = args.includes('--preserve-profile');

console.log('═══ Cognitia Shield — Chrome Launcher ═══');
console.log('');

// 1. Build extension if needed
if (!existsSync(join(EXTENSION_DIR, 'manifest.json'))) {
  console.log('📦 Building extension...');
  try {
    execSync('pnpm --filter @cognitia/extension build', {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    });
    console.log('✅ Extension built');
  } catch {
    console.error('❌ Failed to build extension');
    process.exit(1);
  }
} else {
  console.log('✅ Extension already built');
}

// 2. Handle user data directory
if (PRESERVE_PROFILE && existsSync(USER_DATA_DIR)) {
  console.log('📁 Using existing Chrome profile (preserves MetaMask)');
} else {
  console.log('🧹 Creating fresh Chrome profile...');
  if (existsSync(USER_DATA_DIR)) {
    rmSync(USER_DATA_DIR, { recursive: true, force: true });
  }
  mkdirSync(USER_DATA_DIR, { recursive: true });
  console.log('✅ Fresh profile created');
}

// 3. Check for MetaMask
console.log('');
console.log('ℹ️  MetaMask detection:');
console.log('   - MetaMask is a user-installed extension');
console.log('   - It will be available if installed in your Chrome profile');
console.log('   - Run once with --preserve-profile to keep it between launches');
console.log('');

// 4. Launch Chrome
const chromePath = getChromePath();
const chromeArgs = buildChromeArgs(USER_DATA_DIR, EXTENSION_DIR, HEADLESS);

console.log('═══ Launching Chrome ═══');
console.log(`📍 Extension: ${EXTENSION_DIR}`);
console.log(`📁 Profile: ${USER_DATA_DIR}`);
console.log(`👁️  Mode: ${HEADLESS ? 'headless' : 'visible'}`);
console.log('');

// Start Chrome in background
const chromeCmd = `"${chromePath}" --remote-debugging-port=9222 ${chromeArgs.join(' ')}`;
console.log(`Executing: ${chromeCmd.substring(0, 100)}...`);

try {
  // Launch Chrome detached
  const child = execSync(chromeCmd, {
    cwd: PROJECT_ROOT,
    stdio: 'ignore',
    detached: true,
  });

  // Wait for Chrome to start
  console.log('⏳ Waiting for Chrome to start...');
  await new Promise((r) => setTimeout(r, 2000));

  console.log('✅ Chrome launched');
  console.log('');
  console.log('═══ Next Steps ═══');
  console.log('');
  console.log('1. Open Chrome to load extensions:');
  console.log(`   chrome://extensions`);
  console.log('');
  console.log('2. Verify extensions:');
  console.log('   - MetaMask (if installed in your profile)');
  console.log('   - "Nemesis — Web3 Transaction Firewall"');
  console.log('');
  console.log('3. Start the demo app:');
  console.log(`   pnpm dev  # opens http://localhost:${DEMO_APP_PORT}`);
  console.log('');
  console.log('4. Test the flow:');
  console.log('   - Click "Run a live attack" in demo app');
  console.log('   - Cognitia Shield intercepts the request');
  console.log('   - Review the risk analysis');
  console.log('   - BLOCK or CONTINUE');
  console.log('   - MetaMask handles CONTINUE requests');
  console.log('');

  // Open demo app in a new tab if visible mode
  if (!HEADLESS) {
    console.log('🔗 Opening demo app...');
    execSync(`open -a "Google Chrome" "${DEMO_APP_URL}" 2>/dev/null || echo "Manual open required"`);
  }

  console.log('Press Ctrl+C to stop');
} catch (err) {
  console.error('❌ Failed to launch Chrome:', err.message);
  console.error('');
  console.error('Troubleshooting:');
  console.error('- Ensure Google Chrome is installed');
  console.error('- On macOS, Chrome is at: /Applications/Google Chrome.app');
  console.error('- On Linux: sudo apt install google-chrome-stable');
  process.exit(1);
}

// Helpers
function getChromePath() {
  if (process.platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  }
  if (process.platform === 'linux') {
    const paths = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'];
    for (const p of paths) {
      if (existsSync(p)) return p;
    }
    return 'google-chrome'; // Hope it's in PATH
  }
  // Windows
  const winPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  for (const p of winPaths) {
    if (existsSync(p)) return p;
  }
  return 'chrome';
}

function buildChromeArgs(userDataDir, extensionDir, headless) {
  const args = [
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-sync',
    '--metrics-recording-only',
    '--safebrowsing-disable-auto-update',
    '--disable-dev-shm-usage',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--disable-features=MediaRouter,TranslateUI',
    '--disable-breakpad',
    `--user-data-dir=${userDataDir}`,
    `--load-extension=${extensionDir}`,
  ];

  if (headless) {
    args.push('--headless=new', '--disable-gpu', '--window-size=1920,1080');
  }

  return args;
}
