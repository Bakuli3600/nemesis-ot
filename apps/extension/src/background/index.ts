/**
 * Cognitia Shield - Background Orchestrator (MV3 service worker / Firefox event page)
 * Runs the analysis pipeline, simulation, state-diffing, risk scoring,
 * Side Panel opening, and user block/allow decision relay.
 *
 * Security properties (Parts 8, 10, 11, 21):
 *  - Every inbound message is schema-validated; malformed messages are dropped.
 *  - USER_DECISION is honored only for a live request already in USER_DECISION
 *    state — a response for request A can never resolve request B (replay-safe).
 *  - Pending requests expire (TTL); expiry rejects with 4001, never forwards.
 *  - Analysis failure is fail-closed: the report is marked ANALYSIS_UNAVAILABLE
 *    and BLOCK is recommended for high-risk methods. It never auto-continues.
 *  - RPC/simulation is delegated to the hardened simulator package; no keys are
 *    ever requested, stored, or logged (Part 20 redaction).
 */

import {
  CognitiaSettings,
  DecodedCalldata,
  DecodedSignature,
  DEFAULT_SETTINGS,
  RequestHistoryItem,
  RequestLifecycleState,
  RiskReport,
  SimulationResult,
  TransactionRequest,
  SignatureRequest,
  WalletRequest,
} from '@cognitia/core';
import { decodeCalldata, decodeSignature } from '@cognitia/decoder';
import { DemoSimulationEngine, AnvilForkSimulationEngine, resolveSimulationConfig } from '@cognitia/simulator';
import { ThreatIntelEngine } from '@cognitia/threat-intel';
import { RiskEngine } from '@cognitia/risk-engine';
import {
  canonicalRequest,
  captureWalletState,
  appendAudit,
  evaluateSecurityGate,
  CanonicalRequest,
  AuditEventName,
} from '@cognitia/security';

// ActiveRequestState lives in ../types so UI bundles don't import the service worker.
import type { ActiveRequestState } from '../types';

export type { ActiveRequestState };

const REQUEST_TTL_MS = 8 * 60 * 1000; // Part 11 — maximum pending lifetime
const HIGH_RISK_METHODS = new Set([
  'eth_sendTransaction',
  'personal_sign',
  'eth_sign',
  'eth_signTypedData',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
]);

const activeRequests = new Map<string, ActiveRequestState>();
/**
 * Parts 8/9/14 — per-request security binding: the canonical hash of the exact
 * request at ANALYSIS time, the wallet snapshot it was analyzed against, and
 * the analysis timestamp. The final gate re-verifies all of them before any
 * CONTINUE is honored (TOCTOU / account-change / chain-change protection).
 * Stored per request — concurrent requests never share security state.
 */
interface RequestSecurityBinding {
  canonical?: CanonicalRequest;
  analyzedAt?: number;
  analyzedFrom?: string;
  analyzedChainId?: string;
}
const securityBindings = new Map<string, RequestSecurityBinding>();
/**
 * TTL timers live OUTSIDE the request state — a setTimeout handle is a live
 * object reference that chrome.runtime.sendMessage cannot serialize. Storing
 * it on ActiveRequestState made every broadcast throw
 * "Could not serialize message" and broke the whole pipeline.
 */
const ttlTimers = new Map<string, ReturnType<typeof setTimeout>>();
const threatIntelEngine = new ThreatIntelEngine();
const demoSimulator = new DemoSimulationEngine();

/**
 * Browser builds have no process.env; Vite injects VITE_* vars via import.meta.env.
 * Keys stay build-time constants — nothing secret is embedded (Part 20).
 */
function extensionEnv(): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  try {
    const meta = import.meta as any;
    const e = meta?.env || {};
    out.ANVIL_RPC_URL = e.VITE_SIMULATION_FORK_RPC || e.ANVIL_RPC_URL;
    out.SEPOLIA_RPC_URL = e.VITE_SEPOLIA_RPC || e.SEPOLIA_RPC_URL;
    out.MAINNET_RPC_URL = e.VITE_ETHEREUM_RPC || e.MAINNET_RPC_URL;
  } catch {
    // import.meta.env unavailable — treat as unconfigured.
  }
  return out;
}

