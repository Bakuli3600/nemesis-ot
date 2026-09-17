import { ThreatIndicator, ThreatIntelResult } from '@cognitia/core';

// Embedded default threat feed from data/demo-threat-intelligence.json
const DEFAULT_THREAT_INDICATORS: ThreatIndicator[] = [
  {
    id: 'TI-DRAIN-01',
    type: 'OPERATOR_ADDRESS',
    value: '0xd8da6bf26964af9ded9e03e53415d37aa96045',
    threatFamily: 'SUSPICIOUS_OPERATOR',
    severity: 'CRITICAL',
    confidence: 98,
    description: 'Blacklisted drainer operator address observed in multiple cross-chain sweeping operations.',
    source: 'Cognitia Threat Intel Network (Simulated)',
    lastUpdated: '2026-03-10T08:00:00Z',
  },
  {
    id: 'TI-DRAIN-02',
    type: 'CONTRACT_ADDRESS',
    value: '0x000000000000000000000000000000000000dead',
    threatFamily: 'BURN_TRAP',
    severity: 'HIGH',
    confidence: 90,
    description: 'Dead burn address used in deceptive zero-transfer scams.',
    source: 'Cognitia Threat Intel Network (Simulated)',
    lastUpdated: '2026-03-01T10:00:00Z',
  },
  {
    id: 'TI-DRAIN-03',
    type: 'CONTRACT_ADDRESS',
    value: '0x6666666666666666666666666666666666666666',
    threatFamily: 'NFT_DRAINER',
    severity: 'CRITICAL',
    confidence: 99,
    description: "Active NFT sweep contract associated with 'ApeClaim' and 'Seaport Exploiter' clusters.",
    source: 'Cognitia Threat Intel Network (Simulated)',
    lastUpdated: '2026-03-11T04:20:00Z',
  },
  {
    id: 'TI-DRAIN-04',
    type: 'CONTRACT_ADDRESS',
    value: '0x7777777777777777777777777777777777777777',
    threatFamily: 'FAKE_AIRDROP_DRAINER',
    severity: 'CRITICAL',
    confidence: 96,
    description: 'FakeRewards phishing proxy designed to solicit setApprovalForAll during fake claim calls.',
    source: 'Cognitia Threat Intel Network (Simulated)',
    lastUpdated: '2026-03-09T18:30:00Z',
  },
  {
    id: 'TI-DRAIN-05',
    type: 'OPERATOR_ADDRESS',
    value: '0x8888888888888888888888888888888888888888',
    threatFamily: 'UNLIMITED_APPROVAL_DRAINER',
    severity: 'CRITICAL',
    confidence: 95,
    description: 'Unverified external spender with automated token liquidation bots attached.',
    source: 'Cognitia Threat Intel Network (Simulated)',
    lastUpdated: '2026-03-08T12:00:00Z',
  },
  {
    id: 'TI-DRAIN-06',
    type: 'FUNCTION_SELECTOR',
    value: '0x379607f5',
    threatFamily: 'FAKE_AIRDROP_DRAINER',
    severity: 'HIGH',
    confidence: 92,
    description: 'claimRewards() selector frequently used by malicious honeypots to disguise approval triggers.',
    source: 'Cognitia Threat Intel Network (Simulated)',
    lastUpdated: '2026-03-05T09:15:00Z',
  },
];

export class ThreatIntelEngine {
  private indicators: ThreatIndicator[];

  constructor(customIndicators?: ThreatIndicator[]) {
    this.indicators = customIndicators || DEFAULT_THREAT_INDICATORS;
  }

  public checkAddress(address: string | undefined): ThreatIntelResult {
    if (!address) {
      return {
        matches: [],
        isKnownThreat: false,
        reputationScore: 100,
        source: 'Cognitia Threat Intel (Simulated)',
        details: 'No address provided to evaluate.',
      };
    }

    const clean = address.toLowerCase();
    const matches = this.indicators.filter((ind) => ind.value.toLowerCase() === clean);

    if (matches.length > 0) {
      const top = matches[0];
      return {
        matches,
        isKnownThreat: true,
        threatFamily: top.threatFamily,
        reputationScore: top.severity === 'CRITICAL' ? 5 : 25,
        source: top.source,
        details: top.description,
      };
    }

    return {
      matches: [],
      isKnownThreat: false,
      reputationScore: 85,
      source: 'Cognitia Threat Intel (Simulated)',
      details: 'No malicious indicators observed for this address in current threat feeds.',
    };
  }

  public checkSelector(selector: string | undefined): ThreatIntelResult {
    if (!selector) {
      return {
        matches: [],
        isKnownThreat: false,
        reputationScore: 100,
        source: 'Cognitia Threat Intel',
        details: 'Empty selector.',
      };
    }

    const clean = selector.toLowerCase();
    const matches = this.indicators.filter(
      (ind) => ind.type === 'FUNCTION_SELECTOR' && ind.value.toLowerCase() === clean
    );

    if (matches.length > 0) {
      const top = matches[0];
      return {
        matches,
        isKnownThreat: true,
        threatFamily: top.threatFamily,
        reputationScore: 30,
        source: top.source,
        details: top.description,
      };
    }

    return {
      matches: [],
      isKnownThreat: false,
      reputationScore: 90,
      source: 'Cognitia Threat Intel',
      details: 'Selector not tagged as known exploit pattern.',
    };
  }
}
