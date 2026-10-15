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
        className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
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
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse" 
            title="Authenticated Session"
          />
        </div>

        {/* User Info labels (hidden on very small screens) */}
        <div className="hidden lg:flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-200 max-w-[140px] truncate leading-tight">
              {user.email}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 rounded">
              {primaryGroup}
            </span>
            <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5">
              • Auth
            </span>
          </div>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-cyan-400' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header Identity Section */}
          <div className="flex items-start gap-3 pb-3 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-600 p-0.5 shadow-lg flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-white">
                {initials}
              </span>
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold text-white truncate">
                {user.email}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-950/90 text-emerald-400 border border-emerald-800/60 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Authenticated
                </span>
                <span className="text-[10px] text-slate-400">
                  Cognito SSO
                </span>
              </div>
            </div>
          </div>

          {/* User Roles & Groups */}
          <div className="py-3 border-b border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                Cognito Group / Role
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                OIDC Claims
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {user.groups && user.groups.length > 0 ? (
                user.groups.map((group) => (
                  <span
                    key={group}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800/70 rounded-lg"
                  >
                    <Layers className="w-3 h-3 text-cyan-400" />
                    {group}
                  </span>
                ))
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700 rounded-lg">
                  <UserIcon className="w-3 h-3 text-slate-400" />
                  Role Not Assigned
                </span>
              )}
            </div>
          </div>

          {/* User Pool & Infrastructure Info */}
          <div className="py-2.5 border-b border-slate-800/70 text-[10px] text-slate-500 space-y-1 font-mono">
            <div className="flex justify-between">
              <span>Identity Provider:</span>
              <span className="text-slate-400">AWS Cognito (us-east-1)</span>
            </div>
            <div className="flex justify-between">
              <span>Security Flow:</span>
              <span className="text-slate-400">Authorization Code + PKCE</span>
            </div>
          </div>

          {/* Logout Action */}
          <div className="pt-3">
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/50 hover:border-rose-700 text-rose-300 hover:text-rose-200 text-xs font-semibold transition cursor-pointer shadow-sm shadow-rose-950/40"
              title="Terminate Cognito Session & Sign Out"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Sign Out of MedOps</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
