import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  ShieldCheck, 
  Key, 
  Loader2, 
  Info, 
  Cloud, 
  Users, 
  Server,
  Layers,
  Database
} from 'lucide-react';
import { 
  fetchHealthStatus, 
  type HealthStatus 
} from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';

interface SecurityGovernanceProps {
  onExecuteAction?: (actionId: string, payload?: any) => void;
}

const COGNITO_APPLICATION_GROUPS = [
  {
    name: 'ADMIN',
    role: 'System Administrator',
    description: 'System configuration, governance oversight, infrastructure diagnostics, and global settings.',
    badge: 'Administrative Group',
    color: 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300'
  },
  {
    name: 'HOSPITAL_ADMIN',
    role: 'Hospital Administration',
    description: 'Executive facility operations, cross-department resource management, throughput and capacity.',
    badge: 'Executive Group',
    color: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
  },
  {
    name: 'ANALYST',
    role: 'Data & Analytics',
    description: 'Operational analytics, executive reporting, Athena query execution, and KPI exploration.',
    badge: 'Analytics Group',
    color: 'border-amber-500/40 bg-amber-950/40 text-amber-300'
  },
  {
    name: 'DOCTOR',
    role: 'Medical Staff',
    description: 'Clinical workflows, patient encounter tracking, care coordination, and clinical documentation.',
    badge: 'Clinical Group',
    color: 'border-purple-500/40 bg-purple-950/40 text-purple-300'
  },
  {
    name: 'VIEWER',
    role: 'Standard Application User',
    description: 'Standard dashboard visibility, summary operations metrics, and read-only operational views.',
    badge: 'Standard Group',
    color: 'border-slate-700 bg-slate-900/60 text-slate-300'
  }
];

