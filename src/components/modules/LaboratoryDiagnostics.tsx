import React, { useState, useEffect } from 'react';
import { 
  TestTube, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Activity, 
  Cpu, 
  BellRing,
  Filter,
  Loader2,
  Database
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { fetchLaboratoryIntelligence } from '../../services/apiService';

interface LaboratoryDiagnosticsProps {
  selectedFacility?: string;
  selectedTimeframe?: string;
  onExecuteAction: (actionId: string, payload?: any) => void;
}

export const LaboratoryDiagnostics: React.FC<LaboratoryDiagnosticsProps> = ({ 
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

    fetchLaboratoryIntelligence(selectedFacility, selectedTimeframe)
      .then((res) => {
        if (!isMounted) return;
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to fetch laboratory intelligence:', err);
        setError(err.message || 'Failed to fetch laboratory data from API');
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
        <p className="text-sm font-medium text-slate-300">Loading diagnostic laboratory analytics from Amazon Athena...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-rose-950/40 border border-rose-800/60 rounded-2xl text-rose-300 text-center min-h-[300px]">
        <AlertTriangle className="w-10 h-10 text-rose-400 mb-2" />
        <h3 className="text-base font-bold text-white mb-1">Laboratory Analytics API Error</h3>
        <p className="text-xs text-rose-200 max-w-md">{error}</p>
      </div>
    );
  }

  if (!data || data.totalOrders === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-center min-h-[300px]">
        <Database className="w-10 h-10 text-slate-500 mb-2" />
        <h3 className="text-base font-bold text-slate-200 mb-1">No Lab Orders Found</h3>
        <p className="text-xs text-slate-400">No laboratory test orders match the selected scope ({selectedFacility}).</p>
      </div>
    );
  }

  const catData = (data.categories || []).map((c: any) => ({
    category: c.category,
    orders: c.orders,
    tat: c.avgTAT
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TestTube className="w-5 h-5 text-cyan-400" /> Laboratory & Diagnostics Intelligence
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono font-bold rounded-full">
              {data.dataSource || 'Local Fallback'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real dataset lab order volume, turnaround time (TAT) tracking, equipment status, and sample processing
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-slate-400 font-medium">STAT Alert Dispatch:</span>
          <span className="text-slate-200 font-semibold">Detection Mode (Gateway Standby)</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Diagnostic Orders</span>
          <div className="text-2xl font-bold text-white font-mono">{data.totalOrders.toLocaleString()} Orders</div>
          <p className="text-[10px] text-slate-400">Scope: {selectedFacility === 'all' ? 'All Facilities' : selectedFacility}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Mean Turnaround (TAT)</span>
          <div className="text-2xl font-bold text-cyan-400 font-mono">{data.avgTAT} Hours</div>
          <p className="text-[10px] text-cyan-300">Average Order-to-Result</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Verified Results</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{(data.completedOrders || data.totalOrders).toLocaleString()}</div>
          <p className="text-[10px] text-slate-400">
            <span className="text-emerald-400">{data.normalCount || 0} Norm</span> • <span className="text-amber-400">{data.abnormalCount || 0} Abn</span> • <span className="text-rose-400">{data.criticalCount || 0} Crit</span>
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Lab Equipment</span>
          <div className="text-2xl font-bold text-teal-400 font-mono">{data.equipment?.operational || 0} / {data.equipment?.total || 0}</div>
          <p className="text-[10px] text-teal-300">Operational ({data.equipment?.avgUtilization || 0}% Util)</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Samples Tracked</span>
          <div className="text-2xl font-bold text-indigo-400 font-mono">{(data.samples?.total || 0).toLocaleString()}</div>
          <p className="text-[10px] text-indigo-300">{data.samples?.rejected || 0} rejected ({data.samples?.rejectionRate || 0}%)</p>
        </div>
      </div>

      {/* Lab Test Categories Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-1">Diagnostic Test Orders by Category</h3>
        <p className="text-xs text-slate-400 mb-4">Total orders and mean TAT per test category</p>

        <div className="h-64 w-full">
          {catData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4B4B4B" />
                <XAxis dataKey="category" stroke="#9CA3AF" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                <Tooltip 
                  formatter={(val: any, name: any) => [name === 'orders' ? `${val} Orders` : `${val} hrs`, name === 'orders' ? 'Volume' : 'Avg TAT']}
                  contentStyle={{ backgroundColor: '#2D2D2D', borderColor: '#4B4B4B', color: '#F9FAFB' }}
                />
                <Bar dataKey="orders" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-slate-500">No category data</div>
          )}
        </div>
      </div>

      {/* Priority Breakdown Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-1">Diagnostic Categories Leaderboard</h3>
        <p className="text-xs text-slate-400 mb-4">Detailed category order volume and turnaround times</p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
              <tr>
                <th className="p-3">Category Name</th>
                <th className="p-3">Total Orders</th>
                <th className="p-3">Average TAT (Hours)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {catData.map((c: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="p-3 font-semibold text-white">{c.category}</td>
                  <td className="p-3 font-mono text-cyan-400 font-bold">{c.orders.toLocaleString()}</td>
                  <td className="p-3 font-mono text-amber-400">{c.tat} hrs</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
