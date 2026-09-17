import { ChainConfig } from '@cognitia/core';

export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  1: {
    id: 1,
    name: 'Ethereum Mainnet',
    shortName: 'Ethereum',
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    nativeToken: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    isTestnet: false,
  },
  11155111: {
    id: 11155111,
    name: 'Sepolia Testnet',
    shortName: 'Sepolia',
    rpcUrl: 'https://rpc.sepolia.org',
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeToken: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    isTestnet: true,
  },
  8453: {
    id: 8453,
    name: 'Base Mainnet',
    shortName: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    nativeToken: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    isTestnet: false,
  },
  84532: {
    id: 84532,
    name: 'Base Sepolia Testnet',
    shortName: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    explorerUrl: 'https://sepolia.basescan.org',
    nativeToken: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    isTestnet: true,
  },
  137: {
    id: 137,
    name: 'Polygon PoS',
    shortName: 'Polygon',
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    nativeToken: { name: 'Polygon', symbol: 'POL', decimals: 18 },
    isTestnet: false,
  },
  80002: {
    id: 80002,
    name: 'Polygon Amoy Testnet',
    shortName: 'Amoy',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    explorerUrl: 'https://amoy.polygonscan.com',
    nativeToken: { name: 'Polygon', symbol: 'POL', decimals: 18 },
    isTestnet: true,
  },
};

export function getChainConfig(chainId: number | string | undefined): ChainConfig {
  if (!chainId) return SUPPORTED_CHAINS[11155111]; // default Sepolia
  const idNum = typeof chainId === 'string' ? (chainId.startsWith('0x') ? parseInt(chainId, 16) : parseInt(chainId, 10)) : chainId;
  return SUPPORTED_CHAINS[idNum] || {
    id: idNum,
    name: `Chain #${idNum}`,
    shortName: `Chain ${idNum}`,
    rpcUrl: 'https://rpc.sepolia.org',
    explorerUrl: 'https://etherscan.io',
    nativeToken: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    isTestnet: true,
  };
}
