import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  AlertOctagon, 
  PieChart as PieIcon, 
  CreditCard, 
  FileWarning, 
  CheckCircle,
  Download,
  Filter,
  Loader2,
  AlertTriangle,
  Database
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { fetchBillingIntelligence } from '../../services/apiService';

interface BillingRevenueIntelligenceProps {
  selectedFacility?: string;
  selectedTimeframe?: string;
  onExecuteAction: (actionId: string, payload?: any) => void;
}

const COLORS = ['#38bdf8', '#34d399', '#a78bfa', '#fbbf24', '#f43f5e', '#ec4899'];

export const BillingRevenueIntelligence: React.FC<BillingRevenueIntelligenceProps> = ({ 
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

    fetchBillingIntelligence(selectedFacility, selectedTimeframe)
      .then((res) => {
        if (!isMounted) return;
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load billing intelligence:', err);
        setError(err.message || 'Failed to fetch billing data from backend API');
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
        <p className="text-sm font-medium text-slate-300">Loading billing & revenue analytics from Amazon Athena...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-rose-950/40 border border-rose-800/60 rounded-2xl text-rose-300 text-center min-h-[300px]">
        <AlertTriangle className="w-10 h-10 text-rose-400 mb-2" />
        <h3 className="text-base font-bold text-white mb-1">Billing Analytics API Error</h3>
        <p className="text-xs text-rose-200 max-w-md">{error}</p>
      </div>
    );
  }

  if (!data || (data.totalRevenue === 0 && data.grossRevenue === 0)) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-center min-h-[300px]">
        <Database className="w-10 h-10 text-slate-500 mb-2" />
        <h3 className="text-base font-bold text-slate-200 mb-1">No Billing Records Found</h3>
        <p className="text-xs text-slate-400">No billing records match the selected scope ({selectedFacility}).</p>
      </div>
    );
  }

  const deptData = (data.departmentRevenue || []).map((d: any) => ({
    dept: d.department,
    revenue: roundVal(d.revenue / 1e6, 2)
  }));

  const payerData = (data.payerMix || []).map((p: any, idx: number) => ({
    name: p.name,
    value: p.value,
    color: COLORS[idx % COLORS.length]
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" /> Billing & Revenue Intelligence
          </h2>
          <p className="text-xs text-slate-400">
            Real billing performance, gross vs. net revenue, insurance payouts, and department revenue breakdown
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-slate-400 font-medium">Reconciliation:</span>
          <span className="text-slate-200 font-semibold">Continuous Analytics</span>
        </div>
      </div>

      {/* Top Financial Summary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Gross Billed Revenue</span>
          <div className="text-2xl font-bold text-white font-mono">₹{(data.grossRevenue / 1e6).toFixed(2)} M</div>
          <p className="text-[10px] text-slate-400 font-semibold">Total Gross Invoiced</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Net Revenue Collected</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono">₹{(data.totalRevenue / 1e6).toFixed(2)} M</div>
          <p className="text-[10px] text-emerald-400">Collection Rate: {data.grossRevenue > 0 ? ((data.totalRevenue / data.grossRevenue) * 100).toFixed(1) : 0}%</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Outstanding Accounts Receivable</span>
          <div className="text-2xl font-bold text-amber-400 font-mono">₹{(data.outstandingAR / 1e6).toFixed(2)} M</div>
          <p className="text-[10px] text-amber-400 font-semibold">Pending Collections</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Insurance Payouts</span>
          <div className="text-2xl font-bold text-cyan-400 font-mono">₹{(data.insuranceAmount / 1e6).toFixed(2)} M</div>
          <p className="text-[10px] text-slate-400">Patient Share: ₹{(data.patientAmount / 1e6).toFixed(2)} M</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Method / Payer Mix */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-1">Payment Method & Payer Breakdown</h3>
          <p className="text-xs text-slate-400 mb-4">Distribution of net revenue collected across payment modes</p>

          <div className="h-64 w-full flex items-center justify-center">
            {payerData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={payerData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {payerData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => [`₹${(Number(val || 0) / 1e6).toFixed(2)} M`, 'Revenue']}
                    contentStyle={{ backgroundColor: '#2D2D2D', borderColor: '#4B4B4B', color: '#F9FAFB' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-500">No payment method data available</p>
            )}
          </div>
        </div>

        {/* Department Revenue Contribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-1">Department Revenue Leaderboard (₹ Millions)</h3>
          <p className="text-xs text-slate-400 mb-4">Net revenue generated across clinical departments</p>

          <div className="h-64 w-full">
            {deptData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4B4B4B" />
                  <XAxis dataKey="dept" stroke="#9CA3AF" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                  <Tooltip 
                    formatter={(val: any) => [`₹${val} M`, 'Net Revenue']}
                    contentStyle={{ backgroundColor: '#2D2D2D', borderColor: '#4B4B4B', color: '#F9FAFB' }}
                  />
                  <Bar dataKey="revenue" fill="#34d399" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-500">No department revenue data available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function roundVal(num: number, decimals: number = 2): number {
  return Number(Math.round(Number(num + 'e' + decimals)) + 'e-' + decimals);
}
