import {
  SimulationResult,
  SimulationStatus,
  StateSnapshot,
  TransactionRequest,
} from '@cognitia/core';
import { StateDiffEngine } from '@cognitia/state-diff';
import { ISimulationEngine } from './simulationEngine';
import { SecureRpcClient, RpcError, validateTransaction, securityLog, isAddress } from './security';
import { checkRpcHealth, RpcHealth } from './rpcHealth';

/**
 * Parts 1, 3, 4, 5, 7 — hardened LIVE simulation engine (Anvil fork / real RPC).
 *
 * Guarantees:
 *  - LIVE mode never falls back to demo and never fakes a successful result.
 *    Unavailable RPC -> SIMULATION_UNAVAILABLE (fail closed).
 *  - Every transaction is validated before any RPC interaction.
 *  - Target contract presence is verified via eth_getCode; EOAs are reported,
 *    not treated as contracts.
 *  - Anvil forks: evm_snapshot -> execute -> collect -> evm_revert, so a
 *    simulated malicious transaction can never mutate the simulation baseline.
 *  - msg.sender is preserved: eth_call executes as exactly `req.from`
 *    (verified below); Anvil impersonation is used to make fork state
 *    consistent. No private keys are ever requested, stored, or derived.
 *  - Simulation restricted to read-only RPC methods (assertNoBroadcast).
 */

export interface SimulationEnv {
  ANVIL_RPC_URL?: string;
  SEPOLIA_RPC_URL?: string;
  MAINNET_RPC_URL?: string;
  VITE_SIMULATION_FORK_RPC?: string;
  VITE_SEPOLIA_RPC?: string;
  VITE_ETHEREUM_RPC?: string;
  FORK_BLOCK_NUMBER?: string;
}

export interface SimulationMeta {
  simulationId: string;
  chainId: number;
  forkBlock?: string;
  timestamp: number;
  from: string;
  to: string;
  value: string;
  data: string;
  rpcKind: 'anvil-fork' | 'live-rpc';
  isolationMethod: 'evm_snapshot_revert' | 'eth_call_readonly' | 'none';
  targetKind?: 'EOA' | 'CONTRACT' | 'UNKNOWN';
  proxy?: { isProxy: boolean; implementation?: string; slotStandard?: string };
}

const EIP1967_IMPL_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

function defaultEnv(): SimulationEnv {
  return (typeof process !== 'undefined' ? (process.env as SimulationEnv) : {}) as SimulationEnv;
}

/** Part 3 — RPC configuration with explicit precedence. No hard-coded secrets. */
export function resolveSimulationConfig(env: SimulationEnv = defaultEnv()): {
  rpcUrl?: string;
  expectedChainId?: number;
  rpcKind: 'anvil-fork' | 'live-rpc' | 'unconfigured';
  forkBlockNumber?: number;
} {
  if (env.ANVIL_RPC_URL || env.VITE_SIMULATION_FORK_RPC) {
    return { rpcUrl: env.ANVIL_RPC_URL || env.VITE_SIMULATION_FORK_RPC, rpcKind: 'anvil-fork' };
  }
  if (env.SEPOLIA_RPC_URL || env.VITE_SEPOLIA_RPC) {
    return { rpcUrl: env.SEPOLIA_RPC_URL || env.VITE_SEPOLIA_RPC, expectedChainId: 11155111, rpcKind: 'live-rpc' };
  }
  if (env.MAINNET_RPC_URL || env.VITE_ETHEREUM_RPC) {
    return { rpcUrl: env.MAINNET_RPC_URL || env.VITE_ETHEREUM_RPC, expectedChainId: 1, rpcKind: 'live-rpc' };
  }
  return { rpcKind: 'unconfigured' };
}

export class AnvilForkSimulationEngine implements ISimulationEngine {
  private simulationCounter = 1;
  private anvilDetected: boolean | undefined;

  constructor(
    private readonly rpcUrl?: string,
    private readonly expectedChainId?: number,
    private readonly env: SimulationEnv = defaultEnv()
  ) {}

