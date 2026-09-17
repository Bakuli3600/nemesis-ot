import { SecureRpcClient, RpcError } from './security';

/**
 * Part 2 — RPC health verification.
 *
 * Never assume the RPC URL corresponds to the configured network:
 * eth_chainId is queried and COMPARED against the expected chain ID.
 * A mismatch is a hard failure, not a warning.
 */
export interface RpcHealth {
  connected: boolean;
  chainId: number;
  chainIdHex: string;
  expectedChainId?: number;
  chainIdMatches?: boolean;
  latestBlock: string;
  latencyMs: number;
  mode: 'live';
  error?: string;
  errorCode?: 'TIMEOUT' | 'NETWORK' | 'RPC_ERROR' | 'MALFORMED_RESPONSE';
}

function parseHexQuantity(value: string): number {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]+$/.test(value)) {
    throw new RpcError(`Malformed quantity response: ${String(value)}`, 'MALFORMED_RESPONSE');
  }
  return Number(BigInt(value));
}

export async function checkRpcHealth(rpcUrl: string, expectedChainId?: number, timeoutMs = 8000): Promise<RpcHealth> {
  const client = new SecureRpcClient(rpcUrl, { timeoutMs, retries: 1 });
  const start = Date.now();

  try {
    const chainIdHex = await client.request<string>('eth_chainId');
    const chainId = parseHexQuantity(chainIdHex);

    // Optional extra validation — block number must parse as a quantity.
    const latestBlockHex = await client.request<string>('eth_blockNumber');
    parseHexQuantity(latestBlockHex);

    const latencyMs = Date.now() - start;

    if (expectedChainId !== undefined && chainId !== expectedChainId) {
      return {
        connected: true,
        chainId,
        chainIdHex,
        expectedChainId,
        chainIdMatches: false,
        latestBlock: latestBlockHex,
        latencyMs,
        mode: 'live',
        error: `RPC reports chainId ${chainId} but ${expectedChainId} was configured — refusing to simulate against the wrong network.`,
        errorCode: 'RPC_ERROR',
      };
    }

    return {
      connected: true,
      chainId,
      chainIdHex,
      expectedChainId,
      chainIdMatches: true,
      latestBlock: latestBlockHex,
      latencyMs,
      mode: 'live',
    };
  } catch (err: any) {
    const isRpcErr = err instanceof RpcError;
    return {
      connected: false,
      chainId: expectedChainId ?? 0,
      chainIdHex: '0x0',
      expectedChainId,
      latestBlock: '0x0',
      latencyMs: Date.now() - start,
      mode: 'live',
      error: isRpcErr ? err.message : String(err?.message || err),
      errorCode: isRpcErr
        ? err.code === 'FORBIDDEN_METHOD'
          ? 'RPC_ERROR'
          : err.code
        : 'NETWORK',
    };
  }
}
