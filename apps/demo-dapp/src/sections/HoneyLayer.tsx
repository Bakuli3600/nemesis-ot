import React from 'react';

/**
 * Honeypot/"decoy layer" explainer.
 * Communicates the layered defense: attacks hit a synthetic wallet shadow
 * first; only clean requests are ever forwarded to the real wallet (Nemesis decoy architecture).
 */
export const HoneyLayer: React.FC = () => {
  return (
    <section id="how" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <div className="kicker">The decoy layer</div>
          <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight text-ink-900">
            A decoy that looks exactly
            <br />
            like your wallet.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-fog-500">
            Nemesis wraps your wallet with a synthetic shadow layer — identical address
            formatting, identical prompts, identical flow. An attacker sees one seamless wallet.
            What they actually reach first is a full simulation environment.
          </p>
        </div>

        <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
          {/* Layer diagram */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="space-y-3">
              {/* Real wallet (bottom) */}
              <div className="rounded-2xl border border-black/8 bg-fog-50 p-4 sm:p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-900 text-white">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="6" width="20" height="14" rx="3" />
                        <path d="M16 13h.01" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-ink-900">Your real wallet</div>
                      <div className="font-mono text-[11px] text-fog-400">0x5534…954d · 2.315 ETH · Sepolia</div>
                    </div>
                  </div>
                  <span className="badge-mono border-emerald-500/25 bg-emerald-500/10 text-emerald-600">Protected</span>
                </div>
              </div>

              {/* connector */}
              <div className="flex justify-center">
                <svg width="20" height="26" viewBox="0 0 20 26" className="text-fog-300">
                  <path d="M10 0v18" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
                  <path d="M4 16l6 7 6-7" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </div>

              {/* Cognitia analysis */}
              <div className="rounded-2xl border border-accent-blue/20 bg-gradient-to-b from-accent-blue/8 to-white p-4 sm:p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-blue text-white">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-ink-900">Nemesis analysis layer</div>
                      <div className="text-[11px] text-fog-500">Decode · simulate · diff · score · trace</div>
                    </div>
                  </div>
                  <span className="badge-mono border-accent-blue/25 bg-accent-blue/10 text-accent-blue">Active</span>
                </div>
              </div>

              {/* connector */}
              <div className="flex justify-center">
                <svg width="20" height="26" viewBox="0 0 20 26" className="text-fog-300">
                  <path d="M10 0v18" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
                  <path d="M4 16l6 7 6-7" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </div>

              {/* Honey layer (top) */}
              <div className="relative rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-50 to-white p-4 sm:p-5 shadow-card-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-ink-900">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2a5 5 0 015 5c0 2-1 3-1 5h-8c0-2-1-3-1-5a5 5 0 015-5z" />
                        <path d="M9 16h6M10 19h4" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-ink-900">Honey layer — decoy wallet shadow</div>
                      <div className="font-mono text-[11px] text-fog-400">0x5534…954d · mirrors your real account</div>
                    </div>
                  </div>
                  <span className="badge-mono border-amber-500/30 bg-amber-400/15 text-amber-600">Attacks land here</span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-fog-500">
                  The decoy mirrors your live address so an attacker cannot tell them apart. Every
                  malicious payload detonates in the sandbox — your real assets are never touched.
                </p>
              </div>
            </div>
          </div>

          {/* Explanation copy */}
          <div className="space-y-6">
            {[
              {
                n: '01',
                t: 'Indistinguishable by design',
                d: 'The decoy presents the same address, the same balances view, and the same confirmation surfaces. To an attacker — or a drainer bot — there is exactly one wallet.',
              },
              {
                n: '02',
                t: 'Malice detonates in the sandbox',
                d: 'Suspicious requests execute against the decoy state first. Drainers reveal themselves by what they try to take: approvals, operators, permits.',
              },
              {
                n: '03',
                t: 'Only clean traffic continues',
                d: 'If the simulation comes back clean, the request is forwarded to your real wallet untouched. If it is malicious, the session dies at the decoy layer.',
              },
            ].map((step) => (
              <div key={step.n} className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[11px] font-semibold text-white">
                  {step.n}
                </div>
                <div>
                  <div className="text-base font-semibold text-ink-900">{step.t}</div>
                  <p className="mt-1 text-sm leading-relaxed text-fog-500">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
