import React, { useState, useEffect } from 'react';
import { 
  FileCheck2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Bot, 
  Search, 
  Send, 
  ShieldAlert, 
  Sparkles,
  RefreshCw,
  Loader2,
  Database
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { fetchClaimsIntelligence } from '../../services/apiService';

interface InsuranceClaimsAutomationProps {
  selectedFacility?: string;
  selectedTimeframe?: string;
  onExecuteAction: (actionId: string, payload?: any) => void;
}

const COLORS = ['#34d399', '#38bdf8', '#fbbf24', '#f43f5e', '#a78bfa'];

export const InsuranceClaimsAutomation: React.FC<InsuranceClaimsAutomationProps> = ({ 
  selectedFacility = 'all',
  selectedTimeframe = 'realtime',
  onExecuteAction 
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchClaimsIntelligence(selectedFacility, selectedTimeframe)
      .then((res) => {
        if (!isMounted) return;
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to fetch claims intelligence:', err);
        setError(err.message || 'Failed to fetch claims data from API');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedFacility, selectedTimeframe]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-2xl min-h-[400px]">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-300">Loading claims & denial intelligence from Amazon Athena...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-rose-950/40 border border-rose-800/60 rounded-2xl text-rose-300 text-center min-h-[300px]">
        <AlertTriangle className="w-10 h-10 text-rose-400 mb-2" />
        <h3 className="text-base font-bold text-white mb-1">Claims Analytics API Error</h3>
        <p className="text-xs text-rose-200 max-w-md">{error}</p>
      </div>
    );
  }

  if (!data || data.totalClaims === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-center min-h-[300px]">
        <Database className="w-10 h-10 text-slate-500 mb-2" />
        <h3 className="text-base font-bold text-slate-200 mb-1">No Claims Records Found</h3>
        <p className="text-xs text-slate-400">No insurance claims match the selected scope ({selectedFacility}).</p>
      </div>
    );
  }

  const statusData = (data.statusBreakdown || []).map((s: any, idx: number) => ({
    name: s.status,
    value: s.count,
    color: COLORS[idx % COLORS.length]
  }));

  const payerData = (data.payers || []).map((p: any) => ({
    payer: p.payer,
    claims: p.claims,
    amount: Number((p.claimedAmount / 1e6).toFixed(2)),
    denialRate: p.denialRate
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-cyan-400" /> Insurance & Claims Automation Engine
          </h2>
          <p className="text-xs text-slate-400">
            Real dataset claims analysis, denial rate tracking, top denial reasons, and payer breakdown
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-slate-400 font-medium">Outbound Clearinghouse:</span>
          <span className="text-slate-200 font-semibold">Monitoring Only</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Claims Processed</span>
          <div className="text-2xl font-bold text-white font-mono">{data.totalClaims.toLocaleString()}</div>
          <p className="text-[10px] text-slate-400">Scope: {selectedFacility === 'all' ? 'All Facilities' : selectedFacility}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Claimed Value</span>
          <div className="text-2xl font-bold text-cyan-400 font-mono">₹{(data.claimedAmount / 1e6).toFixed(2)} M</div>
          <p className="text-[10px] text-cyan-300">Submitted Payer Billed</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Claim Denial Rate</span>
          <div className="text-2xl font-bold text-rose-400 font-mono">{data.denialRate} %</div>
          <p className="text-[10px] text-rose-400 font-semibold">{data.deniedClaims} Claims Denied</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Denied Claims Value</span>
          <div className="text-2xl font-bold text-amber-400 font-mono">₹{(data.deniedAmount / 1e6).toFixed(2)} M</div>
          <p className="text-[10px] text-amber-400">Value Under Audit Hold</p>
        </div>
      </div>

      {/* Charts & Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Claim Status Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-1">Claim Status Breakdown</h3>
          <p className="text-xs text-slate-400 mb-4">Volume of claims by lifecycle status</p>
          <div className="h-64 w-full flex items-center justify-center">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => [`${val} Claims`, 'Count']}
                    contentStyle={{ backgroundColor: '#2D2D2D', borderColor: '#4B4B4B', color: '#F9FAFB' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-500">No status data</p>
            )}
          </div>
        </div>

        {/* Top Denial Reasons */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-1">Top Claim Denial Reasons</h3>
          <p className="text-xs text-slate-400 mb-4">Most frequent denial drivers identified in claims dataset</p>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
            {(data.denialReasons || []).map((reason: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                <span className="font-semibold text-slate-200">{reason.reason}</span>
                <span className="px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 rounded font-bold">{reason.count} Denials</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payer Performance Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-1">Payer Performance & Denial Analysis</h3>
        <p className="text-xs text-slate-400 mb-4">Claim volume and denial rates per insurance payer</p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
              <tr>
                <th className="p-3">Insurance Payer</th>
                <th className="p-3">Total Claims</th>
                <th className="p-3">Claimed Value</th>
                <th className="p-3">Denial Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {payerData.map((p: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="p-3 font-semibold text-white">{p.payer}</td>
                  <td className="p-3 font-mono">{p.claims}</td>
                  <td className="p-3 font-mono text-cyan-400">₹{p.amount} M</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded font-bold ${p.denialRate > 10 ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'}`}>
                      {p.denialRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
