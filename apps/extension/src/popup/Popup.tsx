import React, { useEffect, useState } from 'react';
import { ShieldCheck, ExternalLink, Cpu } from 'lucide-react';

declare const browser: any;

const Popup: React.FC = () => {
  const [latestRisk, setLatestRisk] = useState<{ score: number; severity: string } | null>(null);
  const [blockedCount, setBlockedCount] = useState(0);
  const [protectionEnabled, setProtectionEnabled] = useState(true);
  const [demoMode, setDemoMode] = useState(true);

  useEffect(() => {
    chrome.storage.local.get(['requestHistory', 'cognitiaSettings'], (res) => {
      const history = res?.requestHistory || [];
      setBlockedCount(history.filter((h: { decision: string }) => h.decision === 'BLOCK').length);
      if (history.length > 0) {
        const latest = history[0];
        setLatestRisk({ score: latest.riskScore, severity: latest.severity });
      }
      if (res?.cognitiaSettings) {
        setProtectionEnabled(res.cognitiaSettings.protectionEnabled);
        setDemoMode(res.cognitiaSettings.demoMode);
      }
    });
  }, []);

  const severityColor =
    latestRisk?.severity === 'CRITICAL'
      ? 'text-red-400'
      : latestRisk?.severity === 'HIGH'
      ? 'text-amber-400'
      : 'text-emerald-400';

  const openSidePanel = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.windowId && chrome.sidePanel?.open) {
        // Chrome side panel
        chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
      } else if (browser?.sidebarAction) {
        // Firefox sidebar
        browser.sidebarAction.open().catch(() => {});
      } else if (browser?.runtime?.openOptionsPage) {
        // Fallback: open the Command Center in a tab
        const url = chrome.runtime.getURL('src/sidepanel/index.html');
        chrome.tabs.create({ url });
      }
    });
  };

  return (
    <div className="p-3.5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/30 to-cyan-900/30 border border-cyan-500/40 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-xs font-black tracking-wide text-white">NEMESIS</div>
            <div className="text-[9px] font-mono text-slate-400">TRANSACTION FIREWALL</div>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {protectionEnabled ? 'PROTECTED' : 'PAUSED'}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-lg bg-[#0d121d]/85 border border-slate-800/80">
          <div className="text-[9px] font-mono text-slate-400">WALLET</div>
          <div className="text-[11px] font-mono font-bold text-cyan-300 mt-0.5">0x5534...954d</div>
        </div>
        <div className="p-2.5 rounded-lg bg-[#0d121d]/85 border border-slate-800/80">
          <div className="text-[9px] font-mono text-slate-400">NETWORK</div>
          <div className="text-[11px] font-mono font-bold text-slate-200 mt-0.5">Sepolia</div>
        </div>
        <div className="p-2.5 rounded-lg bg-[#0d121d]/85 border border-slate-800/80">
          <div className="text-[9px] font-mono text-slate-400">THREATS BLOCKED</div>
          <div className={`text-sm font-black font-mono mt-0.5 ${blockedCount > 0 ? 'text-red-400' : 'text-slate-300'}`}>
            {blockedCount}
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-[#0d121d]/85 border border-slate-800/80">
          <div className="text-[9px] font-mono text-slate-400">LATEST RISK</div>
          <div className={`text-sm font-black font-mono mt-0.5 ${latestRisk ? severityColor : 'text-slate-500'}`}>
            {latestRisk ? `${latestRisk.score}/100` : '—'}
          </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-2">
        <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#0d121d]/85 border border-slate-800/80 cursor-pointer">
          <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            Protection
          </span>
          <input
            type="checkbox"
            checked={protectionEnabled}
            onChange={(e) => {
              const next = e.target.checked;
              setProtectionEnabled(next);
              chrome.storage.local.get(['cognitiaSettings'], (res) => {
                const updated = { ...(res?.cognitiaSettings || {}), protectionEnabled: next };
                chrome.storage.local.set({ cognitiaSettings: updated });
              });
            }}
            className="w-4 h-4 accent-cyan-500"
          />
        </label>
        <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#0d121d]/85 border border-slate-800/80 cursor-pointer">
          <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            Demo Mode
          </span>
          <input
            type="checkbox"
            checked={demoMode}
            onChange={(e) => {
              const next = e.target.checked;
              setDemoMode(next);
              chrome.storage.local.get(['cognitiaSettings'], (res) => {
                const updated = { ...(res?.cognitiaSettings || {}), demoMode: next };
                chrome.storage.local.set({ cognitiaSettings: updated });
              });
            }}
            className="w-4 h-4 accent-amber-500"
          />
        </label>
      </div>

      {/* Open Command Center */}
      <button
        onClick={openSidePanel}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white text-xs font-black tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/25 transition active:scale-95"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        OPEN COMMAND CENTER
      </button>

      {demoMode && (
        <div className="text-center text-[9px] font-mono text-amber-400/80">
          DEMO ENVIRONMENT — SIMULATED INTELLIGENCE
        </div>
      )}
    </div>
  );
};

export default Popup;
