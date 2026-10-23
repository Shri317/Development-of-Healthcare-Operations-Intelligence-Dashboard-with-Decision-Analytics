import React from 'react';
import { 
  Building2, 
  Users, 
  Stethoscope, 
  DollarSign, 
  FileCheck2, 
  Code2, 
  Pill, 
  TestTube, 
  Siren, 
  ShieldAlert, 
  HeartHandshake, 
  Truck, 
  TrendingUp, 
  ChevronRight
} from 'lucide-react';

export type ModuleId = 
  | 'executive'
  | 'patient-ops'
  | 'staff-intel'
  | 'billing-rev'
  | 'claims-auto'
  | 'coding-doc'
  | 'pharmacy-inv'
  | 'lab-diag'
  | 'emergency-ops'
  | 'quality-compliance'
  | 'patient-exp'
  | 'supply-chain'
  | 'financial-intel';

interface SidebarProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavGroup {
  groupName: string;
  items: {
    id: ModuleId;
    label: string;
    icon: React.ElementType;
    badge?: string;
    badgeColor?: string;
  }[];
}

const navGroups: NavGroup[] = [
  {
    groupName: 'Executive & Core Operations',
    items: [
      { id: 'executive', label: 'Executive Command Center', icon: Building2 },
      { id: 'patient-ops', label: 'Patient Operations', icon: Users },
      { id: 'staff-intel', label: 'Doctor & Staff Intelligence', icon: Stethoscope },
      { id: 'emergency-ops', label: 'Emergency & Critical Ops', icon: Siren },
    ],
  },
  {
    groupName: 'Revenue Cycle & Finance',
    items: [
      { id: 'billing-rev', label: 'Billing & Revenue Intelligence', icon: DollarSign },
      { id: 'claims-auto', label: 'Insurance & Claims Automation', icon: FileCheck2 },
      { id: 'coding-doc', label: 'Medical Coding & Documentation', icon: Code2 },
      { id: 'financial-intel', label: 'Financial Intelligence (P&L)', icon: TrendingUp },
    ],
  },
  {
    groupName: 'Clinical, Quality & Supply',
    items: [
      { id: 'lab-diag', label: 'Laboratory & Diagnostics', icon: TestTube },
      { id: 'pharmacy-inv', label: 'Pharmacy & Inventory', icon: Pill },
      { id: 'quality-compliance', label: 'Quality & Compliance', icon: ShieldAlert },
      { id: 'patient-exp', label: 'Patient Experience', icon: HeartHandshake },
      { id: 'supply-chain', label: 'Supply Chain & Vendors', icon: Truck },
    ],
  },
];

const totalModulesCount = navGroups.reduce((acc, g) => acc + g.items.length, 0);

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  collapsed,
  onToggleCollapse,
}) => {
  return (
    <aside
      className={`h-[calc(100vh-61px)] sticky top-[61px] bg-[#1E1E1E] border-r border-[#4B4B4B] transition-all duration-300 flex flex-col z-20 ${
        collapsed ? 'w-16' : 'w-72'
      }`}
    >
      {/* Collapse Toggle Bar */}
      <div className="p-3 border-b border-[#4B4B4B] flex items-center justify-between">
        {!collapsed && (
          <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
            System Modules ({totalModulesCount})
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg bg-[#2D2D2D] hover:bg-[#383838] text-[#D1D5DB] hover:text-[#F9FAFB] text-xs flex items-center justify-center transition mx-auto border border-[#4B4B4B]"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      </div>

      {/* Navigation Group Items List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            {!collapsed && (
              <h3 className="px-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1">
                {group.groupName}
              </h3>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectModule(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition text-left relative group ${
                    isActive
                      ? 'bg-[#22D3EE]/15 text-[#22D3EE] border border-[#22D3EE]/50 font-semibold shadow-sm'
                      : 'text-[#D1D5DB] hover:bg-[#2D2D2D] hover:text-[#F9FAFB]'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#22D3EE]' : 'text-[#9CA3AF] group-hover:text-[#F9FAFB]'}`} />
                  
                  {!collapsed && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}

                  {!collapsed && item.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                        item.badgeColor || 'bg-[#2D2D2D] text-[#D1D5DB] border border-[#4B4B4B]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {collapsed && item.badge && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#22D3EE] animate-ping" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer System Status */}
      {!collapsed && (
        <div className="p-3 border-t border-[#4B4B4B] bg-[#1E1E1E]">
          <div className="flex items-center justify-between text-[11px] text-[#9CA3AF]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
              Analytics Gateway: Connected
            </span>
            <span className="font-mono text-[#9CA3AF]">v4.2</span>
          </div>
        </div>
      )}
    </aside>
  );
};