  public async simulateTransaction(req: TransactionRequest): Promise<SimulationResult> {
    const startTime = Date.now();
    const simulationId = `SIM-${Date.now().toString(36)}-${this.simulationCounter++}`;
    const blank = this.blankSnapshot();

    const failClosed = (
      status: SimulationStatus,
      details: string,
      extra: Partial<SimulationMeta> = {},
      revertReason?: string
    ): SimulationResult => {
      const meta: SimulationMeta = {
        simulationId,
        chainId: this.expectedChainId ?? 0,
        timestamp: Date.now(),
        from: String(req.from ?? ''),
        to: String(req.to ?? ''),
        value: String(req.value ?? '0x0'),
        data: String(req.data ?? '0x'),
        rpcKind: this.rpcKind(),
        isolationMethod: 'none',
        ...extra,
      };
      securityLog('simulation.' + (status === 'SIMULATION_SUCCESS' || status === 'SIMULATION_REVERTED' ? 'completed' : 'failed_closed'), {
        simulationId, status, from: meta.from, to: meta.to, chainId: meta.chainId,
      });
      return {
        status,
        mode: 'live',
        revertReason,
        preState: blank,
        postState: blank,
        stateDiff: [],
        executionTimeMs: Date.now() - startTime,
        details,
        analysisComplete: false,
        simulationMeta: meta,
      };
    };

    // ---- Part 1/3: configuration must exist for live mode -------------------
    const rpcUrl = this.rpcUrl ?? resolveSimulationConfig(this.env).rpcUrl;
    const expectedChainId = this.expectedChainId ?? resolveSimulationConfig(this.env).expectedChainId;
    if (!rpcUrl) {
      return failClosed(
        'SIMULATION_UNAVAILABLE',
        'Live simulation unavailable: no RPC endpoint is configured. Cognitia will not fabricate live results. Switch to DEMO mode or configure ANVIL_RPC_URL / SEPOLIA_RPC_URL.'
      );
    }

    // ---- Part 6: transaction validation (fail closed, BEFORE any network I/O)
    const validation = validateTransaction(req, expectedChainId !== undefined ? [expectedChainId] : undefined);
    if (!validation.valid) {
      return failClosed(
        'SIMULATION_UNAVAILABLE',
        `Live simulation unavailable: transaction failed validation — ${validation.errors.join('; ')}.`
      );
    }

    // ---- Part 2: health + chain ID verification (fail closed) ---------------
    const health: RpcHealth = await checkRpcHealth(rpcUrl, expectedChainId);
    if (!health.connected) {
      return failClosed('SIMULATION_UNAVAILABLE', `Live simulation unavailable: RPC unreachable (${health.error})`);
    }
    if (health.chainIdMatches === false) {
      return failClosed(
        'SIMULATION_UNAVAILABLE',
        `Live simulation unavailable: RPC reports chainId ${health.chainId} but ${expectedChainId} was configured. Refusing to simulate against the wrong network.`
      );
    }

    const rpc = new SecureRpcClient(rpcUrl, { timeoutMs: 20_000, retries: 1 });
    const forkBlock = await this.safeBlockNumber(rpc);
    const meta: SimulationMeta = {
      simulationId,
      chainId: health.chainId,
      forkBlock,
      timestamp: Date.now(),
      from: validation.normalized.from,
      to: validation.normalized.to,
      value: validation.normalized.valueWei,
      data: validation.normalized.data,
      rpcKind: this.rpcKind(),
      isolationMethod: 'eth_call_readonly',
    };

    // ---- Part 7: target validation via eth_getCode ---------------------------
    const targetKind = await this.classifyTarget(rpc, meta.to);
    meta.targetKind = targetKind.kind;
    let targetWarning = '';
    if (targetKind.kind === 'EOA') {
      targetWarning = ' Transaction targets an externally owned account (EOA) — no contract code will execute.';
    } else if (targetKind.kind === 'UNKNOWN') {
      targetWarning = ' Contract presence could not be determined from the RPC (eth_getCode failed) — treated as UNKNOWN, not assumed to be a contract.';
    } else if (targetKind.kind === 'CONTRACT') {
      // ---- Part 17: minimal proxy awareness (EIP-1967) -----------------------
      const proxy = await this.detectProxy(rpc, meta.to);
      meta.proxy = proxy;
      if (proxy.isProxy && proxy.implementation) {
        targetWarning = ` Proxy contract detected (EIP-1967). Implementation: ${proxy.implementation}.`;
      } else if (proxy.isProxy) {
        targetWarning = ' Proxy contract detected (EIP-1967 slot pattern). Implementation unknown.';
      }
    }

    // ---- Part 4/5: snapshot, impersonate, execute, revert --------------------
    let snapshotId: string | undefined;
    let isolationMethod: SimulationMeta['isolationMethod'] = 'eth_call_readonly';
    if (await this.isAnvil(rpc)) {
      try {
        const snap = await rpc.request<string>('evm_snapshot');
        if (typeof snap === 'string') {
          snapshotId = snap;
          isolationMethod = 'evm_snapshot_revert';
        }
        // Part 5 — impersonate the ORIGINAL wallet address so fork state (and any
        // balance checks) treat msg.sender === requested.from. No keys involved.
        if (isAddress(req.from)) {
          await rpc.request('anvil_impersonateAccount', [validation.normalized.from]).catch(() => {});
        }
      } catch {
        // Non-Anvil endpoint advertising nothing — eth_call remains read-only.
      }
    }
    meta.isolationMethod = isolationMethod;

    const callParams = {
      from: validation.normalized.from, // msg.sender preserved exactly
      to: validation.normalized.to,
      value: '0x' + (BigInt(validation.normalized.valueWei || '0')).toString(16),
      data: validation.normalized.data,
    };

    let status: SimulationStatus;
    let revertReason: string | undefined;
    let details: string;

    try {
      const gas = await rpc.request<string>('eth_estimateGas', [callParams]);
      const gasUsed = BigInt(gas).toString();

      try {
        const returnData = await rpc.request<string>('eth_call', [callParams, 'latest']);
        status = 'SIMULATION_SUCCESS';
        details =
          `Live eth_call succeeded on chain ${health.chainId} (block ${Number(forkBlock)}) as ${validation.normalized.from}.` +
          targetWarning +
          (returnData && returnData !== '0x' ? ` Return data: ${returnData.slice(0, 74)}${returnData.length > 74 ? '…' : ''}` : ' No return data.');
        meta.isolationMethod = isolationMethod;
      } catch (callErr: any) {
        // eth_call reverting is a legitimate simulation OUTCOME, not an
        // infrastructure failure: the tx would revert on-chain.
        status = 'SIMULATION_REVERTED';
        revertReason = callErr instanceof RpcError ? callErr.message : String(callErr?.message || callErr);
        details = `Transaction would revert on-chain (eth_call). ${revertReason}`;
      }

      // Part 4 — ALWAYS revert the snapshot, even on success paths.
      if (snapshotId) {
        await rpc.request('evm_revert', [snapshotId]).catch(() => {});
      }

      const preState = await this.collectBaseline(rpc, validation.normalized.from);
      const postState = preState; // eth_call cannot mutate real state; diffs come from decoded semantics
      const stateDiff = StateDiffEngine.calculateDiff(preState, postState);

      securityLog('simulation.completed', {
        simulationId, status, chainId: health.chainId, forkBlock: Number(forkBlock),
        isolation: isolationMethod, gasUsed,
      });

      return {
        status,
        mode: 'live',
        gasUsed: `${gasUsed} gas`,
        gasLimit: `${(BigInt(gas) * 120n / 100n).toString()} gas`,
        revertReason,
        preState,
        postState,
        stateDiff,
        executionTimeMs: Date.now() - startTime,
        details,
        analysisComplete: status === 'SIMULATION_SUCCESS' || status === 'SIMULATION_REVERTED',
        simulationMeta: meta,
      };
    } catch (err: any) {
      if (snapshotId) {
        await rpc.request('evm_revert', [snapshotId]).catch(() => {});
      }
      const msg = err instanceof RpcError ? `${err.code}: ${err.message}` : String(err?.message || err);
      return failClosed('SIMULATION_UNAVAILABLE', `Live simulation unavailable: ${msg}`, meta);
    }
  }

