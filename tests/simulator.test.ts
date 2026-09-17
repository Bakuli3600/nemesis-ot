import { describe, it, expect } from 'vitest';
import { DemoSimulationEngine } from '@cognitia/simulator';
import { TransactionRequest } from '@cognitia/core';

describe('Simulation Engine', () => {
  const sim = new DemoSimulationEngine();

  it('simulates safe transfer without state drain', async () => {
    const req: TransactionRequest = {
      id: 'CNG-2026-000001',
      type: 'TRANSACTION',
      method: 'eth_sendTransaction',
      origin: 'demo.local',
      timestamp: Date.now(),
      from: '0x5534a781298715edfb42542a9b6d6168954de012',
      to: '0x1234567890123456789012345678901234567890',
      value: '0x2386f26fc10000',
      data: '0x',
    };

    const res = await sim.simulateTransaction(req);
    expect(res.status).toBe('SIMULATION_SUCCESS');
    expect(res.mode).toBe('demo');
    expect(res.stateDiff.length).toBe(1);
    expect(res.stateDiff[0]?.assetName).toBe('Ethereum');
  });

  it('simulates malicious claim and captures operator escalation state diff', async () => {
    const req: TransactionRequest = {
      id: 'CNG-2026-000002',
      type: 'TRANSACTION',
      method: 'eth_sendTransaction',
      origin: 'scam-claim.xyz',
      timestamp: Date.now(),
      from: '0x5534a781298715edfb42542a9b6d6168954de012',
      to: '0x7777777777777777777777777777777777777777',
      data: '0x379607f5', // claimRewards()
    };

    const res = await sim.simulateTransaction(req);
    expect(res.status).toBe('SIMULATION_SUCCESS');
    const operatorDiff = res.stateDiff.find((d) => d.assetType === 'OPERATOR_APPROVAL');
    expect(operatorDiff).toBeDefined();
    expect(operatorDiff?.after).toBe('TRUE (Approved)');
    expect(operatorDiff?.severity).toBe('CRITICAL');
  });
});
