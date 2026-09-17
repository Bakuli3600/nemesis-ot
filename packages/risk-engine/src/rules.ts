import { DecodedCalldata, DecodedSignature, SecurityFinding, StateDiffItem, ThreatIntelResult, WalletRequest } from '@cognitia/core';

export class SecurityRuleSet {
  public static evaluate(
    request: WalletRequest,
    decodedCall?: DecodedCalldata,
    decodedSig?: DecodedSignature,
    stateDiffs: StateDiffItem[] = [],
    threatIntel?: ThreatIntelResult
  ): SecurityFinding[] {
    const findings: SecurityFinding[] = [];

    // 1. EVALUATE THREAT INTELLIGENCE MATCHES
    if (threatIntel && threatIntel.isKnownThreat) {
      findings.push({
        id: 'RULE-THREAT-INTEL-MATCH',
        severity: 'CRITICAL',
        title: `Known Malicious Threat Entity (${threatIntel.threatFamily || 'DRAINER'})`,
        technicalReason: `Address matched confirmed threat database entry: ${threatIntel.details}`,
        humanExplanation: '🚨 This destination or operator address is a confirmed malicious drainer recorded in global threat feeds.',
        evidence: `Threat Family: ${threatIntel.threatFamily} | Source: ${threatIntel.source}`,
        confidence: 99,
        recommendedAction: 'BLOCK REQUEST IMMEDIATELY. Do not interact.',
        scoreContribution: 40,
      });
    }

    // 2. EVALUATE CALLDATA RULES
    if (decodedCall) {
      // Check: setApprovalForAll
      if (decodedCall.functionName === 'setApprovalForAll' && decodedCall.isDangerousPattern) {
        findings.push({
          id: 'RULE-NFT-SET-APPROVAL-FOR-ALL',
          severity: 'CRITICAL',
          title: 'Collection-wide NFT Operator Approval',
          technicalReason: 'setApprovalForAll(operator, true) grants complete transfer authority over all ERC-721/1155 tokens in collection',
          humanExplanation: '⚠️ This request gives another address permission to transfer every NFT from this collection that your wallet owns.',
          evidence: `Selector: ${decodedCall.selector} | Operator: ${decodedCall.params[0]?.humanReadable || 'Unknown'}`,
          confidence: 98,
          recommendedAction: 'Block this request unless you explicitly intend to authorize a trusted marketplace.',
          scoreContribution: 35,
        });
      }

      // Check: Unlimited ERC-20 approval
      if (decodedCall.functionName === 'approve' && decodedCall.isDangerousPattern) {
        findings.push({
          id: 'RULE-ERC20-UNLIMITED-APPROVE',
          severity: 'CRITICAL',
          title: 'Unlimited Token Spending Approval',
          technicalReason: 'approve(spender, 2^256-1) grants unlimited spending allowance to external contract',
          humanExplanation: '⚠️ This approval grants the spender permission to move tokens up to an effectively unlimited amount.',
          evidence: `Spender: ${decodedCall.params[0]?.humanReadable || 'Unknown'} | Value: Unlimited`,
          confidence: 95,
          recommendedAction: 'Block this request or reduce the approval amount to only the exact required quantity.',
          scoreContribution: 30,
        });
      }

      // Check: Deceptive Claim / Phishing Bait
      if (decodedCall.functionName === 'claimRewards' || decodedCall.functionName === 'claim') {
        findings.push({
          id: 'RULE-DECEPTIVE-CLAIM-PATTERN',
          severity: 'HIGH',
          title: 'Deceptive Phishing Claim Invocation',
          technicalReason: 'Transaction invokes a claim function frequently tied to deceptive phishing honeypots',
          humanExplanation: '⚠️ This request mimics an airdrop reward claim. Phishing sites frequently use this function to camouflage permission grants.',
          evidence: `Selector: ${decodedCall.selector} (${decodedCall.functionName})`,
          confidence: 90,
          recommendedAction: 'Verify that the claim contract is verified and officially published by the project team.',
          scoreContribution: 25,
        });
      }

      // Check: Unknown function selector
      if (!decodedCall.isKnown) {
        findings.push({
          id: 'RULE-UNKNOWN-SELECTOR',
          severity: 'MEDIUM',
          title: 'Unverified Function Signature',
          technicalReason: `Function selector ${decodedCall.selector} not matched in standard ABI dictionary`,
          humanExplanation: '⚠️ Cognitia cannot identify this contract function. Signing an unknown function call carries additional risk.',
          evidence: `Selector: ${decodedCall.selector}`,
          confidence: 85,
          recommendedAction: 'Review the verified contract source on a block explorer before signing.',
          scoreContribution: 20,
        });
      }

      // Check: Multicall bundling
      if (decodedCall.functionName === 'multicall') {
        findings.push({
          id: 'RULE-MULTICALL-BUNDLE',
          severity: 'MEDIUM',
          title: 'Bundled Multicall Execution',
          technicalReason: 'multicall() executes multiple nested transactions in a single atomic batch',
          humanExplanation: '⚠️ This transaction bundles multiple internal operations together. Inspect individual sub-calls carefully.',
          evidence: `Selector: ${decodedCall.selector}`,
          confidence: 80,
          recommendedAction: 'Ensure all batched actions match your explicit intentions.',
          scoreContribution: 15,
        });
      }
    }

    // 3. EVALUATE SIGNATURE RULES
    if (decodedSig) {
      if (decodedSig.standard === 'ETH_SIGN') {
        findings.push({
          id: 'RULE-ETH-SIGN-BLIND',
          severity: 'CRITICAL',
          title: 'Dangerous Blind Signature (eth_sign)',
          technicalReason: 'eth_sign requests signing of raw arbitrary hashes without schema inspection',
          humanExplanation: '🚨 Danger: eth_sign can be used to sign transactions or dangerous authorizations without your knowledge.',
          evidence: 'Method: eth_sign',
          confidence: 99,
          recommendedAction: 'REJECT THIS SIGNATURE. Legitimate applications do not use eth_sign.',
          scoreContribution: 45,
        });
      }

      if (decodedSig.standard === 'EIP_712' && decodedSig.isDangerousPattern) {
        findings.push({
          id: 'RULE-EIP712-PERMIT-AUTHORIZATION',
          severity: 'CRITICAL',
          title: 'Off-Chain Permit / Spending Authorization',
          technicalReason: 'EIP-712 typed data grants off-chain ERC-20 / ERC-721 transfer privileges via Permit',
          humanExplanation: decodedSig.notice || '⚠️ This signature grants an external address permission to move tokens from your wallet.',
          evidence: `PrimaryType: ${decodedSig.primaryType} | Spender: ${decodedSig.permitSpender || 'Unknown'}`,
          confidence: 96,
          recommendedAction: 'Block this signature unless you explicitly intended to authorize this exact protocol.',
          scoreContribution: 35,
        });
      }

      if (decodedSig.standard === 'PERSONAL_SIGN' && decodedSig.isDangerousPattern) {
        findings.push({
          id: 'RULE-PERSONAL-SIGN-SUSPICIOUS',
          severity: 'HIGH',
          title: 'Suspicious Phishing Text in Signature Request',
          technicalReason: 'Message text contains keywords indicative of deceptive phishing agreements',
          humanExplanation: decodedSig.notice || '⚠️ The signature message includes language asking for authorization or claiming rewards.',
          evidence: `Snippet: "${(decodedSig.humanReadableText || '').slice(0, 60)}..."`,
          confidence: 85,
          recommendedAction: 'Read the full text carefully and ensure you trust the origin dApp.',
          scoreContribution: 25,
        });
      }
    }

    // 4. EVALUATE STATE DIFF SIMULATION FINDINGS
    for (const diff of stateDiffs) {
      if (diff.isDangerous && diff.severity === 'CRITICAL') {
        findings.push({
          id: `RULE-SIM-DANGEROUS-DIFF-${diff.id}`,
          severity: 'CRITICAL',
          title: `Critical State Change: ${diff.assetName}`,
          technicalReason: `Simulated state change resulted in dangerous outcome: ${diff.changeDescription}`,
          humanExplanation: `⚠️ Pre-execution simulation revealed that executing this request will cause: ${diff.changeDescription} (${diff.before} → ${diff.after})`,
          evidence: `Asset: ${diff.assetName} | Before: ${diff.before} | After: ${diff.after}`,
          confidence: 98,
          recommendedAction: 'Block this request to prevent unintended loss of assets or permissions.',
          scoreContribution: 30,
        });
      }
    }

    // Part 21 — incomplete analysis is an explicit finding, never silence.
    if (stateDiffs.some((d) => d.evidence === 'UNKNOWN')) {
      findings.push({
        id: 'RULE-ANALYSIS-INCOMPLETE',
        severity: 'MEDIUM',
        title: 'Analysis Incomplete — Some State Unknown',
        technicalReason: 'One or more on-chain state queries returned UNKNOWN; claims in this report are partially unproven',
        humanExplanation: '⚠️ Some state values could not be read. Treat this analysis as partial — signing is not recommended.',
        evidence: 'UNKNOWN evidence present in state diff',
        confidence: 100,
        recommendedAction: 'Retry the analysis or verify the transaction manually before signing.',
        scoreContribution: 15,
      });
    }

    // Default safe finding if nothing flagged
    if (findings.length === 0) {
      findings.push({
        id: 'RULE-NO-RISK-DETECTED',
        severity: 'LOW',
        title: 'Standard Transaction Pattern',
        technicalReason: 'No malicious signatures, unlimited approvals, or known drainer indicators detected',
        humanExplanation: 'No high-risk findings detected. Transaction parameters appear standard.',
        evidence: 'Standard transfer / call with verified parameters',
        confidence: 90,
        recommendedAction: 'Proceed with normal caution.',
        scoreContribution: 5,
      });
    }

    return findings;
  }
}
