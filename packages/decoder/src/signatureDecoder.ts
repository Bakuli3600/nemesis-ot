import { DecodedSignature, SignatureRequest } from '@cognitia/core';
import { isMaxUint256, shortenAddress } from '@cognitia/shared';

export function decodeSignature(req: SignatureRequest): DecodedSignature {
  const method = req.method;

  if (method === 'eth_sign') {
    return {
      method,
      standard: 'ETH_SIGN',
      humanReadableText: 'BLIND ARBITRARY HASH SIGNATURE (eth_sign)',
      isDangerousPattern: true,
      notice: '⚠️ eth_sign allows malicious dApps to sign arbitrary transactions or data that can drain assets without user visibility.',
      confidence: 100,
    };
  }

  if (method === 'personal_sign') {
    let decodedText = '';
    const raw = req.rawPayload;
    const hex = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';
    
    if (typeof hex === 'string' && hex.startsWith('0x')) {
      try {
        const bytes = [];
        for (let i = 2; i < hex.length; i += 2) {
          bytes.push(parseInt(hex.slice(i, i + 2), 16));
        }
        decodedText = new TextDecoder().decode(new Uint8Array(bytes));
      } catch {
        decodedText = hex;
      }
    } else {
      decodedText = String(hex || '');
    }

    // Check for phishing keywords in message
    const lower = decodedText.toLowerCase();
    const isSuspicious =
      lower.includes('permit') ||
      lower.includes('approval') ||
      lower.includes('ownership') ||
      lower.includes('drain') ||
      lower.includes('claim reward');

    return {
      method,
      standard: 'PERSONAL_SIGN',
      humanReadableText: decodedText,
      isDangerousPattern: isSuspicious,
      notice: isSuspicious
        ? '⚠️ This personal sign message contains authorization or claim language commonly found in phishing prompts.'
        : undefined,
      confidence: 85,
    };
  }

  // EIP-712 Typed Data
  if (method === 'eth_signTypedData' || method === 'eth_signTypedData_v3' || method === 'eth_signTypedData_v4') {
    const domain = req.domain || {};
    const primaryType = req.primaryType || 'EIP712Domain';
    const msg = req.message || {};
    let isDangerousPattern = false;
    let notice = '';
    let permitSpender = '';
    let permitAmount = '';
    let permitDeadline = '';

    const isPermitType =
      primaryType.toLowerCase().includes('permit') ||
      Boolean(msg.spender || msg.operator);

    if (isPermitType) {
      isDangerousPattern = true;
      permitSpender = msg.spender || msg.operator || '';
      permitAmount = msg.value ? String(msg.value) : msg.allowed ? 'Unlimited' : '';
      permitDeadline = msg.deadline ? String(msg.deadline) : '';

      const spenderDisplay = shortenAddress(permitSpender);
      const isUnlimited = isMaxUint256(permitAmount) || permitAmount.toLowerCase() === 'unlimited';
      const amountDisplay = isUnlimited ? 'effectively UNLIMITED tokens' : `${permitAmount} tokens`;

      notice = `⚠️ This signature grants ${spenderDisplay} permission to move ${amountDisplay} directly from your wallet via off-chain Permit authorization.`;
    }

    return {
      method,
      standard: 'EIP_712',
      domain,
      verifyingContract: domain.verifyingContract,
      primaryType,
      permitSpender,
      permitAmount,
      permitDeadline,
      isDangerousPattern,
      notice: notice || 'EIP-712 structured data signature.',
      confidence: 95,
    };
  }

  return {
    method,
    standard: 'UNKNOWN',
    humanReadableText: JSON.stringify(req.rawPayload),
    isDangerousPattern: false,
    confidence: 30,
  };
}
