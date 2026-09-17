import React from 'react';
import { Shield, ChevronRight, Cpu, Radar, GitCompare, Globe } from 'lucide-react';

interface HeroProps {
  onLaunchAttack: () => void;
}

const HERO_STEPS = [
  { icon: Radar, title: 'Intercept', text: 'Requests pause before your wallet ever opens.' },
  { icon: Cpu, title: 'Simulate', text: 'The transaction runs against a shadow of chain state.' },
  { icon: GitCompare, title: 'Diff', text: 'Every balance and approval change is surfaced first.' },
  { icon: Globe, title: 'Trace', text: 'Findings correlate with threat infrastructure.' },
];

export const Hero: React.FC<HeroProps> = ({ onLaunchAttack }) => {
  return (
    <section className="relative overflow-hidden bg-fog-100">
      {/* soft light gradient, Apple keynote style */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(1200px 500px at 50% -10%, rgba(0,113,227,0.10), transparent 60%), radial-gradient(800px 400px at 85% 20%, rgba(45,212,191,0.08), transparent 60%)',
        }}
      />

      <div className="relative mx-auto max-w-5xl px-6 pt-20 pb-16 sm:pt-28 sm:pb-24 text-center">
        <div className="badge-mono border-accent-blue/25 bg-white/70 text-accent-blue mx-auto">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-accent-blue opacity-75 animate-pulse-ring" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-blue" />
          </span>
          Live product demo · Web3 security
        </div>

        <h1 className="mt-6 text-4xl sm:text-6xl font-semibold tracking-tight text-ink-900 animate-fade-up">
          Your Web3 transaction
          <br />
          <span className="bg-gradient-to-r from-accent-blue to-accent-teal bg-clip-text text-transparent">
            firewall.
          </span>
        </h1>

        <p className="mt-5 mx-auto max-w-2xl text-lg sm:text-xl text-fog-500 leading-relaxed animate-fade-up" style={{ animationDelay: '80ms' }}>
          Nemesis intercepts wallet requests before they are signed — simulating what a
          transaction would really do, scoring its risk, and stopping the malicious ones cold.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-up" style={{ animationDelay: '160ms' }}>
          <button
            onClick={onLaunchAttack}
            className="group inline-flex items-center gap-2 rounded-full bg-accent-blue px-7 py-3.5 text-base font-medium text-white shadow-glow transition hover:bg-accent-blue-dark active:scale-[0.98]"
          >
            <Shield className="h-4 w-4" />
            Run a live attack
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <a href="#how" className="btn-ghost">
            How the shield works
          </a>
        </div>

        <p className="mt-4 text-xs text-fog-400">
          Fires a real wallet request — MetaMask opens the confirmation on top of this page.
          Reject it, or watch the shield block it in the console below.
        </p>
      </div>

      {/* four-step strip */}
      <div className="relative mx-auto max-w-5xl px-6 pb-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {HERO_STEPS.map((s, i) => (
            <div key={s.title} className="card p-5 text-left animate-fade-up" style={{ animationDelay: `${200 + i * 70}ms` }}>
              <s.icon className="h-5 w-5 text-accent-blue" strokeWidth={1.8} />
              <div className="mt-3 text-sm font-semibold text-ink-900">{s.title}</div>
              <div className="mt-1 text-xs leading-relaxed text-fog-500">{s.text}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
