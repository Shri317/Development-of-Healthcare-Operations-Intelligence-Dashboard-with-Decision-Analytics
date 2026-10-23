import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  RefreshCw, 
  Loader2, 
  TrendingUp, 
  Activity, 
  DollarSign, 
  AlertTriangle 
} from 'lucide-react';
import { 
  fetchExecutiveSummary, 
  fetchBillingIntelligence, 
  fetchClaimsIntelligence,
  fetchEmergencyCriticalIntelligence
} from '../../services/apiService';

interface PowerBIDashboardHubProps {
  selectedFacility?: string;
  selectedTimeframe?: string;
  onExecuteAction: (actionId: string, payload?: any) => void;
}

export const PowerBIDashboardHub: React.FC<PowerBIDashboardHubProps> = ({ 
  selectedFacility = 'all',
  selectedTimeframe = 'realtime',
  onExecuteAction 
}) => {
  const [activeReport, setActiveReport] = useState('Executive Overview');
  const [viewDevice, setViewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [execData, setExecData] = useState<any>(null);
  const [claimsData, setClaimsData] = useState<any>(null);
  const [edData, setEdData] = useState<any>(null);

  const loadAllAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [exec, claims, ed] = await Promise.all([
        fetchExecutiveSummary(selectedFacility, selectedTimeframe),
        fetchClaimsIntelligence(selectedFacility, selectedTimeframe),
        fetchEmergencyCriticalIntelligence(selectedFacility, selectedTimeframe)
      ]);
      setExecData(exec);
      setClaimsData(claims);
      setEdData(ed);
    } catch (err: any) {
      console.error('Failed to load executive analytics hub metrics:', err);
      setError(err.message || 'Unable to load cross-domain analytics tiles from the backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAnalytics();
  }, [selectedFacility, selectedTimeframe]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-amber-400" /> Executive Analytics & Reporting Hub
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono font-bold rounded-full">
              {loading ? 'Connecting...' : (execData?.source || 'Live Engine Connected')}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Aggregated cross-domain executive analytics, dynamic facility slicers, and report views
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Report Tab Selector */}
          <select
            value={activeReport}
            onChange={(e) => setActiveReport(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-amber-300 font-semibold rounded-xl px-3 py-2 outline-none"
          >
            <option value="Executive Overview">📊 Executive Command Analytics Report</option>
            <option value="Revenue & Claims">💰 Revenue Cycle & Claims Report</option>
            <option value="Patient Throughput">🏥 Patient Throughput & ED Report</option>
          </select>
        </div>
      </div>

      {/* Embedded Analytics Canvas */}
      <div className={`bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden p-4 space-y-4 shadow-2xl transition-all ${
        viewDevice === 'mobile' ? 'max-w-md mx-auto border-4 border-slate-700 rounded-3xl' : ''
      }`}>
        {/* Workspace Header Toolbar */}
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              {activeReport}.dash
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Scope: {selectedFacility === 'all' ? 'All Enterprise Facilities' : selectedFacility}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewDevice(viewDevice === 'desktop' ? 'mobile' : 'desktop')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono"
            >
              Mode: {viewDevice.toUpperCase()}
            </button>

            <button
              onClick={loadAllAnalytics}
              className="p-1 text-slate-400 hover:text-white"
              title="Refresh Semantic Dataset"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Embedded Report Content */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 min-h-[440px] flex flex-col justify-between space-y-6">
          {/* Top Analytics Slicers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Facility Context</span>
              <span className="text-white font-semibold">{selectedFacility === 'all' ? 'All 5 Locations' : selectedFacility}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Timeframe Context</span>
              <span className="text-cyan-400 font-semibold">{selectedTimeframe.toUpperCase()}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Data Engine</span>
              <span className="text-emerald-400 font-semibold">{execData?.source || 'Amazon Athena / FastAPI'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Dataset Status</span>
              <span className="text-amber-400 font-semibold">99,485 Records Active</span>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 min-h-[200px]">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
              <p className="text-xs text-slate-400">Loading cross-domain analytics tiles from Amazon Athena...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-8 bg-rose-950/30 border border-rose-800/50 rounded-xl text-rose-300 text-center min-h-[200px] space-y-2">
              <AlertTriangle className="w-8 h-8 text-rose-400 mb-1" />
              <h4 className="text-sm font-bold text-white">Cross-Domain Analytics Unavailable</h4>
              <p className="text-xs text-rose-200 max-w-sm">{error}</p>
              <button
                onClick={loadAllAnalytics}
                className="mt-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" /> Retry Request
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
              {activeReport === 'Executive Overview' && (
                <>
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-300">Total Billed Revenue</span>
                    <span className="text-3xl font-extrabold text-emerald-400 font-mono my-2">
                      {execData?.rawMetrics?.totalRevenue != null
                        ? (execData.rawMetrics.totalRevenue >= 1e6 ? `₹${(execData.rawMetrics.totalRevenue / 1e6).toFixed(2)} M` : `₹${(execData.rawMetrics.totalRevenue / 1e3).toFixed(1)} K`)
                        : (execData?.kpis?.find((k: any) => k.title?.includes('Revenue'))?.value || 'Unavailable')}
                    </span>
                    <span className="text-[10px] text-slate-500">From billing records ({execData?.source || 'Analytics Engine'})</span>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-300">Total Patient Encounters</span>
                    <span className="text-3xl font-extrabold text-cyan-400 font-mono my-2">
                      {execData?.rawMetrics?.totalAdmissions != null
                        ? execData.rawMetrics.totalAdmissions.toLocaleString()
                        : (execData?.kpis?.find((k: any) => k.title?.includes('Admissions'))?.value || 'Unavailable')}
                    </span>
                    <span className="text-[10px] text-slate-500">From admissions & encounters</span>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-300">Monitored Facilities</span>
                    <span className="text-3xl font-extrabold text-amber-400 font-mono my-2">
                      5 Facilities
                    </span>
                    <span className="text-[10px] text-slate-500">Network healthcare branches</span>
                  </div>
                </>
              )}

              {activeReport === 'Revenue & Claims' && (
                <>
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-300">Total Evaluated Claims</span>
                    <span className="text-3xl font-extrabold text-cyan-400 font-mono my-2">
                      {claimsData?.totalClaims != null ? claimsData.totalClaims.toLocaleString() : 'Unavailable'}
                    </span>
                    <span className="text-[10px] text-slate-500">From claims dataset</span>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-300">Total Claimed Value</span>
                    <span className="text-3xl font-extrabold text-emerald-400 font-mono my-2">
                      {claimsData?.totalClaimedAmountFormatted || (claimsData?.totalClaimedAmount != null ? `₹${(claimsData.totalClaimedAmount / 1e6).toFixed(2)} M` : 'Unavailable')}
                    </span>
                    <span className="text-[10px] text-slate-500">Aggregated claim submissions</span>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-300">Overall Denial Rate</span>
                    <span className="text-3xl font-extrabold text-rose-400 font-mono my-2">
                      {claimsData?.denialRate != null ? `${claimsData.denialRate}%` : 'Unavailable'}
                    </span>
                    <span className="text-[10px] text-slate-500">Calculated claims denial rate</span>
                  </div>
                </>
              )}

              {activeReport === 'Patient Throughput' && (
                <>
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-300">Emergency Visits</span>
                    <span className="text-3xl font-extrabold text-white font-mono my-2">
                      {edData?.totalVisits != null ? edData.totalVisits.toLocaleString() : 'Unavailable'}
                    </span>
                    <span className="text-[10px] text-slate-500">From emergency visit logs</span>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-300">Mean Door-to-Doctor</span>
                    <span className="text-3xl font-extrabold text-cyan-400 font-mono my-2">
                      {edData?.meanWaitMinutes != null ? `${edData.meanWaitMinutes} Mins` : 'Unavailable'}
                    </span>
                    <span className="text-[10px] text-slate-500">Average triage waiting time</span>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-300">ED Admission Rate</span>
                    <span className="text-3xl font-extrabold text-amber-400 font-mono my-2">
                      {edData?.admissionRate != null ? `${edData.admissionRate}%` : 'Unavailable'}
                    </span>
                    <span className="text-[10px] text-slate-500">Patients admitted from emergency</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Analytics Embed Footer */}
          <div className="flex justify-between items-center text-[11px] text-slate-500 border-t border-slate-800 pt-3">
            <span>Powered by Enterprise Analytics Engine API</span>
            <span className="font-mono">Report ID: rpt-core-v9-live</span>
          </div>
        </div>
      </div>
    </div>
  );
};
