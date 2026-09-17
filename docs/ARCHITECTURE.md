# Cognitia Shield — Architecture

## System overview

```mermaid
flowchart TD
    A[DApp\nwindow.ethereum.request] --> B[MAIN-World Provider Guard]
    B -->|postMessage| C[Content Script Bridge]
    C -->|chrome.runtime| D[Service Worker Orchestrator]
    D --> E[Calldata / Signature Decoder]
    D --> F[Simulation Engine]
    D --> G[Threat Intelligence]
    F --> H[State Diff Engine]
    E --> I[Risk Engine]
    G --> I
    H --> I
    I --> J[Side Panel — Severity-Ranked Report]
    J -->|BLOCK| D
    J -->|CONTINUE| D
    D -->|USER_DECISION_RESULT| C
    C -->|postMessage| B
    B -->|CONTINUE: pristine request| K[Original Wallet Provider\nMetaMask / EIP-1193]
    B -->|BLOCK: reject 4001| A
    K --> L[User Signs]
```

## Interception layer

```mermaid
sequenceDiagram
    participant D as DApp
    participant G as Provider Guard (MAIN)
    participant C as Content Script
    participant W as Service Worker
    participant P as MetaMask Provider

    D->>G: eth_sendTransaction(params)
    G->>G: hold promise (paused)
    G->>C: postMessage REQUEST_INTERCEPTED CNG-2026-XXXXXX
    C->>W: chrome.runtime.sendMessage
    W->>W: decode → simulate → diff → intel → risk
    W->>C: decision relay
    alt BLOCK
        C->>G: USER_DECISION_RESULT BLOCK
        G-->>D: reject Error code 4001
    else CONTINUE
        C->>G: USER_DECISION_RESULT CONTINUE
        G->>P: originalRequest(args)  [unmodified]
        P-->>G: wallet result
        G-->>D: resolve(pristine result)
    end
```

## Package dependency graph

```mermaid
flowchart LR
    core[core: types & constants] --> shared[shared: chains & utils]
    core --> decoder[decoder]
    core --> simulator[simulator]
    core --> statediff[state-diff]
    core --> intel[threat-intel]
    core --> risk[risk-engine]
    core --> exposure[exposure]
    core --> ui[ui: R3F components]
    decoder --> risk
    simulator --> statediff
    intel --> risk
    statediff --> risk
    background[extension background] --> decoder & simulator & intel & risk
    sidepanel[extension sidepanel] --> ui
```

## Request lifecycle

```
REQUEST_RECEIVED → REQUEST_PAUSED → REQUEST_ANALYZING → REQUEST_SIMULATING
→ REQUEST_RISK_ASSESSMENT → USER_DECISION → REQUEST_BLOCKED | REQUEST_FORWARDING
→ REQUEST_COMPLETED | REQUEST_FAILED
```

Each UI stepper state corresponds to an actual async stage in the service worker.

## Analysis pipeline detail

1. **Normalize** — `eth_sendTransaction` becomes a `TransactionRequest`; signing methods become a
   `SignatureRequest` (never assume every request is a transaction).
2. **Decode** — selector lookup in the extensible selector DB; ERC-20/721/1155, multicall,
   permit recognition; unknown selectors surface `UNKNOWN FUNCTION` with the human explanation.
3. **Simulate** — `DemoSimulationEngine` (seeded) or `RealRpcSimulationEngine` (`eth_call`,
   `eth_estimateGas`; `debug_traceCall`/fork planned). Never broadcasts.
4. **Diff** — native/ERC-20/ERC-721 balance, allowance, operator, and ownership deltas.
5. **Intel** — address/selector matching against the modular threat DB.
6. **Risk** — deterministic rules produce findings with explicit score contributions; total is
   clamped to 0–100 and banded LOW/MEDIUM/HIGH/CRITICAL.

## Security invariants

- Original provider preserved (`__cognitiaOriginalRequest`); request payload forwarded unmodified.
- No private keys, seed phrases, or signing secrets requested, stored, or transmitted.
- The extension never auto-signs, never broadcasts simulated transactions.
- Dark-web/exposure intelligence is simulated and badged; a `RealThreatRelay` interface exists
  for legitimate live feeds only.
- Fail-safe: unsupported methods pass through untouched; a 10-minute pending timeout rejects
  hung requests with code 4001.
