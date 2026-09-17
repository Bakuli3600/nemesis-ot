import { AnalysisStatus, DecodedCalldata, DecodedSignature, RiskReport, SecurityFinding, SecuritySeverity, StateDiffItem, ThreatIntelResult, WalletRequest } from '@cognitia/core';
import { SecurityRuleSet } from './rules';

export class RiskEngine {
  public static calculateRisk(
    request: WalletRequest,
    decodedCall?: DecodedCalldata,
    decodedSig?: DecodedSignature,
    stateDiffs: StateDiffItem[] = [],
    threatIntel?: ThreatIntelResult,
    opts?: { analysisComplete?: boolean; analysisNote?: string }
  ): RiskReport {
    // Part 21 — ANALYSIS_UNAVAILABLE must never be interpreted as SAFE.
    // If the pipeline could not complete (RPC down, simulation unavailable),
    // the report says so explicitly and never recommends signing.
    const findings = SecurityRuleSet.evaluate(request, decodedCall, decodedSig, stateDiffs, threatIntel);

    // Sum evidence points
    let rawScore = 0;
    const evidenceBreakdown: Array<{ item: string; points: number; description: string }> = [];

    for (const f of findings) {
      rawScore += f.scoreContribution;
      evidenceBreakdown.push({
        item: f.title,
        points: f.scoreContribution,
        description: f.humanExplanation,
      });
    }

    // Clamp score to 0 - 100
    const finalScore = Math.min(100, Math.max(5, rawScore));

    // Determine severity ranking
    let severity: SecuritySeverity = 'LOW';
    if (finalScore >= 71) {
      severity = 'CRITICAL';
    } else if (finalScore >= 46) {
      severity = 'HIGH';
    } else if (finalScore >= 21) {
      severity = 'MEDIUM';
    } else {
      severity = 'LOW';
    }

    // Determine overall security state (Part 21)
    const analysisComplete = opts?.analysisComplete !== false; // default true
    let analysisStatus: AnalysisStatus;
    if (!analysisComplete) {
      analysisStatus = 'ANALYSIS_UNAVAILABLE';
    } else {
      analysisStatus =
        severity === 'CRITICAL'
          ? 'CRITICAL'
          : severity === 'HIGH'
          ? 'HIGH_RISK'
          : severity === 'MEDIUM'
          ? 'WARNING'
          : 'SAFE';
    }

    // Determine recommended action. Incomplete analysis can NEVER recommend
    // signing — it degrades to WARN at best.
    const recommendedDecision = !analysisComplete
      ? 'WARN'
      : severity === 'CRITICAL' || severity === 'HIGH'
      ? 'BLOCK'
      : severity === 'MEDIUM'
      ? 'WARN'
      : 'CONTINUE';

    // Calculate weighted confidence
    const totalConfidence = Math.round(
      findings.reduce((acc, f) => acc + f.confidence, 0) / Math.max(1, findings.length)
    );

    // Human summary
    let humanSummary = '';
    if (!analysisComplete) {
      humanSummary =
        '⚠️ ANALYSIS INCOMPLETE: ' +
        (opts?.analysisNote || 'part of the security pipeline could not run') +
        '. Signing is NOT recommended until a full analysis completes.';
    } else if (severity === 'CRITICAL') {
      humanSummary = '🚨 CRITICAL RISK: DO NOT SIGN. This request exhibits characteristics of an active wallet drainer or malicious authorization.';
    } else if (severity === 'HIGH') {
      humanSummary = '⚠️ HIGH RISK: Proceed with extreme caution. This request grants substantial privileges or interacts with unverified contracts.';
    } else if (severity === 'MEDIUM') {
      humanSummary = '⚠️ MEDIUM RISK: Transaction has unverified parameters or uncommon function calls. Review carefully.';
    } else {
      humanSummary = '🛡️ LOW RISK: No high-risk indicators detected. Standard transaction.';
    }

    return {
      score: finalScore,
      severity,
      analysisStatus,
      findings,
      totalConfidence,
      recommendedDecision,
      humanSummary,
      evidenceBreakdown,
    };
  }
}
