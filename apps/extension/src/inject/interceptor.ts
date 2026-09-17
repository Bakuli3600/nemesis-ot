/**
 * Cognitia Shield - EIP-1193 MAIN World Provider Interceptor
 * Injected into the MAIN execution world at document_start.
 * Interposes window.ethereum.request without permanently altering or destroying original wallet state.
 *
 * Security properties (Parts 8, 9, 10, 11):
 *  - Original request objects are forwarded UNCHANGED on CONTINUE.
 *  - Request IDs cannot collide (counter + entropy suffix).
 *  - Concurrent requests are isolated in a keyed pending map.
 *  - Pending requests expire safely: expiry REJECTS (4001), never auto-continues.
 *  - Page navigation clears all pending requests (rejected, never forwarded).
 *  - Extension reload cannot approve anything: pending requests can only be
 *    resolved by an explicit decision message; expiry rejects them.
 *  - Unknown methods pass through untouched (policy).
 *  - BLOCK returns EIP-1193 code 4001; Cognitia never signs anything itself.
 *  - Provider identity is preserved per wrapped object (EIP-6963 aware); the
 *    provider object itself is never serialized through postMessage.
 */

(() => {
  if ((window as any).__COGNITIA_SHIELD_INSTALLED__) return;
  (window as any).__COGNITIA_SHIELD_INSTALLED__ = true;

  console.log('%c[Cognitia Shield]%c Web3 Transaction Firewall Active (MAIN World)', 'color: #06b6d4; font-weight: bold;', 'color: auto;');

  const REQUEST_TTL_MS = 8 * 60 * 1000; // Part 11 — 5-10 minute maximum lifetime

  interface PendingEntry {
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
    originalRequest: (args: any) => Promise<any>;
    args: any;
    providerName: string;
    timer: ReturnType<typeof setTimeout>;
  }

  const pendingRequests = new Map<string, PendingEntry>();

  const INTERCEPTED_METHODS = new Set([
    'eth_sendTransaction',
    'personal_sign',
    'eth_sign',
    'eth_signTypedData',
    'eth_signTypedData_v3',
    'eth_signTypedData_v4',
  ]);

  let requestCounter = 1;

  /** Collision-resistant ID: monotonic counter + entropy suffix. */
  function nextRequestId(): string {
    const entropy = Math.random().toString(36).slice(2, 8);
    return `NMS-2026-${String(requestCounter++).padStart(6, '0')}-${entropy}`;
  }

  function rejectAllPending(reason: string, code: number) {
    for (const [id, pending] of pendingRequests.entries()) {
      clearTimeout(pending.timer);
      pendingRequests.delete(id);
      const err: any = new Error(reason);
      err.code = code;
      try {
        pending.reject(err);
      } catch {
        // reject must never throw into the page's stack
      }
    }
  }

  // Part 8 — navigation cleans pending requests. Rejected, never forwarded.
  window.addEventListener('pagehide', () => {
    rejectAllPending('Cognitia Shield: page navigation cancelled the pending security review', 4001);
  });

  // Listen for user decision responses relayed from Content Script.
  // Strict message validation (Part 10): wrong shape or stale IDs are dropped.
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.target !== 'COGNITIA_MAIN_WORLD') {
      return;
    }

    const { type, id, decision, error } = event.data;

    if (type !== 'USER_DECISION_RESULT') return;
    if (typeof id !== 'string') return; // malformed — ignore
    if (decision !== 'BLOCK' && decision !== 'CONTINUE' && decision !== 'EXPIRED') return; // unknown policy

    const pending = pendingRequests.get(id);
    if (!pending) return; // stale / replayed response for an unknown request — ignore

    pendingRequests.delete(id);
    clearTimeout(pending.timer);

    if (decision === 'BLOCK') {
      const blockError: any = new Error(
        'Cognitia Shield: Transaction rejected by user (Security Firewall Block)'
      );
      blockError.code = 4001; // EIP-1193 userRejectedRequest
      pending.reject(blockError);
    } else if (decision === 'CONTINUE') {
      // Forward the ORIGINAL, unmodified request through the SAME provider
      // it was captured on (provider identity preserved — Part 9).
      pending
        .originalRequest(pending.args)
        .then((res: any) => pending.resolve(res))
        .catch((err: any) => pending.reject(err));
    } else {
      // EXPIRED — fail closed (Part 8/11): never forward automatically.
      const expiredError: any = new Error(
        error || 'Cognitia Shield: Security analysis expired. Please retry.'
      );
      expiredError.code = 4001;
      pending.reject(expiredError);
    }
  });

  function wrapProvider(provider: any, providerInfo?: { name?: string }) {
    if (!provider || provider.__isCognitiaWrapped) return provider;

    const originalRequest = provider.request ? provider.request.bind(provider) : null;
    if (!originalRequest) return provider;

    provider.__isCognitiaWrapped = true;
    provider.__cognitiaOriginalRequest = originalRequest;
    // Part 9 — preserve provider identity on the object (never serialized).
    provider.__cognitiaProviderName =
      providerInfo?.name || (provider.isMetaMask === true ? 'MetaMask or EIP-1193 wallet' : 'unknown EIP-1193 provider');

    provider.request = async function (args: { method: string; params?: any[] }) {
      if (!args || !args.method || !INTERCEPTED_METHODS.has(args.method)) {
        // Unknown / unintercepted methods pass through per policy.
        return originalRequest(args);
      }

      const id = nextRequestId();
      const origin = window.location.host || window.location.hostname || 'unknown-origin';

      // Dispatch request interception message to Content Script.
      // Only plain data crosses the boundary — never a provider reference.
      window.postMessage(
        {
          target: 'COGNITIA_CONTENT_SCRIPT',
          type: 'REQUEST_INTERCEPTED',
          id,
          origin,
          timestamp: Date.now(),
          providerName: provider.__cognitiaProviderName || 'unknown',
          args: { method: args.method, params: args.params },
        },
        '*'
      );

      // Return paused Promise awaiting user security review in Side Panel.
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          // Part 11 — expiry removes the request and REJECTS safely.
          // A timeout NEVER means CONTINUE.
          if (pendingRequests.has(id)) {
            pendingRequests.delete(id);
            const timeoutError: any = new Error(
              'Cognitia Shield: Security analysis expired. Please retry.'
            );
            timeoutError.code = 4001;
            reject(timeoutError);
          }
        }, REQUEST_TTL_MS);

        pendingRequests.set(id, {
          resolve,
          reject,
          originalRequest,
          args, // original object preserved for pristine forwarding
          providerName: provider.__cognitiaProviderName || 'unknown',
          timer,
        });
      });
    };

    return provider;
  }

  // Intercept window.ethereum property definition
  let currentEthereum = (window as any).ethereum;
  if (currentEthereum) {
    wrapProvider(currentEthereum);
  } else {
    // If no provider installed at document_start, provide a clearly-labeled demo provider
    // (enables interception demos without a wallet) and listen for real wallet injection.
    // It NEVER fakes success: non-demonstration methods are rejected explicitly.
    const demoProvider = {
      isMetaMask: false,
      isCognitiaDemoProvider: true,
      chainId: '0xaa36a7', // Sepolia
      selectedAddress: '0x5534a781298715EdfB42542a9b6d6168954de012',
      request: async (args: { method: string; params?: any[] }) => {
        if (args.method === 'eth_requestAccounts' || args.method === 'eth_accounts') {
          return ['0x5534a781298715EdfB42542a9b6d6168954de012'];
        }
        if (args.method === 'eth_chainId') {
          return '0xaa36a7';
        }
        // Fail loudly rather than pretend the request succeeded —
        // no real wallet is installed, so nothing can actually be signed or sent.
        const err: any = new Error(
          'Cognitia Shield demo provider: no real wallet installed. Interception analysis ran, but this request cannot be executed.'
        );
        err.code = 4100; // EIP-1193 unauthorized / provider unavailable
        throw err;
      },
      on: (_event: string, _callback: Function) => {},
      removeListener: (_event: string, _callback: Function) => {},
    };
    currentEthereum = demoProvider;
    wrapProvider(currentEthereum, { name: 'Cognitia Demo Provider' });
  }

  try {
    Object.defineProperty(window, 'ethereum', {
      configurable: true,
      enumerable: true,
      get() {
        return currentEthereum;
      },
      set(newProvider) {
        currentEthereum = wrapProvider(newProvider);
      },
    });
  } catch (e) {
    console.warn('[Cognitia Shield] Could not defineProperty on window.ethereum', e);
  }

  // EIP-6963 multi-provider support: wrap each announced provider and keep its
  // identity. Requests always return through the provider they arrived on.
  window.addEventListener('eip6963:announceProvider', (event: any) => {
    if (event.detail && event.detail.provider) {
      wrapProvider(event.detail.provider, { name: event.detail?.info?.name || 'EIP-6963 wallet' });
    }
  });
})();