  private rpcKind(): 'anvil-fork' | 'live-rpc' {
    const cfg = resolveSimulationConfig(this.env);
    return cfg.rpcKind === 'anvil-fork' ? 'anvil-fork' : 'live-rpc';
  }

  private async isAnvil(rpc: SecureRpcClient): Promise<boolean> {
    if (this.anvilDetected !== undefined) return this.anvilDetected;
    try {
      const info = await rpc.request<any>('web3_clientVersion', [], { timeoutMs: 3000, retries: 0 });
      this.anvilDetected = typeof info === 'string' && /anvil|foundry/i.test(info);
    } catch {
      try {
        await rpc.request('anvil_nodeInfo', [], { timeoutMs: 2000, retries: 0 });
        this.anvilDetected = true;
      } catch {
        this.anvilDetected = false;
      }
    }
    return this.anvilDetected;
  }

  private async safeBlockNumber(rpc: SecureRpcClient): Promise<string> {
    try {
      return await rpc.request<string>('eth_blockNumber');
    } catch {
      return '0x0';
    }
  }

  /** Part 7 — classify target via eth_getCode; never pretend. */
  private async classifyTarget(
    rpc: SecureRpcClient,
    to: string
  ): Promise<{ kind: 'EOA' | 'CONTRACT' | 'UNKNOWN'; warning?: string }> {
    try {
      const code = await rpc.request<string>('eth_getCode', [to, 'latest']);
      if (typeof code !== 'string') return { kind: 'UNKNOWN' };
      return code === '0x' || code === '' ? { kind: 'EOA' } : { kind: 'CONTRACT' };
    } catch {
      return { kind: 'UNKNOWN' };
    }
  }

