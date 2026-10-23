import React, { useState, useRef, useEffect } from 'react';
import { 
  LogOut, 
  ShieldCheck, 
  ChevronDown, 
  User as UserIcon, 
  CheckCircle2, 
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const UserAccountMenu: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!isAuthenticated || !user) {
    return null;
  }

  // Get user initials for avatar
  const initials = user.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'MO';

  const primaryGroup = user.groups && user.groups.length > 0 
    ? user.groups[0] 
    : 'NO ROLE';

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-[#2D2D2D] hover:bg-[#383838] border border-[#4B4B4B] hover:border-[#60A5FA] transition cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-[#22D3EE]/50"
        title="View User Account & Cognito Session"
      >
        {/* Avatar with Status indicator */}
        <div className="relative">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-600 to-teal-700 p-0.5 shadow-md flex items-center justify-center">
            <span className="text-[11px] font-bold text-white tracking-wider">
              {initials}
            </span>
          </div>
          {/* Green Live Authenticated Dot */}
          <span 
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#34D399] border-2 border-[#1E1E1E] animate-pulse" 
            title="Authenticated Session"
          />
        </div>

        {/* User Info labels (hidden on very small screens) */}
        <div className="hidden lg:flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-[#F9FAFB] max-w-[140px] truncate leading-tight">
              {user.email}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider bg-[#22D3EE]/15 text-[#22D3EE] border border-[#22D3EE]/30 rounded">
              {primaryGroup}
            </span>
            <span className="text-[10px] text-[#34D399] font-medium flex items-center gap-0.5">
              • Auth
            </span>
          </div>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-[#9CA3AF] transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#22D3EE]' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#2D2D2D] border border-[#4B4B4B] rounded-2xl shadow-2xl backdrop-blur-xl z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header Identity Section */}
          <div className="flex items-start gap-3 pb-3 border-b border-[#4B4B4B]">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-600 p-0.5 shadow-lg flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-white">
                {initials}
              </span>
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold text-[#F9FAFB] truncate">
                {user.email}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-[#34D399]" />
                  Authenticated
                </span>
                <span className="text-[10px] text-[#9CA3AF]">
                  Cognito SSO
                </span>
              </div>
            </div>
          </div>

          {/* User Roles & Groups */}
          <div className="py-3 border-b border-[#4B4B4B] space-y-2">
            <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#22D3EE]" />
                Cognito Group / Role
              </span>
              <span className="text-[10px] font-mono text-[#9CA3AF]">
                OIDC Claims
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {user.groups && user.groups.length > 0 ? (
                user.groups.map((group) => (
                  <span
                    key={group}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-[#22D3EE]/15 text-[#22D3EE] border border-[#22D3EE]/30 rounded-lg"
                  >
                    <Layers className="w-3 h-3 text-[#22D3EE]" />
                    {group}
                  </span>
                ))
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-[#383838] text-[#D1D5DB] border border-[#4B4B4B] rounded-lg">
                  <UserIcon className="w-3 h-3 text-[#9CA3AF]" />
                  Role Not Assigned
                </span>
              )}
            </div>
          </div>

          {/* User Pool & Infrastructure Info */}
          <div className="py-2.5 border-b border-[#4B4B4B] text-[10px] text-[#9CA3AF] space-y-1 font-mono">
            <div className="flex justify-between">
              <span>Identity Provider:</span>
              <span className="text-[#D1D5DB]">AWS Cognito (us-east-1)</span>
            </div>
            <div className="flex justify-between">
              <span>Security Flow:</span>
              <span className="text-[#D1D5DB]">Authorization Code + PKCE</span>
            </div>
          </div>

          {/* Logout Action */}
          <div className="pt-3">
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#FB7185]/15 hover:bg-[#FB7185]/25 border border-[#FB7185]/40 text-[#FB7185] text-xs font-semibold transition cursor-pointer shadow-sm"
              title="Terminate Cognito Session & Sign Out"
            >
              <LogOut className="w-3.5 h-3.5 text-[#FB7185]" />
              <span>Sign Out of MedOps</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
