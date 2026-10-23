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
      color: 'border-[#FB7185]/40 bg-[#FB7185]/10',
      badgeColor: 'text-[#FB7185] bg-[#FB7185]/15 border-[#FB7185]/30'
    },
    {
      id: 'ALT-102',
      title: 'ED Door-to-Doctor SLA Breach Warning',
      desc: 'Wait time at Metro General ED reached 38.4 mins (+18 mins over 20 min SLA target).',
      severity: 'High',
      time: '12 mins ago',
      statusLabel: 'SLA Monitor · Active Threshold Rule',
      color: 'border-[#FBBF24]/40 bg-[#FBBF24]/10',
      badgeColor: 'text-[#FBBF24] bg-[#FBBF24]/15 border-[#FBBF24]/30'
    },
    {
      id: 'ALT-103',
      title: 'Pharmacy Stock Low Level Alert',
      desc: 'Propofol Injectable emulsion down to 45 units (Predicted depletion in 2 days).',
      severity: 'Medium',
      time: '1 hour ago',
      statusLabel: 'Inventory Rule · Automated Depletion Tracking',
      color: 'border-[#22D3EE]/40 bg-[#22D3EE]/10',
      badgeColor: 'text-[#22D3EE] bg-[#22D3EE]/15 border-[#22D3EE]/30'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="medops-modal-card bg-[#333333] border border-[#4B4B4B] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#4B4B4B] pb-3">
          <h3 className="text-base font-bold text-[#F9FAFB] flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#FBBF24]" /> Operational Exception & SLA Notices ({alertItems.length})
          </h3>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#F9FAFB] transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 bg-[#2D2D2D] border border-[#4B4B4B] rounded-xl flex items-center gap-2 text-xs text-[#D1D5DB]">
          <Info className="w-4 h-4 text-[#22D3EE] shrink-0" />
          <span>Automated outbound dispatch gateway is in standby mode. Notices reflect continuous analytical threshold monitoring.</span>
        </div>

        <div className="space-y-3">
          {alertItems.map((alt) => (
            <div key={alt.id} className={`p-4 border rounded-xl space-y-2 text-xs ${alt.color}`}>
              <div className="flex justify-between items-center font-bold">
                <span className="text-[#F9FAFB]">{alt.title}</span>
                <span className="font-mono text-[10px] uppercase text-[#F9FAFB]">{alt.severity}</span>
              </div>
              <p className="text-[#D1D5DB]">{alt.desc}</p>
              <div className="pt-2 border-t border-[#4B4B4B]/60 flex items-center justify-between">
                <span className="text-[10px] text-[#9CA3AF]">{alt.time}</span>
                <span className={`px-2.5 py-0.5 border rounded text-[10px] font-mono ${alt.badgeColor}`}>
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
