import React from 'react';
import { Globe, Link2, ShieldAlert, EyeOff } from 'lucide-react';
import { shortAddr, type DemoScenario, type DemoReport, type DarkWebTrace as DarkWebTraceData } from '../demo/scenarios';

interface Props {
  active: { scenario: DemoScenario; report: DemoReport } | null;
}

/**
 * Simulated threat-relay traceback. Mirrors the extension's Threat Mirror:
 * a Tor-style route visualization over synthetic intelligence records.
 * Clearly badged DEMO — never claims real dark-web access.
 */
export const DarkWebTrace: React.FC<Props> = ({ active }) => {
  const trace: DarkWebTraceData | null = active?.report.darkWeb ?? null;
  const attacker = active?.report.attackGraph.nodes.find((n) => n.kind === 'attacker' || n.kind === 'operator');

  return (
    <section id="trace" className="bg-ink-900 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <div className="kicker text-accent-teal">Threat mirror</div>
          <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight text-white">
            Trace the attack back
            <br />
            to its source.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-white/50">
            Blocked payloads are fingerprinted and correlated against a simulated dark-web
            intelligence mirror — reconstructing the route the attack took and the infrastructure
            that sold it.
          </p>
        </div>

        {!trace || !attacker ? (
          /* Empty state — shown before any attack ran */
          <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-8 py-16 text-center">
            <EyeOff className="h-8 w-8 text-white/20" strokeWidth={1.5} />
            <div className="mt-3 text-sm text-white/40">No traceback yet</div>
            <div className="mt-1 text-xs text-white/25">
              Run a malicious scenario in the console above — the route appears here.
            </div>
          </div>
        ) : (
          <div className="mt-12 grid gap-5 lg:grid-cols-[1fr_380px]">
            {/* Route */}
            <div className="console-panel p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-mono uppercase tracking-wider text-white/40">
                  Simulated threat route
                </div>
                <span className="badge-mono border-amber-500/30 bg-amber-500/10 text-amber-300">
                  Demo intelligence
                </span>
              </div>

              {/* Tor-style hop chain */}
              <div className="mt-6 space-y-0">
                {trace.hops.map((hop, i) => (
                  <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
                    {/* connector line */}
                    {i < trace.hops.length - 1 && (
                      <span className="absolute left-[13px] top-7 h-full w-px bg-gradient-to-b from-accent-teal/50 to-white/10" />
                    )}
                    <span className="relative mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border border-accent-teal/40 bg-ink-950">
                      <span className="h-2 w-2 rounded-full bg-accent-teal" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white">{hop.label}</div>
                      <div className="font-mono text-[11px] text-white/40">{hop.detail}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* attribution */}
              <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/8 pt-5">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-white/35">Cluster attribution</div>
                  <div className="mt-1 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-red-400" />
                    <span className="text-sm font-semibold text-white">{trace.cluster}</span>
                    <span className="badge-mono border-red-500/30 bg-red-500/10 text-red-300">
                      {trace.clusterConfidence}% conf
                    </span>
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-white/35">Linked wallet</div>
                  <div className="mt-1 font-mono text-sm text-white/70">{shortAddr(attacker.label)}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-white/35">Window</div>
                  <div className="mt-1 font-mono text-sm text-white/70">
                    {trace.firstSeen} → {trace.lastSeen}
                  </div>
                </div>
              </div>
            </div>

            {/* Marketplace listing card */}
            <div className="console-panel overflow-hidden">
              <div className="border-b border-white/8 px-5 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-white/40" />
                    <span className="font-mono text-xs text-white/60">{trace.marketName}</span>
                  </div>
                  <span className="font-mono text-[10px] text-white/25">onion · v3</span>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-white/35">Hidden service</div>
                  <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2">
                    <Link2 className="h-3.5 w-3.5 shrink-0 text-accent-teal" />
                    <code className="truncate font-mono text-xs text-accent-teal">{trace.onion}</code>
                  </div>
                  <div className="mt-1.5 text-[10px] text-white/25">
                    Synthetic address — resolved inside Nemesis's read-only mirror, never contacted live.
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-xs font-medium leading-snug text-white/85">{trace.listing}</div>
                    <span className="shrink-0 rounded-md bg-red-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-red-300">
                      {trace.price}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-3 font-mono text-[10px] text-white/40">
                    <span>vendor · {trace.vendor}</span>
                    <span>{trace.listingsFound} related listings</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <p className="text-[11px] leading-relaxed text-amber-200/70">
                    All market intelligence shown here is synthetic and generated locally for
                    demonstration. No real dark-web service is ever contacted.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
