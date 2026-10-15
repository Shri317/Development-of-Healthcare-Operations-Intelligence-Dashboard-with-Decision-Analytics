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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Central Medical Operations Security Card */}
      <div className="relative z-10 w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-8 backdrop-blur-xl flex flex-col items-center text-center">
        {/* Emblem */}
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-400 p-0.5 shadow-xl shadow-cyan-950/60 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Activity className="w-8 h-8 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-950 border border-emerald-500/50 flex items-center justify-center">
            <Lock className="w-3 h-3 text-emerald-400" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold tracking-tight text-white mb-1">
          MediOps <span className="text-cyan-400 font-normal">Intelligence</span>
        </h1>
        <p className="text-xs text-slate-400 font-medium tracking-wide uppercase mb-6">
          Enterprise Medical Operations Command System
        </p>

        {/* Loading Spinner & Status */}
        <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800/80 rounded-xl px-4 py-3 w-full mb-4">
          <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin flex-shrink-0" />
          <div className="text-left overflow-hidden">
            <p className="text-xs font-semibold text-slate-200 truncate">
              {message}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {subMessage}
            </p>
          </div>
        </div>

        {/* Security badges */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500 pt-2 border-t border-slate-800/60 w-full">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
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
