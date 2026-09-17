export function shortenAddress(address: string | undefined, chars = 4): string {
  if (!address) return '0x000...0000';
  if (address.length < chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function isZeroAddress(address: string | undefined): boolean {
  if (!address) return true;
  return address.toLowerCase() === '0x0000000000000000000000000000000000000000';
}

export function isMaxUint256(value: string | bigint | number | undefined): boolean {
  if (!value) return false;
  const str = value.toString().toLowerCase();
  if (str === '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff') return true;
  if (str === '115792089237316195423570985008687907853269984665640564039457584007913129639935') return true;
  // Also flag values exceedingly large (e.g. > 10^30)
  try {
    const bi = BigInt(str);
    return bi > BigInt('1000000000000000000000000000000000000000000000000');
  } catch {
    return false;
  }
}

let requestCounter = 1;
export function generateRequestId(): string {
  const padded = String(requestCounter++).padStart(6, '0');
  return `NMS-2026-${padded}`;
}

export function formatWeiToEth(weiValue: string | number | bigint | undefined): string {
  if (!weiValue || weiValue === '0' || weiValue === '0x0') return '0 ETH';
  try {
    const bi = BigInt(weiValue.toString());
    const eth = Number(bi) / 1e18;
    return `${eth.toFixed(4).replace(/\.?0+$/, '')} ETH`;
  } catch {
    return `${weiValue} wei`;
  }
}

export function safeJsonParse<T>(input: string, fallback: T): T {
  try {
    return JSON.parse(input);
  } catch {
    return fallback;
  }
}
