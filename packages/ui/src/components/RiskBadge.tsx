import React from 'react';
import { SecuritySeverity } from '@cognitia/core';

interface RiskBadgeProps {
  severity: SecuritySeverity;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ severity, score, size = 'md' }) => {
  const getColors = () => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-950/80 text-red-400 border-red-500/50 shadow-red-500/20';
      case 'HIGH':
        return 'bg-amber-950/80 text-amber-400 border-amber-500/50 shadow-amber-500/20';
      case 'MEDIUM':
        return 'bg-yellow-950/80 text-yellow-400 border-yellow-500/50 shadow-yellow-500/20';
      case 'LOW':
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-500/50 shadow-emerald-500/20';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-700';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-0.5 text-xs font-semibold';
      case 'lg':
        return 'px-3.5 py-1.5 text-sm font-bold tracking-wide';
      default:
        return 'px-2.5 py-1 text-xs font-semibold';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border shadow-sm backdrop-blur-md ${getColors()} ${getSizeClasses()}`}
    >
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      <span>{severity}</span>
      {score !== undefined && <span className="opacity-80 font-mono">({score}/100)</span>}
    </span>
  );
};
