import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'critical' | 'highlight' | 'terminal';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  variant = 'default',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'critical':
        return 'border-red-500/30 bg-[#12070a]/90 shadow-[0_4px_24px_rgba(239,68,68,0.12)]';
      case 'highlight':
        return 'border-cyan-500/30 bg-[#071318]/90 shadow-[0_4px_24px_rgba(6,182,212,0.1)]';
      case 'terminal':
        return 'border-slate-800 bg-[#080b11]/95 font-mono';
      default:
        return 'border-slate-800/80 bg-[#0d121d]/85 shadow-[0_4px_20px_rgba(0,0,0,0.4)]';
    }
  };

  return (
    <div
      className={`rounded-xl border backdrop-blur-xl p-4 transition-all duration-200 ${getVariantStyles()} ${className}`}
    >
      {children}
    </div>
  );
};
