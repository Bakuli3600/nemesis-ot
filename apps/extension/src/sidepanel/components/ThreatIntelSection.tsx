import React, { useState } from 'react';
import { GlassCard, ThreatNetwork3D } from '@cognitia/ui';
import { ThreatIntelEngine } from '@cognitia/threat-intel';
import { Database, Search, ShieldAlert, ShieldCheck } from 'lucide-react';
import { shortenAddress } from '@cognitia/shared';

export const ThreatIntelSection: React.FC = () => {
  const [searchAddr, setSearchAddr] = useState('0x6666666666666666666666666666666666666666');
  const [intelEngine] = useState(() => new ThreatIntelEngine());
  const [lookupResult, setLookupResult] = useState(() => intelEngine.checkAddress('0x6666666666666666666666666666666666666666'));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupResult(intelEngine.checkAddress(searchAddr));
  };

  return (
    <div className="space-y-4">
      {/* 3D Threat Cluster Animation */}
      <ThreatNetwork3D height={160} />

      {/* Address Reputation Lookup Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchAddr}
            onChange={(e) => setSearchAddr(e.target.value)}
            placeholder="Search address or contract 0x..."
            className="w-full bg-[#090e1a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          />
        </div>
        <button
          type="submit"
          className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition"
        >
          <Search className="w-3.5 h-3.5" />
          Lookup
        </button>
      </form>

      {/* Lookup Verdict Card */}
      {lookupResult && (
        <GlassCard
          variant={lookupResult.isKnownThreat ? 'critical' : 'highlight'}
          className="p-3.5 space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {lookupResult.isKnownThreat ? (
                <ShieldAlert className="w-5 h-5 text-red-400" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              )}
              <span className="text-xs font-bold text-white uppercase">
                {lookupResult.isKnownThreat ? 'CONFIRMED MALICIOUS THREAT' : 'CLEAN REPUTATION'}
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-slate-300">
              Score: {lookupResult.reputationScore}/100
            </span>
          </div>

          <p className="text-xs text-slate-300">{lookupResult.details}</p>

          <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800 flex justify-between">
            <span>Source: {lookupResult.source}</span>
            {lookupResult.threatFamily && (
              <span className="text-red-400 font-bold">Family: {lookupResult.threatFamily}</span>
            )}
          </div>
        </GlassCard>
      )}

      {/* Known Threat Families Catalog */}
      <GlassCard className="p-3.5 space-y-2.5">
        <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          Monitored Threat Signatures
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="p-2 rounded bg-black/40 border border-slate-800 flex justify-between items-center">
            <div>
              <div className="font-bold text-slate-300">FAKE_AIRDROP_DRAINER</div>
              <div className="text-[10px] text-slate-500">claimRewards() disguised approval attacks</div>
            </div>
            <span className="text-[10px] text-red-400 font-mono">CRITICAL</span>
          </div>

          <div className="p-2 rounded bg-black/40 border border-slate-800 flex justify-between items-center">
            <div>
              <div className="font-bold text-slate-300">NFT_DRAINER</div>
              <div className="text-[10px] text-slate-500">Collection-wide setApprovalForAll sweeps</div>
            </div>
            <span className="text-[10px] text-red-400 font-mono">CRITICAL</span>
          </div>

          <div className="p-2 rounded bg-black/40 border border-slate-800 flex justify-between items-center">
            <div>
              <div className="font-bold text-slate-300">PERMIT_DRAINER</div>
              <div className="text-[10px] text-slate-500">EIP-712 off-chain gasless permit theft</div>
            </div>
            <span className="text-[10px] text-amber-400 font-mono">HIGH</span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
