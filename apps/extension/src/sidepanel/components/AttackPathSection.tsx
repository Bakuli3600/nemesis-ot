import React from 'react';
import { GlassCard, AttackPath3D } from '@cognitia/ui';
import { Network, ShieldAlert, ArrowDown } from 'lucide-react';

export const AttackPathSection: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Exploit Path Reconstruction
          </span>
        </div>
        <span className="text-[10px] font-mono text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-800">
          SIMULATED ATTACK VECTOR
        </span>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        Cognitia reconstructs the multi-hop authorization path from dApp interaction down to underlying smart contract privilege escalations:
      </p>

      {/* 3D Attack Graph */}
      <AttackPath3D isCritical={true} />

      {/* Step-by-Step Traversal Chain */}
      <GlassCard className="p-3.5 space-y-3">
        <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">
          Forensic Vector Analysis
        </div>

        <div className="space-y-2 text-xs">
          <div className="p-2 rounded bg-black/40 border border-slate-800 flex items-center justify-between">
            <span className="font-semibold text-blue-400">1. User Origin</span>
            <span className="text-[11px] font-mono text-slate-300">0x5534...012 (Active Wallet)</span>
          </div>

          <div className="flex justify-center">
            <ArrowDown className="w-3.5 h-3.5 text-slate-600" />
          </div>

          <div className="p-2 rounded bg-black/40 border border-amber-900/60 flex items-center justify-between">
            <span className="font-semibold text-amber-400">2. Interacting Web App</span>
            <span className="text-[11px] font-mono text-amber-300">airdrop-claim.xyz (Phishing Bait)</span>
          </div>

          <div className="flex justify-center">
            <ArrowDown className="w-3.5 h-3.5 text-slate-600" />
          </div>

          <div className="p-2 rounded bg-black/40 border border-red-900/60 flex items-center justify-between">
            <span className="font-semibold text-red-400">3. Malicious Claim Contract</span>
            <span className="text-[11px] font-mono text-red-300">FakeRewards.sol (0x7777...777)</span>
          </div>

          <div className="flex justify-center">
            <ArrowDown className="w-3.5 h-3.5 text-slate-600" />
          </div>

          <div className="p-2 rounded bg-red-950/40 border border-red-500/60 flex items-center justify-between">
            <span className="font-bold text-red-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              4. Escalated Operator
            </span>
            <span className="text-[11px] font-mono text-red-200 font-bold">0x6666...666 (Confirmed Drainer)</span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
