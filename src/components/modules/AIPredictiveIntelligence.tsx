import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Brain, 
  Target, 
  Layers,
  ArrowRight,
  Database,
  RefreshCw,
  Clock,
  ShieldAlert,
  Activity,
  DollarSign,
  FileCheck2,
  CalendarCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend,
  BarChart,
  Bar
} from 'recharts';
import { 
  fetchAIPredictiveIntelligence, 
  type AIPredictiveResponse 
} from '../../services/apiService';

interface AIPredictiveIntelligenceProps {
  selectedFacility?: string;
  selectedTimeframe?: string;
  onExecuteAction?: (actionId: string, payload?: any) => void;
}

export const AIPredictiveIntelligence: React.FC<AIPredictiveIntelligenceProps> = ({ 
  selectedFacility = 'all',
  selectedTimeframe = 'realtime',
  onExecuteAction 
}) => {
  const [data, setData] = useState<AIPredictiveResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'forecast' | 'noshow' | 'claims'>('forecast');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAIPredictiveIntelligence(selectedFacility, selectedTimeframe);
      setData(res);
    } catch (err: any) {
      console.error('Failed to load predictive intelligence:', err);
      setError(err.message || 'Unable to connect to predictive intelligence service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedFacility, selectedTimeframe]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" /> AI & Predictive Intelligence Engine
            </h2>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] font-medium text-slate-300">
              <Database className="w-3 h-3 text-cyan-400" />
              <span>Data Source: <strong className="text-cyan-300">{loading ? 'Connecting to Amazon Athena...' : (data?.source || 'Local Fallback')}</strong></span>
            </div>
            <div className="hidden sm:inline-flex px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-[10px] font-medium text-cyan-300">
              Statistical Trend Regression
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Data-driven encounter forecasting, clinician capacity projections, appointment no-show analytics, and empirical delay bottlenecks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-[11px] text-slate-400 font-medium">Facility Context</div>
            <div className="text-xs font-semibold text-slate-200">
              {selectedFacility === 'all' ? 'Enterprise (All 5 Facilities)' : selectedFacility}
            </div>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
            title="Refresh Predictive Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && !data && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white">Calculating Predictive Trends</h3>
          <p className="text-xs text-slate-400 mt-1">Aggregating historical encounter series, workload ratios, and denial patterns...</p>
        </div>
      )}

      {/* Error State */}
      {error && !data && (
        <div className="bg-rose-950/40 border border-rose-800 rounded-2xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-white">Predictive Intelligence Service Unavailable</h3>
          <p className="text-xs text-rose-300 mt-1">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Main Content */}
      {data && (
        <>
          {/* Predictive KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 7-Day Patient Volume Forecast */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>7-Day Volume Projection</span>
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              </span>
              <div className="text-2xl font-bold text-white font-mono">
                {data.kpis.peakForecastVolumeFormatted}
              </div>
              <p className="text-[10px] text-cyan-400 font-semibold">
                {data.kpis.forecastTrendFormatted}
              </p>
            </div>

            {/* Staffing Requirement */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Staffing Requirement</span>
                <Users className="w-3.5 h-3.5 text-amber-400" />
              </span>
              <div className="text-2xl font-bold text-amber-400 font-mono">
                {data.kpis.projectedStaffRequiredFormatted}
              </div>
              <p className="text-[10px] text-slate-400">
                {data.kpis.staffingRatioStandard}
              </p>
            </div>

            {/* No-Show Risk Analytics */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>No-Show Risk Analytics</span>
                <CalendarCheck className="w-3.5 h-3.5 text-emerald-400" />
              </span>
              <div className="text-2xl font-bold text-emerald-400 font-mono">
                {data.kpis.overallNoShowRateFormatted}
              </div>
              <p className="text-[10px] text-slate-400">
                {data.kpis.noShowCount} unfulfilled out of {data.kpis.totalAppointments} appts
              </p>
            </div>

            {/* Claim Denial Avoidance / Exposure */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Claim Denial Exposure</span>
                <DollarSign className="w-3.5 h-3.5 text-rose-400" />
              </span>
              <div className="text-2xl font-bold text-rose-400 font-mono">
                {data.kpis.totalDeniedAmountFormatted} at Risk
              </div>
              <p className="text-[10px] text-slate-400">
                {data.kpis.deniedClaimsCount} denied ({data.kpis.overallDenialRateFormatted})
              </p>
            </div>
          </div>

          {/* Patient Volume & Staffing Predictive Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  14-Day Historical Encounters & 7-Day Predictive Demand Forecast
                </h3>
                <p className="text-xs text-slate-400">
                  Time-series trend regression across inpatient admissions, scheduled appointments, and emergency visits
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  {data.kpis.methodology}
                </span>
              </div>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.forecastChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4B4B4B" />
                  <XAxis dataKey="day" stroke="#9CA3AF" fontSize={11} />
                  <YAxis stroke="#9CA3AF" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#2D2D2D', 
                      borderColor: '#4B4B4B',
                      color: '#F9FAFB', 
                      borderRadius: '8px', 
                      fontSize: '12px' 
                    }} 
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="ActualVolume" 
                    stroke="#34d399" 
                    strokeWidth={2} 
                    name="Actual Encounters (Historical)" 
                    connectNulls={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="PredictedVolume" 
                    stroke="#38bdf8" 
                    strokeWidth={2} 
                    strokeDasharray="5 5" 
                    name="Projected Encounters (Trend Regression)" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* View Selection Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveView('forecast')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeView === 'forecast'
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-950/50'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Operational Anomalies & Bottlenecks</span>
            </button>

            <button
              onClick={() => setActiveView('noshow')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeView === 'noshow'
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-950/50'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>No-Show Risk Analytics</span>
            </button>

            <button
              onClick={() => setActiveView('claims')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeView === 'claims'
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-950/50'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Claim Denial Root-Cause</span>
            </button>
          </div>

          {/* View 1: Operational Anomaly Detector & Causal Bottlenecks */}
          {activeView === 'forecast' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Operational Anomaly Detector Feed */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-400" /> Operational Anomaly Detector Feed
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">Real-Time Risk Alerts</span>
                </div>
                
                <div className="space-y-2.5 text-xs">
                  {data.anomalies.length === 0 ? (
                    <div className="py-6 text-center text-slate-500">
                      No active operational anomalies detected for selected facility.
                    </div>
                  ) : (
                    data.anomalies.map((an, i) => (
                      <div key={i} className={`p-3 border rounded-xl ${an.color} space-y-1`}>
                        <div className="flex justify-between font-bold">
                          <span>{an.title}</span>
                          <span className="font-mono text-[10px] uppercase">{an.severity}</span>
                        </div>
                        <p className="text-[11px] text-slate-300">{an.cause}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Patient Flow Bottleneck Analysis */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Empirical Patient Flow Bottlenecks</h3>
                  <p className="text-xs text-slate-400 mb-3">
                    Calculated average waiting times and stage durations from 1,949 measured hospital flow events
                  </p>

                  <div className="space-y-2">
                    {data.bottlenecks.slice(0, 5).map((b, i) => (
                      <div key={i} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-200">{i + 1}. {b.stage}</div>
                          <div className="text-[10px] text-slate-400">Duration: {b.avgDurationMinutes} mins · {b.eventCount} recorded events</div>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                            b.avgWaitMinutes > 20 ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}>
                            {b.avgWaitMinutes} min wait
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Primary Delay Factor: Inpatient Bed Transfer Coordination</span>
                  <span className="font-mono text-cyan-400 text-[10px] bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
                    Bottleneck Analytics Active
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* View 2: No-Show Risk Analytics */}
          {activeView === 'noshow' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* No-Show by Booking Channel */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-emerald-400" /> No-Show Rate by Booking Channel
                </h3>
                <p className="text-xs text-slate-400">
                  Empirical probability of patient absence across intake channels
                </p>

                <div className="space-y-3 pt-2">
                  {Object.entries(data.noShowByBooking).map(([channel, rate]) => (
                    <div key={channel} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-300">{channel}</span>
                        <span className="font-mono text-cyan-300 font-bold">{rate}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            rate >= 13 ? 'bg-rose-400' : rate >= 12 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${Math.min(rate * 4, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* No-Show by Department */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" /> No-Show Rate by Clinical Department
                </h3>
                <p className="text-xs text-slate-400">
                  Departmental appointment completion variance
                </p>

                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  {Object.entries(data.noShowByDepartment).map(([dept, rate]) => (
                    <div key={dept} className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
                      <div className="text-[11px] text-slate-400 font-medium truncate">{dept}</div>
                      <div className="text-base font-bold text-white font-mono">{rate}%</div>
                      <div className="text-[9px] text-slate-500">Unfulfilled Rate</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* View 3: Claim Denial Root-Cause Breakdown */}
          {activeView === 'claims' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Denial Reasons Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-rose-400" /> Denial Drivers & Financial Exposure
                </h3>
                <p className="text-xs text-slate-400">
                  Primary denial triggers quantified by occurrence frequency and claimed dollars
                </p>

                <div className="space-y-2 pt-2">
                  {data.denialsByReason.map((d, i) => (
                    <div key={i} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-200">{d.reason}</div>
                        <div className="text-[10px] text-slate-400">{d.count} denied claims</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-rose-400">{d.amountFormatted}</div>
                        <div className="text-[9px] text-slate-500">Claimed Value</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Denial Rate by Payer */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-400" /> Denial Rate by Insurance Payer
                </h3>
                <p className="text-xs text-slate-400">
                  Payer adjudication risk based on historical claim dispute rates
                </p>

                <div className="space-y-3 pt-2">
                  {Object.entries(data.denialRateByPayer).map(([payer, rate]) => (
                    <div key={payer} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-300">{payer}</span>
                        <span className="font-mono text-amber-300 font-bold">{rate}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            rate >= 11 ? 'bg-rose-400' : rate >= 9 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${Math.min(rate * 6, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
