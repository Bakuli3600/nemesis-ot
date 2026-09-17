import React, { useState } from 'react';
import { GlassCard, LifecycleStepper, RiskBadge } from '@cognitia/ui';
import { ActiveRequestState } from '../../types';
import {
  ShieldAlert,
  ShieldCheck,
  Ban,
  ArrowRight,
  Eye,
  AlertTriangle,
  Code,
  Network,
  CheckCircle2,
} from 'lucide-react';
import { shortenAddress, formatWeiToEth } from '@cognitia/shared';

interface LiveRequestSectionProps {
  activeRequest: ActiveRequestState | null;
  onDecision: (id: string, decision: 'BLOCK' | 'CONTINUE') => void;
  onViewAttackPath: () => void;
}

export const LiveRequestSection: React.FC<LiveRequestSectionProps> = ({
  activeRequest,
  onDecision,
  onViewAttackPath,
}) => {
  const [showRawDetails, setShowRawDetails] = useState(false);
  const [confirmContinue, setConfirmContinue] = useState(false);

  if (!activeRequest) {
    return (
      <div className="py-12 px-4 text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
          <ShieldCheck className="w-6 h-6 text-emerald-500/60" />
        </div>
        <h3 className="text-sm font-bold text-slate-300">Firewall Idle — All Clear</h3>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          No transactions or signatures are currently paused for review. Any outgoing Web3 request will be automatically intercepted here.
        </p>
      </div>
    );
  }

  const { id, request, lifecycle, decodedCalldata, decodedSignature, simulationResult, riskReport } =
    activeRequest;

  const isBlocked = lifecycle === 'REQUEST_BLOCKED';
  const isForwarding = lifecycle === 'REQUEST_FORWARDING';
  const isPendingDecision = lifecycle === 'USER_DECISION';
  const isCritical = riskReport?.severity === 'CRITICAL';

  return (
    <div className="space-y-4">
      {/* Lifecycle Progress Stepper */}
      <GlassCard className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono text-slate-400">REQUEST ID: {id}</span>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
            {request.origin}
          </span>
        </div>
        <LifecycleStepper currentState={lifecycle} />
      </GlassCard>

      {/* Paused Alert Banner */}
      {isBlocked ? (
        <GlassCard variant="critical" className="flex items-center gap-3 p-3.5 border-red-500">
          <Ban className="w-6 h-6 text-red-400 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-red-200">REQUEST BLOCKED</h4>
            <p className="text-xs text-red-300">
              Transaction rejected. The malicious request was halted before reaching the wallet or blockchain.
            </p>
          </div>
        </GlassCard>
      ) : isForwarding ? (
        <GlassCard variant="highlight" className="flex items-center gap-3 p-3.5 border-emerald-500">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-emerald-200">REQUEST FORWARDED</h4>
            <p className="text-xs text-emerald-300">
              Pristine transaction dispatched to original wallet provider for user signing.
            </p>
          </div>
        </GlassCard>
      ) : (
        <GlassCard
          variant={isCritical ? 'critical' : 'highlight'}
          className={`space-y-3 ${isCritical ? 'border-red-500/80 shadow-[0_0_25px_rgba(239,68,68,0.25)]' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs font-mono font-bold tracking-wider text-red-400">
                REQUEST PAUSED FOR INSPECTION
              </span>
            </div>
            {riskReport && <RiskBadge severity={riskReport.severity} score={riskReport.score} size="md" />}
          </div>

          <div className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            {isCritical ? (
              <>
                <ShieldAlert className="w-6 h-6 text-red-500 shrink-0" />
                <span>CRITICAL RISK — DO NOT SIGN</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-6 h-6 text-cyan-400 shrink-0" />
                <span>TRANSACTION INSPECTED</span>
              </>
            )}
          </div>

          <p className="text-xs text-slate-200 leading-relaxed font-medium">
            {riskReport?.humanSummary}
          </p>
        </GlassCard>
      )}

      {/* Target & Method Overview */}
      <GlassCard className="p-3 space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div>
            <span className="text-slate-400">Method:</span>
            <div className="font-bold text-cyan-300">{request.method}</div>
          </div>
          <div>
            <span className="text-slate-400">Value:</span>
            <div className="font-bold text-slate-200">
              {request.type === 'TRANSACTION' ? formatWeiToEth(request.value) : 'Off-chain'}
            </div>
          </div>
          <div>
            <span className="text-slate-400">Function:</span>
            <div className="font-bold text-amber-300 truncate">
              {decodedCalldata?.functionName || decodedSignature?.primaryType || 'Unknown'}
            </div>
          </div>
          <div>
            <span className="text-slate-400">Target Contract:</span>
            <div className="font-bold text-slate-300 truncate">
              {request.type === 'TRANSACTION'
                ? shortenAddress(request.to, 5)
                : shortenAddress(decodedSignature?.verifyingContract, 5)}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Security Findings Breakdown */}
      {riskReport && riskReport.findings.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
            <span>Detected Risk Findings</span>
            <span className="text-[10px] font-mono text-slate-400">
              Score Contribution: +{riskReport.score}/100
            </span>
          </div>

          {riskReport.findings.map((finding) => (
            <GlassCard
              key={finding.id}
              variant={finding.severity === 'CRITICAL' ? 'critical' : 'default'}
              className="p-3 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <AlertTriangle
                    className={`w-3.5 h-3.5 ${
                      finding.severity === 'CRITICAL'
                        ? 'text-red-400'
                        : finding.severity === 'HIGH'
                        ? 'text-amber-400'
                        : 'text-yellow-400'
                    }`}
                  />
                  {finding.title}
                </span>
                <RiskBadge severity={finding.severity} size="sm" />
              </div>

              <div className="text-xs text-slate-300 font-medium">
                {finding.humanExplanation}
              </div>

              <div className="text-[10px] font-mono text-slate-400 bg-black/40 p-1.5 rounded border border-slate-800">
                {finding.evidence}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* State Changes Simulation Highlights */}
      {simulationResult && simulationResult.stateDiff.length > 0 && (
        <GlassCard className="p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-200">
            <span>Simulated State Diff Impact</span>
            <span className="text-[10px] font-mono text-cyan-400">
              {simulationResult.mode.toUpperCase()} SIMULATION
            </span>
          </div>

          <div className="space-y-1.5">
            {simulationResult.stateDiff.map((diff) => (
              <div
                key={diff.id}
                className="p-2 rounded bg-black/50 border border-slate-800 text-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-200">{diff.assetName}</div>
                  <div className="text-[10px] text-slate-400">{diff.changeDescription}</div>
                </div>
                <div className="text-right font-mono text-[11px]">
                  <span className="text-slate-400">{String(diff.before)}</span>
                  <span className="text-slate-500 mx-1">→</span>
                  <span className={diff.isDangerous ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                    {String(diff.after)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Raw Decoding Drawer Toggle */}
      <button
        onClick={() => setShowRawDetails(!showRawDetails)}
        className="w-full py-1.5 text-xs text-slate-400 hover:text-cyan-400 flex items-center justify-center gap-1.5 font-mono"
      >
        <Code className="w-3.5 h-3.5" />
        {showRawDetails ? 'Hide Raw Technical Parameters' : 'View Raw Technical Parameters'}
      </button>

      {showRawDetails && (
        <GlassCard variant="terminal" className="p-3 text-[10px] space-y-2 overflow-x-auto">
          <div>
            <span className="text-slate-500">Selector:</span>{' '}
            <span className="text-amber-400">{decodedCalldata?.selector || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-500">Signature:</span>{' '}
            <span className="text-slate-300">{decodedCalldata?.signature || 'Unknown'}</span>
          </div>
          <div>
            <span className="text-slate-500">Raw Calldata:</span>
            <div className="text-slate-400 break-all bg-black/60 p-1.5 rounded mt-1 font-mono">
              {request.type === 'TRANSACTION' ? request.data : JSON.stringify(request.rawPayload)}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Action Buttons */}
      {isPendingDecision && (
        <div className="space-y-2 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onDecision(id, 'BLOCK')}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition active:scale-95"
            >
              <Ban className="w-4 h-4" />
              BLOCK REQUEST
            </button>

            {!confirmContinue ? (
              <button
                onClick={() => {
                  if (isCritical) {
                    setConfirmContinue(true);
                  } else {
                    onDecision(id, 'CONTINUE');
                  }
                }}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition"
              >
                CONTINUE ANYWAY
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => onDecision(id, 'CONTINUE')}
                className="py-3 px-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-bold text-[11px] flex items-center justify-center gap-1 transition animate-pulse"
              >
                CONFIRM DANGEROUS SIGN
              </button>
            )}
          </div>

          <button
            onClick={onViewAttackPath}
            className="w-full py-2 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 transition"
          >
            <Network className="w-4 h-4 text-cyan-400" />
            INSPECT 3D ATTACK PATH
          </button>
        </div>
      )}
    </div>
  );
};
