import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  PieChart, 
  ArrowUpRight, 
  CheckCircle2, 
  Filter, 
  Database, 
  RefreshCw, 
  AlertCircle,
  BarChart2,
  FileText
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { 
  fetchFinancialIntelligence, 
  type FinancialIntelligenceResponse 
} from '../../services/apiService';

interface FinancialIntelligenceProps {
  selectedFacility?: string;
  selectedTimeframe?: string;
  onExecuteAction?: (actionId: string, payload?: any) => void;
}

export const FinancialIntelligence: React.FC<FinancialIntelligenceProps> = ({ 
  selectedFacility = 'all',
  selectedTimeframe = 'realtime',
  onExecuteAction 
}) => {
  const [data, setData] = useState<FinancialIntelligenceResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    fetchFinancialIntelligence(selectedFacility, selectedTimeframe)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load Financial Intelligence data:', err);
        setError(err.message || 'Failed to fetch financial intelligence from backend API');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [selectedFacility, selectedTimeframe]);

  const kpis = data?.kpis;
  const pnlData = data?.pnlStatement || [];
  const expenseCategories = data?.expenseCategories || [];
  const dataSource = loading ? 'Connecting to Amazon Athena...' : (data?.source || 'Local Fallback');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" /> Executive Financial Intelligence & P&L Master
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-slate-950 text-cyan-400 border border-slate-800 rounded-md">
              Data Source: {dataSource}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Statement of Profit & Loss, budget vs. actual variance, departmental cost-centers, and cash-flow visibility calculated from dataset
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Financials</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400 text-sm animate-pulse space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
          <p>Loading financial intelligence from Amazon Athena...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-6 bg-rose-950/40 border border-rose-800 rounded-2xl text-rose-300 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <div>
              <p className="font-bold">Financial Intelligence Error</p>
              <p className="text-rose-300/80 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1.5 bg-rose-900 hover:bg-rose-800 text-white font-semibold rounded-xl transition"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Main Financial Dashboard */}
      {!loading && !error && data && (
        <>
          {/* Financial Overview KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Operating Profit / EBITDA Proxy Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Operating Profit (EBITDA Proxy)
              </span>
              <div className="text-2xl font-bold text-emerald-400 font-mono">
                {kpis?.operatingProfitFormatted || '₹0.00'}
              </div>
              <p className="text-[10px] text-emerald-400 font-semibold">
                {kpis?.operatingMarginPct ?? 0}% Net Operating Margin
              </p>
            </div>

            {/* Budget vs Actual Variance Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Revenue Budget Variance
              </span>
              <div className={`text-2xl font-bold font-mono ${
                (kpis?.revenueVariance || 0) >= 0 ? 'text-cyan-400' : 'text-rose-400'
              }`}>
                {kpis?.revenueVarianceFormatted || '₹0.00'}
              </div>
              <p className={`text-[10px] font-semibold ${
                (kpis?.revenueVariance || 0) >= 0 ? 'text-cyan-400' : 'text-rose-400'
              }`}>
                {(kpis?.revenueVariance || 0) >= 0 ? 'Favorable Revenue' : 'Unfavorable Revenue'} ({kpis?.revenueVariancePct}% vs Budget)
              </p>
            </div>

            {/* Operating Expenses (OpEx) Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Operating Expenses (OpEx)
              </span>
              <div className="text-2xl font-bold text-slate-200 font-mono">
                {kpis?.operatingExpensesFormatted || '₹0.00'}
              </div>
              <p className={`text-[10px] font-semibold ${
                (kpis?.costVariance || 0) <= 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                Cost Variance: {kpis?.costVarianceFormatted} ({kpis?.costVariancePct}% vs Budget)
              </p>
            </div>
          </div>

          {/* Statement of Profit & Loss Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" /> Executive Statement of Profit & Loss (Dataset Reconciled)
              </h3>
              <span className="text-[11px] text-slate-400">
                Scope: {selectedFacility === 'all' ? 'All Facilities Group' : selectedFacility}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">P&L Financial Line Item</th>
                    <th className="py-3 px-3">Actual Amount</th>
                    <th className="py-3 px-3">Target Budget</th>
                    <th className="py-3 px-3">Variance</th>
                    <th className="py-3 px-3">Performance Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {pnlData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                        No financial records found for selected filters.
                      </td>
                    </tr>
                  ) : (
                    pnlData.map((row, i) => (
                      <tr 
                        key={i} 
                        className={`hover:bg-slate-800/40 transition ${
                          row.metric.includes('EBITDA') || row.metric.includes('Operating Profit') 
                            ? 'bg-emerald-950/20 font-bold' 
                            : row.metric.includes('Gross Billed')
                            ? 'bg-slate-950/50'
                            : ''
                        }`}
                      >
                        <td className="py-3 px-3 font-sans font-semibold text-white">
                          {row.metric}
                        </td>
                        <td className={`py-3 px-3 font-bold ${
                          row.actual < 0 ? 'text-rose-300' : 'text-emerald-400'
                        }`}>
                          {row.actualFormatted}
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          {row.budgetFormatted}
                        </td>
                        <td className={`py-3 px-3 font-bold ${
                          row.variance.startsWith('-') ? 'text-rose-400' : row.variance === 'N/A' ? 'text-slate-500' : 'text-cyan-400'
                        }`}>
                          {row.variance}
                        </td>
                        <td className="py-3 px-3 font-sans text-xs">
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                            row.performanceTrend === 'Favorable' || row.performanceTrend === 'Realized Cash' || row.performanceTrend === 'Actual Billed'
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                              : row.performanceTrend === 'Unfavorable' || row.performanceTrend === 'Over Budget'
                              ? 'bg-rose-950 text-rose-400 border-rose-800'
                              : 'bg-slate-950 text-slate-400 border-slate-800'
                          }`}>
                            {row.performanceTrend}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expense Category Breakdown Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-emerald-400" /> Operating Expense Breakdown by Category (financial_expenses.csv)
                </h3>
                <p className="text-xs text-slate-400">Calculated expense totals across departmental cost centers</p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseCategories}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4B4B4B" />
                  <XAxis dataKey="category" stroke="#9CA3AF" fontSize={11} />
                  <YAxis stroke="#9CA3AF" fontSize={11} tickFormatter={(val) => `₹${(val / 1e6).toFixed(1)}M`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#2D2D2D', borderColor: '#4B4B4B', borderRadius: '8px', fontSize: '12px', color: '#F9FAFB' }}
                    formatter={(value: any) => [`₹${(Number(value) / 1e6).toFixed(2)} Million`, 'Expense Amount']}
                  />
                  <Bar dataKey="amount" fill="#34d399" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
