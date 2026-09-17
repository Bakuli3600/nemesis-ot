import React from 'react';
import { GlassCard, RiskBadge } from '@cognitia/ui';
import { SimulationResult } from '@cognitia/core';
import { Cpu, CheckCircle2, XCircle, Gauge, Layers, PlayCircle, ShieldCheck, Info } from 'lucide-react';

interface SimulationSectionProps {
  simulationResult: SimulationResult | null;
  /** Trigger a deterministic scenario through the real pipeline — no wallet or funds needed. */
  onRunScenario?: (scenarioType: string) => void;
}

const SCENARIOS: Array<{ id: string; label: string; fn: string; tone: 'rose' | 'amber' | 'violet' | 'emerald' }> = [
  { id: 'NFT_APPROVAL', label: 'NFT drainer', fn: 'setApprovalForAll()', tone: 'rose' },
  { id: 'UNLIMITED_APPROVE', label: 'Unlimited approve', fn: 'approve(spender, max)', tone: 'amber' },
  { id: 'FAKE_REWARDS', label: 'Fake reward claim', fn: 'claimRewards() bait', tone: 'violet' },
  { id: 'SAFE_TRANSFER', label: 'Safe transfer', fn: '0.01 ETH → peer', tone: 'emerald' },
];

const TONES: Record<string, string> = {
  rose: 'border-rose-500/25 hover:bg-rose-500/[0.08] text-rose-300',
  amber: 'border-amber-500/25 hover:bg-amber-500/[0.08] text-amber-300',
  violet: 'border-violet-500/25 hover:bg-violet-500/[0.08] text-violet-300',
  emerald: 'border-emerald-500/25 hover:bg-emerald-500/[0.08] text-emerald-300',
};

export const SimulationSection: React.FC<SimulationSectionProps> = ({ simulationResult, onRunScenario }) => {
  if (!simulationResult) {
    return (
      <div className="space-y-4">
        <div className="py-8 px-4 text-center space-y-2">
          <Cpu className="w-8 h-8 text-slate-600 mx-auto" />
          <div className="text-xs font-bold text-slate-400">No Active Simulation</div>
          <p className="text-[11px] text-slate-500">
            Simulations run automatically when an outbound transaction request is intercepted.
          </p>
        </div>

        {/* Run a simulation without a real transaction — nothing is ever broadcast. */}
        {onRunScenario && (
          <GlassCard className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlayCircle className="h-4 w-4 text-slate-300" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
                  Run a simulation now
                </span>
              </div>
              <span className="rounded border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] text-amber-400">
                NO FUNDS NEEDED
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Injects a deterministic request into the live pipeline — full decode, simulate, diff
              and verdict. The request is <span className="text-slate-300">paused before your wallet
              ever sees it</span>, so nothing can be signed or broadcast.
            </p>

            <div className="space-y-1.5">
              {SCENARIOS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onRunScenario(v.id)}
                  className={`flex w-full items-center justify-between rounded-lg border bg-white/[0.02] px-3 py-2 text-left transition ${TONES[v.tone]}`}
                >
                  <span className="text-xs font-semibold">{v.label}</span>
                  <span className="font-mono text-[10px] opacity-60">{v.fn}</span>
                </button>
              ))}
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.06] p-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
              <span className="text-[10px] leading-snug text-slate-400">
                CONTINUE will forward the request to your wallet. With no wallet installed the demo
                provider rejects it loudly (code 4100) — the simulation result above is already
                complete either way.
              </span>
            </div>
          </GlassCard>
        )}
      </div>
    );
  }

  const isSuccess = simulationResult.status === 'SIMULATION_SUCCESS';

  return (
    <div className="space-y-4">
      {/* Simulation Header */}
      <GlassCard variant={isSuccess ? 'highlight' : 'critical'} className="p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isSuccess ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
            <span className="text-xs font-bold text-white uppercase">
              {simulationResult.status}
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 border border-slate-700 text-cyan-400">
            {simulationResult.mode.toUpperCase()} FORK BACKEND
          </span>
        </div>
        <p className="text-xs text-slate-300">{simulationResult.details}</p>
      </GlassCard>

      {/* Gas & Execution Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="p-3">
          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            GAS CONSUMPTION
          </div>
          <div className="text-sm font-bold font-mono text-slate-200 mt-1">
            {simulationResult.gasUsed || '21,000 gas'}
          </div>
        </GlassCard>
        <GlassCard className="p-3">
          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            LATENCY
          </div>
          <div className="text-sm font-bold font-mono text-purple-300 mt-1">
            {simulationResult.executionTimeMs} ms
          </div>
        </GlassCard>
      </div>

      {/* Pre & Post Balances Comparison */}
      <GlassCard className="p-3 space-y-3">
        <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">
          State Delta Snapshot
        </div>

        <div className="space-y-2 text-xs font-mono">
          <div className="p-2 rounded bg-black/40 border border-slate-800 flex justify-between items-center">
            <span className="text-slate-400">Native ETH Balance</span>
            <div>
              <span className="text-slate-300">{simulationResult.preState.nativeBalance} ETH</span>
              <span className="text-slate-600 mx-1.5">→</span>
              <span className="text-cyan-400 font-bold">{simulationResult.postState.nativeBalance} ETH</span>
            </div>
          </div>

          <div className="p-2 rounded bg-black/40 border border-slate-800 flex justify-between items-center">
            <span className="text-slate-400">BAYC #4819 Ownership</span>
            <div>
              <span className="text-slate-300">Wallet</span>
              <span className="text-slate-600 mx-1.5">→</span>
              <span className="text-amber-400 font-bold">
                {simulationResult.postState.erc721Tokens['0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d']?.length === 0
                  ? 'Transferred'
                  : 'Retained'}
              </span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Run another scenario without leaving the tab */}
      {onRunScenario && (
        <GlassCard className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <PlayCircle className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
              Run another scenario
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {SCENARIOS.map((v) => (
              <button
                key={v.id}
                onClick={() => onRunScenario(v.id)}
                className={`rounded-lg border bg-white/[0.02] px-2 py-1.5 text-[10px] font-semibold transition ${TONES[v.tone]}`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
};
