/**
 * Part 2 — TOTP-based 2FA for the COGNITIA security layer itself.
 *
 * This is explicitly NOT MetaMask authentication. MetaMask does not expose its
 * password/2FA state through EIP-1193, and Cognitia never inspects it.
 *
 * Implementation notes:
 *  - RFC 6238 TOTP over HMAC-SHA1 (authenticator-app standard), 6 digits, 30s step.
 *  - Secret is stored ENCRYPTED (AES-GCM via WebCrypto) — never plaintext.
 *  - Verification is rate-limited with exponential lockout (brute-force protection).
 *  - Recovery codes are hashed (SHA-256), single-use, and also stored encrypted.
 *  - Every operation emits an audit event (no secrets in payloads).
 */

import { securityLog } from '@cognitia/simulator';

const TOTP_PERIOD_S = 30;
const TOTP_DIGITS = 6;
const LOCKOUT_BASE_MS = 30_000;
const LOCKOUT_MAX_MS = 15 * 60_000;
const MAX_FAILURES_BEFORE_LOCKOUT = 3;

// ---------------------------------------------------------------------------
// Crypto helpers (WebCrypto — available in extension contexts)
// ---------------------------------------------------------------------------

async function sha256Hex(data: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data) as unknown as BufferSource);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** AES-GCM encryption of the TOTP secret at rest. Key derived from a device-local key. */
async function getAesKey(): Promise<CryptoKey> {
  // Device-local key material. Stored outside sync storage so it never leaves
  // the machine. This is defense-in-depth: the TOTP secret at rest is
  // ciphertext, not plaintext.
  let raw = (await chrome.storage.local.get(['cognitiaDeviceKey'])).cognitiaDeviceKey as string | undefined;
  if (!raw) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    raw = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    await chrome.storage.local.set({ cognitiaDeviceKey: raw });
  }
  const keyMaterial = await crypto.subtle.importKey('raw', hexToBytes(raw) as unknown as BufferSource, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new TextEncoder().encode('cognitia-totp-v1') as unknown as BufferSource,
      label: new TextEncoder().encode('totp-secret-encryption') as unknown as BufferSource,
    } as any,
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function encryptJson(key: CryptoKey, value: unknown): Promise<{ iv: string; ct: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    new TextEncoder().encode(JSON.stringify(value)) as unknown as BufferSource
  );
  return {
    iv: Array.from(iv).map((b) => b.toString(16).padStart(2, '0')).join(''),
    ct: Array.from(new Uint8Array(ct)).map((b) => b.toString(16).padStart(2, '0')).join(''),
  };
}

async function decryptJson<T>(key: CryptoKey, blob: { iv: string; ct: string }): Promise<T> {
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: hexToBytes(blob.iv) as unknown as BufferSource },
    key,
    hexToBytes(blob.ct) as unknown as BufferSource
  );
  return JSON.parse(new TextDecoder().decode(pt)) as T;
}

// ---------------------------------------------------------------------------
// Base32 (RFC 4648) for authenticator compatibility
// ---------------------------------------------------------------------------

const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Uint8Array {
  const clean = s.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const c of clean) {
    const idx = B32_ALPHABET.indexOf(c);
    if (idx === -1) throw new Error('invalid base32 character');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

// ---------------------------------------------------------------------------
// Core TOTP (RFC 6238)
// ---------------------------------------------------------------------------

export async function generateTotpSecret(): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return base32Encode(bytes);
}

