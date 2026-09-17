import React from 'react';
import {
  Radar,
  FileSearch,
  Cpu,
  GitCompare,
  Database,
  Network,
  Globe,
  History,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Deterministic analytics data (30-day window)                        */
/* ------------------------------------------------------------------ */

const MALICIOUS_BLOCKED = [
  3, 5, 2, 6, 8, 4, 7, 9, 6, 10, 12, 8, 7, 11, 14, 9, 8, 12, 15, 11, 9, 13,
  16, 12, 14, 18, 15, 17, 21, 19,
];
const CLEAN_FORWARDED = [
  42, 45, 40, 48, 52, 47, 55, 58, 50, 61, 64, 57, 53, 66, 70, 62, 59, 68, 74,
  65, 61, 72, 78, 69, 75, 82, 76, 84, 88, 85,
];
const DAYS = MALICIOUS_BLOCKED.length;

const VECTOR_MIX = [
  { label: 'NFT setApprovalForAll', pct: 34, color: '#ef4444' },
  { label: 'Unlimited approvals', pct: 27, color: '#f59e0b' },
  { label: 'Permit phishing', pct: 22, color: '#0ea5e9' },
  { label: 'Hidden multicall', pct: 11, color: '#8b5cf6' },
  { label: 'Other', pct: 6, color: '#94a3b8' },
];

const KPIS = [
  { value: '184 ms', label: 'Median analysis time', delta: 'p50 across all pipelines' },
  { value: '99.2%', label: 'Simulation coverage', delta: 'requests fully simulated' },
  { value: '97.4%', label: 'Verdict precision', delta: 'on curated attack corpus' },
];

/* ------------------------------------------------------------------ */
/* Chart geometry helpers                                              */
/* ------------------------------------------------------------------ */

const W = 640;
const H = 250;
const PAD_L = 38;
const PAD_R = 10;
const PAD_T = 14;
const PAD_B = 28;
const MAXY = 100;

const cx = (i: number) => PAD_L + (i * (W - PAD_L - PAD_R)) / (DAYS - 1);
const cy = (v: number) => H - PAD_B - (v / MAXY) * (H - PAD_T - PAD_B);

const toLine = (data: number[]) =>
  data.map((v, i) => `${i === 0 ? 'M' : 'L'}${cx(i).toFixed(1)},${cy(v).toFixed(1)}`).join(' ');

const toArea = (data: number[]) =>
  `${toLine(data)} L${cx(DAYS - 1).toFixed(1)},${cy(0).toFixed(1)} L${cx(0).toFixed(1)},${cy(0).toFixed(1)} Z`;

const X_LABELS: Array<{ i: number; text: string }> = [
  { i: 0, text: 'Aug 14' },
  { i: 7, text: 'Aug 21' },
  { i: 14, text: 'Aug 28' },
  { i: 21, text: 'Sep 4' },
  { i: 28, text: 'Sep 11' },
];

/* ------------------------------------------------------------------ */
/* Capability list                                                     */
/* ------------------------------------------------------------------ */

const CAPABILITIES = [
  {
    icon: Radar,
    title: 'Provider-level interception',
    text: 'Requests pause at the EIP-1193 boundary — before MetaMask ever opens.',
  },
  {
    icon: FileSearch,
    title: 'Calldata & signature decoding',
    text: 'ERC-20 / 721 / 1155, multicall and Permit payloads in plain language.',
  },
  {
    icon: Cpu,
    title: 'Pre-execution simulation',
    text: 'Transactions run against decoy-layer state without broadcasting.',
  },
  {
    icon: GitCompare,
    title: 'Before / after state diff',
    text: 'Balances, allowances and operators rendered as an exact delta.',
  },
  {
    icon: Database,
    title: 'Explainable risk scoring',
    text: 'Every verdict itemizes weighted evidence — no black-box numbers.',
  },
  {
    icon: Network,
    title: 'Attack path reconstruction',
    text: 'dApp → contract → operator → your wallet. See who benefits.',
  },
  {
    icon: Globe,
    title: 'Threat mirror traceback',
    text: 'Blocked payloads correlate to simulated dark-web infrastructure.',
  },
  {
    icon: History,
    title: 'Complete request history',
    text: 'Every inspected request logged locally with its verdict.',
  },
];

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export const Features: React.FC = () => {
  const R = 56;
  const CIRC = 2 * Math.PI * R;
  let acc = 0;

  return (
    <section id="features" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        {/* Heading */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <div className="kicker">Analytics</div>
            <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight text-ink-900">
              Measured protection.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-fog-500">
              The same engines that block the attacks above feed these numbers — simulated across a
              30-day evaluation window on the reference corpus.
            </p>
          </div>
          <span className="badge-mono border-fog-200 bg-fog-100 text-fog-500">
            Simulated dataset · v1.0
          </span>
        </div>

        {/* Charts row */}
        <div className="mt-12 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          {/* Trend chart */}
          <div className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-ink-900">Requests intercepted</div>
                <div className="text-xs text-fog-400">Daily · last 30 days</div>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-fog-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500" /> Malicious · blocked
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-accent-blue" /> Clean · forwarded
                </span>
              </div>
            </div>

            <svg viewBox={`0 0 ${W} ${H}`} className="mt-5 w-full" role="img" aria-label="Requests intercepted over the last 30 days">
              <defs>
                <linearGradient id="malArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* grid + y axis */}
              {[0, 25, 50, 75, 100].map((v) => (
                <g key={v}>
                  <line x1={PAD_L} x2={W - PAD_R} y1={cy(v)} y2={cy(v)} stroke="#e8e8ed" strokeWidth="1" />
                  <text x={PAD_L - 8} y={cy(v) + 3.5} textAnchor="end" fontSize="10" fill="#a1a1a6" fontFamily="ui-monospace, Menlo, monospace">
                    {v}
                  </text>
                </g>
              ))}

              {/* x labels */}
              {X_LABELS.map(({ i, text }) => (
                <text key={text} x={cx(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#a1a1a6" fontFamily="ui-monospace, Menlo, monospace">
                  {text}
                </text>
              ))}

              {/* clean series (thin blue line) */}
              <path d={toLine(CLEAN_FORWARDED)} fill="none" stroke="#0071e3" strokeWidth="1.75" strokeLinecap="round" />

              {/* malicious series (red line + area) */}
              <path d={toArea(MALICIOUS_BLOCKED)} fill="url(#malArea)" />
              <path d={toLine(MALICIOUS_BLOCKED)} fill="none" stroke="#ef4444" strokeWidth="2.25" strokeLinecap="round" />

              {/* end-point markers */}
              <circle cx={cx(DAYS - 1)} cy={cy(MALICIOUS_BLOCKED[DAYS - 1])} r="3.5" fill="#ef4444" />
              <circle cx={cx(DAYS - 1)} cy={cy(CLEAN_FORWARDED[DAYS - 1])} r="3.5" fill="#0071e3" />
            </svg>
          </div>

          {/* Vector mix donut */}
          <div className="card p-6">
            <div className="text-sm font-semibold text-ink-900">Attack vector mix</div>
            <div className="text-xs text-fog-400">Share of blocked requests</div>

            <div className="mt-4 flex items-center gap-5">
              <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0 -rotate-90">
                <circle cx="70" cy="70" r={R} fill="none" stroke="#f5f5f7" strokeWidth="14" />
                {VECTOR_MIX.map((seg) => {
                  const len = (seg.pct / 100) * CIRC;
                  const offset = acc;
                  acc += len;
                  return (
                    <circle
                      key={seg.label}
                      cx="70"
                      cy="70"
                      r={R}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="14"
                      strokeDasharray={`${len} ${CIRC - len}`}
                      strokeDashoffset={-offset}
                    />
                  );
                })}
              </svg>

              <div className="min-w-0 flex-1 space-y-2">
                {VECTOR_MIX.map((seg) => (
                  <div key={seg.label} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="flex min-w-0 items-center gap-2 text-fog-500">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: seg.color }} />
                      <span className="truncate">{seg.label}</span>
                    </span>
                    <span className="font-mono font-semibold text-ink-900">{seg.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {KPIS.map((k) => (
            <div key={k.label} className="card flex items-baseline justify-between p-5">
              <div>
                <div className="text-xl font-semibold tracking-tight text-ink-900">{k.value}</div>
                <div className="mt-0.5 text-xs text-fog-500">{k.label}</div>
              </div>
              <div className="text-right text-[10px] leading-snug text-fog-400">{k.delta}</div>
            </div>
          ))}
        </div>

        {/* Capability list — compact rows, not cards */}
        <div className="mt-14">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-900">
              Everything under the hood
            </h3>
            <span className="font-mono text-[10px] text-fog-400">8 engines · 1 verdict</span>
          </div>
          <div className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {CAPABILITIES.map((c) => (
              <div key={c.title} className="flex items-start gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-fog-100 text-ink-900">
                  <c.icon className="h-4.5 w-4.5" strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink-900">{c.title}</div>
                  <p className="mt-0.5 text-xs leading-relaxed text-fog-500">{c.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
