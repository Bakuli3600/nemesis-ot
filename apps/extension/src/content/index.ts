/**
 * Cognitia Shield Content Script (Isolated World)
 * Bridges window postMessages with Background Service Worker and renders in-page HUD badge.
 */

(() => {
  // Inject MAIN world script explicitly if not auto-injected by manifest world: MAIN
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('src/inject/interceptor.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  } catch {
    // Handled by manifest content_scripts
  }

  // Create In-Page HUD Badge
  const badgeContainer = document.createElement('div');
  badgeContainer.id = 'cognitia-shield-hud';
  badgeContainer.style.cssText = `
    position: fixed;
    top: 14px;
    right: 14px;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
    font-size: 11px;
    color: #f8fafc;
    background: rgba(10, 15, 29, 0.88);
    border: 1px solid rgba(6, 182, 212, 0.4);
    backdrop-filter: blur(12px);
    border-radius: 9999px;
    padding: 6px 14px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    user-select: none;
    transition: all 0.25s ease;
  `;

  badgeContainer.innerHTML = `
    <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981;"></span>
    <span style="font-weight: 700; letter-spacing: 0.05em; color: #06b6d4;">NEMESIS</span>
    <span style="opacity: 0.6;">|</span>
    <span id="cognitia-hud-status" style="color: #94a3b8;">PROTECTED</span>
  `;

  badgeContainer.addEventListener('click', () => {
    try {
      const result = chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' });
      if (result && typeof (result as Promise<void>).catch === 'function') {
        (result as Promise<void>).catch(() => {});
      }
    } catch {
      // Extension context gone (e.g. during reload)
    }
  });

  if (document.body) {
    document.body.appendChild(badgeContainer);
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(badgeContainer);
    });
  }

  function updateHud(statusText: string, color: string, isPulsing = false) {
    const statusEl = document.getElementById('cognitia-hud-status');
    if (statusEl) {
      statusEl.textContent = statusText;
      statusEl.style.color = color;
      if (isPulsing) {
        badgeContainer.style.borderColor = color;
        badgeContainer.style.boxShadow = `0 0 16px ${color}`;
      } else {
        badgeContainer.style.borderColor = 'rgba(6, 182, 212, 0.4)';
        badgeContainer.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.45)';
      }
    }
  }

  // Listen for intercepted requests from MAIN world.
  // Part 10 — only well-formed messages are relayed; the orchestrator validates again.
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.target !== 'COGNITIA_CONTENT_SCRIPT') {
      return;
    }

    if (event.data.type === 'REQUEST_INTERCEPTED') {
      const d = event.data;
      const shapeOk =
        typeof d.id === 'string' &&
        typeof d.origin === 'string' &&
        typeof d.timestamp === 'number' &&
        d.args && typeof d.args.method === 'string' &&
        (d.args.params === undefined || Array.isArray(d.args.params));
      if (!shapeOk) {
        console.warn('[Cognitia Shield] Malformed interception message dropped.');
        return;
      }
      updateHud('ANALYZING THREAT...', '#f59e0b', true);
      try {
        const result = chrome.runtime.sendMessage(event.data);
        if (result && typeof (result as Promise<void>).catch === 'function') {
          (result as Promise<void>).catch(() => {});
        }
      } catch {
        // Background not reachable (reload in progress)
      }
    }
  });

  // Listen for decision relay from Background Service Worker
  chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
    if (message?.target === 'COGNITIA_MAIN_WORLD') {
      if (message.type === 'USER_DECISION_RESULT') {
        if (message.decision === 'BLOCK') {
          updateHud('BLOCKED BY SHIELD', '#ef4444', true);
          setTimeout(() => updateHud('PROTECTED', '#94a3b8', false), 3500);
        } else {
          updateHud('FORWARDED TO WALLET', '#10b981', false);
          setTimeout(() => updateHud('PROTECTED', '#94a3b8', false), 3500);
        }
      }
      window.postMessage(message, '*');
    }
  });
})();
