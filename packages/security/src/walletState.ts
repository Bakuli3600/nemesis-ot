/**
 * Parts 6, 7, 8, 9, 14 — real-time wallet state + canonical request binding.
 *
 * Only EIP-1193-legitimate surfaces are used: eth_chainId, eth_accounts,
 * eth_blockNumber, wallet_getPermissions (where supported), provider events.
 * MetaMask internals (password, 2FA, keyring state) are never inspected —
 * they are not exposed and Cognitia remains non-custodial.
 */

import { TransactionRequest, SignatureRequest } from '@cognitia/core';

export interface WalletStateSnapshot {
  accounts: string[]; // lowercase
  chainId: number | undefined;
  providerIdentity: string;
  capturedAt: string;
  source: 'EIP-1193_LIVE';
  error?: string;
}

export interface CanonicalRequest {
  kind: 'TRANSACTION' | 'SIGNATURE';
  chainId: string;
  from: string;
  to: string; // '' for signatures
  value: string;
  data: string; // calldata, or canonical typed-data JSON for signatures
  gasParams: string;
  method: string;
  /** SHA-256 of the canonical string above. */
  hash: string;
}

function normalizeChainId(chainId: number | string | undefined): string {
  if (chainId === undefined) return '';
  if (typeof chainId === 'number') return String(chainId);
  if (typeof chainId === 'string' && chainId.startsWith('0x')) return String(parseInt(chainId, 16));
  return String(chainId);
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text) as unknown as BufferSource);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Part 9 — canonical representation of the exact request being analyzed.
 * Any mutation of chainId/from/to/value/data/gas (or typed-data payload)
 * after analysis changes the hash and is caught before CONTINUE.
 */
export async function canonicalRequest(req: TransactionRequest | SignatureRequest): Promise<CanonicalRequest> {
  const kind = req.type;
  let chainId = '';
  let to = '';
  let value = '';
  let data = '';
  let gasParams = '';

  if (req.type === 'TRANSACTION') {
    chainId = normalizeChainId(req.chainId);
    to = (req.to || '').toLowerCase();
    value = String(req.value || '0x0').toLowerCase();
    data = (req.data || '0x').toLowerCase();
    gasParams = [req.gas, req.maxFeePerGas, req.maxPriorityFeePerGas].map((v) => String(v ?? '').toLowerCase()).join('|');
  } else {
    // Signatures: bind the EXACT typed-data payload / raw message.
    chainId = normalizeChainId(req.domain?.chainId);
    to = (req.domain?.verifyingContract || '').toLowerCase();
    data = JSON.stringify({ primaryType: req.primaryType, domain: req.domain ?? null, message: req.message ?? null, raw: req.rawPayload ?? null });
  }

  const canonical = [kind, req.method, chainId, (req.from || '').toLowerCase(), to, value, data, gasParams].join('\u241f');
  return { kind, chainId, from: (req.from || '').toLowerCase(), to, value, data, gasParams, method: req.method, hash: await sha256Hex(canonical) };
}

/** Compare two canonical requests; returns the list of mutated fields (Part 8). */
export function diffCanonical(a: CanonicalRequest, b: CanonicalRequest): string[] {
  const changed: string[] = [];
  if (a.kind !== b.kind) changed.push('type');
  if (a.chainId !== b.chainId) changed.push('chainId');
  if (a.from !== b.from) changed.push('from');
  if (a.to !== b.to) changed.push('to');
  if (a.value !== b.value) changed.push('value');
  if (a.data !== b.data) changed.push(b.kind === 'SIGNATURE' ? 'typedData' : 'calldata');
  if (a.gasParams !== b.gasParams) changed.push('gasParams');
  return changed;
}

// ---------------------------------------------------------------------------
// Live wallet state via EIP-1193
// ---------------------------------------------------------------------------

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, cb: (...args: any[]) => void): void;
  removeListener?(event: string, cb: (...args: any[]) => void): void;
}

function parseChainIdHex(v: unknown): number | undefined {
  if (typeof v !== 'string' || !/^0x[0-9a-fA-F]+$/.test(v)) return undefined;
  return Number(BigInt(v));
}

/**
 * Part 6/14 — capture current wallet state live. Never assumes; failures are
 * reported honestly instead of guessed.
 */
export async function captureWalletState(provider: Eip1193Provider | undefined, providerIdentity = 'unknown'): Promise<WalletStateSnapshot> {
  const capturedAt = new Date().toISOString();
  if (!provider?.request) {
    return { accounts: [], chainId: undefined, providerIdentity, capturedAt, source: 'EIP-1193_LIVE', error: 'No EIP-1193 provider available' };
  }
  try {
    const [chainIdRaw, accountsRaw] = await Promise.all([
      provider.request({ method: 'eth_chainId' }) as Promise<unknown>,
      provider.request({ method: 'eth_accounts' }) as Promise<unknown>,
    ]);
    const accounts = Array.isArray(accountsRaw) ? accountsRaw.filter((a): a is string => typeof a === 'string').map((a) => a.toLowerCase()) : [];
    return {
      accounts,
      chainId: parseChainIdHex(chainIdRaw),
      providerIdentity,
      capturedAt,
      source: 'EIP-1193_LIVE',
    };
  } catch (e: any) {
    return { accounts: [], chainId: undefined, providerIdentity, capturedAt, source: 'EIP-1193_LIVE', error: String(e?.message || e) };
  }
}

/** Part 6 — subscribe to account/chain/disconnect events (provider events). */
export function watchWalletEvents(
  provider: Eip1193Provider | undefined,
  onChange: (event: 'ACCOUNTS_CHANGED' | 'CHAIN_CHANGED' | 'DISCONNECT', payload: unknown) => void
): () => void {
  if (!provider?.on) return () => {};
  const handlers: Array<[string, (...args: any[]) => void]> = [
    ['accountsChanged', (acc: unknown) => onChange('ACCOUNTS_CHANGED', acc)],
    ['chainChanged', (cid: unknown) => onChange('CHAIN_CHANGED', cid)],
    ['disconnect', (err: unknown) => onChange('DISCONNECT', err)],
  ];
  for (const [ev, cb] of handlers) provider.on(ev, cb);
  return () => {
    for (const [ev, cb] of handlers) provider.removeListener?.(ev, cb);
  };
}
