import { describe, it, expect } from 'vitest';
import { RiskEngine } from '@cognitia/risk-engine';
import { decodeCalldata } from '@cognitia/decoder';
import { ThreatIntelEngine } from '@cognitia/threat-intel';
import { TransactionRequest } from '@cognitia/core';

describe('Deterministic Risk Engine', () => {
  const intelEngine = new ThreatIntelEngine();

  it('assigns LOW risk score to safe ETH transfer', () => {
    const req: TransactionRequest = {
      id: 'CNG-2026-000001',
      type: 'TRANSACTION',
      method: 'eth_sendTransaction',
      origin: 'app.safe.com',
      timestamp: Date.now(),
      from: '0x5534a781298715edfb42542a9b6d6168954de012',
      to: '0x1111111111111111111111111111111111111111',
      value: '0x2386f26fc10000', // 0.01 ETH
      data: '0x',
    };

    const decoded = decodeCalldata(req.data);
    const intel = intelEngine.checkAddress(req.to);
    const report = RiskEngine.calculateRisk(req, decoded, undefined, [], intel);

    expect(report.severity).toBe('LOW');
    expect(report.score).toBeLessThanOrEqual(20);
    expect(report.recommendedDecision).toBe('CONTINUE');
  });

  it('assigns CRITICAL risk score to NFT setApprovalForAll and known drainer operator', () => {
    const req: TransactionRequest = {
      id: 'CNG-2026-000002',
      type: 'TRANSACTION',
      method: 'eth_sendTransaction',
      origin: 'fake-airdrop.xyz',
      timestamp: Date.now(),
      from: '0x5534a781298715edfb42542a9b6d6168954de012',
      to: '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d', // BAYC
      data: '0xa22cb46500000000000000000000000066666666666666666666666666666666666666660000000000000000000000000000000000000000000000000000000000000001',
    };

    const decoded = decodeCalldata(req.data);
    // Checking drainer operator 0x6666...
    const intel = intelEngine.checkAddress('0x6666666666666666666666666666666666666666');
    const report = RiskEngine.calculateRisk(req, decoded, undefined, [], intel);

    expect(report.severity).toBe('CRITICAL');
    expect(report.score).toBeGreaterThanOrEqual(71);
    expect(report.recommendedDecision).toBe('BLOCK');
    expect(report.findings.length).toBeGreaterThanOrEqual(2);
  });
});
