import React from 'react';
import { GlassCard } from '@cognitia/ui';
import { Globe, ShieldAlert, Radio, Server, ArrowRight } from 'lucide-react';

export const ExposureSection: React.FC = () => {
  const routeNodes = [
    'Relay Alpha (Zurich, CH)',
    'Relay Bravo (Reykjavik, IS)',
    'Relay Charlie (Helsinki, FI)',
    'Cognitia Threat Mirror Node #04',
  ];

  return (
    <div className="space-y-4">
      {/* Header & Badges */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Threat Exposure Analysis
          </span>
        </div>
        <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
          CONTROLLED / SIMULATED FEED
        </span>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        Cognitia correlates inspected wallet addresses and contracts with external dark-web and threat-intel repositories via an isolated Threat Relay interface.
      </p>

      {/* Simulated Tor Routing Pipeline */}
      <GlassCard className="p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            Simulated Threat Relay Route
          </span>
          <span className="text-[9px] font-mono text-slate-400">3-HOP ANONYMIZED QUERY</span>
        </div>

        <div className="space-y-2 text-xs font-mono">
          {routeNodes.map((node, idx) => (
            <div key={node} className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-slate-900 border border-slate-700 text-cyan-400 flex items-center justify-center text-[10px] font-bold">
                {idx + 1}
              </div>
              <div className="p-2 rounded bg-black/40 border border-slate-800 flex-1 text-slate-300 text-[11px] flex justify-between items-center">
                <span>{node}</span>
                <span className="text-emerald-400 text-[9px]">ONLINE</span>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Exposure Correlation Findings */}
      <GlassCard variant="critical" className="p-3.5 space-y-2 border-red-500/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span className="text-xs font-bold text-red-200">CORRELATED THREAT CLUSTER</span>
          </div>
          <span className="text-[10px] font-mono text-red-300 bg-red-950/80 px-2 py-0.5 rounded border border-red-700">
            SIMULATED
          </span>
        </div>

        <div className="text-xs font-bold text-white">Cluster: Operation RedHook Phishing Sybil</div>
        <p className="text-xs text-slate-300 leading-relaxed">
          The inspected contract (0x7777...7777) and operator (0x6666...6666) were observed in controlled simulated intelligence datasets as part of an automated phishing sweeper syndicate.
        </p>

        <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-red-900/50 flex justify-between">
          <span>Confidence: 97%</span>
          <span>Observed: 2026-03-10</span>
        </div>
      </GlassCard>
    </div>
  );
};
