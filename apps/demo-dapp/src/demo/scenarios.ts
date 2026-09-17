import React from 'react';

/**
 * Nemesis — deterministic demonstration dataset.
 *
 * Everything in this file is SIMULATED: findings, risk scores, wallet state,
 * threat clusters and dark-web records are generated locally so the live
 * console behaves identically on every run (no network, no randomness).
 * Address intelligence mirrors data/demo-threat-intelligence.json so the
 * website and the extension tell the same story.
 */

export type ScenarioTone = 'safe' | 'warn' | 'danger' | 'mystery';

export interface EvidenceItem {
  item: string;
  points: number;
  description: string;
}

export interface Finding {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  humanExplanation: string;
  evidence: string;
  confidence: number;
}

export interface StateDiff {
  assetType: 'NATIVE' | 'ERC20' | 'ERC721' | 'OPERATOR_APPROVAL' | 'OWNERSHIP';
  assetName: string;
  before: string;
  after: string;
  isDangerous: boolean;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
}

export interface AttackNode {
  id: string;
  label: string;
  sublabel: string;
  kind: 'wallet' | 'dapp' | 'contract' | 'operator' | 'asset' | 'attacker';
}

export interface AttackEdge {
  from: string;
  to: string;
  label?: string;
}

export interface DarkWebHop {
  label: string;
  detail: string;
}

export interface DarkWebTrace {
  marketName: string;
  onion: string;
  listing: string;
  price: string;
  vendor: string;
  hops: DarkWebHop[];
  cluster: string;
  clusterConfidence: number;
  listingsFound: number;
  firstSeen: string;
  lastSeen: string;
}

export interface DemoReport {
  id: string;
  requestId: string;
  scenarioId: string;
  riskScore: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  recommendedDecision: 'BLOCK' | 'CONTINUE' | 'WARN';
  humanSummary: string;
  findings: Finding[];
  evidence: EvidenceItem[];
  stateDiffs: StateDiff[];
  gasEstimate: string;
  simulation: {
    status: 'SIMULATION_SUCCESS' | 'SIMULATION_REVERTED';
    executionTimeMs: number;
  };
  attackGraph: { nodes: AttackNode[]; edges: AttackEdge[] };
  darkWeb?: DarkWebTrace;
}

export interface DemoScenario {
  id: string;
  label: string;
  tagline: string;
  description: string;
  tone: ScenarioTone;
  method: string;
  origin: string;
  target: string;
  functionName: string;
  calldata: string;
  value: string;
  /** Real wallet request this scenario dispatches when MetaMask is present. */
  walletRequest?:
    | { method: 'eth_sendTransaction'; params: Array<Record<string, string>> }
    | { method: 'personal_sign'; params: string[] }
    | { method: 'eth_signTypedData_v4'; params: string[] };
  report: DemoReport;
}

/* ------------------------------------------------------------------ */
/* Shared constants — same world as the extension demo data            */
/* ------------------------------------------------------------------ */

export const WALLET = '0x5534a781298715EdfB42542a9b6d6168954de012';
export const WALLET_SHORT = '0x5534…954d';

const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const BAYC = '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D';
const FAKE_REWARDS = '0x7777777777777777777777777777777777777777';
const OPERATOR = '0x6666666666666666666666666666666666666666';
const SPENDER = '0x8888888888888888888888888888888888888888';
const ROUTER = '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45';
const PEER = '0x1234567890123456789012345678901234567890';
const MYSTERY = '0x9999999999999999999999999999999999999999';

/* ------------------------------------------------------------------ */
/* Reusable findings                                                   */
/* ------------------------------------------------------------------ */

const FINDING_NFT_OPERATOR = (operator: string): Finding => ({
  severity: 'CRITICAL',
  title: 'Collection-wide NFT authorization',
  humanExplanation: `This request gives ${shortAddr(
    operator
  )} permission to transfer every NFT in this collection from your wallet — not just one token.`,
  evidence: 'setApprovalForAll(operator, true)',
  confidence: 99,
});

const FINDING_UNKNOWN_SPENDER = (spender: string): Finding => ({
  severity: 'HIGH',
  title: 'Unknown spender address',
  humanExplanation:
    'The address receiving spending permission has no public contract verification, no history, and is not associated with any known protocol.',
  evidence: `spender ${shortAddr(spender)} · unverified contract · first seen by Nemesis`,
  confidence: 94,
});

const FINDING_THREAT_MATCH = (family: string): Finding => ({
  severity: 'CRITICAL',
  title: 'Threat intelligence match',
  humanExplanation: `The target contract matches the "${family}" drainer family in Nemesis's simulated intelligence corpus.`,
  evidence: 'threat-intelligence corpus · confidence-weighted match',
  confidence: 96,
});

