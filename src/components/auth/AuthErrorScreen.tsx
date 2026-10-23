import React from 'react';
import { AlertTriangle, RotateCcw, LogIn, ShieldAlert } from 'lucide-react';

interface AuthErrorScreenProps {
  error: string;
  onRetry: () => void;
}

export const AuthErrorScreen: React.FC<AuthErrorScreenProps> = ({ error, onRetry }) => {
  return (
    <div className="min-h-screen bg-[#252525] flex flex-col items-center justify-center p-6 text-[#F9FAFB] font-sans selection:bg-[#FB7185] selection:text-[#1E1E1E] relative overflow-hidden">
      <div className="relative z-10 w-full max-w-lg bg-[#333333] border border-[#4B4B4B] rounded-2xl shadow-2xl p-8 flex flex-col items-center text-center">
        {/* Error Emblem */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 p-0.5 shadow-xl shadow-black/40 flex items-center justify-center mb-6">
          <div className="w-full h-full bg-[#2D2D2D] rounded-[14px] flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-[#FB7185]" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold tracking-tight text-[#F9FAFB] mb-1">
          Authentication Exception
        </h1>
        <p className="text-xs text-[#FB7185] font-medium tracking-wide uppercase mb-6">
          Amazon Cognito Security Gateway
        </p>

        {/* Detailed Error Box */}
        <div className="w-full bg-[#2D2D2D] border border-[#FB7185]/40 rounded-xl p-4 text-left mb-6">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-[#FB7185] flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-semibold text-[#FB7185]">Security Notice:</span>
              <p className="text-[#D1D5DB] break-words leading-relaxed font-mono text-[11px]">
                {error}
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <p className="text-xs text-[#9CA3AF] mb-6 max-w-sm">
          Please verify your Cognito credentials or retry logging in via the AWS Cognito Managed Login portal.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <button
            onClick={onRetry}
            className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#22D3EE] hover:bg-[#06B6D4] text-[#1E1E1E] font-semibold text-xs transition shadow-lg shadow-black/20 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry Login</span>
          </button>
          
          <button
            onClick={() => {
              sessionStorage.clear();
              window.location.href = window.location.pathname;
            }}
            className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2D2D2D] hover:bg-[#383838] text-[#D1D5DB] hover:text-[#F9FAFB] font-semibold text-xs border border-[#4B4B4B] transition cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Reset Session</span>
          </button>
        </div>
      </div>
    </div>
  );
};
