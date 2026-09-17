import React from 'react';
import { RequestLifecycleState } from '@cognitia/core';

interface LifecycleStepperProps {
  currentState: RequestLifecycleState;
}

const STEPS: Array<{ key: RequestLifecycleState; label: string }> = [
  { key: 'REQUEST_RECEIVED', label: 'INTERCEPTED' },
  { key: 'REQUEST_ANALYZING', label: 'DECODING' },
  { key: 'REQUEST_SIMULATING', label: 'SIMULATING' },
  { key: 'REQUEST_RISK_ASSESSMENT', label: 'DIFF & INTEL' },
  { key: 'USER_DECISION', label: 'DECISION' },
];

export const LifecycleStepper: React.FC<LifecycleStepperProps> = ({ currentState }) => {
  const getStepIndex = (state: RequestLifecycleState) => {
    switch (state) {
      case 'REQUEST_RECEIVED':
      case 'REQUEST_PAUSED':
        return 0;
      case 'REQUEST_ANALYZING':
        return 1;
      case 'REQUEST_SIMULATING':
        return 2;
      case 'REQUEST_RISK_ASSESSMENT':
        return 3;
      case 'USER_DECISION':
      case 'REQUEST_BLOCKED':
      case 'REQUEST_FORWARDING':
      case 'REQUEST_COMPLETED':
      case 'REQUEST_FAILED':
        return 4;
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(currentState);

  return (
    <div className="flex items-center justify-between w-full py-2 px-1 text-[11px] font-mono select-none">
      {STEPS.map((step, idx) => {
        const isDone = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const isPending = idx > currentIndex;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center border text-[10px] font-bold transition-all ${
                  isDone
                    ? 'border-emerald-500 bg-emerald-950/80 text-emerald-400'
                    : isCurrent
                    ? 'border-cyan-400 bg-cyan-950/90 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.5)] animate-pulse'
                    : 'border-slate-800 bg-slate-900 text-slate-600'
                }`}
              >
                {isDone ? '✓' : idx + 1}
              </div>
              <span
                className={`text-[10px] tracking-tight ${
                  isCurrent ? 'text-cyan-400 font-semibold' : isDone ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`h-[1px] flex-1 mx-1.5 transition-colors ${
                  idx < currentIndex ? 'bg-emerald-500/60' : 'bg-slate-800'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
