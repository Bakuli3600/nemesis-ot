import React from 'react';
import { Shield } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-black/5 bg-fog-50">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-900 text-white">
                <Shield className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold text-ink-900">Nemesis</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-fog-500">
              Pre-execution transaction interceptor and malicious signature simulator. Nemesis
              analyzes requests only — it never holds keys, never auto-signs, and never broadcasts
              simulated transactions.
            </p>
          </div>

          <div className="flex gap-16">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-900">Product</div>
              <ul className="mt-3 space-y-2 text-[13px] text-fog-500">
                <li><a href="#how" className="hover:text-ink-900">Decoy layer</a></li>
                <li><a href="#console" className="hover:text-ink-900">Live console</a></li>
                <li><a href="#trace" className="hover:text-ink-900">Traceback</a></li>
              </ul>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-900">Environment</div>
              <ul className="mt-3 space-y-2 text-[13px] text-fog-500">
                <li>Chrome extension (MV3)</li>
                <li>Sepolia testnet</li>
                <li>Simulated intelligence</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-black/5 pt-6 text-[11px] text-fog-400 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Nemesis — COGNITIA 2026 Hackathon · Blockchain &amp; Cybersecurity</span>
          <span className="font-mono">All demonstration data is synthetic · No real assets are at risk</span>
        </div>
      </div>
    </footer>
  );
};