const FINDING_UNVERIFIED_CONTRACT: Finding = {
  severity: 'MEDIUM',
  title: 'Contract intelligence unavailable',
  humanExplanation:
    'Nemesis could not retrieve verified source or bytecode metadata for this contract. Signing an unidentified function call carries additional risk.',
  evidence: 'no verified source · no ABI match · selector not in corpus',
  confidence: 78,
};

const FINDING_HIDDEN_MULTICALL: Finding = {
  severity: 'HIGH',
  title: 'Batched call hides secondary operations',
  humanExplanation:
    'This multicall bundles sub-operations that are not visible in the transaction preview. At least one decoded sub-call requests token authorization.',
  evidence: 'multicall(bytes[]) → 2 sub-calls · 1 hidden approval',
  confidence: 91,
};

const FINDING_PERMIT = (deadline: string): Finding => ({
  severity: 'CRITICAL',
  title: 'Off-chain token spending authorization',
  humanExplanation:
    'You are not sending a transaction — you are signing a permission slip. Once signed, the spender can move your tokens at any time without further confirmation, and no on-chain transaction is required.',
  evidence: `Permit(value: uint256.max) · deadline ${deadline}`,
  confidence: 97,
});

const FINDING_AUTH_LANGUAGE: Finding = {
  severity: 'MEDIUM',
  title: 'Authorization language in signature',
  humanExplanation:
    'The message you would sign contains claim/authorization wording. Signatures like this are frequently used to socially-engineer approvals.',
  evidence: 'message contains “authorize the release of my pending tokens”',
  confidence: 85,
};

const FINDING_SAFE_TRANSFER: Finding = {
  severity: 'LOW',
  title: 'Plain native transfer',
  humanExplanation:
    'A straightforward ETH transfer to a personal wallet. No approval, no contract interaction, no state authorization changes detected.',
  evidence: 'value transfer · data: 0x · recipient is an EOA',
  confidence: 99,
};

const FINDING_KNOWN_ROUTER: Finding = {
  severity: 'LOW',
  title: 'Recognized router contract',
  humanExplanation:
    'The target matches a widely-used, publicly verified router contract with a consistent bytecode history.',
  evidence: 'verified contract · 3.2M+ historical interactions (simulated)',
  confidence: 93,
};

/* ------------------------------------------------------------------ */
/* Reusable dark-web traces                                            */
/* ------------------------------------------------------------------ */

const TRACE_APECLAIM: DarkWebTrace = {
  marketName: 'NightVault Market',
  onion: 'nvault7x3qkzlp5rd.onion',
  listing: 'ApeClaim v2 — ERC721 drainer kit · seeded panel · Tor-panel admin',
  price: '0.42 BTC',
  vendor: 'lacedVend0r (4.9 ★ · 312 sales · FE enabled)',
  hops: [
    { label: 'Entry guard', detail: 'Guard node observed leaving your network — path length 3' },
    { label: 'Relay Bravo', detail: 'Reykjavik, IS — middle relay, ~61 ms latency' },
    { label: 'Relay Echo', detail: 'Stockholm, SE — exit research node (read-only mirror)' },
    { label: 'Nemesis Threat Mirror', detail: 'Snapshot indexed 2026-08-30 03:12 UTC' },
  ],
  cluster: 'Operation RedHook',
  clusterConfidence: 97,
  listingsFound: 4,
  firstSeen: '2026-07-14',
  lastSeen: '2026-08-30',
};

const TRACE_CRYPTOGROBBER: DarkWebTrace = {
  marketName: 'NightVault Market',
  onion: 'nvault7x3qkzlp5rd.onion',
  listing: 'CryptoGrabber C2 panel — unlimited-approval drain module',
  price: '0.31 BTC',
  vendor: 'mullh0lland (4.7 ★ · 188 sales)',
  hops: [
    { label: 'Entry guard', detail: 'Guard node observed leaving your network — path length 3' },
    { label: 'Relay Delta', detail: 'Amsterdam, NL — middle relay, ~48 ms latency' },
    { label: 'Relay Foxtrot', detail: 'Zürich, CH — exit research node (read-only mirror)' },
    { label: 'Nemesis Threat Mirror', detail: 'Snapshot indexed 2026-09-01 21:47 UTC' },
  ],
  cluster: 'CryptoGrabber C2',
  clusterConfidence: 94,
  listingsFound: 2,
  firstSeen: '2026-06-02',
  lastSeen: '2026-09-01',
};

const UINT_MAX =
  '115792089237316195423570985008687907853269984665640564039457584007913129639935';

/* ------------------------------------------------------------------ */
/* Scenarios                                                           */
/* ------------------------------------------------------------------ */

