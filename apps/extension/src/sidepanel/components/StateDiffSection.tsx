import React from 'react';
import { GlassCard, RiskBadge } from '@cognitia/ui';
import { StateDiffItem } from '@cognitia/core';
import { Layers, AlertOctagon, CheckCircle } from 'lucide-react';

interface StateDiffSectionProps {
  stateDiffs: StateDiffItem[];
}

export const StateDiffSection: React.FC<StateDiffSectionProps> = ({ stateDiffs }) => {
  if (stateDiffs.length === 0) {
    return (
      <div className="py-12 px-4 text-center space-y-2">
        <Layers className="w-8 h-8 text-slate-600 mx-auto" />
        <div className="text-xs font-bold text-slate-400">Zero State Modifications</div>
        <p className="text-[11px] text-slate-500">
          No balance, allowance, or ownership diffs recorded for this call.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Before vs After State Impact
        </span>
        <span className="text-[10px] font-mono text-cyan-400">
          {stateDiffs.length} Diff Item(s)
        </span>
      </div>

      {stateDiffs.map((diff) => (
        <GlassCard
          key={diff.id}
          variant={diff.severity === 'CRITICAL' ? 'critical' : 'default'}
          className="p-3.5 space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {diff.isDangerous ? (
                <AlertOctagon className="w-4 h-4 text-red-400 shrink-0" />
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span className="text-xs font-bold text-white">{diff.assetName}</span>
            </div>
            <RiskBadge severity={diff.severity} size="sm" />
          </div>

          <p className="text-xs text-slate-300">{diff.changeDescription}</p>

          {/* Part 15 — evidence level shown next to every claim */}
          {diff.evidence && (
            <div className="flex items-center gap-1.5">
              <span
                className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                  diff.evidence === 'OBSERVED'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                    : diff.evidence === 'INFERRED'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                    : 'bg-slate-500/10 text-slate-400 border border-slate-500/25'
                }`}
              >
                {diff.evidence}
              </span>
              {diff.evidenceNote && (
                <span className="text-[10px] text-slate-500">{diff.evidenceNote}</span>
              )}
            </div>
          )}

          <div className="p-2 rounded bg-black/60 border border-slate-800 text-[11px] font-mono flex items-center justify-between">
            <div>
              <span className="text-slate-500 text-[9px] block uppercase">Before Execution</span>
              <span className="text-slate-300 font-semibold">{String(diff.before)}</span>
            </div>
            <span className="text-slate-500 text-sm">→</span>
            <div className="text-right">
              <span className="text-slate-500 text-[9px] block uppercase">Post Execution</span>
              <span className={diff.isDangerous ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                {String(diff.after)}
              </span>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
};
