import React from 'react';
import { 
  Building2, 
  Clock, 
  Bot, 
  Activity
} from 'lucide-react';
import type { TimeframeOption } from '../../types';
import { facilitiesData } from '../../data/mockData';
import { fetchFacilities, type Facility } from '../../services/apiService';
import { UserAccountMenu } from '../auth/UserAccountMenu';

interface HeaderProps {
  selectedFacility: string;
  onFacilityChange: (id: string) => void;
  selectedTimeframe: TimeframeOption;
  onTimeframeChange: (tf: TimeframeOption) => void;
  onToggleCopilot: () => void;
  isCopilotOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  selectedFacility,
  onFacilityChange,
  selectedTimeframe,
  onTimeframeChange,
  onToggleCopilot,
  isCopilotOpen
}) => {
  const [facilities, setFacilities] = React.useState<Facility[]>(facilitiesData);

  React.useEffect(() => {
    fetchFacilities()
      .then((data) => {
        if (data && data.length > 0) {
          setFacilities(data);
        }
      })
      .catch((err) => console.warn('Using default facilities list:', err));
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-[#1E1E1E]/95 backdrop-blur border-b border-[#4B4B4B] px-4 lg:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
      {/* Brand & System Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-400 p-0.5 shadow-lg shadow-black/40 flex items-center justify-center">
          <div className="w-full h-full bg-[#2D2D2D] rounded-[10px] flex items-center justify-center">
            <Activity className="w-5 h-5 text-[#22D3EE] animate-pulse" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-[#F9FAFB] tracking-tight">
              MediOps <span className="text-[#22D3EE] font-normal">Intelligence</span>
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-[#22D3EE]/15 text-[#22D3EE] border border-[#22D3EE]/30 rounded-full">
              Enterprise v4.2
            </span>
          </div>
          <p className="text-xs text-[#9CA3AF] hidden sm:block">
            Medical Operations Intelligence & Automation Command System
          </p>
        </div>
      </div>

      {/* Global Slicers & Context Filters */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Facility Selector */}
        <div className="flex items-center gap-1.5 bg-[#2D2D2D] border border-[#4B4B4B] rounded-lg px-2.5 py-1.5 text-xs text-[#D1D5DB]">
          <Building2 className="w-3.5 h-3.5 text-[#22D3EE]" />
          <select
            value={selectedFacility}
            onChange={(e) => onFacilityChange(e.target.value)}
            className="bg-transparent text-[#F9FAFB] border-none outline-none font-medium cursor-pointer"
          >
            <option value="all" className="bg-[#2D2D2D] text-[#F9FAFB]">All Facilities (Enterprise Group)</option>
            {facilities.map((fac) => (
              <option key={fac.id} value={fac.id} className="bg-[#2D2D2D] text-[#F9FAFB]">
                {fac.name}
              </option>
            ))}
          </select>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1.5 bg-[#2D2D2D] border border-[#4B4B4B] rounded-lg px-2.5 py-1.5 text-xs text-[#D1D5DB]">
          <Clock className="w-3.5 h-3.5 text-[#34D399]" />
          <select
            value={selectedTimeframe}
            onChange={(e) => onTimeframeChange(e.target.value as TimeframeOption)}
            className="bg-transparent text-[#F9FAFB] border-none outline-none font-medium cursor-pointer"
          >
            <option value="realtime" className="bg-[#2D2D2D] text-[#F9FAFB]">Current Operations</option>
            <option value="today" className="bg-[#2D2D2D] text-[#F9FAFB]">Today (24 Hrs)</option>
            <option value="weekly" className="bg-[#2D2D2D] text-[#F9FAFB]">This Week</option>
            <option value="monthly" className="bg-[#2D2D2D] text-[#F9FAFB]">This Month (Sep 2026)</option>
            <option value="quarterly" className="bg-[#2D2D2D] text-[#F9FAFB]">Q3 2026</option>
            <option value="ytd" className="bg-[#2D2D2D] text-[#F9FAFB]">Year to Date (YTD)</option>
          </select>
        </div>
      </div>

      {/* Header Actions & Mode Toggles */}
      <div className="flex items-center gap-2">
        {/* Dedicated AI Agent Copilot Drawer Trigger */}
        <button
          onClick={onToggleCopilot}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition border shadow-lg ${
            isCopilotOpen
              ? 'bg-[#22D3EE] text-[#1E1E1E] border-[#22D3EE] shadow-[#22D3EE]/30'
              : 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white border-cyan-400/30'
          }`}
        >
          <Bot className="w-4 h-4 animate-spin-slow" />
          <span>AI Copilot</span>
        </button>

        {/* Divider & Enterprise User Account Profile */}
        <div className="h-6 w-px bg-[#4B4B4B] mx-1 hidden sm:block" />
        <UserAccountMenu />
      </div>
    </header>
  );
};
