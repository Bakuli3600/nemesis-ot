import React, { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';

const LINKS = [
  { href: '#how', label: 'Decoy layer' },
  { href: '#console', label: 'Live console' },
  { href: '#trace', label: 'Traceback' },
  { href: '#features', label: 'Capabilities' },
];

export const Nav: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'border-b border-black/5 bg-white/80 backdrop-blur-xl' : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <a href="#" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-900 text-white">
            <Shield className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-ink-900">
            Nemesis
          </span>
          <span className="badge-mono hidden border-amber-500/30 bg-amber-400/10 text-amber-600 sm:inline-flex">
            Demo
          </span>
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-1.5 text-[13px] text-fog-500 transition hover:bg-black/5 hover:text-ink-900"
            >
              {l.label}
            </a>
          ))}
        </div>

        <a
          href="#console"
          className="rounded-full bg-ink-900 px-4 py-1.5 text-[13px] font-medium text-white transition hover:bg-black active:scale-[0.98]"
        >
          Open console
        </a>
      </nav>
    </header>
  );
};
