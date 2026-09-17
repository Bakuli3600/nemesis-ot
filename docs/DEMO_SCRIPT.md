# Cognitia Shield — 3-Minute Demo Script

> Total: ~3:00. Everything runs locally with demo mode ON. All simulated data is badged.

| # | Time | Action | What to say |
|---|------|--------|-------------|
| 1 | 0:00 | Open the demo dApp (`pnpm dev` → localhost:5175) | "This is our security demonstration environment." |
| 2 | 0:15 | Point at the Cognitia HUD badge (top-right) and Side Panel header | "The shield is injected. PROTECTED." |
| 3 | 0:30 | Click **SAFE TRANSACTION** | "A normal 0.01 ETH transfer…" |
| 4 | 0:40 | Show Live Request tab: lifecycle stepper runs INTERCEPTED → DECODING → SIMULATING → DIFF & INTEL → DECISION | "Every request is paused *before* it reaches the wallet." |
| 5 | 0:55 | Click **CONTINUE** | "Low risk — forwarded pristine to MetaMask." |
| 6 | 1:10 | Click **MALICIOUS REWARD CLAIM** | "This fake airdrop hides a drainer." |
| 7 | 1:20 | Show decoded function `claimRewards()` and findings | "Calldata decoded, threat intel matches a known drainer cluster." |
| 8 | 1:30 | Show State Diff tab | "Simulation shows the *true* effect: NFT operator false → true, 2.31 ETH → 0.04 ETH." |
| 9 | 1:45 | Click **INSPECT 3D ATTACK PATH** | "The attack graph reconstructs: wallet → fake dApp → reward contract → drainer operator → NFT collection." |
| 10 | 2:00 | Show Threat Intel + Exposure tabs | "Simulated dark-web correlation — clearly badged SIMULATED." |
| 11 | 2:15 | Risk reads CRITICAL 95/100 → click **BLOCK REQUEST** | "We reject before the wallet ever sees it — code 4001 back to the dApp." |
| 12 | 2:30 | Show History tab + popup stats | "Full audit trail. Threats blocked count increments." |
| 13 | 2:45 | Close | "Same architecture supports real RPC/fork backends — the demo engine is a drop-in for Anvil/Tenderly." |

## Setup before demoing

```bash
pnpm install
pnpm build
pnpm --filter @cognitia/demo-dapp dev
# Load apps/extension/dist via chrome://extensions → Load unpacked
# Open side panel, confirm PROTECTED + DEMO MODE badges
```

## Talking points for judges

- **Real interception**: MAIN-world EIP-1193 wrapper, request IDs (`CNG-2026-000001`), full
  pause/forward/block lifecycle — not a mock UI.
- **Explainable risk**: every point in the 0–100 score is an evidence line.
- **Honest labeling**: DEMO vs LIVE everywhere; never fakes live intelligence.
- **Privacy**: no keys, no seed phrases, no auto-signing, no broadcasting.