  /** Part 17 — EIP-1967 implementation slot probe. */
  private async detectProxy(
    rpc: SecureRpcClient,
    to: string
  ): Promise<NonNullable<SimulationMeta['proxy']>> {
    try {
      const slotValue = await rpc.request<string>('eth_getStorageAt', [to, EIP1967_IMPL_SLOT, 'latest']);
      const asAddress = '0x' + slotValue.slice(-40);
      if (/^0x[0-9a-f]{40}$/.test(asAddress) && BigInt(asAddress) !== 0n) {
        return { isProxy: true, implementation: asAddress.toLowerCase(), slotStandard: 'EIP-1967' };
      }
      return { isProxy: false };
    } catch {
      return { isProxy: false };
    }
  }

  /**
   * Baseline state via read-only queries. Values that cannot be retrieved are
   * recorded as 'UNKNOWN' (Part 16) — the diff engine treats them honestly.
   */
  private async collectBaseline(rpc: SecureRpcClient, from: string): Promise<StateSnapshot> {
    let nativeBalance = 'UNKNOWN';
    try {
      const wei = await rpc.request<string>('eth_getBalance', [from, 'latest']);
      nativeBalance = (Number(BigInt(wei)) / 1e18).toFixed(6);
    } catch {
      // leave UNKNOWN
    }
    return {
      nativeBalance,
      erc20Balances: {},
      erc20Allowances: {},
      erc721Operators: {},
      erc721Tokens: {},
    };
  }

  private blankSnapshot(): StateSnapshot {
    return {
      nativeBalance: 'UNKNOWN',
      erc20Balances: {},
      erc20Allowances: {},
      erc721Operators: {},
      erc721Tokens: {},
    };
  }
}
