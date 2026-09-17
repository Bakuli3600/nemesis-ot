import { describe, it, expect } from 'vitest';
import { StateDiffEngine } from '@cognitia/state-diff';
import { ThreatIntelEngine } from '@cognitia/threat-intel';
import { DemoThreatRelay, ThreatExposureEngine } from '@cognitia/exposure';
import { decodeCalldata } from '@cognitia/decoder';
import { StateSnapshot } from '@cognitia/core';

describe('Advanced Integration Tests', () => {
  it('detects ERC-1155 approval and safeBatchTransferFrom', () => {
    const approvalData = '0xa22cb46500000000000000000000000066666666666666666666666666666666666666660000000000000000000000000000000000000000000000000000000000000001';
    const decodedApproval = decodeCalldata(approvalData);
    expect(decodedApproval.functionName).toBe('setApprovalForAll');
    expect(decodedApproval.isDangerousPattern).toBe(true);

    const batchTransferData = '0x2eb2c2d6';
    const decodedBatch = decodeCalldata(batchTransferData);
    expect(decodedBatch.functionName).toBe('safeBatchTransferFrom');
  });

  it('calculates comprehensive state diffs across assets and operators', () => {
    const pre: StateSnapshot = {
      nativeBalance: '2.5000',
      erc20Balances: { '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': '1000' },
      erc20Allowances: {},
      erc721Operators: { '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d': {} },
      erc721Tokens: { '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d': ['#1', '#2'] },
    };

    const post: StateSnapshot = {
      nativeBalance: '0.1000',
      erc20Balances: { '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': '0' },
      erc20Allowances: {
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { '0x8888888888888888888888888888888888888888': 'Unlimited' },
      },
      erc721Operators: {
        '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d': { '0x6666666666666666666666666666666666666666': true },
      },
      erc721Tokens: { '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d': [] },
    };

    const diffs = StateDiffEngine.calculateDiff(pre, post);
    expect(diffs.length).toBe(4); // ETH balance, token allowance, operator approval, NFT loss
    const criticals = diffs.filter((d) => d.severity === 'CRITICAL');
    expect(criticals.length).toBeGreaterThanOrEqual(3);
  });

  it('runs ThreatExposureEngine and simulates routing hops', async () => {
    const exposureEngine = new ThreatExposureEngine(new DemoThreatRelay());
    const report = await exposureEngine.getExposureReport('0x7777777777777777777777777777777777777777');
    expect(report.isSimulated).toBe(true);
    expect(report.records.length).toBeGreaterThan(0);
    expect(report.route.length).toBeGreaterThan(2);
    expect(report.highestSeverity).toBe('CRITICAL');
  });

  it('matches threat indicators from threat database', () => {
    const intel = new ThreatIntelEngine();
    const result = intel.checkAddress('0xd8da6bf26964af9ded9e03e53415d37aa96045');
    expect(result.isKnownThreat).toBe(true);
    expect(result.threatFamily).toBe('SUSPICIOUS_OPERATOR');
  });
});
