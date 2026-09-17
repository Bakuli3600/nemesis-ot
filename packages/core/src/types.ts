export type SecuritySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

/** Part 21 — explicit security states. ANALYSIS_UNAVAILABLE must never be read as SAFE. */
export type AnalysisStatus = 'SAFE' | 'WARNING' | 'HIGH_RISK' | 'CRITICAL' | 'ANALYSIS_UNAVAILABLE';

/** Part 15 — evidence level attached to every state-diff claim. */
export type EvidenceLevel = 'OBSERVED' | 'INFERRED' | 'UNKNOWN';

export type UserDecision = 'BLOCK' | 'CONTINUE';

export type RequestLifecycleState =
  | 'REQUEST_RECEIVED'
  | 'REQUEST_PAUSED'
  | 'REQUEST_ANALYZING'
  | 'REQUEST_SIMULATING'
  | 'REQUEST_RISK_ASSESSMENT'
  | 'USER_DECISION'
  | 'REQUEST_BLOCKED'
  | 'REQUEST_FORWARDING'
  | 'REQUEST_EXPIRED'
  | 'REQUEST_COMPLETED'
  | 'REQUEST_FAILED';

export interface BaseWalletRequest {
  id: string; // CNG-2026-000001
  origin: string; // example: "demo-dapp.local"
  timestamp: number;
  method: string;
}

export interface TransactionRequest extends BaseWalletRequest {
  type: 'TRANSACTION';
  method: 'eth_sendTransaction';
  from: string;
  to: string;
  value?: string;
  data?: string;
  chainId?: number | string;
  gas?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: string;
}

export interface SignatureRequest extends BaseWalletRequest {
  type: 'SIGNATURE';
  method: 'personal_sign' | 'eth_sign' | 'eth_signTypedData' | 'eth_signTypedData_v3' | 'eth_signTypedData_v4';
  from: string;
  domain?: {
    name?: string;
    version?: string;
    chainId?: number | string;
    verifyingContract?: string;
    salt?: string;
  };
  types?: Record<string, Array<{ name: string; type: string }>>;
  primaryType?: string;
  message?: any;
  rawPayload: any;
}

export type WalletRequest = TransactionRequest | SignatureRequest;

export interface SecurityFinding {
  id: string;
  severity: SecuritySeverity;
  title: string;
  technicalReason: string;
  humanExplanation: string;
  evidence: string;
  confidence: number; // 0 - 100
  recommendedAction: string;
  scoreContribution: number;
}

export interface RiskReport {
  score: number; // 0 - 100
  severity: SecuritySeverity;
  /** Part 21 — overall security state; ANALYSIS_UNAVAILABLE never means SAFE. */
  analysisStatus: AnalysisStatus;
  findings: SecurityFinding[];
  totalConfidence: number;
  recommendedDecision: 'BLOCK' | 'CONTINUE' | 'WARN';
  humanSummary: string;
  evidenceBreakdown: Array<{
    item: string;
    points: number;
    description: string;
  }>;
}

export type SimulationStatus =
  | 'SIMULATION_PENDING'
  | 'SIMULATION_SUCCESS'
  | 'SIMULATION_REVERTED'
  | 'SIMULATION_UNAVAILABLE'
  | 'SIMULATION_ERROR';

export interface StateSnapshot {
  nativeBalance: string; // in ETH, or 'UNKNOWN' when the read failed (Part 16)
  erc20Balances: Record<string, string>; // tokenAddress -> balance string or 'UNKNOWN'
  erc20Allowances: Record<string, Record<string, string>>; // tokenAddress -> spender -> allowance string or 'UNKNOWN'
  erc721Operators: Record<string, Record<string, boolean | 'UNKNOWN'>>; // nftContract -> operator -> approved or 'UNKNOWN'
  erc721Tokens: Record<string, string[]>; // nftContract -> tokenIds owned
}

