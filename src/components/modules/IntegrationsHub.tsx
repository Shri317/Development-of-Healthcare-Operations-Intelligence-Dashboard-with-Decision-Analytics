import React, { useState, useEffect } from 'react';
import { 
  Cable, 
  CheckCircle2, 
  RefreshCw, 
  Server, 
  Send, 
  AlertTriangle, 
  Cloud, 
  Database, 
  Cpu, 
  Sparkles,
  Loader2,
  Info
} from 'lucide-react';
import { fetchIntegrationsStatus, pingIntegrationEndpoint, type IntegrationsStatusResponse } from '../../services/apiService';

interface IntegrationsHubProps {
  onExecuteAction: (actionId: string, payload?: any) => void;
}

export const IntegrationsHub: React.FC<IntegrationsHubProps> = ({ onExecuteAction }) => {
  const [data, setData] = useState<IntegrationsStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [pingingName, setPingingName] = useState<string | null>(null);

  const loadStatus = () => {
    setLoading(true);
    setError(null);
    fetchIntegrationsStatus()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch integrations status:', err);
        setError(err.message || 'Failed to fetch integrations status');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleTestPing = async (name: string) => {
    setPingingName(name);
    setTestResult(`Testing real backend diagnostic probe to ${name}...`);
    try {
      const res = await pingIntegrationEndpoint(name);
      if (res.success) {
        setTestResult(`✅ ${res.service}: [${res.status}] Latency: ${res.latency}. ${res.message}`);
      } else {
        setTestResult(`⚠️ ${res.service}: [${res.status}] ${res.message}`);
      }
    } catch (err: any) {
      setTestResult(`❌ Probe failed for ${name}: ${err.message || 'Network error'}`);
    } finally {
      setPingingName(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-2xl min-h-[400px]">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-300">Loading enterprise integrations status from backend...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-rose-950/40 border border-rose-800/60 rounded-2xl text-rose-300 text-center min-h-[300px]">
        <AlertTriangle className="w-10 h-10 text-rose-400 mb-2" />
        <h3 className="text-base font-bold text-white mb-1">Integrations Hub API Error</h3>
        <p className="text-xs text-rose-200 max-w-md">{error || 'Unknown error'}</p>
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
              <Cable className="w-5 h-5 text-cyan-400" /> Enterprise Healthcare & Cloud Integrations Hub
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono font-bold rounded-full">
              {data.dataSource}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real connection status for Local CSV engine, AWS S3/Glue/Athena, and EHR/EMR staging connectors
          </p>
        </div>

        <button
          onClick={loadStatus}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-cyan-950/50"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Connector Status
        </button>
      </div>

      {/* Honest Architectural Context Banner */}
      <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400 leading-relaxed">
          <strong className="text-slate-200 block mb-0.5">Integration Environment Status:</strong>
          Local dataset analytics engine is <strong>CONNECTED</strong> with 41 tables and 99,485 records. AWS Cloud infrastructure (S3, Glue, Athena, Bedrock) is configured in <code className="text-amber-300">ap-south-1</code> but session authentication is currently expired. External EHR/EMR endpoints are in architecture staging mode.
        </div>
      </div>

      {/* Diagnostic Probe Results */}
      {testResult && (
        <div className="p-3 bg-slate-950 border border-cyan-800/80 rounded-xl text-xs text-cyan-300 font-mono">
          {testResult}
        </div>
      )}

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.integrations.map((item, idx) => {
          const isConnected = item.status === 'CONNECTED';
          const isAuthExpired = item.status === 'AUTH_EXPIRED';

          return (
            <div
              key={idx}
              className={`bg-slate-900 border rounded-2xl p-4 space-y-3 flex flex-col justify-between hover:border-slate-700 transition ${
                item.isAws ? 'border-amber-400/50' : 'border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    {item.isAws && <Cloud className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    {item.name}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                    isConnected 
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                      : isAuthExpired 
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {item.status}
                  </span>
                </div>
                <span className={`text-[10px] block ${item.isAws ? 'text-amber-400 font-semibold' : 'text-cyan-400'}`}>
                  {item.type}
                </span>
                <p className="text-[11px] text-slate-400 mt-2 font-mono truncate" title={item.protocol}>
                  Protocol: {item.protocol}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                  {item.details}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[10px]">
                <span className="text-slate-500 font-mono">Latency: {item.latency}</span>
                <button
                  onClick={() => handleTestPing(item.name)}
                  disabled={pingingName === item.name}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded font-semibold transition disabled:opacity-50"
                >
                  {pingingName === item.name ? 'Probing...' : 'Test Probe'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
