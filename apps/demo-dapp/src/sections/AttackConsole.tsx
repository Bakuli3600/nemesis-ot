import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Play,
  Square,
  ChevronDown,
  Check,
  X,
  AlertTriangle,
  Eye,
  Fingerprint,
} from 'lucide-react';
import {
  SCENARIOS,
  DEFAULT_SCENARIO,
  getScenario,
  shortAddr,
  SEVERITY_STYLES,
  type DemoScenario,
  type DemoReport,
} from '../demo/scenarios';

/* ------------------------------------------------------------------ */
/* Pipeline definition                                                 */
/* ------------------------------------------------------------------ */

const PIPELINE_STAGES = [
  { key: 'INTERCEPTED', label: 'Intercepted', detail: 'Request paused at the provider boundary' },
  { key: 'DECODING', label: 'Decoding', detail: 'Selector resolved · ABI matched' },
  { key: 'SIMULATING', label: 'Simulating', detail: 'Executed against decoy-layer state' },
  { key: 'DIFFING', label: 'Diffing state', detail: 'Before / after balances computed' },
  { key: 'THREAT_INTEL', label: 'Threat intel', detail: 'Address + cluster correlation' },
  { key: 'RISK', label: 'Risk scoring', detail: 'Weighted findings → verdict' },
] as const;

type Phase = 'IDLE' | 'RUNNING' | 'VERDICT';

const STAGE_MS = 420;