export interface StateDiffItem {
  id: string;
  assetType: 'NATIVE' | 'ERC20' | 'ERC721' | 'ERC1155' | 'OPERATOR_APPROVAL' | 'OWNERSHIP';
  assetName: string;
  assetSymbol?: string;
  assetAddress?: string;
  tokenId?: string;
  before: string | boolean | number;
  after: string | boolean | number;
  changeDescription: string;
  severity: SecuritySeverity;
  isDangerous: boolean;
  affectedCount?: number;
  /** Part 15 — how the claim is supported. UI must render this distinction. */
  evidence?: EvidenceLevel;
  /** Optional explanation of what was directly observed vs inferred. */
  evidenceNote?: string;
}

export interface SimulationResult {
  status: SimulationStatus;
  mode: 'live' | 'demo';
  gasUsed?: string;
  gasLimit?: string;
  revertReason?: string;
  preState: StateSnapshot;
  postState: StateSnapshot;
  stateDiff: StateDiffItem[];
  executionTimeMs: number;
  details?: string;
  /** Part 21/24 — false when the analysis is partial (UNKNOWN values, RPC gaps). */
  analysisComplete?: boolean;
  /** Part 3 — provenance metadata for every simulation. */
  simulationMeta?: SimulationMeta;
}

export interface SimulationMeta {
  simulationId: string;
  chainId: number;
  forkBlock?: string;
  timestamp: number;
  from: string;
  to: string;
  value: string;
  data: string;
  rpcKind?: 'anvil-fork' | 'live-rpc' | 'demo';
  isolationMethod?: 'evm_snapshot_revert' | 'eth_call_readonly' | 'none';
  targetKind?: 'EOA' | 'CONTRACT' | 'UNKNOWN';
  proxy?: { isProxy: boolean; implementation?: string; slotStandard?: string };
}

export interface DecodedParam {
  name: string;
  type: string;
  value: any;
  humanReadable: string;
}

export interface DecodedCalldata {
  selector: string;
  isKnown: boolean;
  functionName: string;
  signature?: string;
  params: DecodedParam[];
  rawCalldata: string;
  abiConfidence: number; // 0 - 100
  notice?: string;
  isDangerousPattern: boolean;
}

export interface DecodedSignature {
  method: string;
  standard: 'PERSONAL_SIGN' | 'ETH_SIGN' | 'EIP_712' | 'UNKNOWN';
  humanReadableText?: string;
  domain?: any;
  verifyingContract?: string;
  primaryType?: string;
  permitSpender?: string;
  permitAmount?: string;
  permitDeadline?: string;
  isDangerousPattern: boolean;
  notice?: string;
  confidence: number;
}

export interface ThreatIndicator {
  id: string;
  type: 'CONTRACT_ADDRESS' | 'OPERATOR_ADDRESS' | 'FUNCTION_SELECTOR' | 'BYTECODE_HASH';
  value: string;
  threatFamily: string;
  severity: SecuritySeverity;
  confidence: number;
  description: string;
  source: string;
  lastUpdated: string;
}

export interface ThreatIntelResult {
  matches: ThreatIndicator[];
  isKnownThreat: boolean;
  threatFamily?: string;
  reputationScore: number; // 0 - 100 (100 = perfectly clean, 0 = malicious drainer)
  source: string;
  details: string;
}

export interface ThreatExposureRecord {
  id: string;
  target: string;
  threatCluster: string;
  severity: SecuritySeverity;
  confidence: number;
  source: string;
  observedDate: string;
  details: string;
  routeNodes: string[];
  isSimulated: boolean;
}

export interface ChainConfig {
  id: number;
  name: string;
  shortName: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeToken: {
    name: string;
    symbol: string;
    decimals: number;
  };
  isTestnet: boolean;
}

export interface RequestHistoryItem {
  id: string;
  timestamp: number;
  origin: string;
  method: string;
  chainId: number | string;
  target?: string;
  functionName?: string;
  riskScore: number;
  severity: SecuritySeverity;
  decision: UserDecision;
  simulationStatus: SimulationStatus;
  mode: 'live' | 'demo';
}

export interface CognitiaSettings {
  protectionEnabled: boolean;
  demoMode: boolean;
  riskSensitivity: 'LOW' | 'STANDARD' | 'PARANOID';
  showAdvancedDetails: boolean;
  activeChainId: number;
  customRpcUrl?: string;
}
