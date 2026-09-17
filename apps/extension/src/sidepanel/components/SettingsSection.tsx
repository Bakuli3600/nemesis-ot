import React, { useState, useEffect } from 'react';
import { GlassCard } from '@cognitia/ui';
import { Settings, Shield, Cpu, RefreshCw } from 'lucide-react';
import { CognitiaSettings, DEFAULT_SETTINGS } from '@cognitia/core';

export const SettingsSection: React.FC = () => {
  const [settings, setSettings] = useState<CognitiaSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    chrome.storage?.local?.get?.(['cognitiaSettings'], (res) => {
      if (res?.cognitiaSettings) {
        setSettings(res.cognitiaSettings);
      }
    });
  }, []);

  const updateSetting = (key: keyof CognitiaSettings, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    chrome.storage?.local?.set?.({ cognitiaSettings: updated });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
          Firewall Configuration
        </span>
      </div>

      <GlassCard className="p-3.5 space-y-4 text-xs">
        {/* Protection Switch */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              Pre-Execution Interception
            </div>
            <div className="text-[11px] text-slate-400">Pause all wallet requests for security analysis</div>
          </div>
          <input
            type="checkbox"
            checked={settings.protectionEnabled}
            onChange={(e) => updateSetting('protectionEnabled', e.target.checked)}
            className="w-4 h-4 accent-cyan-500 cursor-pointer"
          />
        </div>

        {/* Demo Mode Switch */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <div>
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              Deterministic Demo Mode
            </div>
            <div className="text-[11px] text-slate-400">Seed simulation engine with hackathon demo scenarios</div>
          </div>
          <input
            type="checkbox"
            checked={settings.demoMode}
            onChange={(e) => updateSetting('demoMode', e.target.checked)}
            className="w-4 h-4 accent-amber-500 cursor-pointer"
          />
        </div>

        {/* Risk Sensitivity */}
        <div className="pt-3 border-t border-slate-800 space-y-1.5">
          <div className="font-bold text-slate-200">Risk Assessment Sensitivity</div>
          <select
            value={settings.riskSensitivity}
            onChange={(e) => updateSetting('riskSensitivity', e.target.value)}
            className="w-full bg-[#090e1a] border border-slate-700 rounded-lg p-2 text-xs text-slate-200 font-mono"
          >
            <option value="LOW">Low (Allow standard actions with warning)</option>
            <option value="STANDARD">Standard (Block Critical drainer patterns)</option>
            <option value="PARANOID">Paranoid (Block any unverified bytecode call)</option>
          </select>
        </div>

        {/* Custom RPC Endpoint */}
        <div className="pt-3 border-t border-slate-800 space-y-1.5">
          <div className="font-bold text-slate-200">Sepolia Simulation RPC Endpoint</div>
          <input
            type="text"
            defaultValue="https://rpc.sepolia.org"
            className="w-full bg-[#090e1a] border border-slate-700 rounded-lg p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          />
          <div className="text-[10px] text-slate-500">
            Allows real eth_call dry-run against testnet or local Anvil forks.
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