interface WalletLogEntry {
  time: string;
  text: string;
  kind: 'blocked' | 'allowed' | 'info';
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export const AttackConsole: React.FC<{
  runSignal: number;
  onTraceChange?: (trace: { scenario: DemoScenario; report: DemoReport } | null) => void;
}> = ({ runSignal, onTraceChange }) => {
  const [scenarioId, setScenarioId] = useState<string>(DEFAULT_SCENARIO.id);
  const [phase, setPhase] = useState<Phase>('IDLE');
  const [stageIdx, setStageIdx] = useState(-1);
  const [report, setReport] = useState<DemoReport | null>(null);
  const [decision, setDecision] = useState<'BLOCK' | 'CONTINUE' | null>(null);
  const [log, setLog] = useState<WalletLogEntry[]>([
    { time: now(), text: 'Decoy layer active — wallet shadow 0x5534…954d armed', kind: 'info' },
  ]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const timers = useRef<number[]>([]);
  const verdictRef = useRef<HTMLDivElement>(null);

  const scenario = getScenario(scenarioId);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  /* External trigger (hero button) */
  useEffect(() => {
    if (runSignal > 0) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runSignal]);

  const pushLog = (text: string, kind: WalletLogEntry['kind']) =>
    setLog((l) => [{ time: now(), text, kind }, ...l].slice(0, 8));

  const run = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];

    setPhase('RUNNING');
    setReport(null);
    setDecision(null);
    setStageIdx(0);
    pushLog(`${scenario.label} intercepted from ${scenario.origin}`, 'info');

    const s = scenario;
    PIPELINE_STAGES.forEach((_, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setStageIdx(i);
          if (i === PIPELINE_STAGES.length - 1) {
            timers.current.push(
              window.setTimeout(() => {
                setReport(s.report);
                setPhase('VERDICT');
                const critical = s.report.severity === 'CRITICAL' || s.report.severity === 'HIGH';
                pushLog(
                  critical
                    ? `${s.functionName} — BLOCKED by Nemesis (risk ${s.report.riskScore}/100)`
                    : `${s.functionName} — forwarded to wallet (risk ${s.report.riskScore}/100)`,
                  critical ? 'blocked' : 'allowed'
                );
                onTraceChange?.(critical ? { scenario: s, report: s.report } : null);
                verdictRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }, STAGE_MS)
            );
          }
        }, i * STAGE_MS)
      );
    });
  }, [scenario, onTraceChange]);

  const decide = (d: 'BLOCK' | 'CONTINUE') => {
    setDecision(d);
    pushLog(
      d === 'BLOCK'
        ? `Session cancelled at decoy layer — ${scenario.functionName} never reached the wallet`
        : `Clean request forwarded to real wallet 0x5534…954d`,
      d === 'BLOCK' ? 'blocked' : 'allowed'
    );
  };

  const running = phase === 'RUNNING';
  const sev = report ? SEVERITY_STYLES[report.severity] : null;

  return (
    <section id="console" className="bg-ink-950 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        {/* Heading */}
        <div className="max-w-2xl">
          <div className="kicker text-accent-teal">Live console</div>
          <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight text-white">
            Watch the shield catch an attack.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-white/50">
            A real interception-style run against the decoy layer — the same pipeline, decoders,
            risk engine and report the extension renders in its side panel.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-[340px_1fr]">
          {/* ---------------------------------------------------------- */}
          {/* Left column: attacker panel                                 */}
          {/* ---------------------------------------------------------- */}
          <div className="space-y-4">
            {/* Attacker card */}
            <div className="console-panel p-5">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-mono uppercase tracking-wider text-white/40">
                  Attack origin
                </div>
                <span className="badge-mono border-red-500/30 bg-red-500/10 text-red-400">Simulated</span>
              </div>

              {/* Scenario dropdown */}
              <div className="relative mt-3">
                <button
                  onClick={() => setPickerOpen((v) => !v)}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/8"
                >
                  <span>
                    <span className="block text-sm font-medium text-white">{scenario.label}</span>
                    <span className="mt-0.5 block font-mono text-[11px] text-white/40">{scenario.tagline}</span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-white/40 transition-transform ${pickerOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {pickerOpen && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-white/10 bg-ink-900 shadow-console">
                    {SCENARIOS.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setScenarioId(s.id);
                          setPickerOpen(false);
                          setPhase('IDLE');
                          setReport(null);
                        }}
                        className={`block w-full px-4 py-2.5 text-left text-sm transition hover:bg-white/5 ${
                          s.id === scenarioId ? 'text-accent-teal' : 'text-white/70'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <p className="mt-3 text-xs leading-relaxed text-white/45">{scenario.description}</p>

              {/* Request details */}
              <div className="mt-4 space-y-2 border-t border-white/8 pt-4 font-mono text-[11px]">
                <Row k="origin" v={scenario.origin} />
                <Row k="method" v={scenario.method} />
                <Row k="function" v={scenario.functionName} />
                <Row k="value" v={scenario.value} />
                <Row k="calldata" v={scenario.calldata.length > 26 ? `${scenario.calldata.slice(0, 26)}…` : scenario.calldata} />
              </div>

              {/* Execute */}
              <button
                onClick={run}
                disabled={running}
                className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition active:scale-[0.98] ${
                  running
                    ? 'cursor-wait bg-red-500/20 text-red-300'
                    : 'bg-red-500 text-white hover:bg-red-400 shadow-[0_8px_24px_rgba(239,68,68,0.35)]'
                }`}
              >
                {running ? (
                  <>
                    <Square className="h-4 w-4 animate-pulse" /> Attack in progress…
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" /> Execute attack
                  </>
                )}
              </button>
              <p className="mt-2 text-center text-[10px] text-white/25">
                Fires at the decoy layer · your real wallet is never contacted
              </p>
            </div>

            {/* Wallet log */}
            <div className="console-panel p-5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-white/40">Wallet log</div>
              <div className="mt-3 space-y-2">
                {log.map((e, i) => (
                  <div
                    key={`${e.time}-${i}`}
                    className={`rounded-lg border px-3 py-2 font-mono text-[11px] leading-snug ${
                      e.kind === 'blocked'
                        ? 'border-red-500/25 bg-red-500/8 text-red-300'
                        : e.kind === 'allowed'
                        ? 'border-emerald-500/25 bg-emerald-500/8 text-emerald-300'                        : 'border-white/8 bg-white/[0.04] text-white/50'
                    }`}>
                    <span className="text-white/30">[{e.time}]</span> {e.text}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------- */}
          {/* Right column: shield report                                 */}
          {/* ---------------------------------------------------------- */}
          <div className="console-panel flex flex-col p-5 sm:p-6">
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-white/8 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/8">
                  <Shield className="h-5 w-5 text-accent-teal" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Nemesis</div>
                  <div className="font-mono text-[10px] text-white/40">decoy layer · session {report?.requestId ?? 'standby'}</div>
                </div>
              </div>
              <span
                className={`badge-mono ${
                  running
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                    : report
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-white/15 bg-white/5 text-white/50'
                }`}
              >
                {running ? 'Analyzing' : report ? 'Protected' : 'Standby'}
              </span>
            </div>

            {/* Pipeline */}
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PIPELINE_STAGES.map((stage, i) => {
                const done = stageIdx > i || !!report;
                const active = running && stageIdx === i;
                return (
                  <div
                    key={stage.key}
                    className={`rounded-xl border px-3 py-2.5 transition ${
                      active
                        ? 'border-accent-teal/50 bg-accent-teal/[0.08]'
                        : done
                        ? 'border-emerald-500/25 bg-emerald-500/[0.06]'
                        : 'border-white/8 bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {done ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : active ? (
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-accent-teal animate-pulse-ring" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-teal" />
                        </span>
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-white/15" />
                      )}
                      <span
                        className={`text-[11px] font-medium ${
                          active ? 'text-accent-teal' : done ? 'text-emerald-300' : 'text-white/35'
                        }`}
                      >
                        {stage.label}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] leading-tight text-white/30">{stage.detail}</div>
                  </div>
                );
              })}
            </div>

            {/* Body: report / empty / running */}
            <div className="mt-5 flex-1" ref={verdictRef}>
              {!report && !running && (
                <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 p-8 text-center">
                  <ShieldCheck className="h-8 w-8 text-white/20" strokeWidth={1.5} />
                  <div className="mt-3 text-sm text-white/40">
                    Execute an attack to see the full analysis
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-white/25">
                    decode → simulate → diff → correlate → score
                  </div>
                </div>
              )}

              {running && (
                <div className="flex h-full min-h-[280px] items-center justify-center">
                  <div className="text-center">
                    <Fingerprint className="mx-auto h-8 w-8 animate-pulse text-accent-teal" strokeWidth={1.5} />
                    <div className="mt-3 font-mono text-xs text-white/50">
                      running {PIPELINE_STAGES[Math.max(stageIdx, 0)].label.toLowerCase()}…
                    </div>
                  </div>
                </div>
              )}

              {report && sev && (
                <div className="animate-fade-up space-y-5">
                  {/* Verdict header */}
                  <div className={`rounded-xl border p-5 ${sev.border} ${sev.bg}`}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          {report.severity === 'LOW' ? (
                            <ShieldCheck className={`h-5 w-5 ${sev.text}`} />
                          ) : (
                            <ShieldAlert className={`h-5 w-5 ${sev.text}`} />
                          )}
                          <span className={`text-lg font-bold tracking-tight ${sev.text}`}>
                            {report.severity === 'LOW'
                              ? 'No high-risk findings'
                              : report.severity === 'MEDIUM'
                              ? 'Caution'
                              : `Critical risk — do not sign`}
                          </span>
                        </div>
                        <p className="mt-2 max-w-md text-xs leading-relaxed text-white/60">
                          {report.humanSummary}
                        </p>
                      </div>

                      {/* Score dial */}
                      <ScoreDial score={report.riskScore} severity={report.severity} />
                    </div>

                    {/* Evidence breakdown */}
                    <div className="mt-4 space-y-1.5 border-t border-white/10 pt-4">
                      {report.evidence.map((e) => (
                        <div key={e.item} className="flex items-center justify-between gap-3 text-[11px]">
                          <span className="text-white/55">
                            {e.item}
                            <span className="ml-2 text-white/25">{e.description}</span>
                          </span>
                          <span className={`font-mono font-semibold ${e.points >= 20 ? sev.text : 'text-white/45'}`}>
                            +{e.points}
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between border-t border-white/10 pt-2 text-xs font-semibold text-white">
                        <span>Weighted risk score</span>
                        <span className="font-mono">{report.riskScore} / 100</span>
                      </div>
                    </div>
                  </div>

                  {/* Findings + diff grid */}
                  <div className="grid gap-4 lg:grid-cols-2">
                    {/* Findings */}
                    <div>
                      <SectionTitle icon={<AlertTriangle className="h-3.5 w-3.5" />}>Findings</SectionTitle>
                      <div className="mt-2 space-y-2">
                        {report.findings.map((f, i) => {
                          const fs = SEVERITY_STYLES[f.severity];
                          return (
                            <div key={i} className={`rounded-xl border p-3.5 ${fs.border} bg-white/[0.03]`}>
                              <div className="flex items-center justify-between gap-2">
                                <span className={`badge-mono ${fs.border} ${fs.bg} ${fs.text}`}>{f.severity}</span>
                                <span className="font-mono text-[10px] text-white/30">{f.confidence}% conf</span>
                              </div>
                              <div className="mt-2 text-xs font-semibold text-white">{f.title}</div>
                              <p className="mt-1 text-[11px] leading-relaxed text-white/50">{f.humanExplanation}</p>
                              <div className="mt-2 truncate rounded bg-black/30 px-2 py-1 font-mono text-[10px] text-white/35">
                                {f.evidence}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* State diff + attack graph */}
                    <div className="space-y-4">
                      <div>
                        <SectionTitle icon={<Eye className="h-3.5 w-3.5" />}>Simulated state change</SectionTitle>
                        <div className="mt-2 space-y-2">
                          {report.stateDiffs.map((d, i) => (
                            <div
                              key={i}
                              className={`rounded-xl border px-3.5 py-2.5 ${SEVERITY_STYLES[d.severity].border} bg-white/[0.03]`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-medium text-white/80">{d.assetName}</span>
                                <span className="font-mono text-[10px] text-white/30">{d.assetType}</span>
                              </div>
                              <div className="mt-1.5 flex items-center gap-2 font-mono text-xs">
                                <span className="text-white/45">{d.before}</span>
                                <span className="text-white/25">→</span>
                                <span className={d.isDangerous ? 'font-semibold text-red-400' : 'text-emerald-300'}>
                                  {d.after}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Attack graph */}
                      <div>
                        <SectionTitle icon={<Fingerprint className="h-3.5 w-3.5" />}>Attack path</SectionTitle>
                        <div className="mt-2 rounded-xl border border-white/8 bg-black/25 p-4">
                          <AttackGraph report={report} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Decision buttons */}
                  {decision === null && (
                    <div className="flex flex-col gap-2.5 sm:flex-row">
                      <button
                        onClick={() => decide('BLOCK')}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-semibold text-white transition hover:bg-red-400 active:scale-[0.98]"
                      >
                        <X className="h-4 w-4" /> Block request
                      </button>
                      <button
                        onClick={() => decide('CONTINUE')}
                        disabled={report.severity === 'CRITICAL'}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <Check className="h-4 w-4" />
                        {report.severity === 'CRITICAL' ? 'Blocked by policy' : 'Continue to wallet'}
                      </button>
                    </div>
                  )}

                  {decision && (
                    <div
                      className={`flex items-center gap-3 rounded-xl border p-4 ${
                        decision === 'BLOCK'
                          ? 'border-red-500/30 bg-red-500/8'
                          : 'border-emerald-500/30 bg-emerald-500/8'
                      }`}
                    >
                      {decision === 'BLOCK' ? (
                        <>
                          <ShieldAlert className="h-5 w-5 shrink-0 text-red-400" />
                          <div>
                            <div className="text-sm font-semibold text-red-300">Request blocked</div>
                            <div className="text-[11px] text-white/50">
                              The dApp received error 4001. The malicious payload died at the decoy layer.
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />
                          <div>
                            <div className="text-sm font-semibold text-emerald-300">Forwarded to wallet</div>
                            <div className="text-[11px] text-white/50">
                              Clean request passed through to your real wallet for signing.
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

const Row: React.FC<{ k: string; v: string }> = ({ k, v }) => (
  <div className="flex items-baseline justify-between gap-3">
    <span className="shrink-0 text-white/30">{k}</span>
    <span className="truncate text-right text-white/65">{v}</span>
  </div>
);

const SectionTitle: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-white/40">
    {icon}
    {children}
  </div>
);

/** Simple SVG donut for the risk score. */
const ScoreDial: React.FC<{ score: number; severity: string }> = ({ score, severity }) => {
  const R = 34;
  const C = 2 * Math.PI * R;
  const pct = Math.min(score, 100) / 100;
  const color =
    severity === 'CRITICAL'
      ? '#ef4444'
      : severity === 'HIGH'
      ? '#f59e0b'
      : severity === 'MEDIUM'
      ? '#facc15'
      : '#10b981';
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 88 88" className="h-full w-full -rotate-90">
        <circle cx="44" cy="44" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
        <circle
          cx="44"
          cy="44"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-white">{score}</span>
        <span className="font-mono text-[9px] text-white/40">/ 100</span>
      </div>
    </div>
  );
};

/** Horizontal flow graph rendered in SVG — deterministic, no 3D needed. */
const AttackGraph: React.FC<{ report: DemoReport }> = ({ report }) => {
  const { nodes, edges } = report.attackGraph;
  return (
    <div className="space-y-1.5">
      {edges.map((e, i) => {
        const from = nodes.find((n) => n.id === e.from);
        const to = nodes.find((n) => n.id === e.to);
        if (!from || !to) return null;
        const dangerous = /drain|sweep|approv|phish|liquidat|bait/i.test(e.label || '');
        return (
          <div key={i} className="flex items-center gap-2 font-mono text-[10px]">
            <span
              className={`truncate rounded-md border px-2 py-1 ${
                from.kind === 'wallet'
                  ? 'border-accent-teal/30 bg-accent-teal/8 text-accent-teal'
                  : from.kind === 'attacker'
                  ? 'border-red-500/30 bg-red-500/8 text-red-300'
                  : 'border-white/10 bg-white/5 text-white/60'
              }`}
            >
              {from.label}
            </span>
            <svg width="28" height="10" viewBox="0 0 28 10" className="shrink-0 text-white/25">
              <line x1="0" y1="5" x2="20" y2="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
              <path d="M20 1l7 4-7 4z" fill="currentColor" />
            </svg>
            <span
              className={`truncate rounded-md border px-2 py-1 ${
                to.kind === 'attacker'
                  ? 'border-red-500/30 bg-red-500/8 text-red-300'
                  : to.kind === 'wallet'
                  ? 'border-accent-teal/30 bg-accent-teal/8 text-accent-teal'
                  : 'border-white/10 bg-white/5 text-white/60'
              }`}
            >
              {to.label}
            </span>
            <span className={`ml-auto shrink-0 ${dangerous ? 'text-red-400/80' : 'text-white/25'}`}>{e.label}</span>
          </div>
        );
      })}
    </div>
  );
};

function now(): string {
  return new Date().toLocaleTimeString([], { hour12: false });
}
