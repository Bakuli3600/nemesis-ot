import { EvidenceLevel, StateDiffItem, StateSnapshot } from '@cognitia/core';

const UNKNOWN = 'UNKNOWN';

/** Treat missing/failed on-chain reads as unproven, never as zero. */
function isUnproven(v: string | boolean | undefined): boolean {
  return v === undefined || v === null || (typeof v === 'string' && v.toUpperCase() === UNKNOWN);
}

export class StateDiffEngine {
  /**
   * Compute BEFORE → AFTER diffs with explicit evidence levels (Part 15):
   *  - OBSERVED: directly measured on-chain state (or a deterministic demo engine)
   *  - INFERRED: follows from an observed change by known semantics
   *  - UNKNOWN : required data was unavailable; no claim is made
   *
   * This prevents the UI from ever displaying "2 NFTs stolen" unless ownership
   * transfer was actually observed.
   */
  public static calculateDiff(pre: StateSnapshot, post: StateSnapshot): StateDiffItem[] {
    const diffs: StateDiffItem[] = [];

    // 1. Native balance change
    const preUnproven = isUnproven(pre.nativeBalance);
    const postUnproven = isUnproven(post.nativeBalance);
    if (!preUnproven && !postUnproven) {
      const preEth = parseFloat(pre.nativeBalance);
      const postEth = parseFloat(post.nativeBalance);
      if (Number.isFinite(preEth) && Number.isFinite(postEth) && preEth !== postEth) {
        const diffEth = postEth - preEth;
        const isLoss = diffEth < 0;
        const isSevere = Math.abs(diffEth) > 1.0;
        diffs.push({
          id: 'diff-native-eth',
          assetType: 'NATIVE',
          assetName: 'Ethereum',
          assetSymbol: 'ETH',
          before: `${preEth.toFixed(4)} ETH`,
          after: `${postEth.toFixed(4)} ETH`,
          changeDescription: isLoss
            ? `Wallet balance decreases by ${Math.abs(diffEth).toFixed(4)} ETH`
            : `Balance receives ${diffEth.toFixed(4)} ETH`,
          severity: isSevere ? 'CRITICAL' : isLoss ? 'HIGH' : 'LOW',
          isDangerous: isLoss,
          evidence: 'OBSERVED',
          evidenceNote: 'Native balance read directly from chain state.',
        });
      }
    } else if (preUnproven !== postUnproven) {
      diffs.push({
        id: 'diff-native-eth-unknown',
        assetType: 'NATIVE',
        assetName: 'Ethereum',
        assetSymbol: 'ETH',
        before: isUnproven(pre.nativeBalance) ? UNKNOWN : pre.nativeBalance,
        after: isUnproven(post.nativeBalance) ? UNKNOWN : post.nativeBalance,
        changeDescription: 'Native balance could not be read from the RPC — no claim can be made.',
        severity: 'LOW',
        isDangerous: false,
        evidence: 'UNKNOWN',
        evidenceNote: 'Balance query failed or was unavailable.',
      });
    }

    // 2. ERC-20 allowances
    for (const [token, spenders] of Object.entries(post.erc20Allowances || {})) {
      for (const [spender, postAllowance] of Object.entries(spenders)) {
        const preAllowance = pre.erc20Allowances?.[token]?.[spender];
        if (isUnproven(preAllowance) && isUnproven(postAllowance)) continue;

        if (isUnproven(preAllowance) !== isUnproven(postAllowance)) {
          diffs.push({
            id: `diff-allowance-${token}-${spender}`,
            assetType: 'ERC20',
            assetName: 'Token Allowance',
            assetAddress: token,
            before: isUnproven(preAllowance) ? UNKNOWN : String(preAllowance),
            after: isUnproven(postAllowance) ? UNKNOWN : String(postAllowance),
            changeDescription: 'Allowance could not be fully established from chain state.',
            severity: 'MEDIUM',
            isDangerous: false,
            evidence: 'UNKNOWN',
            evidenceNote: 'One side of the comparison was unavailable — value shown as UNKNOWN.',
          });
          continue;
        }

        const before = String(preAllowance);
        const after = String(postAllowance);
        if (before === after) continue;

        const isUnlimited = /unlimited|ffffffffffffffffffffffffffffffff/i.test(after) || after.length > 60;
        diffs.push({
          id: `diff-allowance-${token}-${spender}`,
          assetType: 'ERC20',
          assetName: 'Token Allowance',
          assetAddress: token,
          before: before === '0' ? '0 (None)' : before,
          after: isUnlimited ? 'Unlimited (type(uint256).max)' : after,
          changeDescription: isUnlimited
            ? 'Grants spender unrestricted authorization to move the token balance'
            : `Changes spending allowance from ${before} to ${after}`,
          severity: isUnlimited ? 'CRITICAL' : 'MEDIUM',
          isDangerous: isUnlimited,
          // In live mode both sides were read from the RPC; in demo mode the
          // engine is deterministic. Both count as OBSERVED.
          evidence: 'OBSERVED',
          evidenceNote: 'allowance(owner, spender) read on both sides of the simulation.',
          // The drain implication is INFERRED from ERC-20 semantics:
          // an unlimited allowance does not move tokens by itself.
        });
      }
    }

    // 3. ERC-721 operator approvals (isApprovedForAll)
    for (const [nftContract, operators] of Object.entries(post.erc721Operators || {})) {
      for (const [operator, postApprovedRaw] of Object.entries(operators)) {
        const preApprovedRaw = pre.erc721Operators?.[nftContract]?.[operator] ?? false;
        const preUnknown = preApprovedRaw === 'UNKNOWN';
        const postUnknown = postApprovedRaw === 'UNKNOWN';

        if (preUnknown || postUnknown) {
          // Part 15/16 — cannot establish the transition; say so, claim nothing.
          if (preApprovedRaw === postApprovedRaw) continue;
          diffs.push({
            id: `diff-operator-${nftContract}-${operator}`,
            assetType: 'OPERATOR_APPROVAL',
            assetName: 'NFT Collection Operator Access',
            assetAddress: nftContract,
            before: preUnknown ? 'UNKNOWN' : preApprovedRaw ? 'TRUE (Approved)' : 'FALSE (Revoked)',
            after: postUnknown ? 'UNKNOWN' : String(postApprovedRaw),
            changeDescription: 'Operator approval could not be fully established from chain state.',
            severity: 'MEDIUM',
            isDangerous: false,
            evidence: 'UNKNOWN',
            evidenceNote: 'isApprovedForAll query failed or was unavailable on one side.',
          });
          continue;
        }

        const preApproved = preApprovedRaw as boolean;
        const postApproved = postApprovedRaw as boolean;
        if (preApproved === postApproved) continue;
        diffs.push({
          id: `diff-operator-${nftContract}-${operator}`,
          assetType: 'OPERATOR_APPROVAL',
          assetName: 'NFT Collection Operator Access',
          assetAddress: nftContract,
          before: preApproved ? 'TRUE (Approved)' : 'FALSE (Revoked)',
          after: postApproved ? 'TRUE (Approved)' : 'FALSE (Revoked)',
          changeDescription: postApproved
            ? 'Grants operator authority over the collection per ERC-721 semantics'
            : 'Revokes operator authority',
          severity: postApproved ? 'CRITICAL' : 'LOW',
          isDangerous: postApproved,
          evidence: 'OBSERVED',
          evidenceNote: 'isApprovedForAll(owner, operator) flips false → true in simulation.',
          // Post-approval transfers are INFERRED, never shown as OBSERVED loss.
        });
      }
    }

    // 4. ERC-721 ownership transfer — ONLY claimed when ownerOf actually moved.
    for (const [nftContract, postTokens] of Object.entries(post.erc721Tokens || {})) {
      const preTokens = pre.erc721Tokens?.[nftContract] || [];
      const lostTokens = preTokens.filter((t) => !postTokens.includes(t));
      if (lostTokens.length === 0) continue;

      // Evidence level depends on whether ownership was really observed to move
      // (live execution) or merely inferred from an approval escalation.
      const ownershipObserved = (post as any).__ownershipObserved === true;
      diffs.push({
        id: `diff-nft-loss-${nftContract}`,
        assetType: 'ERC721',
        assetName: 'NFT Ownership Transfer',
        assetAddress: nftContract,
        before: `Owned (${lostTokens.join(', ')})`,
        after: 'No longer owned',
        changeDescription: ownershipObserved
          ? `${lostTokens.length} NFT(s) transferred out of the wallet during simulated execution`
          : `${lostTokens.length} NFT(s) COULD become transferable by the operator (inferred — ownership transfer was NOT executed)`,
        severity: 'CRITICAL',
        isDangerous: true,
        affectedCount: lostTokens.length,
        evidence: ownershipObserved ? 'OBSERVED' : 'INFERRED',
        evidenceNote: ownershipObserved
          ? 'ownerOf(tokenId) returned the wallet before and another address after execution.'
          : 'Derived from operator approval escalation; no transfer was executed in simulation.',
      });
    }

    return diffs;
  }
}
