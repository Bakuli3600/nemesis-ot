import { Interface } from 'ethers';
import { DecodedCalldata, DecodedParam } from '@cognitia/core';
import { isMaxUint256, shortenAddress } from '@cognitia/shared';
import { KNOWN_SELECTORS } from './selectors';

export function decodeCalldata(data: string | undefined): DecodedCalldata {
  if (!data || data === '0x' || data.length < 10) {
    return {
      selector: '0x',
      isKnown: true,
      functionName: 'Native ETH Transfer',
      params: [],
      rawCalldata: data || '0x',
      abiConfidence: 100,
      isDangerousPattern: false,
      notice: 'Standard ETH transfer with empty or negligible calldata.',
    };
  }

  const selector = data.slice(0, 10).toLowerCase();
  const known = KNOWN_SELECTORS[selector];

  if (!known) {
    return {
      selector,
      isKnown: false,
      functionName: 'UNKNOWN FUNCTION',
      params: [],
      rawCalldata: data,
      abiConfidence: 0,
      isDangerousPattern: false,
      notice: 'Cognitia cannot determine the exact contract intent from the available ABI information.',
    };
  }

  try {
    const iface = new Interface([known.abiFragment]);
    const parsed = iface.parseTransaction({ data });
    if (!parsed) throw new Error('Failed to parse calldata');

    const params: DecodedParam[] = [];
    let isDangerousPattern = false;

    for (let i = 0; i < parsed.fragment.inputs.length; i++) {
      const input = parsed.fragment.inputs[i];
      const val = parsed.args[i];
      let humanVal = String(val);

      if (input.type === 'address') {
        humanVal = shortenAddress(val);
      } else if (input.type === 'uint256') {
        if (isMaxUint256(val)) {
          humanVal = 'UNLIMITED (type(uint256).max)';
        }
      }

      params.push({
        name: input.name,
        type: input.type,
        value: val,
        humanReadable: humanVal,
      });
    }

    // Dangerous pattern checks
    if (known.name === 'setApprovalForAll' && parsed.args.approved === true) {
      isDangerousPattern = true;
    }
    if (known.name === 'approve' && isMaxUint256(parsed.args.value)) {
      isDangerousPattern = true;
    }
    if (known.name === 'claimRewards' || known.name === 'claim') {
      // Phishing claim bait pattern
      isDangerousPattern = true;
    }

    return {
      selector,
      isKnown: true,
      functionName: known.name,
      signature: known.signature,
      params,
      rawCalldata: data,
      abiConfidence: 100,
      isDangerousPattern,
    };
  } catch (err: any) {
    return {
      selector,
      isKnown: true,
      functionName: known.name,
      signature: known.signature,
      params: [],
      rawCalldata: data,
      abiConfidence: 50,
      isDangerousPattern: false,
      notice: `Calldata decoding encountered formatting mismatch: ${err.message}`,
    };
  }
}
