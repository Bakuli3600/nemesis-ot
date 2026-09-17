import React from 'react';
import { ShieldCheck, AlertTriangle, Activity, Database, PlayCircle } from 'lucide-react';
import { shortenAddress } from '@cognitia/shared';
import { AnalysisStatus } from '@cognitia/core';

interface OverviewSectionProps {
  onTriggerScenario: (scenarioType: string) => void;
  walletAddress?: string;
  networkName?: string;
  blockedCount?: number;
  inspectedCount?: number;
  /** Part 24 — live status fields. */
  mode?: 'LIVE' | 'ANVIL' | 'DEMO';
  rpcConnected?: boolean;
  forkBlock?: string;
  analysisStatus?: AnalysisStatus;
  analysisComplete?: boolean;
}

/** Deterministic 14-day sparkline (blocked vs inspected), shifted so the
 *  latest window reflects the live counters. */
function Sparkline({ blocked, inspected }: { blocked: number; inspected: number }) {
  const base = [6, 9, 4, 11, 7, 12, 8, 14, 9, 13, 10, 16, 12, 15];
  const series = [...base.slice(1), Math.max(blocked, 1)];
  const max = Math.max(...series, 4);
  const W = 240;
  const H = 56;
  const pts = series
    .map((v, i) => `${(i * W) / (series.length - 1)},${H - 6 - (v / max) * (H - 14)}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-14 w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,${H} ${pts} ${W},${H}`} fill="url(#sparkFill)" stroke="none" />
      <polyline
        points={pts}
        fill="none"
        stroke="#f43f5e"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={W}
        cy={H - 6 - (Math.max(blocked, 1) / max) * (H - 14)}
        r="2.5"
        fill="#f43f5e"
      />
    </svg>
  );
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  onTriggerScenario,
  walletAddress = '0x5534a781298715EdfB42542a9b6d6168954de012',
  networkName = 'Sepolia Testnet (11155111)',
  blockedCount = 14,
  inspectedCount = 49,
  mode = 'DEMO',
  rpcConnected = false,
  forkBlock,
  analysisStatus,
  analysisComplete = true,
}) => {
  const blockRate = inspectedCount > 0 ? Math.round((blockedCount / inspectedCount) * 100) : 0;

  const modeTone =
    mode === 'LIVE' ? 'text-emerald-400 border-emerald-500/25 bg-emerald-500/10' : mode === 'ANVIL' ? 'text-cyan-400 border-cyan-500/25 bg-cyan-500/10' : 'text-amber-400 border-amber-500/25 bg-amber-500/10';

  return (
    <div className="space-y-4">
      {/* ── Protection status ─────────────────────────────────────── */}
      <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.07] to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Protection active</div>
              <div className="text-[11px] text-slate-400">
                All wallet requests pass through Nemesis before signing
              </div>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 font-mono text-[9px] font-bold tracking-wide text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            LIVE
          </span>
        </div>

        {/* 14-day blocked trend */}
        <div className="mt-3 border-t border-white/5 pt-3">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>BLOCKED · LAST 14 DAYS</span>
            <span className="text-rose-400">↑ trend</span>
          </div>
          <Sparkline blocked={blockedCount} inspected={inspectedCount} />
        </div>
      </div>

      {/* ── Session counters ──────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
          <div className="text-[9px] font-mono uppercase tracking-wider text-slate-500">Inspected</div>
          <div className="mt-1 font-mono text-xl font-bold text-sky-300">{inspectedCount}</div>
          <div className="text-[9px] text-slate-500">requests</div>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-3">
          <div className="text-[9px] font-mono uppercase tracking-wider text-rose-400/80">Blocked</div>
          <div className="mt-1 font-mono text-xl font-bold text-rose-400">{blockedCount}</div>
          <div className="text-[9px] text-rose-400/70">malicious</div>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
          <div className="text-[9px] font-mono uppercase tracking-wider text-slate-500">Block rate</div>
          <div className="mt-1 font-mono text-xl font-bold text-amber-400">{blockRate}%</div>
          <div className="text-[9px] text-slate-500">of inspected</div>
        </div>
      </div>

      {/* ── Wallet / network ──────────────────────────────────────── */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
        <div className="flex items-center justify-between py-1">
          <span className="text-[11px] text-slate-400">Wallet</span>
          <span className="flex items-center gap-2 font-mono text-[11px] text-slate-200">
            {shortenAddress(walletAddress, 5)}
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">
              GUARDED
            </span>
          </span>
        </div>
        <div className="border-t border-white/5" />
        <div className="flex items-center justify-between py-1 pt-2">
          <span className="text-[11px] text-slate-400">Network</span>
          <span className="font-mono text-[11px] text-slate-200">{networkName}</span>
        </div>
        <div className="border-t border-white/5" />
        {/* Part 24 — mode / RPC / fork block status */}
        <div className="flex items-center justify-between py-1 pt-2">
          <span className="text-[11px] text-slate-400">Mode</span>
          <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold ${modeTone}`}>{mode}</span>
        </div>
        <div className="border-t border-white/5" />
        <div className="flex items-center justify-between py-1 pt-2">
          <span className="text-[11px] text-slate-400">RPC</span>
          <span className={`flex items-center gap-1.5 font-mono text-[11px] ${rpcConnected ? 'text-emerald-400' : 'text-slate-500'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${rpcConnected ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            {rpcConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>
        {mode === 'ANVIL' && forkBlock && (
          <>
            <div className="border-t border-white/5" />
            <div className="flex items-center justify-between py-1 pt-2">
              <span className="text-[11px] text-slate-400">Fork block</span>
              <span className="font-mono text-[11px] text-slate-200">{Number(forkBlock)}</span>
            </div>
          </>
        )}
        {(!analysisComplete || analysisStatus === 'ANALYSIS_UNAVAILABLE') && (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 p-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span className="text-[11px] leading-snug text-amber-300">
              ⚠ Analysis incomplete — signing is not recommended.
            </span>
          </div>
        )}
        <div className="border-t border-white/5" />
        <div className="flex items-center justify-between py-1 pt-2">
          <span className="text-[11px] text-slate-400">Threat corpus</span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-200">
            <Database className="h-3 w-3 text-slate-500" />
            6 clusters · synced
          </span>
        </div>
      </div>

      {/* ── Test vectors ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlayCircle className="h-4 w-4 text-slate-300" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
              Test vectors
            </span>
          </div>
          <span className="rounded border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] text-amber-400">
            DEMO
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          Injects a request into the live pipeline — full decode, simulate, diff and verdict.
        </p>

        <div className="mt-3 space-y-1.5">
          {[
            { id: 'NFT_APPROVAL', label: 'NFT drainer', fn: 'setApprovalForAll()', icon: AlertTriangle, tone: 'rose' },
            { id: 'UNLIMITED_APPROVE', label: 'Unlimited approve', fn: 'approve(spender, max)', icon: AlertTriangle, tone: 'amber' },
            { id: 'FAKE_REWARDS', label: 'Fake reward claim', fn: 'claimRewards() bait', icon: Activity, tone: 'violet' },
            { id: 'SAFE_TRANSFER', label: 'Safe transfer', fn: '0.01 ETH → peer', icon: ShieldCheck, tone: 'emerald' },
          ].map((v) => {
            const tones: Record<string, string> = {
              rose: 'border-rose-500/25 hover:bg-rose-500/[0.08] text-rose-300',
              amber: 'border-amber-500/25 hover:bg-amber-500/[0.08] text-amber-300',
              violet: 'border-violet-500/25 hover:bg-violet-500/[0.08] text-violet-300',
              emerald: 'border-emerald-500/25 hover:bg-emerald-500/[0.08] text-emerald-300',
            };
            return (
              <button
                key={v.id}
                onClick={() => onTriggerScenario(v.id)}
                className={`flex w-full items-center justify-between rounded-lg border bg-white/[0.02] px-3 py-2 text-left transition ${tones[v.tone]}`}
              >
                <span className="flex items-center gap-2">
                  <v.icon className="h-3.5 w-3.5" />
                  <span className="text-xs font-semibold">{v.label}</span>
                </span>
                <span className="font-mono text-[10px] opacity-60">{v.fn}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
