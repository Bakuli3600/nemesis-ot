import { ThreatExposureRecord } from '@cognitia/core';

export interface IThreatRelay {
  queryExposure(target: string): Promise<ThreatExposureRecord[]>;
}

export class DemoThreatRelay implements IThreatRelay {
  private records: ThreatExposureRecord[] = [
    {
      id: 'EXP-2026-9021',
      target: '0x5534a781298715edfb42542a9b6d6168954de012',
      threatCluster: 'Operation RedHook Phishing Sybil',
      severity: 'HIGH',
      confidence: 88,
      source: 'Dark-Web Threat Intelligence Feed (Simulated)',
      observedDate: '2026-03-08T22:15:00Z',
      details: 'User wallet address was correlated with a targeted phishing target list harvested from fake Discord airdrop invite forms.',
      routeNodes: [
        'Relay Alpha (Zurich, CH)',
        'Relay Bravo (Reykjavik, IS)',
        'Relay Charlie (Helsinki, FI)',
        'Cognitia Threat Mirror Node #04',
      ],
      isSimulated: true,
    },
    {
      id: 'EXP-2026-9022',
      target: '0x7777777777777777777777777777777777777777',
      threatCluster: 'CryptoGrabber C2 Infrastructure',
      severity: 'CRITICAL',
      confidence: 97,
      source: 'Dark-Web Threat Intelligence Feed (Simulated)',
      observedDate: '2026-03-10T14:45:00Z',
      details: "Contract address advertised on underground developer forum '0xDarkMarkets' as part of an 'all-in-one ERC721 drainer kit v4'.",
      routeNodes: [
        'Relay Alpha (Zurich, CH)',
        'Relay Delta (Amsterdam, NL)',
        'Relay Echo (Stockholm, SE)',
        'Cognitia Threat Mirror Node #09',
      ],
      isSimulated: true,
    },
    {
      id: 'EXP-2026-9023',
      target: '0x6666666666666666666666666666666666666666',
      threatCluster: 'Inferno Drainer Infrastructure Mirror',
      severity: 'CRITICAL',
      confidence: 99,
      source: 'Dark-Web Threat Intelligence Feed (Simulated)',
      observedDate: '2026-03-11T03:00:00Z',
      details: 'Automated sweeper bot associated with high-frequency drainer clusters across EVM chains.',
      routeNodes: [
        'Relay Alpha (Zurich, CH)',
        'Relay Foxtrot (Reykjavik, IS)',
        'Relay Golf (Tallinn, EE)',
        'Cognitia Threat Mirror Node #11',
      ],
      isSimulated: true,
    },
  ];

  public async queryExposure(target: string): Promise<ThreatExposureRecord[]> {
    const clean = (target || '').toLowerCase();
    const matched = this.records.filter((r) => r.target.toLowerCase() === clean);
    if (matched.length > 0) return matched;

    // Return default synthetic correlation for demo presentation if no exact match
    return [
      {
        id: 'EXP-DEMO-GENERAL',
        target,
        threatCluster: 'Global Web3 Threat Watchlist',
        severity: 'LOW',
        confidence: 92,
        source: 'Cognitia Global Relay Feed (Simulated)',
        observedDate: new Date().toISOString(),
        details: 'No direct exposure found in monitored underground channels or phishing databases.',
        routeNodes: [
          'Relay Alpha (Zurich, CH)',
          'Relay Bravo (Frankfurt, DE)',
          'Cognitia Threat Mirror Node #01',
        ],
        isSimulated: true,
      },
    ];
  }
}

export class ThreatExposureEngine {
  private relay: IThreatRelay;

  constructor(relay?: IThreatRelay) {
    this.relay = relay || new DemoThreatRelay();
  }

  public async getExposureReport(target: string): Promise<{
    records: ThreatExposureRecord[];
    isSimulated: boolean;
    route: string[];
    clusterName: string;
    highestSeverity: string;
  }> {
    const records = await this.relay.queryExposure(target);
    const top = records[0];
    return {
      records,
      isSimulated: top?.isSimulated ?? true,
      route: top?.routeNodes ?? ['Relay Alpha (Zurich, CH)', 'Relay Bravo (Reykjavik, IS)', 'Cognitia Threat Mirror Node'],
      clusterName: top?.threatCluster ?? 'Standard Monitor',
      highestSeverity: top?.severity ?? 'LOW',
    };
  }
}
