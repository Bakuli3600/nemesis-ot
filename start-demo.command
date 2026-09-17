#!/bin/bash
# Cognitia Shield — Demo dApp launcher
# Double-click this file (or run: ./start-demo.command)
# Safe to run repeatedly: it clears stale servers and installs deps if missing.

cd "$(dirname "$0")"

PORT=5175

echo ""
echo "  ================================"
echo "   COGNITIA SHIELD — DEMO DAPP"
echo "  ================================"
echo ""

# 1. Free the port if a previous instance is stuck (graceful, then forced)
if lsof -ti :$PORT >/dev/null 2>&1; then
  echo "  → Port $PORT busy — stopping the old server…"
  lsof -ti :$PORT | xargs kill 2>/dev/null
  sleep 1
  lsof -ti :$PORT | xargs kill -9 2>/dev/null
  sleep 1
fi

# 2. Make sure workspace dependencies exist (first run / fresh clone)
if [ ! -x "apps/demo-dapp/node_modules/.bin/vite" ]; then
  echo "  → Dependencies missing — running pnpm install (one time)…"
  pnpm install
fi

# 3. Make sure the Tailwind CSS entry exists (guards against partial checkouts)
if [ ! -f "apps/demo-dapp/src/index.css" ]; then
  echo "  → WARNING: apps/demo-dapp/src/index.css not found — styles will be missing."
fi

echo "  Starting server at:  http://localhost:$PORT"
echo ""
echo "  Chrome setup (once):"
echo "    1. chrome://extensions -> Developer mode ON"
echo "    2. Load unpacked -> select apps/extension/dist"
echo ""
echo "  Keep this window OPEN while demoing."
echo "  Press Ctrl+C to stop the server."
echo ""

open -a "Google Chrome" "http://localhost:$PORT" 2>/dev/null

cd apps/demo-dapp
exec ./node_modules/.bin/vite --port $PORT --strictPort --host
