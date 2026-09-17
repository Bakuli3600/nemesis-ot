import { describe, it, expect } from 'vitest';
import { decodeCalldata, decodeSignature } from '@cognitia/decoder';
import { SignatureRequest } from '@cognitia/core';

describe('Calldata & Signature Decoder', () => {
  it('decodes standard ETH transfer with empty calldata', () => {
    const result = decodeCalldata('0x');
    expect(result.functionName).toBe('Native ETH Transfer');
    expect(result.isKnown).toBe(true);
    expect(result.isDangerousPattern).toBe(false);
  });

  it('decodes unlimited ERC-20 approval as dangerous pattern', () => {
    // approve(0x8888888888888888888888888888888888888888, type(uint256).max)
    const calldata = '0x095ea7b30000000000000000000000008888888888888888888888888888888888888888ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const result = decodeCalldata(calldata);
    expect(result.functionName).toBe('approve');
    expect(result.isDangerousPattern).toBe(true);
    expect(result.params[1]?.humanReadable).toContain('UNLIMITED');
  });

  it('decodes ERC-721 setApprovalForAll(operator, true) as dangerous pattern', () => {
    // setApprovalForAll(0x6666666666666666666666666666666666666666, true)
    const calldata = '0xa22cb46500000000000000000000000066666666666666666666666666666666666666660000000000000000000000000000000000000000000000000000000000000001';
    const result = decodeCalldata(calldata);
    expect(result.functionName).toBe('setApprovalForAll');
    expect(result.isDangerousPattern).toBe(true);
  });

  it('handles unknown function selectors gracefully', () => {
    const result = decodeCalldata('0x12345678abcdef0000');
    expect(result.isKnown).toBe(false);
    expect(result.functionName).toBe('UNKNOWN FUNCTION');
    expect(result.notice).toContain('Cognitia cannot determine the exact contract intent');
  });

  it('flags eth_sign as critical blind signature', () => {
    const req: SignatureRequest = {
      id: 'CNG-2026-000001',
      type: 'SIGNATURE',
      method: 'eth_sign',
      origin: 'malicious.xyz',
      timestamp: Date.now(),
      from: '0x5534a781298715EdfB42542a9b6d6168954de012',
      rawPayload: ['0x5534a781298715EdfB42542a9b6d6168954de012', '0x1234'],
    };
    const result = decodeSignature(req);
    expect(result.standard).toBe('ETH_SIGN');
    expect(result.isDangerousPattern).toBe(true);
  });

  it('decodes EIP-712 Permit signatures and warns of off-chain allowance grant', () => {
    const req: SignatureRequest = {
      id: 'CNG-2026-000002',
      type: 'SIGNATURE',
      method: 'eth_signTypedData_v4',
      origin: 'uniswap-permit.xyz',
      timestamp: Date.now(),
      from: '0x5534a781298715EdfB42542a9b6d6168954de012',
      primaryType: 'Permit',
      domain: {
        name: 'USD Coin',
        verifyingContract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      },
      message: {
        owner: '0x5534a781298715EdfB42542a9b6d6168954de012',
        spender: '0x8888888888888888888888888888888888888888',
        value: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
        deadline: '1799999999',
      },
      rawPayload: {},
    };
    const result = decodeSignature(req);
    expect(result.standard).toBe('EIP_712');
    expect(result.isDangerousPattern).toBe(true);
    expect(result.notice).toContain('off-chain Permit authorization');
  });
});