/** OTPauth URI for QR encoding (displayed only during setup). */
export function otpauthUri(secret: string, account: string, issuer = 'Cognitia Shield'): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&period=${TOTP_PERIOD_S}&digits=${TOTP_DIGITS}`;
}

async function hotp(secretKey: CryptoKey, counter: bigint): Promise<string> {
  // HMAC over the 8-byte big-endian counter.
  const msg = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    msg[i] = Number(c & 0xffn);
    c >>= 8n;
  }
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', secretKey, msg as unknown as BufferSource));
  const offset = sig[sig.length - 1] & 0x0f;
  const bin =
    ((sig[offset] & 0x7f) << 24) | ((sig[offset + 1] & 0xff) << 16) | ((sig[offset + 2] & 0xff) << 8) | (sig[offset + 3] & 0xff);
  return (bin % 10 ** TOTP_DIGITS).toString().padStart(TOTP_DIGITS, '0');
}

async function importSecretKey(secretBase32: string): Promise<CryptoKey> {
  const raw = base32Decode(secretBase32);
  return crypto.subtle.importKey('raw', raw as unknown as BufferSource, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
}

/** Compute the TOTP for a secret at a given time (used by tests + verification). */
export async function computeTotp(secretBase32: string, atMs: number = Date.now()): Promise<string> {
  const key = await importSecretKey(secretBase32);
  return hotp(key, BigInt(Math.floor(atMs / 1000 / TOTP_PERIOD_S)));
}

// ---------------------------------------------------------------------------
// Rate limiting / brute-force protection
// ---------------------------------------------------------------------------

interface LockoutState {
  failures: number;
  lockedUntil?: number;
}

async function getLockout(): Promise<LockoutState> {
  return ((await chrome.storage.local.get(['cognitia2faLockout'])).cognitia2faLockout as LockoutState) || { failures: 0 };
}

async function setLockout(s: LockoutState): Promise<void> {
  await chrome.storage.local.set({ cognitia2faLockout: s });
}

export async function lockoutRemainingMs(now = Date.now()): Promise<number> {
  const s = await getLockout();
  return s.lockedUntil && s.lockedUntil > now ? s.lockedUntil - now : 0;
}

// ---------------------------------------------------------------------------
// Stored state (encrypted at rest)
// ---------------------------------------------------------------------------

interface StoredTwoFa {
  encSecret: { iv: string; ct: string };
  encRecovery: { iv: string; ct: string }; // [{hash, used}]
  enabledAt: string;
}

const STORE_KEY = 'cognitia2fa';

export async function twoFaStatus(): Promise<import('./index').TwoFaState> {
  try {
    const stored = (await chrome.storage.local.get([STORE_KEY]))[STORE_KEY] as StoredTwoFa | undefined;
    return {
      status: stored ? 'ENABLED' : 'DISABLED',
      source: 'COGNITIA_LOCAL_STORE',
      checkedAt: new Date().toISOString(),
    };
  } catch (e: any) {
    return { status: 'UNKNOWN', source: 'NONE', checkedAt: new Date().toISOString(), error: String(e?.message || e) };
  }
}

// ---------------------------------------------------------------------------
// Setup / enable / verify / disable
// ---------------------------------------------------------------------------

export interface TwoFaSetup {
  secret: string; // shown once, during setup only
  uri: string; // for QR rendering
  recoveryCodes: string[]; // shown once, hashed at rest
}

export async function beginTwoFaSetup(account: string): Promise<TwoFaSetup> {
  const secret = await generateTotpSecret();
  const recoveryCodes = Array.from({ length: 5 }, () => {
    const b = crypto.getRandomValues(new Uint8Array(5));
    return Array.from(b).map((x: number) => x.toString(16).padStart(2, '0')).join('');
  });
  // Keep pending setup locally; it becomes active only after successful verify.
  const key = await getAesKey();
  const encRecovery = await encryptJson(
    key,
    await Promise.all(recoveryCodes.map(async (c) => ({ hash: await sha256Hex(c), used: false })))
  );
  const pendingSecret = await encryptJson(key, { secret });
  await chrome.storage.local.set({ cognitia2faPending: { encSecret: pendingSecret, encRecovery } });
  securityLog('twofa.setup_started', { account });
  return { secret, uri: otpauthUri(secret, account), recoveryCodes };
}

export async function confirmTwoFaSetup(code: string, now = Date.now()): Promise<{ ok: boolean; error?: string }> {
  const pending = (await chrome.storage.local.get(['cognitia2faPending'])).cognitia2faPending;
  if (!pending) return { ok: false, error: 'No setup in progress' };

  const lock = await getLockout();
  if (lock.lockedUntil && lock.lockedUntil > now) {
    return { ok: false, error: `Too many attempts. Retry in ${Math.ceil((lock.lockedUntil - now) / 1000)}s` };
  }

  const key = await getAesKey();
  const { secret } = await decryptJson<{ secret: string }>(key, pending.encSecret);
  const expected = await computeTotp(secret, now);
  if (code !== expected) {
    lock.failures += 1;
    if (lock.failures >= MAX_FAILURES_BEFORE_LOCKOUT) {
      lock.lockedUntil = now + Math.min(LOCKOUT_BASE_MS * 2 ** (lock.failures - MAX_FAILURES_BEFORE_LOCKOUT), LOCKOUT_MAX_MS);
    }
    await setLockout(lock);
    securityLog('twofa.verify_failed', { failures: lock.failures });
    return { ok: false, error: 'Invalid code' };
  }

  await setLockout({ failures: 0 });
  await chrome.storage.local.set({
    [STORE_KEY]: { encSecret: pending.encSecret, encRecovery: pending.encRecovery, enabledAt: new Date().toISOString() },
  });
  await chrome.storage.local.remove(['cognitia2faPending']);
  securityLog('twofa.enabled', {});
  return { ok: true };
}

export async function verifyTwoFa(code: string, now = Date.now()): Promise<{ ok: boolean; error?: string }> {
  const stored = (await chrome.storage.local.get([STORE_KEY]))[STORE_KEY] as StoredTwoFa | undefined;
  if (!stored) return { ok: false, error: '2FA not enabled' };

  const lock = await getLockout();
  if (lock.lockedUntil && lock.lockedUntil > now) {
    securityLog('twofa.verify_blocked_lockout', {});
    return { ok: false, error: 'Locked due to repeated failures' };
  }

  const key = await getAesKey();
  const { secret } = await decryptJson<{ secret: string }>(key, stored.encSecret);

  // Allow current step and ±1 step of clock drift.
  const step = BigInt(Math.floor(now / 1000 / TOTP_PERIOD_S));
  const keyDrift = await importSecretKey(secret);
  const candidates = await Promise.all([step - 1n, step, step + 1n].map((s) => hotp(keyDrift, s)));
  if (!candidates.includes(code)) {
    lock.failures += 1;
    if (lock.failures >= MAX_FAILURES_BEFORE_LOCKOUT) {
      lock.lockedUntil = now + Math.min(LOCKOUT_BASE_MS * 2 ** (lock.failures - MAX_FAILURES_BEFORE_LOCKOUT), LOCKOUT_MAX_MS);
    }
    await setLockout(lock);
    securityLog('twofa.verify_failed', { failures: lock.failures });
    return { ok: false, error: 'Invalid code' };
  }

  await setLockout({ failures: 0 });
  return { ok: true };
}

export async function disableTwoFa(codeOrRecovery: string, now = Date.now()): Promise<{ ok: boolean; error?: string }> {
  const stored = (await chrome.storage.local.get([STORE_KEY]))[STORE_KEY] as StoredTwoFa | undefined;
  if (!stored) return { ok: false, error: '2FA not enabled' };

  // Accept either a valid TOTP code or an unused recovery code.
  const viaTotp = await verifyTwoFa(codeOrRecovery, now);
  if (viaTotp.ok) {
    await chrome.storage.local.remove([STORE_KEY]);
    securityLog('twofa.disabled', { via: 'totp' });
    return { ok: true };
  }

  const key = await getAesKey();
  const codes = await decryptJson<Array<{ hash: string; used: boolean }>>(key, stored.encRecovery);
  const targetHash = await sha256Hex(codeOrRecovery);
  const match = codes.find((c) => c.hash === targetHash && !c.used);
  if (match) {
    match.used = true;
    const encRecovery = await encryptJson(key, codes);
    await chrome.storage.local.set({ [STORE_KEY]: { ...stored, encRecovery } });
    await chrome.storage.local.remove([STORE_KEY]);
    securityLog('twofa.disabled', { via: 'recovery_code' });
    return { ok: true };
  }

  securityLog('twofa.disable_failed', {});
  return { ok: false, error: 'Invalid code or recovery code' };
}

/** Run a self-test of the TOTP engine (used by tests, no secrets persisted). */
export async function totpSelfTest(secret: string, atMs: number): Promise<{ code: string; nextCode: string }> {
  return { code: await computeTotp(secret, atMs), nextCode: await computeTotp(secret, atMs + TOTP_PERIOD_S * 1000) };
}