export const SCENARIOS: DemoScenario[] = [
  {
    id: 'NFT_APPROVAL',
    label: 'Malicious NFT approval',
    tagline: 'Vector #1 · setApprovalForAll',
    description:
      'A fake airdrop page asks you to “verify your collection” — the calldata actually grants an external operator control of every NFT you own.',
    tone: 'danger',
    method: 'eth_sendTransaction',
    origin: 'ape-claim-airdrop.xyz',
    target: BAYC,
    functionName: 'setApprovalForAll(address,bool)',
    calldata:
      '0xa22cb46500000000000000000000000066666666666666666666666666666666666666660000000000000000000000000000000000000000000000000000000000000001',
    value: '0 ETH',
    walletRequest: {
      method: 'eth_sendTransaction',
      params: [
        {
          from: WALLET,
          to: BAYC,
          data: '0xa22cb46500000000000000000000000066666666666666666666666666666666666666660000000000000000000000000000000000000000000000000000000000000001',
        },
      ],
    },
    report: {
      id: 'NMS-2026-000041',
      requestId: 'NMS-2026-000041',
      scenarioId: 'NFT_APPROVAL',
      riskScore: 95,
      severity: 'CRITICAL',
      recommendedDecision: 'BLOCK',
      humanSummary:
        'This request hands an unidentified operator permission to move your entire BAYC collection. Nemesis blocked it before your wallet was opened.',
      findings: [
        FINDING_NFT_OPERATOR(OPERATOR),
        FINDING_UNKNOWN_SPENDER(OPERATOR),
        FINDING_THREAT_MATCH('ApeClaim / Seaport Exploiter'),
        FINDING_UNVERIFIED_CONTRACT,
      ],
      evidence: [
        { item: 'Collection-wide NFT authorization', points: 40, description: 'setApprovalForAll(operator, true)' },
        { item: 'Unknown operator address', points: 25, description: 'no history, no verification, newly funded' },
        { item: 'Threat intel match', points: 20, description: 'ApeClaim drainer cluster (simulated)' },
        { item: 'Contract intelligence unavailable', points: 10, description: 'no verified source code' },
      ],
      stateDiffs: [
        {
          assetType: 'OPERATOR_APPROVAL',
          assetName: 'BAYC · isApprovedForAll',
          before: 'false',
          after: 'true',
          isDangerous: true,
          severity: 'CRITICAL',
        },
        {
          assetType: 'ERC721',
          assetName: 'NFTs exposed to operator',
          before: '0',
          after: '17',
          isDangerous: true,
          severity: 'CRITICAL',
        },
        {
          assetType: 'NATIVE',
          assetName: 'ETH balance',
          before: '2.3150',
          after: '2.3149',
          isDangerous: false,
          severity: 'LOW',
        },
      ],
      gasEstimate: '46,812',
      simulation: { status: 'SIMULATION_SUCCESS', executionTimeMs: 184 },
      attackGraph: {
        nodes: [
          { id: 'wallet', label: WALLET_SHORT, sublabel: 'Your wallet', kind: 'wallet' },
          { id: 'dapp', label: 'ape-claim-airdrop.xyz', sublabel: 'Fake airdrop page', kind: 'dapp' },
          { id: 'rewards', label: 'FakeRewards', sublabel: 'claim() front-end', kind: 'contract' },
          { id: 'bayc', label: 'BAYC', sublabel: 'ERC-721 collection', kind: 'asset' },
          { id: 'operator', label: '0x6666…6666', sublabel: 'Drainer operator', kind: 'operator' },
          { id: 'attacker', label: '0xd8dA…6045', sublabel: 'Cluster treasury', kind: 'attacker' },
        ],
        edges: [
          { from: 'wallet', to: 'dapp', label: 'visits' },
          { from: 'dapp', to: 'rewards', label: 'claim bait' },
          { from: 'rewards', to: 'wallet', label: 'setApprovalForAll' },
          { from: 'wallet', to: 'bayc', label: 'owns 17' },
          { from: 'bayc', to: 'operator', label: 'operator granted' },
          { from: 'operator', to: 'attacker', label: 'sweep' },
        ],
      },
      darkWeb: TRACE_APECLAIM,
    },
  },
  {
    id: 'UNLIMITED_APPROVE',
    label: 'Unlimited token approval',
    tagline: 'Vector #2 · approve(uint256.max)',
    description:
      'A “staking dashboard” requests an allowance of your USDC. The amount encoded is not 50 tokens — it is effectively infinite.',
    tone: 'danger',
    method: 'eth_sendTransaction',
    origin: 'pulse-staking-pool.io',
    target: USDC,
    functionName: 'approve(address,uint256)',
    calldata:
      '0x095ea7b30000000000000000000000008888888888888888888888888888888888888888ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    value: '0 ETH',
    walletRequest: {
      method: 'eth_sendTransaction',
      params: [
        {
          from: WALLET,
          to: USDC,
          data: '0x095ea7b30000000000000000000000008888888888888888888888888888888888888888ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        },
      ],
    },
    report: {
      id: 'NMS-2026-000042',
      requestId: 'NMS-2026-000042',
      scenarioId: 'UNLIMITED_APPROVE',
      riskScore: 88,
      severity: 'CRITICAL',
      recommendedDecision: 'BLOCK',
      humanSummary:
        'You were about to grant an unverified spender unlimited access to your USDC balance. Nemesis flagged the unbounded amount and the spender’s reputation.',
      findings: [
        {
          severity: 'CRITICAL',
          title: 'Unlimited ERC-20 allowance',
          humanExplanation:
            'The approval amount is the maximum possible value — this single signature lets the spender move your entire USDC balance, repeatedly, forever.',
          evidence: 'approve(spender, type(uint256).max)',
          confidence: 99,
        },
        FINDING_UNKNOWN_SPENDER(SPENDER),
        FINDING_THREAT_MATCH('Unlimited-approval drainer'),
        FINDING_UNVERIFIED_CONTRACT,
      ],
      evidence: [
        { item: 'Unbounded allowance', points: 35, description: 'uint256.max approval value' },
        { item: 'Unknown spender', points: 25, description: 'unverified contract, liquidation bots attached' },
        { item: 'Threat intel match', points: 18, description: 'approval-drainer family (simulated)' },
        { item: 'Contract intelligence unavailable', points: 10, description: 'no verified source code' },
      ],
      stateDiffs: [
        {
          assetType: 'ERC20',
          assetName: 'USDC · allowance to 0x8888…8888',
          before: '0',
          after: 'unlimited',
          isDangerous: true,
          severity: 'CRITICAL',
        },
        {
          assetType: 'ERC20',
          assetName: 'USDC at risk',
          before: '0',
          after: '14,500.00',
          isDangerous: true,
          severity: 'CRITICAL',
        },
        {
          assetType: 'NATIVE',
          assetName: 'ETH balance',
          before: '2.3150',
          after: '2.3148',
          isDangerous: false,
          severity: 'LOW',
        },
      ],
      gasEstimate: '46,120',
      simulation: { status: 'SIMULATION_SUCCESS', executionTimeMs: 141 },
      attackGraph: {
        nodes: [
          { id: 'wallet', label: WALLET_SHORT, sublabel: 'Your wallet', kind: 'wallet' },
          { id: 'dapp', label: 'pulse-staking-pool.io', sublabel: 'Fake staking site', kind: 'dapp' },
          { id: 'usdc', label: 'USDC', sublabel: 'ERC-20 balance', kind: 'asset' },
          { id: 'spender', label: '0x8888…8888', sublabel: 'Unverified spender', kind: 'operator' },
          { id: 'attacker', label: '0xd8dA…6045', sublabel: 'Cluster treasury', kind: 'attacker' },
        ],
        edges: [
          { from: 'wallet', to: 'dapp', label: 'visits' },
          { from: 'dapp', to: 'wallet', label: 'approve(max)' },
          { from: 'wallet', to: 'usdc', label: 'holds 14,500' },
          { from: 'usdc', to: 'spender', label: 'allowance' },
          { from: 'spender', to: 'attacker', label: 'liquidation' },
        ],
      },
      darkWeb: TRACE_CRYPTOGROBBER,
    },
  },
  {
    id: 'FAKE_REWARDS',
    label: 'Fake reward claim',
    tagline: 'Vector #3 · claimRewards()',
    description:
      'The classic drainer bait: a “reward claim” button on a lookalike page. The claim function covertly requests operator rights over your wallet.',
    tone: 'danger',
    method: 'eth_sendTransaction',
    origin: 'reward-drop-centre.xyz',
    target: FAKE_REWARDS,
    functionName: 'claimRewards()',
    calldata: '0x379607f5',
    value: '0 ETH',
    walletRequest: {
      method: 'eth_sendTransaction',
      params: [{ from: WALLET, to: FAKE_REWARDS, data: '0x379607f5' }],
    },
    report: {
      id: 'NMS-2026-000043',
      requestId: 'NMS-2026-000043',
      scenarioId: 'FAKE_REWARDS',
      riskScore: 97,
      severity: 'CRITICAL',
      recommendedDecision: 'BLOCK',
      humanSummary:
        'Behind a harmless-looking “claim” button sits a covert authorization request matching the FakeRewards drainer kit. Blocked pre-execution.',
      findings: [
        {
          severity: 'CRITICAL',
          title: 'Covert authorization behind claim function',
          humanExplanation:
            'The claimRewards() call requests collection-wide operator rights as a side effect — the rewards never exist. This exact pattern is sold as a drainer kit.',
          evidence: 'claimRewards() → setApprovalForAll side effect (kit v4 behaviour)',
          confidence: 98,
        },
        FINDING_NFT_OPERATOR(OPERATOR),
        FINDING_THREAT_MATCH('FakeRewards phishing proxy'),
        FINDING_UNVERIFIED_CONTRACT,
      ],
      evidence: [
        { item: 'Known drainer pattern', points: 45, description: 'claim → setApprovalForAll side effect' },
        { item: 'Threat intel match', points: 25, description: 'FakeRewards proxy (simulated)' },
        { item: 'Collection-wide NFT authorization', points: 20, description: 'full-collection operator grant' },
        { item: ' contract intelligence unavailable', points: 7, description: 'no verified source code' },
      ],
      stateDiffs: [
        {
          assetType: 'OPERATOR_APPROVAL',
          assetName: 'BAYC · isApprovedForAll',
          before: 'false',
          after: 'true',
          isDangerous: true,
          severity: 'CRITICAL',
        },
        {
          assetType: 'ERC721',
          assetName: 'NFTs exposed to operator',
          before: '0',
          after: '17',
          isDangerous: true,
          severity: 'CRITICAL',
        },
        {
          assetType: 'ERC20',
          assetName: 'WETH · allowance to 0x6666…6666',
          before: '0',
          after: 'unlimited',
          isDangerous: true,
          severity: 'HIGH',
        },
      ],
      gasEstimate: '91,338',
      simulation: { status: 'SIMULATION_SUCCESS', executionTimeMs: 226 },
      attackGraph: {
        nodes: [
          { id: 'wallet', label: WALLET_SHORT, sublabel: 'Your wallet', kind: 'wallet' },
          { id: 'dapp', label: 'reward-drop-centre.xyz', sublabel: 'Phishing claim page', kind: 'dapp' },
          { id: 'rewards', label: 'FakeRewards', sublabel: 'Drainer proxy', kind: 'contract' },
          { id: 'operator', label: '0x6666…6666', sublabel: 'Sweeper contract', kind: 'operator' },
          { id: 'attacker', label: '0xd8dA…6045', sublabel: 'Cluster treasury', kind: 'attacker' },
        ],
        edges: [
          { from: 'wallet', to: 'dapp', label: 'visits' },
          { from: 'dapp', to: 'rewards', label: 'claimRewards()' },
          { from: 'rewards', to: 'wallet', label: 'covert approval' },
          { from: 'operator', to: 'wallet', label: 'sweeps assets' },
          { from: 'operator', to: 'attacker', label: 'funds' },
        ],
      },
      darkWeb: TRACE_APECLAIM,
    },
  },
  {
    id: 'EIP712_PERMIT',
    label: 'Permit signature trap',
    tagline: 'Vector #4 · EIP-712 Permit',
    description:
      'No transaction at all — just a signature. But this signature is a permission slip letting a stranger spend your tokens whenever they want.',
    tone: 'warn',
    method: 'eth_signTypedData_v4',
    origin: 'elixir-governance.vote',
    target: USDC,
    functionName: 'Permit(owner,spender,value,deadline)',
    calldata: '— off-chain EIP-712 payload —',
    value: '0 ETH (gasless)',
    walletRequest: {
      method: 'eth_signTypedData_v4',
      params: [
        WALLET,
        JSON.stringify({
          types: {
            EIP712Domain: [
              { name: 'name', type: 'string' },
              { name: 'version', type: 'string' },
              { name: 'chainId', type: 'uint256' },
              { name: 'verifyingContract', type: 'address' },
            ],
            Permit: [
              { name: 'owner', type: 'address' },
              { name: 'spender', type: 'address' },
              { name: 'value', type: 'uint256' },
              { name: 'deadline', type: 'uint256' },
            ],
          },
          primaryType: 'Permit',
          domain: {
            name: 'USD Coin',
            version: '2',
            chainId: 11155111,
            verifyingContract: USDC,
          },
          message: {
            owner: WALLET,
            spender: SPENDER,
            value: UINT_MAX,
            deadline: '1799999999',
          },
        }),
      ],
    },
    report: {
      id: 'NMS-2026-000044',
      requestId: 'NMS-2026-000044',
      scenarioId: 'EIP712_PERMIT',
      riskScore: 84,
      severity: 'CRITICAL',
      recommendedDecision: 'BLOCK',
      humanSummary:
        'A gasless Permit signature granting an unknown spender unlimited USDC access, with a deadline years away. Signing costs nothing — and loses everything.',
      findings: [
        FINDING_PERMIT('2027-01-15'),
        FINDING_UNKNOWN_SPENDER(SPENDER),
        FINDING_THREAT_MATCH('Permit drainer cluster'),
      ],
      evidence: [
        { item: 'Permit authorization', points: 40, description: 'off-chain spend permission, uint256.max' },
        { item: 'Unknown spender', points: 22, description: 'unverified address, no protocol association' },
        { item: 'Threat intel match', points: 22, description: 'permit-drainer family (simulated)' },
      ],
      stateDiffs: [
        {
          assetType: 'ERC20',
          assetName: 'USDC · permit allowance',
          before: '0',
          after: 'unlimited',
          isDangerous: true,
          severity: 'CRITICAL',
        },
        {
          assetType: 'ERC20',
          assetName: 'USDC at risk',
          before: '0',
          after: '14,500.00',
          isDangerous: true,
          severity: 'CRITICAL',
        },
      ],
      gasEstimate: '0 (off-chain)',
      simulation: { status: 'SIMULATION_SUCCESS', executionTimeMs: 88 },
      attackGraph: {
        nodes: [
          { id: 'wallet', label: WALLET_SHORT, sublabel: 'Your wallet', kind: 'wallet' },
          { id: 'dapp', label: 'elixir-governance.vote', sublabel: 'Fake governance vote', kind: 'dapp' },
          { id: 'usdc', label: 'USDC', sublabel: 'ERC-20 balance', kind: 'asset' },
          { id: 'spender', label: '0x8888…8888', sublabel: 'Permit spender', kind: 'operator' },
          { id: 'attacker', label: '0xd8dA…6045', sublabel: 'Cluster treasury', kind: 'attacker' },
        ],
        edges: [
          { from: 'wallet', to: 'dapp', label: 'visits' },
          { from: 'dapp', to: 'wallet', label: 'Permit signature' },
          { from: 'wallet', to: 'usdc', label: 'holds 14,500' },
          { from: 'usdc', to: 'spender', label: 'spend permission' },
          { from: 'spender', to: 'attacker', label: 'liquidation' },
        ],
      },
      darkWeb: TRACE_CRYPTOGROBBER,
    },
  },
  {
    id: 'PERSONAL_SIGN',
    label: 'Personal-sign social bait',
    tagline: 'Vector #5 · personal_sign',
    description:
      'A message asking you to “claim and authorize” rewards. Individually harmless-looking, exactly the wording used to phish approvals downstream.',
    tone: 'warn',
    method: 'personal_sign',
    origin: 'nemesis-drop-verify.xyz',
    target: '—',
    functionName: 'personal_sign',
    calldata: '0x457468657265756d205369676e6564204d6573736167653a0a…',
    value: '—',
    walletRequest: (() => {
      const msg =
        'By signing, I claim my airdrop rewards and authorize the release of my pending tokens.';
      const hex =
        '0x' +
        Array.from(new TextEncoder().encode(msg))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      return {
        method: 'personal_sign' as const,
        params: [hex, WALLET],
      };
    })(),
    report: {
      id: 'NMS-2026-000045',
      requestId: 'NMS-2026-000045',
      scenarioId: 'PERSONAL_SIGN',
      riskScore: 38,
      severity: 'MEDIUM',
      recommendedDecision: 'WARN',
      humanSummary:
        'The signature body contains authorization language typical of phishing funnels. Nemesis flagged it for review instead of letting it pass silently.',
      findings: [
        FINDING_AUTH_LANGUAGE,
        {
          severity: 'LOW',
          title: 'No on-chain authorization detected',
          humanExplanation:
            'This signature does not itself move funds or grant allowances — the risk is that it is used to social-engineer a later approval.',
          evidence: 'plain message · no Permit payload · no typed authorization',
          confidence: 90,
        },
      ],
      evidence: [
        { item: 'Authorization wording in message', points: 23, description: 'social-engineering pattern' },
        { item: 'Origin not on allow-list', points: 15, description: 'unrecognized first-seen domain' },
      ],
      stateDiffs: [
        {
          assetType: 'NATIVE',
          assetName: 'ETH balance',
          before: '2.3150',
          after: '2.3150',
          isDangerous: false,
          severity: 'LOW',
        },
      ],
      gasEstimate: '— (off-chain)',
      simulation: { status: 'SIMULATION_SUCCESS', executionTimeMs: 52 },
      attackGraph: {
        nodes: [
          { id: 'wallet', label: WALLET_SHORT, sublabel: 'Your wallet', kind: 'wallet' },
          { id: 'dapp', label: 'nemesis-drop-verify.xyz', sublabel: 'Signature bait page', kind: 'dapp' },
          { id: 'operator', label: 'unknown', sublabel: 'Downstream phishing', kind: 'operator' },
        ],
        edges: [
          { from: 'wallet', to: 'dapp', label: 'visits' },
          { from: 'dapp', to: 'wallet', label: 'requests signature' },
          { from: 'dapp', to: 'operator', label: 'reuses signature' },
        ],
      },
    },
  },
  {
    id: 'SAFE_TX',
    label: 'Safe peer transfer',
    tagline: 'Vector #6 · plain transfer',
    description:
      'A normal 0.01 ETH transfer. Nemesis verifies there is no hidden payload and lets it flow through to your wallet immediately.',
    tone: 'safe',
    method: 'eth_sendTransaction',
    origin: 'localhost:5175',
    target: PEER,
    functionName: '— (plain transfer)',
    calldata: '0x',
    value: '0.01 ETH',
    walletRequest: {
      method: 'eth_sendTransaction',
      params: [{ from: WALLET, to: PEER, value: '0x2386f26fc10000', data: '0x' }],
    },
    report: {
      id: 'NMS-2026-000046',
      requestId: 'NMS-2026-000046',
      scenarioId: 'SAFE_TX',
      riskScore: 6,
      severity: 'LOW',
      recommendedDecision: 'CONTINUE',
      humanSummary:
        'A simple transfer with no calldata, no approvals, and a personal-wallet recipient. Cleared for signing without friction.',
      findings: [FINDING_SAFE_TRANSFER, FINDING_KNOWN_ROUTER],
      evidence: [
        { item: 'Plain value transfer', points: 4, description: 'empty data field, EOA recipient' },
        { item: 'Clean origin', points: 2, description: 'local trusted development origin' },
      ],
      stateDiffs: [
        {
          assetType: 'NATIVE',
          assetName: 'ETH balance',
          before: '2.3150',
          after: '2.3049',
          isDangerous: false,
          severity: 'LOW',
        },
      ],
      gasEstimate: '21,000',
      simulation: { status: 'SIMULATION_SUCCESS', executionTimeMs: 61 },
      attackGraph: {
        nodes: [
          { id: 'wallet', label: WALLET_SHORT, sublabel: 'Your wallet', kind: 'wallet' },
          { id: 'peer', label: '0x1234…7890', sublabel: 'Recipient wallet', kind: 'wallet' },
        ],
        edges: [{ from: 'wallet', to: 'peer', label: '0.01 ETH' }],
      },
    },
  },
  {
    id: 'MULTICALL',
    label: 'Suspicious multicall',
    tagline: 'Vector #7 · multicall()',
    description:
      'One call, two hidden operations. The preview shows a swap — the bundle also carries an approval to an unknown spender.',
    tone: 'mystery',
    method: 'eth_sendTransaction',
    origin: 'router-aggregator-swap.xyz',
    target: ROUTER,
    functionName: 'multicall(uint256,bytes[])',
    calldata: '0xac9650d8…(2 sub-calls)',
    value: '0 ETH',
    walletRequest: {
      method: 'eth_sendTransaction',
      params: [
        { from: WALLET, to: ROUTER, data: '0xac9650d80000000000000000000000000000000000000000000000000000000000000001' },
      ],
    },
    report: {
      id: 'NMS-2026-000047',
      requestId: 'NMS-2026-000047',
      scenarioId: 'MULTICALL',
      riskScore: 71,
      severity: 'HIGH',
      recommendedDecision: 'BLOCK',
      humanSummary:
        'The visible swap hides a second sub-call requesting token authorization. Nemesis decoded both operations before you signed.',
      findings: [
        FINDING_HIDDEN_MULTICALL,
        FINDING_UNKNOWN_SPENDER(SPENDER),
        {
          severity: 'MEDIUM',
          title: 'Contract intelligence unavailable',
          humanExplanation:
            'The router bytecode could not be matched against a verified deployment. Batched calls to unidentified contracts compound risk.',
          evidence: 'no verified source · proxy pattern suspected',
          confidence: 74,
        },
      ],
      evidence: [
        { item: 'Hidden approval in multicall', points: 30, description: 'sub-call #2 requests allowance' },
        { item: 'Unknown spender', points: 25, description: 'unverified address' },
        { item: 'Unverified router bytecode', points: 16, description: 'proxy pattern suspected' },
      ],
      stateDiffs: [
        {
          assetType: 'ERC20',
          assetName: 'USDC · allowance to 0x8888…8888',
          before: '0',
          after: 'unlimited',
          isDangerous: true,
          severity: 'HIGH',
        },
        {
          assetType: 'NATIVE',
          assetName: 'ETH balance',
          before: '2.3150',
          after: '2.3090',
          isDangerous: false,
          severity: 'LOW',
        },
      ],
      gasEstimate: '184,552',
      simulation: { status: 'SIMULATION_SUCCESS', executionTimeMs: 173 },
      attackGraph: {
        nodes: [
          { id: 'wallet', label: WALLET_SHORT, sublabel: 'Your wallet', kind: 'wallet' },
          { id: 'dapp', label: 'router-aggregator-swap.xyz', sublabel: 'Aggregator front-end', kind: 'dapp' },
          { id: 'router', label: 'Router', sublabel: 'multicall entry', kind: 'contract' },
          { id: 'usdc', label: 'USDC', sublabel: 'ERC-20 balance', kind: 'asset' },
          { id: 'spender', label: '0x8888…8888', sublabel: 'Hidden spender', kind: 'operator' },
        ],
        edges: [
          { from: 'wallet', to: 'dapp', label: 'visits' },
          { from: 'dapp', to: 'router', label: 'multicall' },
          { from: 'router', to: 'wallet', label: 'sub-call approval' },
          { from: 'wallet', to: 'usdc', label: 'holds' },
          { from: 'usdc', to: 'spender', label: 'allowance' },
        ],
      },
      darkWeb: TRACE_CRYPTOGROBBER,
    },
  },
  {
    id: 'UNKNOWN_FUNCTION',
    label: 'Unknown function call',
    tagline: 'Vector #8 · unidentified selector',
    description:
      'A selector Nemesis has never seen, against a contract with no public history. Honest uncertainty — flagged instead of guessed.',
    tone: 'mystery',
    method: 'eth_sendTransaction',
    origin: 'mystery-contract-page.xyz',
    target: MYSTERY,
    functionName: 'UNKNOWN SELECTOR 0xdeadbeef',
    calldata: '0xdeadbeef0102030405060708',
    value: '0 ETH',
    walletRequest: {
      method: 'eth_sendTransaction',
      params: [{ from: WALLET, to: MYSTERY, data: '0xdeadbeef0102030405060708' }],
    },
    report: {
      id: 'NMS-2026-000048',
      requestId: 'NMS-2026-000048',
      scenarioId: 'UNKNOWN_FUNCTION',
      riskScore: 44,
      severity: 'MEDIUM',
      recommendedDecision: 'WARN',
      humanSummary:
        'Nemesis cannot determine the exact contract intent from available ABI information. You can proceed — but you are signing something nobody can vouch for.',
      findings: [
        {
          severity: 'MEDIUM',
          title: 'Unknown function selector',
          humanExplanation:
            'Nemesis cannot identify this contract function. Signing an unknown function call carries additional risk because its true effect cannot be previewed.',
          evidence: 'selector 0xdeadbeef not in corpus',
          confidence: 80,
        },
        FINDING_UNVERIFIED_CONTRACT,
      ],
      evidence: [
        { item: 'Unknown selector', points: 24, description: '0xdeadbeef · not resolvable' },
        { item: 'Unverified contract', points: 20, description: 'no source, no history' },
      ],
      stateDiffs: [
        {
          assetType: 'NATIVE',
          assetName: 'ETH balance',
          before: '2.3150',
          after: '2.3149',
          isDangerous: false,
          severity: 'MEDIUM',
        },
      ],
      gasEstimate: '38,004',
      simulation: { status: 'SIMULATION_SUCCESS', executionTimeMs: 97 },
      attackGraph: {
        nodes: [
          { id: 'wallet', label: WALLET_SHORT, sublabel: 'Your wallet', kind: 'wallet' },
          { id: 'contract', label: '0x9999…9999', sublabel: 'Unverified contract', kind: 'contract' },
        ],
        edges: [{ from: 'wallet', to: 'contract', label: 'unknown call' }],
      },
    },
  },
];

/** The hero button launches the most dramatic attack first. */
export const DEFAULT_SCENARIO = SCENARIOS[0];

export function getScenario(id: string): DemoScenario {
  return SCENARIOS.find((s) => s.id === id) || DEFAULT_SCENARIO;
}

export function shortAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export const SEVERITY_STYLES: Record<
  DemoReport['severity'],
  { text: string; bg: string; border: string; dot: string; bar: string }
> = {
  CRITICAL: {
    text: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    dot: 'bg-red-500',
    bar: 'bg-gradient-to-r from-red-600 to-red-400',
  },
  HIGH: {
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400',
    bar: 'bg-gradient-to-r from-amber-600 to-amber-400',
  },
  MEDIUM: {
    text: 'text-yellow-300',
    bg: 'bg-yellow-400/10',
    border: 'border-yellow-400/30',
    dot: 'bg-yellow-300',
    bar: 'bg-gradient-to-r from-yellow-500 to-yellow-300',
  },
  LOW: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-400',
    bar: 'bg-gradient-to-r from-emerald-600 to-emerald-400',
  },
  INFO: {
    text: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    dot: 'bg-sky-400',
    bar: 'bg-gradient-to-r from-sky-600 to-sky-400',
  },
};
