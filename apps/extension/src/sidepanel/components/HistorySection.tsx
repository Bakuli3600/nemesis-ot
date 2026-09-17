import React, { useState, useEffect } from 'react';
import { GlassCard, RiskBadge } from '@cognitia/ui';
import { RequestHistoryItem } from '@cognitia/core';
import { History, Search, Trash2, ShieldAlert, CheckCircle } from 'lucide-react';
import { shortenAddress } from '@cognitia/shared';

export const HistorySection: React.FC = () => {
  const [history, setHistory] = useState<RequestHistoryItem[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const loadHistory = () => {
    chrome.storage?.local?.get?.(['requestHistory'], (res) => {
      if (res?.requestHistory) {
        setHistory(res.requestHistory);
      } else {
        // Default demo history items
        setHistory([
          {
            id: 'NMS-2026-000042',
            timestamp: Date.now() - 120000,
            origin: 'fake-airdrop.xyz',
            method: 'eth_sendTransaction',
            chainId: 11155111,
            target: '0x7777777777777777777777777777777777777777',
            functionName: 'setApprovalForAll',
            riskScore: 94,
            severity: 'CRITICAL',
            decision: 'BLOCK',
            simulationStatus: 'SIMULATION_SUCCESS',
            mode: 'demo',
          },
          {
            id: 'NMS-2026-000041',
            timestamp: Date.now() - 360000,
            origin: 'uniswap.org',
            method: 'eth_sendTransaction',
            chainId: 1,
            target: '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45',
            functionName: 'swap',
            riskScore: 12,
            severity: 'LOW',
            decision: 'CONTINUE',
            simulationStatus: 'SIMULATION_SUCCESS',
            mode: 'live',
          },
        ]);
      }
    });
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleClear = () => {
    chrome.storage?.local?.set?.({ requestHistory: [] }, () => {
      setHistory([]);
    });
  };

  const filtered = history.filter((item) => {
    if (filterSeverity !== 'ALL' && item.severity !== filterSeverity) return false;
    if (
      searchTerm &&
      !item.origin.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !(item.functionName || '').toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Request Audit History
          </span>
        </div>
        <button
          onClick={handleClear}
          className="text-[11px] text-slate-400 hover:text-red-400 flex items-center gap-1 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Filter by origin or function..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#090e1a] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          />
        </div>
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="bg-[#090e1a] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none"
        >
          <option value="ALL">All Severities</option>
          <option value="CRITICAL">Critical Only</option>
          <option value="HIGH">High Only</option>
          <option value="LOW">Low Only</option>
        </select>
      </div>

      {/* History List */}
      {filtered.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500 font-mono">
          No matching transaction history records.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <GlassCard
              key={item.id}
              variant={item.decision === 'BLOCK' ? 'critical' : 'default'}
              className="p-3 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  {item.decision === 'BLOCK' ? (
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  {item.origin}
                </span>
                <RiskBadge severity={item.severity} score={item.riskScore} size="sm" />
              </div>

              <div className="text-[11px] font-mono text-slate-300 flex justify-between">
                <span>
                  {item.functionName || item.method} → {shortenAddress(item.target, 4)}
                </span>
                <span
                  className={
                    item.decision === 'BLOCK'
                      ? 'text-red-400 font-bold'
                      : 'text-emerald-400 font-bold'
                  }
                >
                  {item.decision}ED
                </span>
              </div>

              <div className="text-[10px] text-slate-500 flex justify-between">
                <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                <span>ID: {item.id}</span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};
