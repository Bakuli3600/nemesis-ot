import { JsonRpcProvider } from 'ethers';
import { SimulationResult, StateSnapshot, TransactionRequest } from '@cognitia/core';
import { getChainConfig } from '@cognitia/shared';
import { ISimulationEngine } from './simulationEngine';

export class RealRpcSimulationEngine implements ISimulationEngine {
  private rpcUrl: string;

  constructor(rpcUrl?: string, chainId?: number) {
    this.rpcUrl = rpcUrl || getChainConfig(chainId).rpcUrl;
  }

  public async simulateTransaction(req: TransactionRequest): Promise<SimulationResult> {
    const startTime = Date.now();
    const blankState: StateSnapshot = {
      nativeBalance: '0',
      erc20Balances: {},
      erc20Allowances: {},
      erc721Operators: {},
      erc721Tokens: {},
    };

    try {
      const provider = new JsonRpcProvider(this.rpcUrl);
      
      // Perform eth_call dry-run (simulation without broadcasting)
      const callResult = await provider.call({
        from: req.from,
        to: req.to,
        value: req.value || '0x0',
        data: req.data || '0x',
      });

      // Perform gas estimate
      const gasEstimate = await provider.estimateGas({
        from: req.from,
        to: req.to,
        value: req.value || '0x0',
        data: req.data || '0x',
      });

      return {
        status: 'SIMULATION_SUCCESS',
        mode: 'live',
        gasUsed: `${gasEstimate.toString()} gas`,
        gasLimit: `${(gasEstimate * 120n / 100n).toString()} gas`,
        preState: blankState,
        postState: blankState,
        stateDiff: [],
        executionTimeMs: Date.now() - startTime,
        details: `Live simulation successful via eth_call on ${this.rpcUrl}. Return data: ${callResult.slice(0, 18)}...`,
      };
    } catch (err: any) {
      return {
        status: 'SIMULATION_REVERTED',
        mode: 'live',
        revertReason: err.message || 'Execution reverted during simulation dry-run',
        preState: blankState,
        postState: blankState,
        stateDiff: [],
        executionTimeMs: Date.now() - startTime,
        details: `Transaction would revert on-chain: ${err.message}`,
      };
    }
  }
}