export const SecurityGovernance: React.FC<SecurityGovernanceProps> = () => {
  const { user, isAuthenticated } = useAuth();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetchHealthStatus()
      .then((res) => {
        if (!isMounted) return;
        setHealth(res);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('AWS Health status check returned non-fatal error:', err);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-2xl min-h-[400px]">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-300">Loading security architecture & AWS status...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" /> Security, Identity & Governance Center
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono font-bold rounded-full">
              Cognito OIDC Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Zero-credential client exposure, Amazon Cognito identity governance, synthetic data boundary, and AWS cloud integration posture
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
          <Lock className="w-3.5 h-3.5 text-cyan-400" />
          <span>Client Credential Isolation: Active</span>
        </div>
      </div>

      {/* Honest Privacy & Credential Notice Banner */}
      <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400 leading-relaxed">
          <strong className="text-slate-200 block mb-0.5">Privacy Boundary & Credential Governance:</strong>
          All records in this system belong to a verified synthetic healthcare dataset (no human PHI). AWS IAM credentials and session tokens are strictly confined to backend environment variables / STS assume-role and are never transmitted to the browser client.
        </div>
      </div>

      {/* Security Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Transport & Storage</span>
          <div className="text-xl font-bold text-emerald-400 font-mono">TLS 1.3 / HTTPS</div>
          <p className="text-[10px] text-emerald-400 font-semibold">AES-256 Storage Encryption</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cognito Application Groups</span>
          <div className="text-xl font-bold text-white font-mono">5 Defined Groups</div>
          <p className="text-[10px] text-slate-400">Identity context (all features open)</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Synthetic Privacy Boundary</span>
          <div className="text-xl font-bold text-cyan-400 font-mono">Zero Human PHI</div>
          <p className="text-[10px] text-slate-400">Verified synthetic clinical dataset</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">AWS Integration Status</span>
          <div className="text-xl font-bold text-emerald-400 font-mono">
            {health?.status === 'online' ? 'Connected' : (health?.status || 'Querying...')}
          </div>
          <p className="text-[10px] text-slate-400">
            {health?.region ? `Region: ${health.region} • S3, Glue, Athena` : 'S3 + Glue + Athena + Bedrock'}
          </p>
        </div>
      </div>

      {/* AWS Integration Status Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Cloud className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">AWS Integration Status</h3>
          </div>
          {health?.region && (
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/80 border border-cyan-800/80 px-2.5 py-0.5 rounded-full">
              Region: {health.region}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400">
          Live connection status reported by the backend health check endpoint (<code className="text-cyan-300 font-mono">/api/health</code>).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* S3 */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">S3</span>
              <span className="text-[10px] text-slate-400 font-mono truncate max-w-[140px] block" title={health?.s3Bucket}>
                {health?.s3Bucket || 'Object Data Lake'}
              </span>
            </div>
            <div className="text-right">
              {health ? (
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  health.awsServices?.s3 === 'connected' 
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${health.awsServices?.s3 === 'connected' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  {health.awsServices?.s3 === 'connected' ? 'Connected' : (health.awsServices?.s3 || 'Unavailable')}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 font-mono">Checking...</span>
              )}
            </div>
          </div>

          {/* Glue */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Glue</span>
              <span className="text-[10px] text-slate-400 font-mono truncate max-w-[140px] block" title={health?.glueDatabase}>
                {health?.glueDatabase || 'Data Catalog'}
              </span>
            </div>
            <div className="text-right">
              {health ? (
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  health.awsServices?.glue === 'connected' 
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${health.awsServices?.glue === 'connected' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  {health.awsServices?.glue === 'connected' ? 'Connected' : (health.awsServices?.glue || 'Unavailable')}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 font-mono">Checking...</span>
              )}
            </div>
          </div>

          {/* Athena */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Athena</span>
              <span className="text-[10px] text-slate-400 font-mono truncate max-w-[140px] block" title={health?.athenaWorkgroup}>
                Workgroup: {health?.athenaWorkgroup || 'primary'}
              </span>
            </div>
            <div className="text-right">
              {health ? (
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  health.awsServices?.athena === 'ready' || health.awsServices?.athena === 'connected'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${health.awsServices?.athena === 'ready' || health.awsServices?.athena === 'connected' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  {health.awsServices?.athena === 'ready' || health.awsServices?.athena === 'connected' ? 'Connected' : (health.awsServices?.athena || 'Unavailable')}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 font-mono">Checking...</span>
              )}
            </div>
          </div>

          {/* Bedrock */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Bedrock</span>
              <span className="text-[10px] text-slate-400 font-mono block">
                Claude 3.5 Sonnet
              </span>
            </div>
            <div className="text-right">
              {health ? (
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  health.awsServices?.bedrock === 'ready' || health.awsServices?.bedrock === 'connected'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${health.awsServices?.bedrock === 'ready' || health.awsServices?.bedrock === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  {health.awsServices?.bedrock === 'ready' ? 'Available/Ready' : (health.awsServices?.bedrock === 'connected' ? 'Connected' : (health.awsServices?.bedrock || 'Offline'))}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 font-mono">Checking...</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5 Cognito Application Groups */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">5 Cognito Application Groups</h3>
          </div>
          <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 rounded-full">
            Cognito User Pool Directory
          </span>
        </div>

        {/* Truthful Policy Notice */}
        <div className="bg-slate-950 border border-slate-800/80 p-3 rounded-xl text-xs text-slate-400 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-slate-200">Current policy:</strong> Authenticated users have access to the complete MedOps application. Group-based feature restrictions are reserved for future authorization policies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {COGNITO_APPLICATION_GROUPS.map((grp) => (
            <div key={grp.name} className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2 hover:border-slate-700 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {grp.name}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${grp.color}`}>
                  {grp.badge}
                </span>
              </div>
              <p className="text-xs font-semibold text-cyan-300">{grp.role}</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">{grp.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Current Authentication & Security Context */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Current Authentication & Security Context</h3>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {isAuthenticated ? 'Session Authenticated' : 'Session Inactive'}
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Cryptographic token context and user principal identity from the active Amazon Cognito OIDC session.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Authenticated Email */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Authenticated User</span>
            <span className="text-xs font-bold text-white font-mono truncate block" title={user?.email}>
              {user?.email || 'Authenticated User'}
            </span>
            <span className="text-[10px] text-slate-400 block">Verified User Pool Identity</span>
          </div>

          {/* Cognito Group(s) */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Cognito Group(s)</span>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {user?.groups && user.groups.length > 0 ? (
                user.groups.map((grp) => (
                  <span key={grp} className="px-2 py-0.5 text-xs font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 rounded">
                    {grp}
                  </span>
                ))
              ) : (
                <span className="text-xs font-mono text-slate-400">None</span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 block">Assigned Directory Groups</span>
          </div>

          {/* Authentication Provider */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Authentication Provider</span>
            <span className="text-xs font-bold text-white block">Amazon Cognito</span>
            <span className="text-[10px] text-slate-400 font-mono block">Managed Login (us-east-1)</span>
          </div>

          {/* Authentication Flow */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Authentication Flow</span>
            <span className="text-xs font-bold text-white block">Authorization Code + PKCE</span>
            <span className="text-[10px] text-slate-400 font-mono block">RFC 7636 S256 Challenge</span>
          </div>

          {/* Session Status */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Session Status</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-emerald-400">
                {isAuthenticated ? 'Authenticated' : 'Unauthenticated'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block">Isolated Browser SessionStorage</span>
          </div>

          {/* User Subject Identifier */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">User Subject ID (sub)</span>
            <span className="text-xs font-mono text-cyan-300 truncate block" title={user?.sub || user?.username}>
              {user?.sub || user?.username || '—'}
            </span>
            <span className="text-[10px] text-slate-400 block">Unique Cognito Principal UUID</span>
          </div>
        </div>

        {/* Honest Operational Logging Note */}
        <div className="bg-slate-950/60 border border-slate-800/60 p-3 rounded-xl text-xs text-slate-500 flex items-start gap-2">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p>
            Audit Logging Status: Operational session events are scoped to the active Cognito authenticated session. Centralized persistent audit log streaming is not currently provisioned.
          </p>
        </div>
      </div>

      {/* Implemented Architecture & Security Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <Key className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Implemented Architecture & Security Controls</h3>
        </div>
        <p className="text-xs text-slate-400">
          Cryptographic, identity, and cloud controls actually implemented across the MedOps stack.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Authentication</span>
            <span className="text-xs font-bold text-white block">Cognito Managed Login / OIDC</span>
            <span className="text-[11px] text-slate-400 block">Amazon Cognito User Pool directory with hosted login interface.</span>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">OAuth Security</span>
            <span className="text-xs font-bold text-white block">Authorization Code + PKCE (S256)</span>
            <span className="text-[11px] text-slate-400 block">Secretless Single Page Application authentication flow via SHA-256 PKCE.</span>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Application Transport</span>
            <span className="text-xs font-bold text-white block">HTTPS / TLS</span>
            <span className="text-[11px] text-slate-400 block">End-to-end encrypted transport across Vercel frontend and FastAPI backend.</span>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">AWS Runtime Authentication</span>
            <span className="text-xs font-bold text-white block">Vercel OIDC → AWS STS</span>
            <span className="text-[11px] text-slate-400 block">Federated identity trust; zero static AWS access keys or secrets in source code.</span>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Data Platform</span>
            <span className="text-xs font-bold text-white block">S3 + Glue + Athena</span>
            <span className="text-[11px] text-slate-400 block">Encrypted S3 bucket lake, Glue Data Catalog schemas, and Athena SQL engine.</span>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">AI Platform</span>
            <span className="text-xs font-bold text-white block">Amazon Bedrock</span>
            <span className="text-[11px] text-slate-400 block">Claude 3.5 Sonnet foundation models for copilot decisions and insights.</span>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1 md:col-span-2 lg:col-span-3">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Synthetic Data</span>
            <span className="text-xs font-bold text-emerald-400 block">No real patient data / PHI used</span>
            <span className="text-[11px] text-slate-400 block">100% de-identified synthetic clinical and operations dataset generated for healthcare systems research.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
