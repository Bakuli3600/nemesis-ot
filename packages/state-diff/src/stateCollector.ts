import { StateSnapshot } from '@cognitia/core';
import { SecureRpcClient, isAddress } from '@cognitia/simulator';

/**
 * Part 16 — robust on-chain state collection.
 *
 * Contracts may revert, return malformed data, not implement the standard,
 * sit behind proxies, or be unreachable. A single failing query must never
 * crash the analysis: failed values are recorded as 'UNKNOWN' and the rest
 * of the pipeline treats them as unproven (see StateDiffEngine evidence levels).
 */

const ERC20_BALANCE_OF = '0x70a08231'; // balanceOf(address)
const ERC20_ALLOWANCE = '0xdd62ed3e'; // allowance(address,address)
const ERC721_OWNER_OF = '0x6352211e'; // ownerOf(uint256)
const ERC721_GET_APPROVED = '0x081812fc'; // getApproved(uint256)
const ERC721_IS_APPROVED_FOR_ALL = '0xe985e9c5'; // isApprovedForAll(address,address)

function decodeAddress(data: string): string | 'UNKNOWN' {
  if (typeof data !== 'string' || data.length < 66) return 'UNKNOWN';
  const word = data.slice(-40);
  if (!/^[0-9a-fA-F]{40}$/.test(word)) return 'UNKNOWN';
  const addr = '0x' + word;
  return BigInt(addr) === 0n ? 'UNKNOWN' : addr.toLowerCase();
}

function decodeUint(data: string): bigint | 'UNKNOWN' {
  if (typeof data !== 'string' || data.length < 66) return 'UNKNOWN';
  try {
    return BigInt(data);
  } catch {
    return 'UNKNOWN';
  }
}

function decodeBool(data: string): boolean | 'UNKNOWN' {
  const v = decodeUint(data);
  if (v === 'UNKNOWN') return 'UNKNOWN';
  return v !== 0n;
}

export class OnChainStateCollector {
  constructor(private readonly rpc: SecureRpcClient) {}

  /** Wrap a read-only eth_call so any failure yields 'UNKNOWN', never a throw. */
  private async safeCall(to: string, data: string): Promise<string | 'UNKNOWN'> {
    try {
      const res = await this.rpc.request<string>('eth_call', [{ to, data }, 'latest']);
      return typeof res === 'string' ? res : 'UNKNOWN';
    } catch {
      return 'UNKNOWN';
    }
  }

  async nativeBalance(address: string): Promise<string | 'UNKNOWN'> {
    try {
      const wei = await this.rpc.request<string>('eth_getBalance', [address, 'latest']);
      return (Number(BigInt(wei)) / 1e18).toFixed(6);
    } catch {
      return 'UNKNOWN';
    }
  }

  async erc20Balance(token: string, holder: string): Promise<string | 'UNKNOWN'> {
    if (!isAddress(token) || !isAddress(holder)) return 'UNKNOWN';
    const data = ERC20_BALANCE_OF + holder.toLowerCase().replace('0x', '').padStart(64, '0');
    const res = await this.safeCall(token, data);
    const v = decodeUint(res);
    return v === 'UNKNOWN' ? 'UNKNOWN' : v.toString();
  }

  async erc20Allowance(token: string, owner: string, spender: string): Promise<string | 'UNKNOWN'> {
    if (!isAddress(token) || !isAddress(owner) || !isAddress(spender)) return 'UNKNOWN';
    const ownerWord = owner.toLowerCase().replace('0x', '').padStart(64, '0');
    const spenderWord = spender.toLowerCase().replace('0x', '').padStart(64, '0');
    const res = await this.safeCall(token, ERC20_ALLOWANCE + ownerWord + spenderWord);
    const v = decodeUint(res);
    return v === 'UNKNOWN' ? 'UNKNOWN' : v.toString();
  }

  async erc721Owner(nft: string, tokenId: string): Promise<string | 'UNKNOWN'> {
    if (!isAddress(nft)) return 'UNKNOWN';
    const id = BigInt(tokenId).toString(16).padStart(64, '0');
    return decodeAddress(await this.safeCall(nft, ERC721_OWNER_OF + id));
  }

  async erc721GetApproved(nft: string, tokenId: string): Promise<string | 'UNKNOWN'> {
    if (!isAddress(nft)) return 'UNKNOWN';
    const id = BigInt(tokenId).toString(16).padStart(64, '0');
    return decodeAddress(await this.safeCall(nft, ERC721_GET_APPROVED + id));
  }

  async erc721IsApprovedForAll(nft: string, owner: string, operator: string): Promise<boolean | 'UNKNOWN'> {
    if (!isAddress(nft) || !isAddress(owner) || !isAddress(operator)) return 'UNKNOWN';
    const ownerWord = owner.toLowerCase().replace('0x', '').padStart(64, '0');
    const opWord = operator.toLowerCase().replace('0x', '').padStart(64, '0');
    return decodeBool(await this.safeCall(nft, ERC721_IS_APPROVED_FOR_ALL + ownerWord + opWord));
  }

  /**
   * Collect a baseline snapshot. Every entry records the value or 'UNKNOWN'.
   * Optionally probe specific token/allowance pairs the decoded calldata cares about.
   */
  async collect(
    owner: string,
    opts: {
      erc20Tokens?: string[];
      erc20Spenders?: string[];
      erc721Contracts?: string[];
      erc721Operators?: string[];
    } = {}
  ): Promise<StateSnapshot> {
    const snap: StateSnapshot = {
      nativeBalance: await this.nativeBalance(owner),
      erc20Balances: {},
      erc20Allowances: {},
      erc721Operators: {},
      erc721Tokens: {},
    };

    for (const token of opts.erc20Tokens || []) {
      snap.erc20Balances[token] = await this.erc20Balance(token, owner);
      snap.erc20Allowances[token] = {};
      for (const spender of opts.erc20Spenders || []) {
        snap.erc20Allowances[token][spender] = await this.erc20Allowance(token, owner, spender);
      }
    }

    for (const nft of opts.erc721Contracts || []) {
      snap.erc721Operators[nft] = {};
      for (const op of opts.erc721Operators || []) {
        snap.erc721Operators[nft][op] = await this.erc721IsApprovedForAll(nft, owner, op);
      }
      // Token ownership requires knowing token IDs — not enumerable via standard
      // ERC721. Left empty unless the caller supplies IDs explicitly.
      snap.erc721Tokens[nft] = [];
    }

    return snap;
  }
}
