import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  ArrowUpRight, 
  Users, 
  DollarSign, 
  Bed, 
  FileCheck, 
  ChevronRight,
  Filter,
  Database,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Bot,
  Lightbulb,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { revenueByDeptTrend } from '../../data/mockData';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { 
  fetchExecutiveSummary, 
  fetchAIExecutiveSummary,
  fetchFacilityComparison,
  type ExecutiveSummaryResponse, 
  type AIExecutiveSummaryResponse,
  type FacilityComparisonItem 
} from '../../services/apiService';

interface ExecutiveCommandCenterProps {
  selectedFacility: string;
  selectedTimeframe?: string;
  onOpenDrilldown: (facilityId: string) => void;
  onExecuteAction: (actionId: string, payload?: any) => void;
}

export const ExecutiveCommandCenter: React.FC<ExecutiveCommandCenterProps> = ({
  selectedFacility,
  selectedTimeframe = 'realtime',
  onOpenDrilldown,
  onExecuteAction
}) => {
  const [summaryData, setSummaryData] = useState<ExecutiveSummaryResponse | null>(null);
  const [facilitiesComp, setFacilitiesComp] = useState<FacilityComparisonItem[]>([]);
  const [aiSummary, setAiSummary] = useState<AIExecutiveSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [aiLoading, setAiLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);

    Promise.all([
      fetchExecutiveSummary(selectedFacility, selectedTimeframe),
      fetchFacilityComparison(selectedTimeframe)
    ])
      .then(([summaryRes, compRes]) => {
        setSummaryData(summaryRes);
        setFacilitiesComp(compRes);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load Executive Command Center metrics:', err);
        setError(err.message || 'Failed to connect to backend analytics API');
        setLoading(false);
      });
  };

  const loadAISummary = () => {
    setAiLoading(true);
    setAiError(null);

    fetchAIExecutiveSummary(selectedFacility, selectedTimeframe)
      .then((res) => {
        setAiSummary(res);
        setAiLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load AI Executive Summary:', err);
        setAiError(err.message || 'AI summary service temporarily unreachable.');
        setAiLoading(false);
      });
  };

  useEffect(() => {
    loadData();
    loadAISummary();
  }, [selectedFacility, selectedTimeframe]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-2xl min-h-[400px]">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-300">Loading executive command analytics from Amazon Athena...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-rose-950/40 border border-rose-800/60 rounded-2xl text-rose-300 text-center min-h-[350px] space-y-3">
        <AlertTriangle className="w-10 h-10 text-rose-400 mb-1" />
        <h3 className="text-base font-bold text-white">Unable to load executive analytics from the backend</h3>
        <p className="text-xs text-rose-200 max-w-md">{error}</p>
        <button
          onClick={loadData}
          className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold rounded-xl transition flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry Request
        </button>
      </div>
    );
  }

  if (!summaryData) {
    return null;
  }

  const kpis = summaryData.kpis || [];
  const rawMetrics = summaryData.rawMetrics;
  const dataEngineSource = summaryData.source || 'Amazon Athena';

  return (
    <div className="space-y-6">
      {/* Real Data Engine Source Banner */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-400">Data Source:</span>
          <span className="font-semibold text-cyan-300">{dataEngineSource}</span>
          <span className="text-slate-500">| Database: medical_operations_db</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-emerald-400 font-medium">Scope: {selectedFacility === 'all' ? 'All Facilities (Enterprise)' : selectedFacility}</span>
        </div>
      </div>

      {/* Top Banner: Enterprise Operational Health Index */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Operational Health Index
              </span>
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full">
                LIVE ATHENA SCORE
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
                {kpis[0]?.value ? kpis[0].value.split('/')[0].trim() : 'N/A'}
              </span>
              <span className="text-sm text-slate-400 font-mono">/ 100</span>
              <span className="flex items-center text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md">
                <TrendingUp className="w-3.5 h-3.5 mr-1" /> +3.5%
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Composite index dynamically calculated from Amazon Athena across Admissions, Net Revenue, ED Waiting Times, and Claim Denial Rates.
            </p>
          </div>

          {/* Health Score Meter Bar */}
          <div className="w-full lg:w-80 space-y-2 bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl shrink-0">
            <div className="flex justify-between text-xs text-slate-400 font-medium">
              <span>Benchmark Target: 92.0</span>
              <span className="text-cyan-400 font-semibold">{kpis[0]?.value || 'N/A'}</span>
            </div>
            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div className="h-full bg-gradient-to-r from-teal-500 via-cyan-400 to-emerald-400 rounded-full w-[88.5%]" />
            </div>
            <span className="text-[10px] text-slate-500 block text-right font-mono">Status: Optimal Performance</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 hover:border-slate-700 transition">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block truncate">
                {kpi.title}
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold text-white tracking-tight">{kpi.value}</span>
                <span className={`text-xs font-semibold flex items-center ${
                  kpi.status === 'positive' ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {kpi.change > 0 ? '+' : ''}{kpi.change}%
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                <span>Target: {kpi.target}</span>
                <span className="capitalize font-mono">{kpi.category}</span>
              </div>
            </div>
          ))}
        </div>

      {/* AI-Generated Executive Operational Briefing Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden space-y-5">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white tracking-tight">
                  AI Operational Executive Briefing
                </h2>
                <span className="px-2.5 py-0.5 text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 rounded-full flex items-center gap-1">
                  <Bot className="w-3 h-3" />
                  {aiSummary?.provider || 'Google Gemini'}
                </span>
                {aiSummary?.model && (
                  <span className="px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-950 border border-slate-800 rounded">
                    {aiSummary.model}
                  </span>
                )}
                {aiSummary?.is_fallback && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold text-amber-300 bg-amber-950/60 border border-amber-800 rounded-full">
                    Deterministic Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Executive operational insights generated strictly from verified real-time clinical and financial telemetry.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {aiSummary?.data_freshness && (
              <span className="text-[11px] text-slate-400 font-mono hidden md:inline-block">
                Freshness: <span className="text-cyan-400">{aiSummary.data_freshness}</span>
              </span>
            )}
            <button
              onClick={loadAISummary}
              disabled={aiLoading}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-300 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 border border-slate-700/60 shadow-sm"
              title="Regenerate Executive Summary"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
              <span>{aiLoading ? 'Synthesizing...' : 'Refresh Briefing'}</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {aiLoading && (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-xs font-medium text-slate-300">
              Analyzing verified operations metrics with {aiSummary?.provider || 'Google Gemini'}...
            </p>
            <span className="text-[11px] text-slate-500">
              Synthesizing trends across admissions, length of stay, collections, and claim denials
            </span>
          </div>
        )}

        {/* Error State */}
        {!aiLoading && aiError && (
          <div className="p-4 bg-rose-950/30 border border-rose-900/60 rounded-xl flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{aiError}</span>
            </div>
            <button
              onClick={loadAISummary}
              className="px-3 py-1 bg-rose-900/40 hover:bg-rose-900/60 text-white rounded-lg transition font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loaded Content */}
        {!aiLoading && !aiError && aiSummary && (
          <div className="space-y-5">
            {/* Executive Brief Box */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block mb-1">
                Executive Synthesis
              </span>
              <p className="text-sm text-slate-200 leading-relaxed font-sans">
                {aiSummary.executive_brief}
              </p>
            </div>

            {/* 4 Structured Insight Panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Key Trends */}
              <div className="p-4 bg-slate-950/50 border border-slate-800/80 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span>Key Operational Trends</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                  {aiSummary.key_trends.map((item, idx) => (
                    <li key={idx} className="leading-snug">{item}</li>
                  ))}
                </ul>
              </div>

              {/* Operational Concerns */}
              <div className="p-4 bg-slate-950/50 border border-slate-800/80 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>Potential Operational Concerns</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                  {aiSummary.operational_concerns.map((item, idx) => (
                    <li key={idx} className="leading-snug">{item}</li>
                  ))}
                </ul>
              </div>

              {/* Management Recommendations */}
              <div className="p-4 bg-slate-950/50 border border-slate-800/80 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <Lightbulb className="w-4 h-4 text-emerald-400" />
                  <span>Areas for Management Review & Action</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                  {aiSummary.management_recommendations.map((item, idx) => (
                    <li key={idx} className="leading-snug">{item}</li>
                  ))}
                </ul>
              </div>

              {/* Empirical Observations */}
              <div className="p-4 bg-slate-950/50 border border-slate-800/80 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                  <span>Verified Data Observations</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                  {aiSummary.observations.map((item, idx) => (
                    <li key={idx} className="leading-snug">{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Disclaimer & Transparency Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-[10px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                AI-generated operations intelligence derived strictly from verified datasets. Not for individual clinical decisions.
              </span>
              {aiSummary.generated_at && (
                <span className="font-mono text-slate-400">
                  Generated: {new Date(aiSummary.generated_at).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Revenue Trend & Multi-Location Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue by Department Trend Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Monthly Revenue Trend by Clinical Service Line
                </h3>
                <span className="text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded">
                  Static Reference Baseline
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-specialty baseline model (Live financial reconciliations available in Billing & Revenue Intelligence)
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueByDeptTrend}>
                <defs>
                  <linearGradient id="colorCardio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSurg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#4B4B4B" />
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={11} />
                <YAxis stroke="#9CA3AF" fontSize={11} unit="M" />
                <Tooltip contentStyle={{ backgroundColor: '#2D2D2D', borderColor: '#4B4B4B', borderRadius: '8px', fontSize: '12px', color: '#F9FAFB' }} />
                <Area type="monotone" dataKey="Surgery" stroke="#34d399" fillOpacity={1} fill="url(#colorSurg)" />
                <Area type="monotone" dataKey="Cardiology" stroke="#38bdf8" fillOpacity={1} fill="url(#colorCardio)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Facility Comparison Leaderboard Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Branch & Facility Health Comparison</h3>
            <p className="text-xs text-slate-400 mb-4">Real-time Athena scorecard across network locations</p>

            <div className="space-y-3">
              {facilitiesComp.map((fac) => (
                <div
                  key={fac.id}
                  onClick={() => onOpenDrilldown(fac.id)}
                  className="p-3 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 rounded-xl transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-white group-hover:text-cyan-400 transition truncate max-w-[180px]">
                      {fac.name}
                    </span>
                    <span className="text-xs font-mono font-bold text-cyan-400">
                      Adm: {fac.admissions.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Revenue: ₹{(fac.revenue / 1e6).toFixed(2)}M</span>
                    <span>Denial: {fac.denialRate}%</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onOpenDrilldown('all')}
            className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold rounded-xl transition text-center"
          >
            Launch Enterprise → Department Drill-Down Matrix
          </button>
        </div>
      </div>
    </div>
  );
};
