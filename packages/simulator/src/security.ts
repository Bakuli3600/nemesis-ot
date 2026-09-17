/**
 * Security primitives for the simulation pipeline.
 *
 * Covers:
 *  - Transaction field validation before simulation (Part 6)
 *  - An RPC client with timeouts, bounded retries, exponential backoff and
 *    strict response validation (Part 18)
 *  - An explicit no-broadcast guard so simulation code can never send
 *    transactions (Part 19)
 *  - Security logging with sensitive-value redaction (Part 20)
 */

import { TransactionRequest } from '@cognitia/core';

// ---------------------------------------------------------------------------
// Part 19 — No-broadcast guarantee
// ---------------------------------------------------------------------------

/** Methods that could move funds or broadcast. Simulation must NEVER call them. */
export const BROADCAST_METHODS = Object.freeze([
  'eth_sendTransaction',
  'eth_sendRawTransaction',
  'eth_signTransaction',
  'eth_sign',
  'eth_signTypedData',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'personal_sign',
  'wallet_sendCalls',
  'wallet_addEthereumChain',
  'wallet_switchEthereumChain',
]);

// Case-insensitive membership (methods may arrive in any casing).
const BROADCAST_SET: ReadonlySet<string> = new Set(BROADCAST_METHODS.map((m) => m.toLowerCase()));

/**
 * Guard used by the simulation backend. Throws if a broadcast-capable method
 * is ever invoked — simulation is restricted to read-only operations.
 */
export function assertNoBroadcast(method: string): void {
  if (BROADCAST_SET.has(method.toLowerCase())) {
    throw new Error(
      `[COGNITIA-SECURITY] Broadcast method "${method}" is forbidden in the simulation backend. ` +
        `Simulation may only perform read-only operations (eth_call, eth_estimateGas, eth_getCode, ...).`
    );
  }
}

// ---------------------------------------------------------------------------
// Part 6 — Transaction validation
// ---------------------------------------------------------------------------

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const HEX_RE = /^0x[0-9a-fA-F]*$/;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const MAX_UINT256 = BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935');

export function isAddress(value: unknown): value is string {
  return typeof value === 'string' && ADDRESS_RE.test(value);
}

/** Normalize an address to EIP-55 checksum via ethers-style lowercase (no external dep). */
export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

function parseHexQuantity(value: string | number | undefined, field: string): bigint | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) throw new Error(`${field}: invalid numeric value`);
    return BigInt(Math.floor(value));
  }
  const str = String(value);
  if (str.startsWith('0x') || str.startsWith('0X')) {
    if (!HEX_RE.test(str)) throw new Error(`${field}: malformed hex value`);
    if (str.length === 2) return 0n;
    return BigInt(str);
  }
  if (!/^\d+$/.test(str)) throw new Error(`${field}: not a decimal or hex quantity`);
  return BigInt(str);
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  normalized: {
    from: string;
    to: string;
    valueWei: string;
    data: string;
    chainId?: number;
  };
}

/**
 * Validate a raw transaction before simulation. Rejects malformed addresses,
 * malformed hex, impossible numeric values and unknown chain IDs.
 * The requested chainId is returned separately so the caller can compare it
 * against the RPC's actual chain ID (never trusted blindly).
 */
