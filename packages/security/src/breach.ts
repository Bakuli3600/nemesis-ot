/**
 * Part 3 — REAL password-compromise checker (k-anonymity).
 *
 * Privacy design:
 *   password → SHA-1 → first 5 hex chars sent to the breach API → full-hash
 *   comparison happens LOCALLY against the returned suffixes.
 * The complete hash (and obviously the password) never leaves the device.
 *
 * NEVER used with the MetaMask password — Cognitia never sees it. This checks
 * a password the user explicitly types into Cognitia's own Security Center.
 *
 * Honesty: if the live service cannot be reached → UNKNOWN (never SAFE),
 * with error metadata attached (Part 4).
 */

import { PasswordCompromiseResult } from './index';

const API = 'https://api.pwnedpasswords.com/range/';
const REQUEST_TIMEOUT_MS = 8000;

async function sha1Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text) as unknown as BufferSource);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Query the live k-anonymity breach service. */
export async function checkPasswordLive(password: string): Promise<PasswordCompromiseResult> {
  const checkedAt = new Date().toISOString();
  try {
    const fullHash = await sha1Hex(password);
    const prefix = fullHash.slice(0, 5);
    const suffix = fullHash.slice(5);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetch(API + prefix, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      return {
        status: 'UNKNOWN',
        source: 'LIVE_BREACH_DATABASE',
        checkedAt,
        confidence: 'LOW',
        error: `Breach service returned HTTP ${res.status}`,
      } as PasswordCompromiseResult;
    }

    const body = await res.text();
    for (const line of body.split('\n')) {
      const [hashSuffix, countStr] = line.trim().split(':');
      if (hashSuffix === suffix) {
        const occurrences = parseInt(countStr || '0', 10) || 0;
        return {
          status: occurrences > 0 ? 'COMPROMISED' : 'NOT_COMPROMISED',
          source: 'LIVE_BREACH_DATABASE',
          checkedAt,
          confidence: 'HIGH',
          occurrences,
          demo: false,
        } as PasswordCompromiseResult;
      }
    }
    return {
      status: 'NOT_COMPROMISED',
      source: 'LIVE_BREACH_DATABASE',
      checkedAt,
      confidence: 'HIGH',
      occurrences: 0,
      demo: false,
    } as PasswordCompromiseResult;
  } catch (e: any) {
    return {
      status: 'UNKNOWN',
      source: 'LIVE_BREACH_DATABASE',
      checkedAt,
      confidence: 'LOW',
      error: e?.name === 'AbortError' ? 'Breach service timed out' : `Breach service unavailable: ${String(e?.message || e)}`,
    } as PasswordCompromiseResult;
  }
}

/** Demo corpus for offline/hackathon use — clearly labeled as demo, small and static. */
const DEMO_CORPUS = new Set([
  'password123',
  'letmein',
  'qwerty123',
  'metamask1',
  'cognitia',
  'trustno1',
  'admin123456',
]);

export async function checkPasswordDemo(password: string): Promise<PasswordCompromiseResult> {
  const hit = DEMO_CORPUS.has(password);
  return {
    status: hit ? 'COMPROMISED' : 'NOT_COMPROMISED',
    source: 'DEMO_BREACH_DATABASE',
    checkedAt: new Date().toISOString(),
    confidence: 'HIGH',
    occurrences: hit ? 1 : 0,
    demo: true,
  };
}

/** Entry point honoring demo mode (Part 22 — never mix labels). */
export async function checkPasswordCompromise(password: string, demoMode: boolean): Promise<PasswordCompromiseResult> {
  return demoMode ? checkPasswordDemo(password) : checkPasswordLive(password);
}
