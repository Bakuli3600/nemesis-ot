import { DecodedCalldata, SimulationResult, StateSnapshot, TransactionRequest } from '@cognitia/core';
import { StateDiffEngine } from '@cognitia/state-diff';
import { ISimulationEngine } from './simulationEngine';

export class DemoSimulationEngine implements ISimulationEngine {
  public async simulateTransaction(req: TransactionRequest): Promise<SimulationResult> {
    const startTime = Date.now();
    const to = (req.to || '').toLowerCase();
    const data = (req.data || '0x').toLowerCase();
    const value = req.value || '0';

    // Base initial state
    const preState: StateSnapshot = {
      nativeBalance: '2.3150',
      erc20Balances: {
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': '14500.00', // USDC
      },
      erc20Allowances: {
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {},
      },
      erc721Operators: {
        '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d': {}, // BAYC
      },
      erc721Tokens: {
        '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d': ['#4819'],
      },
    };

    // Clone preState into postState
    const postState: StateSnapshot = JSON.parse(JSON.stringify(preState));

    // SCENARIO 1: Safe Token Transfer / Native ETH
    if (data === '0x' || data === '' || data.startsWith('0xa9059cbb')) {
      const sendEth = parseFloat(value) > 0 ? (Number(BigInt(value)) / 1e18) : 0.01;
      const current = parseFloat(postState.nativeBalance);
      postState.nativeBalance = Math.max(0, current - sendEth).toFixed(4);

      const stateDiff = StateDiffEngine.calculateDiff(preState, postState);
      return {
        status: 'SIMULATION_SUCCESS',
        mode: 'demo',
        gasUsed: '21,000 gas',
        gasLimit: '35,000 gas',
        preState,
        postState,
        stateDiff,
        executionTimeMs: Date.now() - startTime + 80,
        details: 'Simulated standard transaction. State changes reflect expected outbound transfer.',
      };
    }

    // SCENARIO 2: Normal ERC-20 Approval (e.g. 50 USDC)
    if (data.startsWith('0x095ea7b3') && !data.includes('ffffffffffffffffffffffffffffffff')) {
      const spender = '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45';
      postState.erc20Allowances['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'][spender] = '50.00 USDC';
      const stateDiff = StateDiffEngine.calculateDiff(preState, postState);
      return {
        status: 'SIMULATION_SUCCESS',
        mode: 'demo',
        gasUsed: '45,210 gas',
        preState,
        postState,
        stateDiff,
        executionTimeMs: Date.now() - startTime + 95,
        details: 'Simulated limited ERC-20 approval for 50.00 USDC.',
      };
    }

    // SCENARIO 3: Unlimited ERC-20 Approval
    if (data.startsWith('0x095ea7b3') && data.includes('ffffffffffffffffffffffffffffffff')) {
      const spender = '0x8888888888888888888888888888888888888888';
      postState.erc20Allowances['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'][spender] = 'Unlimited';
      const stateDiff = StateDiffEngine.calculateDiff(preState, postState);
      return {
        status: 'SIMULATION_SUCCESS',
        mode: 'demo',
        gasUsed: '46,120 gas',
        preState,
        postState,
        stateDiff,
        executionTimeMs: Date.now() - startTime + 110,
        details: 'Simulated unlimited approval. Spender gains unbounded ability to transfer token balance.',
      };
    }

    // SCENARIO 4: NFT setApprovalForAll
    if (data.startsWith('0xa22cb465')) {
      const operator = '0x6666666666666666666666666666666666666666';
      postState.erc721Operators['0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d'][operator] = true;
      const stateDiff = StateDiffEngine.calculateDiff(preState, postState);
      return {
        status: 'SIMULATION_SUCCESS',
        mode: 'demo',
        gasUsed: '48,340 gas',
        preState,
        postState,
        stateDiff,
        executionTimeMs: Date.now() - startTime + 120,
        details: 'Simulated NFT collection operator escalation. Operator granted full collection transfer rights.',
      };
    }

    // SCENARIO 5: Malicious Reward Claim (FakeRewards.sol trigger)
    if (data.startsWith('0x379607f5') || data.startsWith('0x4e71d92d') || to.includes('7777777777777777777777777777777777777777')) {
      // Secretly sets operator approval for drainer
      const operator = '0x6666666666666666666666666666666666666666';
      postState.erc721Operators['0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d'][operator] = true;
      postState.erc721Tokens['0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d'] = []; // NFT drained
      postState.nativeBalance = '0.0410'; // ETH drained
      const stateDiff = StateDiffEngine.calculateDiff(preState, postState);
      return {
        status: 'SIMULATION_SUCCESS',
        mode: 'demo',
        gasUsed: '112,400 gas',
        preState,
        postState,
        stateDiff,
        executionTimeMs: Date.now() - startTime + 140,
        details: 'Simulated execution trace shows covert operator approval trigger and subsequent asset drain.',
      };
    }

    // SCENARIO 6: Suspicious Multicall
    if (data.startsWith('0x5ae401dc') || data.startsWith('0xac9650d8')) {
      const spender = '0x8888888888888888888888888888888888888888';
      postState.erc20Allowances['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'][spender] = 'Unlimited';
      const stateDiff = StateDiffEngine.calculateDiff(preState, postState);
      return {
        status: 'SIMULATION_SUCCESS',
        mode: 'demo',
        gasUsed: '89,500 gas',
        preState,
        postState,
        stateDiff,
        executionTimeMs: Date.now() - startTime + 105,
        details: 'Multicall bundles multiple hidden sub-calls including high-allowance escalation.',
      };
    }

    // SCENARIO 8: Unknown Function Fallback
    const stateDiff = StateDiffEngine.calculateDiff(preState, postState);
    return {
      status: 'SIMULATION_SUCCESS',
      mode: 'demo',
      gasUsed: '63,100 gas',
      preState,
      postState,
      stateDiff,
      executionTimeMs: Date.now() - startTime + 90,
      details: 'Simulated execution completed with no immediate balance change, but unverified bytecode execution.',
    };
  }
}