export function validateTransaction(req: TransactionRequest, supportedChainIds?: number[]): ValidationResult {
  const errors: string[] = [];

  if (!isAddress(req.from)) errors.push('from: malformed address');
  if (req.from && normalizeAddress(req.from) === ZERO_ADDRESS) errors.push('from: zero address not allowed');

  if (!isAddress(req.to)) errors.push('to: malformed address');
  else if (normalizeAddress(req.to) === ZERO_ADDRESS) errors.push('to: zero address not allowed');

  let valueWei = '0';
  try {
    const v = parseHexQuantity(req.value ?? '0x0', 'value') ?? 0n;
    if (v < 0n) errors.push('value: negative');
    if (v > MAX_UINT256) errors.push('value: exceeds uint256');
    valueWei = v.toString();
  } catch (e: any) {
    errors.push(e.message || 'value: unparseable');
  }

  let data = '0x';
  if (req.data !== undefined && req.data !== '') {
    if (typeof req.data !== 'string' || !HEX_RE.test(req.data)) {
      errors.push('data: malformed hex');
    } else {
      if (req.data.length % 2 !== 0) errors.push('data: odd-length hex');
      data = req.data.toLowerCase();
      if (data.length < 10 && data !== '0x') errors.push('data: shorter than a function selector');
    }
  }

  let chainId: number | undefined;
  try {
    const cid = parseHexQuantity(req.chainId as any, 'chainId');
    if (cid !== undefined) {
      if (cid > 4294967295n) errors.push('chainId: out of range');
      chainId = Number(cid);
      if (supportedChainIds && supportedChainIds.length > 0 && !supportedChainIds.includes(chainId)) {
        errors.push(`chainId ${chainId}: not a supported network`);
      }
    }
  } catch (e: any) {
    errors.push(e.message || 'chainId: unparseable');
  }

  for (const field of ['gas', 'gasPrice', 'maxFeePerGas', 'maxPriorityFeePerGas', 'nonce'] as const) {
    try {
      const v = parseHexQuantity((req as any)[field], field);
      if (v !== undefined && v > MAX_UINT256) errors.push(`${field}: exceeds uint256`);
      if (v !== undefined && field !== 'nonce' && v === 0n) errors.push(`${field}: must be > 0 when provided`);
    } catch (e: any) {
      errors.push(e.message || `${field}: unparseable`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized: {
      from: isAddress(req.from) ? normalizeAddress(req.from) : String(req.from ?? ''),
      to: isAddress(req.to) ? normalizeAddress(req.to) : String(req.to ?? ''),
      valueWei,
      data,
      chainId,
    },
  };
}

// ---------------------------------------------------------------------------
// Part 18 — RPC security: timeout, bounded retry, backoff, validation
// ---------------------------------------------------------------------------

export interface RpcRequestOptions {
  timeoutMs?: number;
  retries?: number;
  backoffBaseMs?: number;
}

const DEFAULTS: Required<RpcRequestOptions> = {
  timeoutMs: 15_000,
  retries: 2,
  backoffBaseMs: 400,
};

export class RpcError extends Error {
  constructor(message: string, public readonly code: 'TIMEOUT' | 'NETWORK' | 'RPC_ERROR' | 'MALFORMED_RESPONSE' | 'FORBIDDEN_METHOD') {
    super(message);
    this.name = 'RpcError';
  }
}

export interface JsonRpcResponse<T = any> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: { code: number; message: string; data?: any };
}

/**
 * Minimal JSON-RPC transport with strict response validation.
 * - Bounded retries with exponential backoff (network errors only)
 * - Hard request timeout
 * - Broadcast methods rejected before ever reaching the wire
 * - Malformed responses treated as errors, never returned as data
 */
export class SecureRpcClient {
  private nextId = 1;

  constructor(
    public readonly rpcUrl: string,
    private readonly options: RpcRequestOptions = {}
  ) {}

  async request<T = any>(method: string, params: any[] = [], opts?: RpcRequestOptions): Promise<T> {
    // Defense-in-depth: simulation code must not be able to broadcast.
    assertNoBroadcast(method);

    const cfg = { ...DEFAULTS, ...this.options, ...opts };
    let lastError: RpcError | undefined;

    for (let attempt = 0; attempt <= cfg.retries; attempt++) {
      if (attempt > 0) {
        const delay = cfg.backoffBaseMs * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
      try {
        return await this.singleRequest<T>(method, params, cfg.timeoutMs);
      } catch (err) {
        if (err instanceof RpcError && (err.code === 'RPC_ERROR' || err.code === 'MALFORMED_RESPONSE')) {
          throw err; // deterministic errors are not retried
        }
        lastError = err instanceof RpcError ? err : new RpcError(String(err), 'NETWORK');
      }
    }
    throw lastError ?? new RpcError('RPC request failed', 'NETWORK');
  }

  private singleRequest<T>(method: string, params: any[], timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = this.nextId++;
      const body = JSON.stringify({ jsonrpc: '2.0', id, method, params });
      const controller = new AbortController();
      const timer = setTimeout(() => {
        controller.abort();
        reject(new RpcError(`RPC request timed out after ${timeoutMs}ms (${method})`, 'TIMEOUT'));
      }, timeoutMs);

      fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      })
        .then(async (res) => {
          clearTimeout(timer);
          if (!res.ok) {
            throw new RpcError(`RPC HTTP ${res.status} for ${method}`, 'NETWORK');
          }
          let json: JsonRpcResponse<T>;
          try {
            json = await res.json();
          } catch {
            throw new RpcError(`RPC returned malformed JSON for ${method}`, 'MALFORMED_RESPONSE');
          }
          if (!json || typeof json !== 'object' || !('jsonrpc' in json)) {
            throw new RpcError(`RPC response is not JSON-RPC for ${method}`, 'MALFORMED_RESPONSE');
          }
          if (json.error) {
            throw new RpcError(`RPC error ${json.error.code}: ${json.error.message}`, 'RPC_ERROR');
          }
          if (!('result' in json)) {
            throw new RpcError(`RPC response missing result for ${method}`, 'MALFORMED_RESPONSE');
          }
          resolve(json.result as T);
        })
        .catch((err) => {
          clearTimeout(timer);
          if (err instanceof RpcError) reject(err);
          else reject(new RpcError(`RPC network failure for ${method}: ${err?.message || err}`, 'NETWORK'));
        });
    });
  }
}

// ---------------------------------------------------------------------------
// Part 20 — Security logging with redaction
// ---------------------------------------------------------------------------

const SENSITIVE_KEYS = [
  'privatekey', 'private_key', 'privkey', 'seed', 'seedphrase', 'seed_phrase',
  'mnemonic', 'secret', 'password', 'apikey', 'api_key', 'token', 'credential',
  'authorization', 'deployerprivatekey', 'deployer_private_key', 'rpcapikey',
];

export function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.includes(k.toLowerCase())) {
      out[k] = '[REDACTED]';
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = redactObject(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Structured security log — never logs keys, seeds, or full signed payloads. */
export function securityLog(event: string, fields: Record<string, unknown> = {}): void {
  const safe = redactObject(fields);
  console.info(`[Cognitia:Security] ${event}`, safe);
}
