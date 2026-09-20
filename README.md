# Nemesis — HoneyLayer Web3 Firewall

> **Cognitia Shield · BLOCKCHAIN-PS2 — Pre-Execution Transaction Interceptor & Malicious Signature Simulator**
> Cognitia 2026 · Blockchain & Cybersecurity

**Nemesis** is a browser extension (Chrome MV3 + Firefox MV3) that acts as a **Web3 transaction
firewall**. It sits between every dApp and your wallet, intercepts unsigned transactions and
signature requests **before they reach the signing prompt**, and detonates them against the
**HoneyLayer** — a decoy wallet shadow that mirrors your real account — before anything dangerous
can touch your funds.

The **HoneyLayer website** (this repo's demo dApp) is the product site and live demonstration
environment: Apple-style marketing sections up top, and a deep-graphite **attack console** below
that runs the same decode → simulate → diff → correlate → score pipeline the extension uses, with
the decoy-layer wallet log, risk-score dial, evidence breakdown and simulated dark-web trace.

> **Honesty note:** no security guarantee is claimed without an independent audit. Every claim in
> this README is backed by code and tests; simulated data (threat intel, dark-web trace) is
> explicitly labeled **SIMULATED** in the UI.

---

## 1. What is HoneyLayer?

HoneyLayer is the decoy layer at the heart of Nemesis:

1. **Indistinguishable by design** — Nemesis wraps your wallet with a synthetic shadow layer:
   identical address formatting, identical prompts, identical flow. To an attacker (or a drainer
   bot) there is exactly one wallet.
2. **Malice detonates in the sandbox** — suspicious requests execute against decoy state first.
   Drainers reveal themselves by what they try to take: approvals, operators, permits.
3. **Only clean traffic continues** — if the simulation comes back clean, the original request is
   forwarded to your real wallet **unchanged**. If it is malicious, the session dies at the decoy
   layer and the dApp receives EIP-1193 error `4001`. Your real assets are never touched.

### Attack vectors covered

| Attack Vector | Example | Severity | Detection |
|---|---|---|---|
| Collection-wide NFT approval | `setApprovalForAll(drainer, true)` | 🔴 CRITICAL | Selector decode + operator flag in state diff |
| Unlimited token approval | `approve(spender, 2^256-1)` | 🔴 CRITICAL | Max-value detection, "Unlimited" rendering |
| Blind signature | `eth_sign(hash)` | 🔴 CRITICAL | Raw data with no decodable context |
| Off-chain permit phishing | EIP-712 `Permit(max)` | 🔴 CRITICAL | Signature decoder exposes spender + amount |
| Fake airdrop drainer | `claimRewards()` on malicious contract | 🟠 HIGH | Threat-intel match + `eth_getCode` probe |
| Hidden multicall | `multicall(bytes[])` bundling approvals | 🟠 HIGH | Sub-call decoding |
| Unknown function | Unrecognized selector | 🟡 MEDIUM | "Cannot determine contract intent" warning |

### Demo scenarios on the website

`Malicious NFT approval` · `Unlimited token approval` · `Fake reward claim` ·
`EIP-712 permit phishing` · `Blind personal_sign` · `Hidden multicall` · `Unknown selector` ·
`Safe transfer (control)`

---

## 2. Repository Layout

```
.
├── apps/
│   ├── extension/            # Chrome MV3 extension (React + Vite + Tailwind)
│   │   └── src/
│   │       ├── inject/       # MAIN-world EIP-1193 interceptor (TTL, validation, provider identity)
│   │       ├── content/      # Isolated-world bridge + in-page HUD badge
│   │       ├── background/   # Orchestrator: validation, replay protection, TTL, fail-closed analysis
│   │       ├── sidepanel/    # Command Center UI (9 sections + evidence badges)
│   │       └── popup/        # Compact popup (status, stats, decisions)
│   ├── extension-firefox/    # Firefox (Gecko) MV3 port — same UI source, sidebar_action,
│   │   └── scripts/pack.mjs  #   AMO-ready zip packer
│   └── demo-dapp/            # ★ HoneyLayer website: product site + live attack console
│       └── src/
│           ├── sections/
│           │   ├── Hero.tsx          # Landing + "Run a live attack" CTA
│           │   ├── HoneyLayer.tsx    # The decoy-layer explainer (3-layer diagram)
│           │   ├── AttackConsole.tsx # Live pipeline: decode → simulate → diff → score → decide
│           │   ├── DarkWebTrace.tsx  # Simulated 3-hop relay trace (SIMULATED badge)
│           │   └── Features.tsx      # Product features grid
│           └── demo/scenarios.ts     # 8 deterministic attack scenarios + reports
├── packages/
│   ├── core/                 # Shared types (TransactionRequest, RiskReport, EvidenceLevel…)
│   ├── shared/               # Chain configs, utilities
│   ├── decoder/              # Selector DB, calldata + EIP-712 signature decoders
│   ├── simulator/            # DemoSimulationEngine + AnvilForkSimulationEngine (never broadcasts)
│   ├── state-diff/           # Before/after diffs with OBSERVED / INFERRED / UNKNOWN evidence levels
│   ├── risk-engine/          # Deterministic 0–100 scoring + analysisStatus
│   ├── threat-intel/         # Address/selector reputation matching (demo dataset)
│   ├── exposure/             # Dark-web trace abstraction (simulated relay)
│   └── ui/                   # Shared components + React Three Fiber scenes
├── contracts/
│   ├── FakeRewards.sol       # Minimal demo drainer contract (testnet only)
│   ├── FakeRewards.t.sol     # 6 Foundry security tests
│   └── script/DeploySepolia.s.sol  # Chain-gated Sepolia deployment
├── data/                     # Demo threat-intelligence dataset
├── tests/                    # 49 TS tests (unit + security + live-Anvil integration) + browser E2E
└── scripts/launch-browser.mjs  # Chrome launcher with extension + MetaMask preloaded
```

---

## 3. How It Works (End-to-End Flow)

```
WEB3 DAPP (or the HoneyLayer website's attack console)
   ↓  window.ethereum.request(...)
NEMESIS PROVIDER GUARD (MAIN world, document_start)
   ↓  request PAUSED (the dApp's promise is held open)
CONTENT SCRIPT BRIDGE (isolated world)      ← schema-validates before relaying
   ↓  chrome.runtime message
BACKGROUND ORCHESTRATOR (service worker)    ← validates again, replay-protected
   ├── 1. VALIDATE    → fields, chain ID, target (fail closed)
   ├── 2. HEALTH      → eth_chainId cross-check (fail closed)
   ├── 3. DECODE      → packages/decoder (calldata + signature parsing)
   ├── 4. SIMULATE    → packages/simulator (HoneyLayer demo fork / Anvil fork — never broadcasts)
   ├── 5. DIFF        → packages/state-diff (BEFORE → AFTER, evidence-tagged)
   ├── 6. INTEL       → packages/threat-intel (address/selector reputation)
   └── 7. SCORE       → packages/risk-engine (0–100 + analysisStatus)
   ↓
SEVERITY-RANKED REPORT (Side Panel / Popup / Website console)
   ↓
USER DECISION
   ├── BLOCK    → request rejected with EIP-1193 code 4001 (wallet never sees it)
   ├── CONTINUE → the ORIGINAL, unmodified request is forwarded to your wallet
   └── EXPIRED  → rejected with 4001 — a timeout NEVER auto-continues (8-minute TTL)
```

### Security guarantees

- **Non-custodial** — never requests seed phrases, never stores keys, never signs.
- **No-broadcast, enforced** — `assertNoBroadcast()` rejects `eth_send*`, `wallet_sendCalls`, …
  at the transport layer; simulations physically cannot broadcast (unit + integration tested).
- **Fail-closed everywhere** — LIVE mode never fakes success; timeouts reject (`4001`), never
  forward; incomplete analysis is `ANALYSIS_UNAVAILABLE` and never reads as SAFE.
- **Replay-safe messaging** — a response for request A can never resolve request B; decisions are
  honored only for live, decision-ready requests; page navigation rejects pending requests.
- **Isolated simulation** — every Anvil simulation is wrapped in `evm_snapshot` → execute →
  `evm_revert`, so a malicious simulation cannot mutate the baseline.
- **Honest evidence** — state claims carry OBSERVED / INFERRED / UNKNOWN levels; no theft claims
  without observed ownership transfer.
- **Demo/live separation** — every simulated datum is badged; demo and live results are never
  silently mixed.

---

## 4. Requirements

| Tool | Version | Needed for |
|---|---|---|
| Node.js | 18+ | everything |
| pnpm | 9+ | workspace install (`npm install -g pnpm` if missing) |
| Google Chrome and/or Firefox | current | loading the extension |
| Foundry (`forge` / `anvil`) | latest | contract tests + live fork simulation (optional) |
| MetaMask | — | real-wallet end-to-end test (optional) |

---

## 5. Install & Run — Step by Step

### Step 1 — Install dependencies (once)

```bash
npm install -g pnpm     # if pnpm is missing
pnpm install
pnpm build              # builds all packages + Chrome & Firefox extensions + demo dApp
```

### Step 2 — Start the HoneyLayer website

```bash
pnpm dev                # → http://localhost:5175  (keep this terminal open)
```

You should see the Nemesis landing page: Hero, **HoneyLayer decoy explainer**, the dark
**Attack Console**, the simulated Dark-Web Trace, and the Features grid.

On macOS you can alternatively double-click `start-demo.command`, which frees port 5175, installs
dependencies if missing, and opens Chrome for you.

### Step 3 — Load the extension

**Chrome:**
```bash
pnpm --filter @cognitia/extension build    # if not already built in step 1
```
1. Open `chrome://extensions`
2. Toggle **Developer mode** (top-right)
3. Click **Load unpacked** → select the `apps/extension/dist` folder
4. Pin "Nemesis" from the puzzle-piece menu

**Firefox:**
```bash
pnpm --filter @cognitia/extension-firefox build
```
1. Open `about:debugging` → **This Firefox** → **Load Temporary Add-on…**
2. Select `apps/extension-firefox/dist/manifest.json`
3. If a previous copy is installed, **Remove** it first (duplicate IDs leave old code running)
4. Open the sidebar: Firefox menu → Nemesis (or click the in-page HUD badge)

> Firefox notes: the port uses an event-page background, `sidebar_action` instead of Chrome's
> `sidePanel`, and `host_permissions` (check *about:addons → Nemesis → Permissions*). Temporary
> add-ons are removed when Firefox closes.

### Step 4 — Run an attack from the website

1. Open `http://localhost:5175` in the browser where the extension is loaded
2. Click **"Run a live attack"** in the Hero (or pick a scenario in the Attack Console and press
   **Execute attack**)
3. Watch the pipeline light up: `Intercepted → Decoding → Simulating → Diffing → Threat intel →
   Risk scoring`
4. The verdict card shows the **risk-score dial**, point-by-point evidence, findings, the
   before/after state diff, and the attack-path graph
5. Click **Block request** (the session dies at the decoy layer) or **Continue to wallet**
   (disabled for CRITICAL reports) — if MetaMask is installed, real requests also open the real
   wallet confirmation exactly as they would during a genuine attack

### Step 5 — See the extension intercept a real request

With the extension loaded and MetaMask installed:
1. Click any scenario on the website that dispatches a real wallet request
2. The extension pauses the request before MetaMask opens — the HUD badge flips to
   `ANALYZING THREAT…`, then the Command Center fills with the decoded request, simulation,
   state diff and risk score
3. **BLOCK** → the request dies with EIP-1193 `4001` (MetaMask never sees it)
   **CONTINUE** → the original request is forwarded to MetaMask untouched

### Step 6 (optional) — Live Anvil fork mode

```bash
anvil --fork-url https://eth.llamarpc.com   # or a local chain: anvil
```
```bash
# .env
ANVIL_RPC_URL=http://127.0.0.1:8545
```
Then rebuild (`pnpm build`), reload the extension, turn **Demo mode OFF** in extension Settings,
and re-run a scenario — simulations now execute against the real fork (snapshot → simulate →
revert) with live chain data.

---

## 6. Tests

```bash
pnpm typecheck         # tsc --noEmit across the workspace

pnpm test              # vitest: unit + security suites
                       # (7 Anvil integration tests auto-skip without a local node)

# Full run including the 7 live-Anvil integration tests:
anvil --port 8545 &
ANVIL_RPC_URL=http://127.0.0.1:8545 pnpm test
kill %1

pnpm test:browser      # E2E in headless Chrome (extension + MetaMask)

# Solidity security tests (requires Foundry):
cd contracts && forge test
```

Current status: **49/49 TypeScript tests** (incl. 7 live-Anvil integration) and **6/6 Foundry
tests** passing. Verified in this checkout: `pnpm typecheck` ✅, `pnpm test` ✅ (42 passed,
7 skipped without Anvil), `pnpm build` ✅ (Chrome + Firefox + website).

---

## 7. Deploy / Publish

### Host on addons.mozilla.org (AMO)

The Firefox build packs an upload-ready zip automatically:
```bash
pnpm --filter @cognitia/extension-firefox build
# → apps/extension-firefox/release/nemesis-firefox.zip  (manifest at archive root)
```
Upload at <https://addons.mozilla.org/developers/> — AMO signs after review.

### Chrome Web Store

Build, then zip the contents of `apps/extension/dist` and upload via the
[developer dashboard](https://chrome.google.com/webstore/devconsole).

### Demo dApp static hosting

```bash
pnpm --filter @cognitia/demo-dapp build   # → apps/demo-dapp/dist (any static host)
```

### Testnet contract (Sepolia ONLY)

```bash
cd contracts
forge test
forge create FakeRewards --constructor-args <DEMO_OPERATOR> <DEMO_NFT_CONTRACT> \
  --rpc-url $SEPOLIA_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY
# or the gated script (refuses any chain other than Sepolia 11155111):
forge script script/DeploySepolia.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast
```
Never deploy to mainnet. Never use with real assets.

### Test with MetaMask (Chrome)

```bash
pnpm launch-browser --preserve-profile   # Chrome with Nemesis + your MetaMask profile
```

---

## 8. Environment Variables

Copy `.env.example` → `.env` (none are secret; keys stay server-side / build-time):

| Variable | Purpose |
|---|---|
| `ANVIL_RPC_URL` | Local Anvil fork endpoint (e.g. `http://127.0.0.1:8545`) — enables ANVIL mode |
| `VITE_SIMULATION_FORK_RPC` | Same as above for browser builds |
| `SEPOLIA_RPC_URL` / `VITE_SEPOLIA_RPC` | Sepolia RPC — enables LIVE mode with chain-ID verification |
| `MAINNET_RPC_URL` / `VITE_ETHEREUM_RPC` | Mainnet RPC for read-only simulation |
| `FORK_BLOCK_NUMBER` | Optional pinned fork block |
| `DEPLOYER_PRIVATE_KEY` | **Testnet only.** Used solely by `forge script`; never printed or committed |
| `DEMO_OPERATOR` / `DEMO_NFT_CONTRACT` | Constructor args for the Sepolia demo deployment |

---

## 9. Continuous Integration

`.github/workflows/build.yml` runs on push/PR: install → typecheck → unit/integration tests →
build all packages → upload the built Chrome extension as an artifact. Anvil integration tests
auto-skip without a local node.

---

## 10. Known Limitations & Roadmap

- Threat intelligence and the dark-web trace are **SIMULATED** (clearly badged) — not live feeds.
- Interception depends on provider injection order; a dApp that captures `window.ethereum` before
  the MAIN-world script can bypass the guard.
- Full pre/post fork state extraction (`debug_traceCall` / Anvil state overrides) is on the
  roadmap; uncollected values are reported as UNKNOWN, never guessed.
- EIP-1967 proxy detection covers the standard implementation slot only.

Roadmap: full fork state extraction · live threat feeds behind `RealThreatRelay` · simulation
caching · per-origin policy memory · Anvil container in CI.

---

## 11. Contributors

| | Contributor |
|---|---|
| <img src="https://github.com/sagarsah737.png?size=64" width="36" alt="sagarsah737"> | [@sagarsah737](https://github.com/sagarsah737) |
| <img src="https://github.com/Steins-Gate-1.png?size=64" width="36" alt="Steins-Gate-1"> | [@Steins-Gate-1](https://github.com/Steins-Gate-1) |
| <img src="https://github.com/soumyadeep888.png?size=64" width="36" alt="soumyadeep888"> | [@soumyadeep888](https://github.com/soumyadeep888) |

---

**COGNITIA 2026 · Blockchain & Cybersecurity · BLOCKCHAIN-PS2**
*All demonstration data — threat clusters, dark-web listings, wallets — is simulated and clearly
labeled. No real dark-web service or malicious infrastructure is ever contacted.*
