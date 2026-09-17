import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  LayoutDashboard,
  Radar,
  Cpu,
  GitCompare,
  Database,
  Network,
  Globe,
  History,
  Settings,
} from 'lucide-react';
import { ActiveRequestState } from '../types';
import { getChainConfig, generateRequestId } from '@cognitia/shared';

import { OverviewSection } from './components/OverviewSection';
import { LiveRequestSection } from './components/LiveRequestSection';
import { SimulationSection } from './components/SimulationSection';
import { StateDiffSection } from './components/StateDiffSection';
import { ThreatIntelSection } from './components/ThreatIntelSection';
import { AttackPathSection } from './components/AttackPathSection';
import { ExposureSection } from './components/ExposureSection';
import { HistorySection } from './components/HistorySection';
import { SettingsSection } from './components/SettingsSection';

type TabKey =
  | 'OVERVIEW'
  | 'LIVE_REQUEST'
  | 'SIMULATION'
  | 'STATE_DIFF'
  | 'THREAT_INTEL'
  | 'ATTACK_PATH'
  | 'EXPOSURE'
  | 'HISTORY'
  | 'SETTINGS';

const NAV_ITEMS: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: 'OVERVIEW', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { key: 'LIVE_REQUEST', label: 'Live Request', icon: <Radar className="w-4 h-4" /> },
  { key: 'SIMULATION', label: 'Simulation', icon: <Cpu className="w-4 h-4" /> },
  { key: 'STATE_DIFF', label: 'State Diff', icon: <GitCompare className="w-4 h-4" /> },
  { key: 'THREAT_INTEL', label: 'Threat Intel', icon: <Database className="w-4 h-4" /> },
  { key: 'ATTACK_PATH', label: 'Attack Path', icon: <Network className="w-4 h-4" /> },
  { key: 'EXPOSURE', label: 'Exposure', icon: <Globe className="w-4 h-4" /> },
  { key: 'HISTORY', label: 'History', icon: <History className="w-4 h-4" /> },
  { key: 'SETTINGS', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

// Deterministic demo scenario payloads injected through the real interceptor path
const DEMO_SCENARIOS: Record<string, { to: string; data: string; value?: string }> = {
  SAFE_TRANSFER: {
    to: '0x1234567890123456789012345678901234567890',
    data: '0x',
    value: '0x2386f26fc10000', // 0.01 ETH
  },
  UNLIMITED_APPROVE: {
    to: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
    data: '0x095ea7b30000000000000000000000008888888888888888888888888888888888888888ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  },
  NFT_APPROVAL: {
    to: '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d', // BAYC
    data: '0xa22cb46500000000000000000000000066666666666666666666666666666666666666660000000000000000000000000000000000000000000000000000000000000001',
  },
  FAKE_REWARDS: {
    to: '0x7777777777777777777777777777777777777777', // FakeRewards.sol
    data: '0x379607f5', // claimRewards()
  },
  MULTICALL: {
    to: '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45',
    data: '0xac9650d80000000000000000000000000000000000000000000000000000000000000001',
  },
  UNKNOWN_FUNCTION: {
    to: '0x9999999999999999999999999999999999999999',
    data: '0x12345678abcdef0000',
  },
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('OVERVIEW');
  const [activeRequest, setActiveRequest] = useState<ActiveRequestState | null>(null);
  const [blockedCount, setBlockedCount] = useState(0);
  const [inspectedCount, setInspectedCount] = useState(0);

  // Poll background service worker for live pipeline state
  const pollState = useCallback(() => {
    try {
      chrome.runtime.sendMessage({ type: 'GET_LATEST_ACTIVE_REQUEST' }, (res) => {
        if (chrome.runtime.lastError) return;
        if (res?.request) setActiveRequest(res.request);
      });
      chrome.storage.local.get(['requestHistory'], (res) => {
        const history = res?.requestHistory || [];
        setInspectedCount(history.length);
        setBlockedCount(history.filter((h: { decision: string }) => h.decision === 'BLOCK').length);
      });
    } catch {
      // Sidepanel opened outside extension context; stay idle
    }
  }, []);

  useEffect(() => {
    pollState();
    const interval = setInterval(pollState, 800);
    return () => clearInterval(interval);
  }, [pollState]);

  // Inject test vectors straight into the background pipeline.
  // (window.ethereum does not exist inside extension pages — the full
  // MAIN-world interception path is exercised via the demo dApp instead.)
  const triggerScenario = useCallback((scenarioType: string) => {
    const WALLET = '0x5534a781298715EdfB42542a9b6d6168954de012';
    let args: { method: string; params?: unknown[] } | null = null;

    const scenario = DEMO_SCENARIOS[scenarioType];
    if (scenario) {
      args = {
        method: 'eth_sendTransaction',
        params: [{ from: WALLET, ...scenario }],
      };
    } else if (scenarioType === 'PERSONAL_SIGN') {
      const message = 'Claim your Cognitia test rewards by signing this approval.';
      args = {
        method: 'personal_sign',
        params: [
          `0x${Array.from(new TextEncoder().encode(message))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')}`,
          WALLET,
        ],
      };
    } else if (scenarioType === 'EIP712_PERMIT') {
      args = {
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
              verifyingContract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            },
            message: {
              owner: WALLET,
              spender: '0x8888888888888888888888888888888888888888',
              value:
                '115792089237316195423570985008687907853269984665640564039457584007913129639935',
              deadline: '1799999999',
            },
          }),
        ],
      };
    }

    if (args) {
      chrome.runtime.sendMessage({
        type: 'REQUEST_INTERCEPTED',
        id: generateRequestId(),
        origin: 'cognitia-sidepanel.demo',
        timestamp: Date.now(),
        args,
      });
    }

    setActiveTab('LIVE_REQUEST');
  }, []);

  const handleDecision = useCallback((id: string, decision: 'BLOCK' | 'CONTINUE') => {
    chrome.runtime.sendMessage({ type: 'USER_DECISION', id, decision }, () => {
      void chrome.runtime.lastError;
    });
  }, []);

  const latestDiff = activeRequest?.simulationResult?.stateDiff || [];

  return (
    <div className="min-h-screen w-full bg-[#050811] text-slate-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-[#070b16]/95 backdrop-blur-xl px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/30 to-cyan-900/30 border border-cyan-500/40 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wide text-white leading-none">
                NEMESIS
              </h1>
              <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                WEB3 TRANSACTION FIREWALL
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2 py-1 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              PROTECTED
            </span>
            <span className="text-[9px] font-mono text-amber-400/90 bg-amber-950/40 border border-amber-900/50 px-1.5 py-1 rounded-md">
              DEMO MODE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-slate-400">
          <span>
            WALLET:{' '}
            <span className="text-cyan-300">0x5534...954d</span>
          </span>
          <span className="text-slate-700">|</span>
          <span>
            NETWORK: <span className="text-slate-200">{getChainConfig(11155111).shortName.toUpperCase()}</span>
          </span>
        </div>
      </header>

      {/* Navigation */}
      <nav className="sticky top-[72px] z-10 flex gap-1 overflow-x-auto px-3 py-2 bg-[#070b16]/90 backdrop-blur-lg border-b border-slate-800/60 no-scrollbar">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveTab(item.key)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
              activeTab === item.key
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
            }`}
          >
            {item.icon}
            {item.label}
            {item.key === 'LIVE_REQUEST' && activeRequest && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 px-3 py-4 max-w-lg w-full mx-auto pb-10">
        {activeTab === 'OVERVIEW' && (
          <OverviewSection
            onTriggerScenario={triggerScenario}
            blockedCount={blockedCount}
            inspectedCount={inspectedCount}
            mode={activeRequest?.simulationResult?.simulationMeta?.rpcKind === 'anvil-fork' ? 'ANVIL' : activeRequest?.simulationResult?.mode === 'live' ? 'LIVE' : 'DEMO'}
            rpcConnected={activeRequest?.simulationResult?.simulationMeta?.rpcKind !== undefined}
            forkBlock={activeRequest?.simulationResult?.simulationMeta?.forkBlock}
            analysisStatus={activeRequest?.riskReport?.analysisStatus}
            analysisComplete={activeRequest?.simulationResult?.analysisComplete !== false}
          />
        )}
        {activeTab === 'LIVE_REQUEST' && (
          <LiveRequestSection
            activeRequest={activeRequest}
            onDecision={handleDecision}
            onViewAttackPath={() => setActiveTab('ATTACK_PATH')}
          />
        )}
        {activeTab === 'SIMULATION' && (
          <SimulationSection
            simulationResult={activeRequest?.simulationResult || null}
            onRunScenario={triggerScenario}
          />
        )}
        {activeTab === 'STATE_DIFF' && <StateDiffSection stateDiffs={latestDiff} />}
        {activeTab === 'THREAT_INTEL' && <ThreatIntelSection />}
        {activeTab === 'ATTACK_PATH' && <AttackPathSection />}
        {activeTab === 'EXPOSURE' && <ExposureSection />}
        {activeTab === 'HISTORY' && <HistorySection />}
        {activeTab === 'SETTINGS' && <SettingsSection />}
      </main>

      {/* Footer status bar */}
      <footer className="sticky bottom-0 border-t border-slate-800/70 bg-[#070b16]/95 backdrop-blur-xl px-4 py-2 flex items-center justify-between text-[9px] font-mono text-slate-500">
        <span>
          MODE: <span className="text-amber-400">DEMO / SIMULATED INTELLIGENCE</span>
        </span>
        <span>v1.0.0 — Cognitia 2026</span>
      </footer>
    </div>
  );
};

export default App;
