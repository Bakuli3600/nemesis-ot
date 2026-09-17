export interface SelectorDefinition {
  selector: string;
  name: string;
  signature: string;
  type: 'ERC20' | 'ERC721' | 'ERC1155' | 'DEFI' | 'PERMIT' | 'CUSTOM';
  abiFragment: string;
  isApprovalOrTransfer: boolean;
}

export const KNOWN_SELECTORS: Record<string, SelectorDefinition> = {
  // ERC-20
  '0xa9059cbb': {
    selector: '0xa9059cbb',
    name: 'transfer',
    signature: 'transfer(address,uint256)',
    type: 'ERC20',
    abiFragment: 'function transfer(address to, uint256 value) returns (bool)',
    isApprovalOrTransfer: true,
  },
  '0x095ea7b3': {
    selector: '0x095ea7b3',
    name: 'approve',
    signature: 'approve(address,uint256)',
    type: 'ERC20',
    abiFragment: 'function approve(address spender, uint256 value) returns (bool)',
    isApprovalOrTransfer: true,
  },
  '0x23b872dd': {
    selector: '0x23b872dd',
    name: 'transferFrom',
    signature: 'transferFrom(address,address,uint256)',
    type: 'ERC20',
    abiFragment: 'function transferFrom(address from, address to, uint256 value) returns (bool)',
    isApprovalOrTransfer: true,
  },
  '0x39509351': {
    selector: '0x39509351',
    name: 'increaseAllowance',
    signature: 'increaseAllowance(address,uint256)',
    type: 'ERC20',
    abiFragment: 'function increaseAllowance(address spender, uint256 addedValue) returns (bool)',
    isApprovalOrTransfer: true,
  },
  '0xa457c2d7': {
    selector: '0xa457c2d7',
    name: 'decreaseAllowance',
    signature: 'decreaseAllowance(address,uint256)',
    type: 'ERC20',
    abiFragment: 'function decreaseAllowance(address spender, uint256 subtractedValue) returns (bool)',
    isApprovalOrTransfer: true,
  },
  '0xd505accf': {
    selector: '0xd505accf',
    name: 'permit',
    signature: 'permit(address,address,uint256,uint256,uint8,bytes32,bytes32)',
    type: 'PERMIT',
    abiFragment: 'function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)',
    isApprovalOrTransfer: true,
  },

  // ERC-721 / ERC-1155
  '0xa22cb465': {
    selector: '0xa22cb465',
    name: 'setApprovalForAll',
    signature: 'setApprovalForAll(address,bool)',
    type: 'ERC721',
    abiFragment: 'function setApprovalForAll(address operator, bool approved)',
    isApprovalOrTransfer: true,
  },
  '0x42842e0e': {
    selector: '0x42842e0e',
    name: 'safeTransferFrom',
    signature: 'safeTransferFrom(address,address,uint256)',
    type: 'ERC721',
    abiFragment: 'function safeTransferFrom(address from, address to, uint256 tokenId)',
    isApprovalOrTransfer: true,
  },
  '0xb88d4fde': {
    selector: '0xb88d4fde',
    name: 'safeTransferFrom',
    signature: 'safeTransferFrom(address,address,uint256,bytes)',
    type: 'ERC721',
    abiFragment: 'function safeTransferFrom(address from, address to, uint256 tokenId, bytes data)',
    isApprovalOrTransfer: true,
  },
  '0xf242432a': {
    selector: '0xf242432a',
    name: 'safeTransferFrom',
    signature: 'safeTransferFrom(address,address,uint256,uint256,bytes)',
    type: 'ERC1155',
    abiFragment: 'function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes data)',
    isApprovalOrTransfer: true,
  },
  '0x2eb2c2d6': {
    selector: '0x2eb2c2d6',
    name: 'safeBatchTransferFrom',
    signature: 'safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)',
    type: 'ERC1155',
    abiFragment: 'function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] values, bytes data)',
    isApprovalOrTransfer: true,
  },

  // MultiCall & Claims
  '0x5ae401dc': {
    selector: '0x5ae401dc',
    name: 'multicall',
    signature: 'multicall(bytes[])',
    type: 'DEFI',
    abiFragment: 'function multicall(bytes[] data) returns (bytes[] results)',
    isApprovalOrTransfer: false,
  },
  '0xac9650d8': {
    selector: '0xac9650d8',
    name: 'multicall',
    signature: 'multicall(uint256,bytes[])',
    type: 'DEFI',
    abiFragment: 'function multicall(uint256 deadline, bytes[] data) returns (bytes[] results)',
    isApprovalOrTransfer: false,
  },
  '0x379607f5': {
    selector: '0x379607f5',
    name: 'claimRewards',
    signature: 'claimRewards()',
    type: 'CUSTOM',
    abiFragment: 'function claimRewards()',
    isApprovalOrTransfer: false,
  },
  '0x4e71d92d': {
    selector: '0x4e71d92d',
    name: 'claim',
    signature: 'claim()',
    type: 'CUSTOM',
    abiFragment: 'function claim()',
    isApprovalOrTransfer: false,
  },
};
