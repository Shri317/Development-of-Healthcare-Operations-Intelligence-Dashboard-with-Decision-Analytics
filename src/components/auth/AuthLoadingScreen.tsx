import React from 'react';
import { ShieldCheck, Activity, Lock, RefreshCw } from 'lucide-react';

interface AuthLoadingScreenProps {
  message?: string;
  subMessage?: string;
}

export const AuthLoadingScreen: React.FC<AuthLoadingScreenProps> = ({
  message = 'Verifying Enterprise Healthcare Security Credentials...',
  subMessage = 'Connecting securely via Amazon Cognito OpenID Connect (PKCE)...'
}) => {
  return (
    <div className="min-h-screen bg-[#252525] flex flex-col items-center justify-center p-6 text-[#F9FAFB] font-sans selection:bg-[#22D3EE] selection:text-[#1E1E1E] relative overflow-hidden">
      {/* Central Medical Operations Security Card */}
      <div className="relative z-10 w-full max-w-md bg-[#333333] border border-[#4B4B4B] rounded-2xl shadow-2xl p-8 flex flex-col items-center text-center">
        {/* Emblem */}
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-400 p-0.5 shadow-xl shadow-black/40 flex items-center justify-center">
            <div className="w-full h-full bg-[#2D2D2D] rounded-[14px] flex items-center justify-center">
              <Activity className="w-8 h-8 text-[#22D3EE] animate-pulse" />
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#2D2D2D] border border-[#34D399] flex items-center justify-center">
            <Lock className="w-3 h-3 text-[#34D399]" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold tracking-tight text-[#F9FAFB] mb-1">
          MediOps <span className="text-[#22D3EE] font-normal">Intelligence</span>
        </h1>
        <p className="text-xs text-[#9CA3AF] font-medium tracking-wide uppercase mb-6">
          Enterprise Medical Operations Command System
        </p>

        {/* Loading Spinner & Status */}
        <div className="flex items-center gap-3 bg-[#2D2D2D] border border-[#4B4B4B] rounded-xl px-4 py-3 w-full mb-4">
          <RefreshCw className="w-4 h-4 text-[#22D3EE] animate-spin flex-shrink-0" />
          <div className="text-left overflow-hidden">
            <p className="text-xs font-semibold text-[#F9FAFB] truncate">
              {message}
            </p>
            <p className="text-[11px] text-[#D1D5DB] truncate">
              {subMessage}
            </p>
          </div>
        </div>

        {/* Security badges */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-[#9CA3AF] pt-2 border-t border-[#4B4B4B] w-full">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
            HIPAA Compliant
          </span>
          <span>•</span>
          <span>AWS Cognito us-east-1</span>
          <span>•</span>
          <span>PKCE S256</span>
        </div>
      </div>
    </div>
  );
};
