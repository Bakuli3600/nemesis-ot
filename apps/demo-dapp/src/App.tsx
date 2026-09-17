import React, { useState } from 'react';

import { Nav } from './sections/Nav';
import { Hero } from './sections/Hero';
import { HoneyLayer } from './sections/HoneyLayer';
import { AttackConsole } from './sections/AttackConsole';
import { DarkWebTrace } from './sections/DarkWebTrace';
import { Features } from './sections/Features';
import { Footer } from './sections/Footer';
import { DEFAULT_SCENARIO } from './demo/scenarios';

type TracePayload = Parameters<
  NonNullable<React.ComponentProps<typeof AttackConsole>['onTraceChange']>
>[0];

/**
 * Nemesis — product site + live demonstration environment.
 *
 * Light Apple-style marketing sections up top; a deep-graphite console for the
 * attack simulation; all "intelligence" is locally generated demo data.
 */
const App: React.FC = () => {
  /** Incremented by the hero CTA to tell the console to run. */
  const [runSignal, setRunSignal] = useState(0);
  /** Latest blocked malicious run, consumed by the traceback section. */
  const [trace, setTrace] = useState<TracePayload>(null);

  const eth = (window as unknown as { ethereum?: { request: (a: unknown) => Promise<unknown> } })
    .ethereum;

  /**
   * Hero CTA: launch a real attack.
   * 1. Kick off the local analysis simulation in the console.
   * 2. If a Web3 wallet is installed, dispatch the REAL wallet request —
   *    MetaMask opens its confirmation dialog on top of the page, exactly as
   *    it would during a genuine phishing attack. The user can reject it.
   * 3. If no wallet is present, the console simulation still runs.
   */
  const launchAttack = () => {
    setRunSignal((n) => n + 1);
    document.getElementById('console')?.scrollIntoView({ behavior: 'smooth' });

    const req = DEFAULT_SCENARIO.walletRequest;
    if (eth && req) {
      // Fire-and-forget: MetaMask pops its own UI. Rejection is expected and fine.
      eth.request(req).catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main>
        <Hero onLaunchAttack={launchAttack} />
        <HoneyLayer />
        <AttackConsole runSignal={runSignal} onTraceChange={setTrace} />
        <DarkWebTrace active={trace} />
        <Features />
      </main>
      <Footer />
    </div>
  );
};

export default App;
