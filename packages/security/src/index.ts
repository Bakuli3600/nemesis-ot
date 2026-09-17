/**
 * @cognitia/security — real-time security status services.
 *
 * Honesty rules (Parts 1, 22, 24):
 *  - Every status carries source, checkedAt, confidence, and age computation.
 *  - Unavailable live sources are UNKNOWN/UNAVAILABLE, never SAFE.
 *  - Cognitia can only reason about its OWN security layer (2FA, settings) and
 *    what EIP-1193 legitimately exposes. It can NEVER see MetaMask's internal
 *    password/2FA state, and the wording in the UI reflects that.
 */

// ---------------------------------------------------------------------------
// Part 1/22 — status vocabulary
// ---------------------------------------------------------------------------

export * from './totp';
export * from './breach';
export * from './walletState';
export * from './securityGate';

export type SecurityStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'COMPROMISED'
  | 'SAFE'
  | 'NOT_COMPROMISED'
  | 'UNKNOWN'
  | 'UNAVAILABLE'
  | 'DEMO';

export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';

/** Freshness buckets (Part 5): fresh < 5m, stale 5–30m, expired > 30m. */
export type Freshness = 'FRESH' | 'STALE' | 'EXPIRED' | 'NEVER_CHECKED';

export const TTL_SECONDS = { fresh: 300, stale: 1800 } as const;

export interface SecurityResult<S extends string = string> {
  status: S | SecurityStatus;
  source: string;
  checkedAt: string; // ISO timestamp
  confidence: Confidence;
  error?: string;
}

export function classifyFreshness(checkedAt: string | undefined, now = Date.now()): Freshness {
  if (!checkedAt) return 'NEVER_CHECKED';
  const t = Date.parse(checkedAt);
  if (!Number.isFinite(t)) return 'NEVER_CHECKED';
  const age = (now - t) / 1000;
  if (age < 0) return 'FRESH';
  if (age < TTL_SECONDS.fresh) return 'FRESH';
  if (age < TTL_SECONDS.stale) return 'STALE';
  return 'EXPIRED';
}

export function ageSeconds(checkedAt: string | undefined, now = Date.now()): number | undefined {
  if (!checkedAt) return undefined;
  const t = Date.parse(checkedAt);
  if (!Number.isFinite(t)) return undefined;
  return Math.max(0, Math.round((now - t) / 1000));
}

// ---------------------------------------------------------------------------
// Part 2 — Cognitia 2FA (our own lock — explicitly NOT MetaMask authentication)
// ---------------------------------------------------------------------------

export type TwoFaStatus = 'ENABLED' | 'DISABLED' | 'UNKNOWN';

export interface TwoFaState {
  /** Status of the COGNITIA security lock. Never describes MetaMask. */
  status: TwoFaStatus;
  source: 'COGNITIA_LOCAL_STORE' | 'NONE';
  checkedAt: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Part 3/4 — password compromise (k-anonymity), with honest degradation
// ---------------------------------------------------------------------------

export interface PasswordCompromiseResult extends SecurityResult {
  status: 'NOT_COMPROMISED' | 'COMPROMISED' | 'UNKNOWN';
  checkedAt: string;
  source: 'LIVE_BREACH_DATABASE' | 'DEMO_BREACH_DATABASE';
  /** How many times the exact password appears in the corpus (0 if clean). */
  occurrences?: number;
  /** True when checked against the demo corpus instead of the live service. */
  demo: boolean;
}

// ---------------------------------------------------------------------------
// Part 6 — wallet/provider security (only what EIP-1193 legitimately exposes)
// ---------------------------------------------------------------------------

export interface WalletProviderStatus {
  providerAvailable: SecurityResult<'CONNECTED' | 'DISCONNECTED' | 'UNKNOWN'>;
  providerIdentity: SecurityResult<string | 'UNKNOWN'>;
  chainVerified: SecurityResult<'VERIFIED' | 'MISMATCH' | 'UNKNOWN'>;
  accounts: SecurityResult<'GRANTED' | 'NONE' | 'UNKNOWN'>;
}

// ---------------------------------------------------------------------------
// Part 21 — aggregated Security Center model
// ---------------------------------------------------------------------------

export interface SecurityCenterSnapshot {
  cognitia2fa: TwoFaState;
  credentialBreach: PasswordCompromiseResult | { status: 'UNKNOWN'; source: 'NONE'; checkedAt?: string; error: string };
  walletProvider: WalletProviderStatus;
  rpc: SecurityResult<'LIVE' | 'DEMO' | 'UNKNOWN'>;
  threatIntel: SecurityResult<'LIVE' | 'SIMULATED'>;
  audit: { lastEventAt?: string; eventCount: number };
}
