import React from 'react';
import { X, Bell, Info } from 'lucide-react';

interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteAction?: (actionId: string, payload?: any) => void;
}

export const AlertsModal: React.FC<AlertsModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const alertItems = [
    {
      id: 'ALT-101',
      title: 'High Claim Denial Spike Alert (88% Risk)',
      desc: 'Medicare Part B claim #CLM-2026-9042 flagged for missing prior-authorization token.',
      severity: 'Critical',
      time: '4 mins ago',
      statusLabel: 'Rule Active · Continuous Denial Monitoring',
      color: 'border-rose-800 bg-rose-950/40 text-rose-300'
    },
    {
      id: 'ALT-102',
      title: 'ED Door-to-Doctor SLA Breach Warning',
      desc: 'Wait time at Metro General ED reached 38.4 mins (+18 mins over 20 min SLA target).',
      severity: 'High',
      time: '12 mins ago',
      statusLabel: 'SLA Monitor · Active Threshold Rule',
      color: 'border-amber-800 bg-amber-950/40 text-amber-300'
    },
    {
      id: 'ALT-103',
      title: 'Pharmacy Stock Low Level Alert',
      desc: 'Propofol Injectable emulsion down to 45 units (Predicted depletion in 2 days).',
      severity: 'Medium',
      time: '1 hour ago',
      statusLabel: 'Inventory Rule · Automated Depletion Tracking',
      color: 'border-cyan-800 bg-cyan-950/40 text-cyan-300'
    }
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" /> Operational Exception & SLA Notices ({alertItems.length})
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-2 text-xs text-slate-400">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>Automated outbound dispatch gateway is in standby mode. Notices reflect continuous analytical threshold monitoring.</span>
        </div>

        <div className="space-y-3">
          {alertItems.map((alt) => (
            <div key={alt.id} className={`p-4 border rounded-xl space-y-2 text-xs ${alt.color}`}>
              <div className="flex justify-between items-center font-bold">
                <span>{alt.title}</span>
                <span className="font-mono text-[10px] uppercase">{alt.severity}</span>
              </div>
              <p className="text-slate-300">{alt.desc}</p>
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-[10px] opacity-75">{alt.time}</span>
                <span className="px-2.5 py-0.5 bg-slate-950/90 border border-slate-700/80 rounded text-[10px] font-mono text-slate-300">
                  {alt.statusLabel}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