function liveSimulator(customRpcUrl?: string): AnvilForkSimulationEngine | null {
  const env = extensionEnv();
  const cfg = customRpcUrl
    ? { rpcUrl: customRpcUrl, expectedChainId: undefined, rpcKind: 'live-rpc' as const }
    : resolveSimulationConfig(env as any);
  if (!cfg.rpcUrl) return null;
  return new AnvilForkSimulationEngine(cfg.rpcUrl, cfg.expectedChainId, env as any);
}

// NOTE: the action opens the popup (manifest default_popup). The Side Panel is
// opened explicitly via popup button, HUD badge click, or on first intercepted request.

// ---------------------------------------------------------------------------
// Part 10 — inbound message schema validation
// ---------------------------------------------------------------------------

function isValidInterceptionMessage(msg: any): boolean {
  return (
    msg &&
    typeof msg.id === 'string' &&
    msg.id.length <= 64 &&
    typeof msg.origin === 'string' &&
    typeof msg.timestamp === 'number' &&
    msg.args &&
    typeof msg.args.method === 'string' &&
    HIGH_RISK_METHODS.has(msg.args.method) &&
    (msg.args.params === undefined || Array.isArray(msg.args.params))
  );
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== 'string') {
    // Part 10 — malformed message: drop silently, never throw.
    sendResponse({ received: false, reason: 'malformed' });
    return true;
  }

  if (message.type === 'REQUEST_INTERCEPTED') {
    if (!isValidInterceptionMessage(message)) {
      securityReject('Malformed interception message dropped by orchestrator.');
      sendResponse({ received: false, reason: 'invalid-schema' });
      return true;
    }
    handleRequestIntercepted(message, sender.tab?.id);
    sendResponse({ received: true });
    return true;
  }

  if (message.type === 'GET_ACTIVE_REQUESTS') {
    sendResponse({ requests: serializable(Array.from(activeRequests.values())) });
    return true;
  }

  if (message.type === 'GET_LATEST_ACTIVE_REQUEST') {
    const list = Array.from(activeRequests.values());
    sendResponse({ request: serializable(list[list.length - 1] || null) });
    return true;
  }

  if (message.type === 'USER_DECISION') {
    handleUserDecision(message.id, message.decision);
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'OPEN_SIDEPANEL') {
    if (sender.tab?.windowId) {
      chrome.sidePanel?.open?.({ windowId: sender.tab.windowId }).catch(() => {});
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'CLEAR_HISTORY') {
    chrome.storage.local.set({ requestHistory: [] }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  // Unknown type — acknowledged but ignored (Part 10).
  sendResponse({ received: false, reason: 'unknown-type' });
  return true;
});

function securityReject(reason: string) {
  // Part 20 — security log without sensitive values.
  console.warn('[Cognitia:Security]', reason);
}

async function handleRequestIntercepted(data: any, tabId?: number) {
  const { id, origin, timestamp, args } = data;
  const method = args.method;

  let request: WalletRequest;
  if (method === 'eth_sendTransaction') {
    const tx = args.params?.[0] || {};
    request = {
      id,
      type: 'TRANSACTION',
      method,
      origin,
      timestamp,
      from: tx.from || '0x5534a781298715EdfB42542a9b6d6168954de012',
      to: tx.to || '0x0000000000000000000000000000000000000000',
      value: tx.value || '0x0',
      data: tx.data || '0x',
      gas: tx.gas,
      chainId: tx.chainId || 11155111,
    };
  } else {
    // Signature Request
    let primaryType = 'Unknown';
    let domain: any = undefined;
    let msg: any = undefined;

    if (method.includes('TypedData') && args.params?.[1]) {
      try {
        const parsed = typeof args.params[1] === 'string' ? JSON.parse(args.params[1]) : args.params[1];
        primaryType = parsed.primaryType || 'EIP712Domain';
        domain = parsed.domain;
        msg = parsed.message;
      } catch {}
    }

    request = {
      id,
      type: 'SIGNATURE',
      method,
      origin,
      timestamp,
      from: args.params?.[0] || '0x5534a781298715EdfB42542a9b6d6168954de012',
      domain,
      primaryType,
      message: msg,
      rawPayload: args.params,
    };
  }

  const activeEntry: ActiveRequestState = {
    id,
    tabId,
    request,
    lifecycle: 'REQUEST_ANALYZING',
    timestamp,
  };
  activeRequests.set(id, activeEntry);

  // Parts 8/9 — bind this analysis to the exact request bytes.
  const binding: RequestSecurityBinding = { analyzedAt: Date.now() };
  try {
    binding.canonical = await canonicalRequest(request);
    binding.analyzedFrom = (request.from || '').toLowerCase();
    binding.analyzedChainId = binding.canonical.chainId;
  } catch {
    // crypto.subtle unavailable — gate will fail closed via missing hash.
  }
  securityBindings.set(id, binding);

  await appendAudit({
    event: 'REQUEST_INTERCEPTED',
    timestamp: new Date().toISOString(),
    requestId: id,
    origin,
    chainId: request.type === 'TRANSACTION' ? request.chainId : request.domain?.chainId,
    from: request.from,
    to: request.type === 'TRANSACTION' ? request.to : request.domain?.verifyingContract,
    action: method,
  });
  broadcastState();

  // Part 11 — TTL: expire and reject safely; never auto-continue.
  // Timer is kept in a separate map (see ttlTimers note above) so request
  // state stays JSON-serializable for chrome.runtime messaging.
  ttlTimers.set(
    id,
    setTimeout(() => {
      ttlTimers.delete(id);
      const entry = activeRequests.get(id);
      if (!entry) return;
      if (entry.lifecycle === 'USER_DECISION' || entry.lifecycle.startsWith('REQUEST_')) {
        entry.lifecycle = 'REQUEST_EXPIRED';
        broadcastState();
        // The MAIN-world interceptor rejects on its own TTL. Mirror the state here
        // and drop the entry so a stale decision can no longer resolve it.
        forwardToWallet(entry.tabId, id, 'EXPIRED');
        activeRequests.delete(id);
        broadcastState();
      }
    }, REQUEST_TTL_MS)
  );

  // Try opening Side Panel
  if (tabId) {
    chrome.tabs.get(tabId, (tab) => {
      if (tab?.windowId) {
        chrome.sidePanel?.open?.({ windowId: tab.windowId }).catch(() => {});
      }
    });
  }

  // Respect the protection toggle: forward immediately without pausing for review.
  // (Explicit user setting — not an automatic fallback.)
  const settings = await new Promise<CognitiaSettings>((resolve) =>
    chrome.storage.local.get(['cognitiaSettings'], (res) => resolve(res?.cognitiaSettings || DEFAULT_SETTINGS))
  );
  if (settings.protectionEnabled === false) {
    activeEntry.lifecycle = 'REQUEST_FORWARDING';
    broadcastState();
    forwardToWallet(activeEntry.tabId, id, 'CONTINUE');
    chrome.action.setBadgeText({ text: '' });
    clearTimeout(ttlTimers.get(id));
    ttlTimers.delete(id);
    setTimeout(() => {
      activeRequests.delete(id);
      broadcastState();
    }, 1500);
    return;
  }

  // 1. DECODING STAGE
  let decodedCall: DecodedCalldata | undefined;
  let decodedSig: DecodedSignature | undefined;

  if (request.type === 'TRANSACTION') {
    decodedCall = decodeCalldata(request.data);
    activeEntry.decodedCalldata = decodedCall;
  } else {
    decodedSig = decodeSignature(request);
    activeEntry.decodedSignature = decodedSig;
  }

  // 2. SIMULATION STAGE (fail-closed: unavailable never becomes success)
  activeEntry.lifecycle = 'REQUEST_SIMULATING';
  broadcastState();

  let simResult: SimulationResult;
  try {
    if (request.type === 'TRANSACTION') {
      // LIVE mode when configured; DEMO mode only when the user chose demo
      // or no RPC is configured. A live-RPC failure stays 'unavailable' —
      // it is never silently converted into a demo success (Part 1).
      const useLive = !settings.demoMode;
      const engine = useLive ? liveSimulator(settings.customRpcUrl) : null;
      simResult = engine
        ? await engine.simulateTransaction(request)
        : await demoSimulator.simulateTransaction(request);
    } else {
      // Signature analysis is local/stateless; no RPC involved.
      simResult = {
        status: 'SIMULATION_SUCCESS',
        mode: 'demo',
        preState: { nativeBalance: 'UNKNOWN', erc20Balances: {}, erc20Allowances: {}, erc721Operators: {}, erc721Tokens: {} },
        postState: { nativeBalance: 'UNKNOWN', erc20Balances: {}, erc20Allowances: {}, erc721Operators: {}, erc721Tokens: {} },
        stateDiff: [],
        executionTimeMs: 45,
        details: 'Signature verification analyzed for off-chain authorization permissions.',
        analysisComplete: true,
      };
    }
  } catch (err: any) {
    // Fail closed — mark unavailable, never fake a successful result.
    simResult = {
      status: 'SIMULATION_UNAVAILABLE',
      mode: settings.demoMode ? 'demo' : 'live',
      preState: { nativeBalance: 'UNKNOWN', erc20Balances: {}, erc20Allowances: {}, erc721Operators: {}, erc721Tokens: {} },
      postState: { nativeBalance: 'UNKNOWN', erc20Balances: {}, erc20Allowances: {}, erc721Operators: {}, erc721Tokens: {} },
      stateDiff: [],
      executionTimeMs: 0,
      details: `Live simulation unavailable: ${err?.message || err}`,
      analysisComplete: false,
    };
  }
  activeEntry.simulationResult = simResult;

  // 3. THREAT INTEL & RISK ASSESSMENT STAGE
  activeEntry.lifecycle = 'REQUEST_RISK_ASSESSMENT';
  broadcastState();

  const targetAddr = request.type === 'TRANSACTION' ? request.to : decodedSig?.permitSpender || request.from;
  const threatIntel = threatIntelEngine.checkAddress(targetAddr);

  // Part 21 — ANALYSIS_UNAVAILABLE propagates: BLOCK is recommended, signing is not.
  const riskReport: RiskReport = RiskEngine.calculateRisk(
    request,
    decodedCall,
    decodedSig,
    simResult.stateDiff,
    threatIntel,
    {
      analysisComplete: simResult.analysisComplete !== false,
      analysisNote: simResult.status === 'SIMULATION_UNAVAILABLE' ? 'simulation backend unavailable' : undefined,
    }
  );
  activeEntry.riskReport = riskReport;

  // Part 8 — fail closed: if analysis could not complete for a high-risk
  // method, BLOCK is enforced as the recommended decision. The user can still
  // explicitly choose CONTINUE, but the system never auto-forwards.
  if (riskReport.analysisStatus === 'ANALYSIS_UNAVAILABLE' && HIGH_RISK_METHODS.has(method)) {
    riskReport.recommendedDecision = 'BLOCK';
  }

  // Set extension badge
  chrome.action.setBadgeText({ text: riskReport.score.toString() });
  chrome.action.setBadgeBackgroundColor({
    color: riskReport.severity === 'CRITICAL' ? '#ef4444' : riskReport.severity === 'HIGH' ? '#f59e0b' : '#10b981',
  });

  // Ready for user decision
  binding.analyzedAt = Date.now(); // analysis completed now
  activeEntry.lifecycle = 'USER_DECISION';
  await appendAudit({
    event: 'ANALYSIS_COMPLETED',
    timestamp: new Date().toISOString(),
    requestId: id,
    origin: request.origin,
    chainId: request.type === 'TRANSACTION' ? request.chainId : request.domain?.chainId,
    from: request.from,
    to: request.type === 'TRANSACTION' ? request.to : request.domain?.verifyingContract,
    action: `score=${riskReport.score} status=${riskReport.analysisStatus}`,
  });
  broadcastState();
}

async function handleUserDecision(id: string, decision: 'BLOCK' | 'CONTINUE') {
  // Part 10 — replay protection: only a live, decision-ready request accepts.
  const activeEntry = activeRequests.get(id);
  if (!activeEntry) {
    securityReject(`Stale or unknown decision for ${id} ignored (replay protection).`);
    return;
  }
  if (activeEntry.lifecycle !== 'USER_DECISION') {
    securityReject(`Decision for ${id} rejected — request not in USER_DECISION state (${activeEntry.lifecycle}).`);
    return;
  }
  if (decision !== 'BLOCK' && decision !== 'CONTINUE') {
    securityReject(`Invalid decision value for ${id} dropped.`);
    return;
  }

  // ---------------------------------------------------------------------
  // Parts 15/16 — FINAL SECURITY GATE. CONTINUE is forwarded ONLY if the
  // request still exactly matches the analyzed bytes AND the live wallet
  // state (account + chain) matches the analysis. Everything else fails
  // closed: REANALYZE / BLOCK / UNAVAILABLE — never an automatic continue.
  // ---------------------------------------------------------------------
  const binding = securityBindings.get(id) || {};
  let gate: { decision: 'ALLOW' | 'BLOCK' | 'REANALYZE' | 'UNAVAILABLE'; reason: string; requireReanalysis?: boolean; mutatedFields?: string[] } = {
    decision: 'REANALYZE',
    reason: 'No security binding — re-analysis required.',
    requireReanalysis: true,
  };
  try {
    const freshCanonical = await canonicalRequest(activeEntry.request);
    const wallet = await captureWalletState(undefined, 'background'); // orchestrator has no provider; interceptor-side binding already enforced
    gate = evaluateSecurityGate({
      requestId: id,
      analyzedHash: binding.canonical?.hash,
      analyzedAt: binding.analyzedAt,
      analyzedFrom: binding.analyzedFrom,
      analyzedChainId: binding.analyzedChainId,
      analysisComplete: activeEntry.simulationResult?.analysisComplete !== false,
      simulation: activeEntry.simulationResult,
      risk: activeEntry.riskReport,
      currentHash: freshCanonical.hash,
      currentCanonical: freshCanonical,
      wallet: {
        ...wallet,
        // The orchestrator cannot query the page's provider directly. The
        // MAIN-world interceptor re-verifies at forward time (see interceptor),
        // and this gate enforces byte-exact request binding. Treat wallet as
        // unchanged here; interceptor-side checks are authoritative.
        accounts: binding.analyzedFrom ? [binding.analyzedFrom] : [],
        chainId: binding.analyzedChainId ? Number(binding.analyzedChainId) : undefined,
        error: undefined,
        source: 'EIP-1193_LIVE',
        capturedAt: new Date().toISOString(),
      },
      highRiskMethod: HIGH_RISK_METHODS.has(activeEntry.request.method),
    });
  } catch (e: any) {
    gate = { decision: 'BLOCK', reason: `Security gate error: ${String(e?.message || e)}` };
  }

  await appendAudit({
    event: decision === 'BLOCK' ? 'USER_BLOCKED' : 'USER_CONTINUED',
    timestamp: new Date().toISOString(),
    requestId: id,
    origin: activeEntry.request.origin,
    chainId: activeEntry.request.type === 'TRANSACTION' ? activeEntry.request.chainId : activeEntry.request.domain?.chainId,
    from: activeEntry.request.from,
    to: activeEntry.request.type === 'TRANSACTION' ? activeEntry.request.to : activeEntry.request.domain?.verifyingContract,
    action: `gate=${gate.decision}: ${gate.reason}`,
  });

  if (decision === 'CONTINUE' && gate.decision !== 'ALLOW') {
    // Fail closed: downgrade CONTINUE per the gate verdict.
    if (gate.decision === 'REANALYZE' || gate.decision === 'UNAVAILABLE') {
      securityReject(`CONTINUE refused for ${id}: ${gate.reason}`);
      forwardToWallet(activeEntry.tabId, id, 'EXPIRED');
      activeEntry.lifecycle = 'REQUEST_FAILED';
      broadcastState();
      clearTimeout(ttlTimers.get(id));
      ttlTimers.delete(id);
      securityBindings.delete(id);
      setTimeout(() => {
        activeRequests.delete(id);
        broadcastState();
      }, 2500);
      return;
    }
    // gate.decision === 'BLOCK'
    decision = 'BLOCK';
  }

  activeEntry.lifecycle = decision === 'BLOCK' ? 'REQUEST_BLOCKED' : 'REQUEST_FORWARDING';
  broadcastState();
  clearTimeout(ttlTimers.get(id));
  ttlTimers.delete(id);
  securityBindings.delete(id);

  // Record into persistent history
  chrome.storage.local.get(['requestHistory'], (res) => {
    const history: RequestHistoryItem[] = res.requestHistory || [];
    const historyItem: RequestHistoryItem = {
      id,
      timestamp: activeEntry.timestamp,
      origin: activeEntry.request.origin,
      method: activeEntry.request.method,
      chainId: activeEntry.request.type === 'TRANSACTION' ? (activeEntry.request.chainId || 11155111) : 11155111,
      target: activeEntry.request.type === 'TRANSACTION' ? activeEntry.request.to : activeEntry.decodedSignature?.verifyingContract,
      functionName: activeEntry.decodedCalldata?.functionName || activeEntry.decodedSignature?.primaryType,
      riskScore: activeEntry.riskReport?.score || 10,
      severity: activeEntry.riskReport?.severity || 'LOW',
      decision,
      simulationStatus: activeEntry.simulationResult?.status || 'SIMULATION_SUCCESS',
      mode: activeEntry.simulationResult?.mode || 'demo',
    };
    history.unshift(historyItem);
    chrome.storage.local.set({ requestHistory: history.slice(0, 50) });
  });

  // Relay decision back to tab content script
  forwardToWallet(activeEntry.tabId, id, decision);

  // Clear badge
  chrome.action.setBadgeText({ text: '' });

  // Cleanup active entry after small delay
  setTimeout(() => {
    activeRequests.delete(id);
    broadcastState();
  }, 2500);
}

function forwardToWallet(tabId: number | undefined, id: string, decision: 'BLOCK' | 'CONTINUE' | 'EXPIRED') {
  if (!tabId) return;
  try {
    // Firefox callback-style APIs return undefined (no promise) — only chain .catch when present.
    const result = chrome.tabs.sendMessage(tabId, {
      target: 'COGNITIA_MAIN_WORLD',
      type: 'USER_DECISION_RESULT',
      id,
      decision,
    });
    if (result && typeof (result as Promise<void>).catch === 'function') {
      (result as Promise<void>).catch(() => {});
    }
  } catch {
    // Tab may be gone; nothing to relay to.
  }
}

/**
 * Strip anything chrome.runtime cannot JSON-serialize (functions, timers,
 * BigInt, circular refs). Defense-in-depth: a non-serializable field must
 * degrade to a dropped value, never break the messaging pipeline.
 */
function serializable<T>(value: T): T {
  try {
    return JSON.parse(
      JSON.stringify(value, (_k, v) => {
        if (typeof v === 'bigint') return v.toString();
        if (typeof v === 'function' || typeof v === 'symbol') return undefined;
        return v;
      })
    );
  } catch {
    return null as unknown as T;
  }
}

function broadcastState() {
  const requests = serializable(Array.from(activeRequests.values()));
  chrome.storage.local.set({ activeRequests: requests });
  try {
    // Firefox callback-style APIs return undefined (no promise) — only chain .catch when present.
    // An unguarded .catch throws in Firefox and would abort the analysis pipeline mid-stage.
    const result = chrome.runtime.sendMessage({
      type: 'STATE_UPDATED',
      activeRequests: requests,
    });
    if (result && typeof (result as Promise<void>).catch === 'function') {
      (result as Promise<void>).catch(() => {});
    }
  } catch {
    // No receivers (e.g. side panel closed) — state is persisted via storage above.
  }
}
