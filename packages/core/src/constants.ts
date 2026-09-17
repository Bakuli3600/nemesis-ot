import { CognitiaSettings } from './types';

export const RISK_THRESHOLDS = {
  LOW: { min: 0, max: 20 },
  MEDIUM: { min: 21, max: 45 },
  HIGH: { min: 46, max: 70 },
  CRITICAL: { min: 71, max: 100 },
} as const;

export const DEFAULT_SETTINGS: CognitiaSettings = {
  protectionEnabled: true,
  demoMode: true, // Defaults to enabled for hackathon evaluation
  riskSensitivity: 'STANDARD',
  showAdvancedDetails: true,
  activeChainId: 11155111, // Sepolia
};

export const STANDARD_SELECTORS = {
  // ERC20
  ERC20_TRANSFER: '0xa9059cbb',
  ERC20_APPROVE: '0x095ea7b3',
  ERC20_TRANSFER_FROM: '0x23b872dd',
  ERC20_INCREASE_ALLOWANCE: '0x39509351',
  ERC20_DECREASE_ALLOWANCE: '0xa457c2d7',
  ERC20_PERMIT: '0xd505accf',

  // ERC721
  ERC721_SET_APPROVAL_FOR_ALL: '0xa22cb465',
  ERC721_APPROVE: '0x095ea7b3',
  ERC721_SAFE_TRANSFER_FROM: '0x42842e0e',
  ERC721_SAFE_TRANSFER_FROM_DATA: '0xb88d4fde',
  ERC721_TRANSFER_FROM: '0x23b872dd',

  // ERC1155
  ERC1155_SET_APPROVAL_FOR_ALL: '0xa22cb465',
  ERC1155_SAFE_TRANSFER_FROM: '0xf242432a',
  ERC1155_SAFE_BATCH_TRANSFER_FROM: '0x2eb2c2d6',

  // Common Malicious / Multi-call
  MULTICALL_NO_PARAM: '0xac9650d8',
  MULTICALL_WITH_BYTES: '0x5ae401dc',
  CLAIM_REWARDS: '0x379607f5',
  CLAIM: '0x4e71d92d',
} as const;

export const MAX_UINT256_HEX = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
export const MAX_UINT256_STR = '115792089237316195423570985008687907853269984665640564039457584007913129639935';

export const INTERCEPTED_METHODS = [
  'eth_sendTransaction',
  'personal_sign',
  'eth_sign',
  'eth_signTypedData',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
] as const;
