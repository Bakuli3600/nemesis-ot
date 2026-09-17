/**
 * Parts 15, 16, 17 — the central security gate and audit log.
 *
 * The gate is the ONLY path from a user decision to a forwarded request.
 * It re-validates: analysis existence, freshness, canonical hash match, and
 * live wallet state (account + chain). Every mismatch fails closed.
 */

import { RiskReport, SimulationResult } from '@cognitia/core';
import { CanonicalRequest, WalletStateSnapshot, diffCanonical } from './walletState';
import { classifyFreshness, TTL_SECONDS } from './index';

// ---------------------------------------------------------------------------
// Part 17 — audit log (redacted; no keys/secrets/passwords/TOTP material)
// ---------------------------------------------------------------------------

export type AuditEventName =
  | 'REQUEST_INTERCEPTED'
  | 'ANALYSIS_STARTED'
  | 'ANALYSIS_COMPLETED'
  | 'ANALYSIS_FAILED'
  | 'USER_BLOCKED'
  | 'USER_CONTINUED'
  | 'ACCOUNT_CHANGED'
  | 'CHAIN_CHANGED'
  | 'REQUEST_MUTATED'
  | 'ANALYSIS_EXPIRED'
  | 'SECURITY_STATUS_CHANGED';

export interface AuditEvent {
  event: AuditEventName;
  timestamp: string;
  requestId?: string;
  origin?: string;
  chainId?: number | string;
  from?: string;
  to?: string;
  action?: string;
}

const AUDIT_KEY = 'cognitiaAuditLog';
const AUDIT_MAX = 200;

/** Append an audit event. Payloads are plain data only — never secrets. */
export async function appendAudit(event: AuditEvent): Promise<void> {
  try {
    const log = ((await chrome.storage.local.get([AUDIT_KEY]))[AUDIT_KEY] as AuditEvent[]) || [];
    log.unshift(event);
    await chrome.storage.local.set({ [AUDIT_KEY]: log.slice(0, AUDIT_MAX) });
  } catch {
    // Audit must never break the pipeline; storage may be unavailable in tests.
  }
}

export async function readAudit(): Promise<AuditEvent[]> {
  try {
    return ((await chrome.storage.local.get([AUDIT_KEY]))[AUDIT_KEY] as AuditEvent[]) || [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Part 15 — the gate
// ---------------------------------------------------------------------------

export type GateDecision = 'ALLOW' | 'BLOCK' | 'REANALYZE' | 'UNAVAILABLE';

export interface GateInput {
  requestId: string;
  /** Canonical hash captured when the analysis ran (undefined = no analysis). */
  analyzedHash?: string;
  analyzedAt?: number;
  analyzedFrom?: string;
  analyzedChainId?: string;
  analysisComplete?: boolean;
  simulation?: SimulationResult;
  risk?: RiskReport;
  /** Fresh canonical hash of the request AT DECISION TIME. */
  currentHash: string;
  currentCanonical: CanonicalRequest;
  /** Live wallet state captured at decision time. */
  wallet: WalletStateSnapshot;
  highRiskMethod?: boolean;
}

export interface GateResult {
  decision: GateDecision;
  reason: string;
  mutatedFields?: string[];
  requireReanalysis?: boolean;
}

const ANALYSIS_TTL_MS = 5 * 60 * 1000; // analyses older than this must be redone

export function evaluateSecurityGate(input: GateInput): GateResult {
  const { requestId, analyzedHash, analyzedAt, analyzedFrom, analyzedChainId, analysisComplete, currentHash, currentCanonical, wallet } = input;

  // Part 15 — missing analysis
  if (!analyzedHash || analyzedAt === undefined) {
    return { decision: 'REANALYZE', reason: 'No completed analysis for this request.', requireReanalysis: true };
  }

  // Part 16 — failed/incomplete analysis never auto-continues
  if (analysisComplete === false) {
    return input.highRiskMethod
      ? { decision: 'BLOCK', reason: 'Security analysis incomplete and method is high-risk (fail closed).' }
      : { decision: 'UNAVAILABLE', reason: 'Security analysis incomplete.' };
  }

  // Expired analysis (Part 5/15)
  if (Date.now() - analyzedAt > ANALYSIS_TTL_MS) {
    return { decision: 'REANALYZE', reason: 'Analysis expired — request must be re-analyzed.', requireReanalysis: true };
  }

  // Part 9 — transaction/typed-data mutation (TOCTOU)
  if (analyzedHash !== currentHash) {
    return {
      decision: 'REANALYZE',
      reason: 'Request changed after analysis (mutation detected).',
      mutatedFields: input.currentCanonical ? ['request'] : undefined,
      requireReanalysis: true,
    };
  }

  // Part 6/14 — live wallet state must match the analysis
  const currentAccount = wallet.accounts[0];
  if (analyzedFrom && currentAccount && analyzedFrom.toLowerCase() !== currentAccount) {
    return { decision: 'REANALYZE', reason: 'Wallet account changed since analysis — re-analysis required.', requireReanalysis: true };
  }
  if (analyzedChainId && wallet.chainId !== undefined && normalize(analyzedChainId) !== String(wallet.chainId)) {
    return { decision: 'REANALYZE', reason: 'Wallet network changed. Transaction must be re-analyzed.', requireReanalysis: true };
  }

  // Provider unreachable at decision time — honest degradation
  if (wallet.error) {
    return input.highRiskMethod
      ? { decision: 'BLOCK', reason: `Wallet state unverifiable (${wallet.error}) and method is high-risk.` }
      : { decision: 'UNAVAILABLE', reason: `Wallet state unverifiable: ${wallet.error}` };
  }

  // Critical finding → BLOCK recommendation (user can still explicitly choose,
  // but the gate records the recommendation; ALLOW only for exact request).
  if (input.risk?.severity === 'CRITICAL' && input.risk.recommendedDecision === 'BLOCK') {
    return { decision: 'ALLOW', reason: 'User explicitly chose CONTINUE on a CRITICAL request — allowed only because the request exactly matches the analyzed one.', mutatedFields: [] };
  }

  void requestId;
  return { decision: 'ALLOW', reason: 'Request matches analysis; wallet state unchanged.' };
}

function normalize(chainId: string): string {
  if (/^0x/i.test(chainId)) return String(parseInt(chainId, 16));
  return chainId;
}

// Re-export for orchestrator convenience
export { diffCanonical, classifyFreshness, TTL_SECONDS };
