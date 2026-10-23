import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Database,
  RefreshCw,
  Search,
  Filter,
  FileCheck2,
  Clock,
  Activity,
  AlertOctagon,
  HeartHandshake
} from 'lucide-react';
import { 
  fetchQualityCompliance, 
  type QualityComplianceResponse,
  type QualityIncidentRecord,
  type QualityAuditRecord,
  type CorrectiveActionRecord 
} from '../../services/apiService';

interface QualityComplianceProps {
  selectedFacility?: string;
  selectedTimeframe?: string;
  onExecuteAction?: (actionId: string, payload?: any) => void;
}

export const QualityCompliance: React.FC<QualityComplianceProps> = ({ 
  selectedFacility = 'all', 
  selectedTimeframe = 'realtime',
  onExecuteAction 
}) => {
  const [data, setData] = useState<QualityComplianceResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'incidents' | 'audits' | 'capa'>('incidents');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [auditTypeFilter, setAuditTypeFilter] = useState<string>('all');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchQualityCompliance(selectedFacility, selectedTimeframe);
      setData(res);
    } catch (err: any) {
      console.error('Failed to load quality & compliance data:', err);
      setError(err.message || 'Unable to connect to Quality & Regulatory Compliance service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedFacility, selectedTimeframe]);

  // Filtered Incidents
  const filteredIncidents = useMemo(() => {
    if (!data?.incidents) return [];
    return data.incidents.filter((inc: QualityIncidentRecord) => {
      const matchSearch = searchQuery === '' || 
        inc.incidentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.facilityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.departmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.incidentType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inc.actionStatus && inc.actionStatus.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchSev = severityFilter === 'all' || inc.severity.toLowerCase() === severityFilter.toLowerCase();
      return matchSearch && matchSev;
    });
  }, [data?.incidents, searchQuery, severityFilter]);

  // Filtered Audits
  const filteredAudits = useMemo(() => {
    if (!data?.audits) return [];
    return data.audits.filter((aud: QualityAuditRecord) => {
      const matchSearch = searchQuery === '' ||
        aud.auditId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        aud.facilityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        aud.departmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        aud.auditType.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchType = auditTypeFilter === 'all' || aud.auditType.toLowerCase() === auditTypeFilter.toLowerCase();
      return matchSearch && matchType;
    });
  }, [data?.audits, searchQuery, auditTypeFilter]);

  // Filtered CAPA
  const filteredCapa = useMemo(() => {
    if (!data?.correctiveActions) return [];
    return data.correctiveActions.filter((ca: CorrectiveActionRecord) => {
      return searchQuery === '' ||
        ca.actionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ca.incidentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ca.facilityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ca.actionType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ca.actionStatus.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [data?.correctiveActions, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-emerald-400" /> Quality & Regulatory Compliance Command
            </h2>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] font-medium text-slate-300">
              <Database className="w-3 h-3 text-cyan-400" />
              <span>Data Source: <strong className="text-cyan-300">{loading ? 'Connecting to Amazon Athena...' : (data?.source || 'Local Fallback')}</strong></span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Clinical incident register, regulatory audit logs, CAPA adherence, and safety indicators from real hospital records.
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
            title="Refresh Quality Data"
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
          <h3 className="text-sm font-semibold text-white">Loading Quality & Regulatory Metrics</h3>
          <p className="text-xs text-slate-400 mt-1">Aggregating real audits, incident registers, and CAPA logs...</p>
        </div>
      )}

      {/* Error State */}
      {error && !data && (
        <div className="bg-rose-950/40 border border-rose-800 rounded-2xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-white">Quality Intelligence Service Unavailable</h3>
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
          {/* Primary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Real Audit Compliance Score */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Avg Audit Compliance</span>
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
              </span>
              <div className="text-2xl font-bold text-emerald-400 font-mono">
                {data.kpis.overallComplianceScoreFormatted}
              </div>
              <p className="text-[10px] text-slate-400">
                Data Privacy: {data.kpis.dataPrivacyComplianceScoreFormatted} · {data.kpis.totalAudits} audits
              </p>
            </div>

            {/* Data Privacy Compliance Score */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Data Privacy Compliance</span>
                <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 text-[9px] font-mono">Audit Record</span>
              </span>
              <div className="text-2xl font-bold text-sky-400 font-mono">
                {data.kpis.dataPrivacyComplianceScoreFormatted ?? data.kpis.hipaaComplianceScoreFormatted ?? 'N/A'}
              </div>
              <p className="text-[10px] text-slate-400">
                Audited data privacy & governance score
              </p>
            </div>

            {/* Infection Incident Rate */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Infection Incident Rate</span>
                <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[9px] font-mono">Clinical</span>
              </span>
              <div className="text-2xl font-bold text-rose-400 font-mono">
                {data.kpis.infectionRateFormatted}
              </div>
              <p className="text-[10px] text-slate-400">
                {data.kpis.totalInfectionIncidents} incidents across period admissions
              </p>
            </div>

            {/* Medication Errors */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Medication Errors</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[9px] font-mono">
                  Today: {data.kpis.medicationErrorsToday ?? 0}
                </span>
              </span>
              <div className="text-2xl font-bold text-amber-400 font-mono">
                {data.kpis.totalMedicationErrors}
              </div>
              <p className="text-[10px] text-slate-400">
                Today: {data.kpis.medicationErrorsToday ?? 0} · Reporting period: {data.kpis.totalMedicationErrors}
              </p>
            </div>
          </div>

          {/* Secondary Operational Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Active CAPA Corrective Actions */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <span>Active CAPA Actions</span>
                <Activity className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl font-bold text-amber-400 font-mono mt-1">
                {data.kpis.activeCAPACount} Active
              </div>
              <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                <span className="px-1.5 py-0.5 bg-blue-950 text-blue-400 rounded">
                  {data.kpis.capaByStatus['In Progress'] || 0} In Progress
                </span>
                <span className="px-1.5 py-0.5 bg-amber-950 text-amber-400 rounded">
                  {data.kpis.capaByStatus['Open'] || 0} Open
                </span>
                <span className="px-1.5 py-0.5 bg-rose-950 text-rose-400 rounded">
                  {data.kpis.capaByStatus['Overdue'] || 0} Overdue
                </span>
              </div>
            </div>

            {/* Quality Audits Overview */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <span>Audit Outcomes ({data.kpis.totalAudits})</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
                {data.kpis.compliantAudits} Compliant
              </div>
              <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-400 rounded">
                  {data.kpis.compliantAudits} Passed
                </span>
                <span className="px-1.5 py-0.5 bg-amber-950 text-amber-400 rounded">
                  {data.kpis.minorFindingsAudits} Minor
                </span>
                <span className="px-1.5 py-0.5 bg-rose-950 text-rose-400 rounded">
                  {data.kpis.majorFindingsAudits} Major
                </span>
              </div>
            </div>

            {/* Patient Grievances / Complaints */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <span>Patient Complaints</span>
                <HeartHandshake className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-xl font-bold text-cyan-400 font-mono mt-1">
                {data.kpis.totalComplaints} Logged
              </div>
              <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                <span>Avg Resolution: <strong className="text-slate-200">{data.kpis.avgComplaintResolutionHours} hrs</strong></span>
                <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-400 rounded">
                  {data.kpis.complaintsByStatus['Resolved'] || 0} Resolved
                </span>
              </div>
            </div>
          </div>

          {/* Incident Severity & Category Breakdown Badges */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Safety Incidents Breakdown ({data.kpis.totalIncidents} total incidents)
            </span>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-2">
              {Object.entries(data.kpis.incidentsByType).map(([type, count]) => (
                <div key={type} className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                  <div className="text-[10px] text-slate-400 truncate">{type}</div>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">{count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('incidents')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'incidents'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-950/50'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>Incident Register ({filteredIncidents.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('audits')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'audits'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-950/50'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Quality Audits ({filteredAudits.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('capa')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'capa'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-950/50'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>CAPA Log ({filteredCapa.length})</span>
            </button>
          </div>

          {/* Tab 1: Safety Incident Register */}
          {activeTab === 'incidents' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-white">Quality Incident & Safety Event Register</h3>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search incident ID, facility..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-56"
                    />
                  </div>

                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="all">All Severities</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3">Incident ID / Date</th>
                      <th className="py-3 px-3">Facility / Dept</th>
                      <th className="py-3 px-3">Incident Type</th>
                      <th className="py-3 px-3">Severity</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Corrective Action (CAPA)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredIncidents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                          No quality incidents match the filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredIncidents.map((row) => (
                        <tr key={row.incidentId} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-3">
                            <div className="font-semibold text-white">{row.incidentId}</div>
                            <div className="text-[10px] text-slate-500">{row.incidentDate}</div>
                          </td>
                          <td className="py-3 px-3 font-sans">
                            <div className="text-slate-200 font-medium">{row.facilityName}</div>
                            <div className="text-[10px] text-slate-400">{row.departmentName}</div>
                          </td>
                          <td className="py-3 px-3 font-sans text-cyan-300 font-medium">
                            {row.incidentType}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              row.severity === 'Critical'
                                ? 'bg-rose-950/80 text-rose-400 border-rose-800'
                                : row.severity === 'High'
                                ? 'bg-amber-950/80 text-amber-400 border-amber-800'
                                : row.severity === 'Moderate'
                                ? 'bg-blue-950/80 text-blue-400 border-blue-800'
                                : 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                            }`}>
                              {row.severity}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                              row.status === 'Closed'
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                                : row.status === 'Under Investigation'
                                ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                                : 'bg-sky-950/60 text-sky-300 border-sky-800/60'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-sans">
                            {row.actionId ? (
                              <div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  row.actionStatus === 'Completed'
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                    : row.actionStatus === 'In Progress'
                                    ? 'bg-blue-950 text-blue-400 border border-blue-800'
                                    : row.actionStatus === 'Overdue'
                                    ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                    : 'bg-amber-950 text-amber-400 border border-amber-800'
                                }`}>
                                  {row.actionId}: {row.actionStatus}
                                </span>
                                <div className="text-[10px] text-slate-500 mt-0.5">{row.actionType}</div>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500">
                                {row.correctiveActionRequired === 'Yes' ? 'CAPA Pending' : 'None Required'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Quality Audits Register */}
          {activeTab === 'audits' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-white">Quality Audit Inspection Logs</h3>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search audit ID, facility..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-56"
                    />
                  </div>

                  <select
                    value={auditTypeFilter}
                    onChange={(e) => setAuditTypeFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="all">All Audit Types</option>
                    <option value="Data Privacy">Data Privacy</option>
                    <option value="Medication Safety">Medication Safety</option>
                    <option value="Clinical">Clinical</option>
                    <option value="Billing Compliance">Billing Compliance</option>
                    <option value="Documentation">Documentation</option>
                    <option value="Infection Control">Infection Control</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3">Audit ID / Date</th>
                      <th className="py-3 px-3">Facility / Dept</th>
                      <th className="py-3 px-3">Audit Scope</th>
                      <th className="py-3 px-3">Compliance Score</th>
                      <th className="py-3 px-3">Findings</th>
                      <th className="py-3 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredAudits.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                          No quality audits match the filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredAudits.map((row) => (
                        <tr key={row.auditId} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-3">
                            <div className="font-semibold text-white">{row.auditId}</div>
                            <div className="text-[10px] text-slate-500">{row.auditDate}</div>
                          </td>
                          <td className="py-3 px-3 font-sans">
                            <div className="text-slate-200 font-medium">{row.facilityName}</div>
                            <div className="text-[10px] text-slate-400">{row.departmentName}</div>
                          </td>
                          <td className="py-3 px-3 font-sans text-cyan-300 font-medium">
                            {row.auditType}
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-sm font-bold text-white">{row.complianceScore}%</div>
                            <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                              <div
                                className={`h-full rounded-full ${
                                  row.complianceScore >= 90 ? 'bg-emerald-400' : row.complianceScore >= 75 ? 'bg-amber-400' : 'bg-rose-400'
                                }`}
                                style={{ width: `${Math.min(row.complianceScore, 100)}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.findingsCount === 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                            }`}>
                              {row.findingsCount} findings
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                              row.status === 'Compliant'
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                                : row.status === 'Minor Findings'
                                ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                                : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: CAPA Corrective Actions Register */}
          {activeTab === 'capa' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-white">CAPA Corrective Action Program</h3>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search CAPA ID, incident..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-56"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3">CAPA Action ID</th>
                      <th className="py-3 px-3">Incident Reference</th>
                      <th className="py-3 px-3">Facility</th>
                      <th className="py-3 px-3">Action Type</th>
                      <th className="py-3 px-3">Due Date</th>
                      <th className="py-3 px-3">Action Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredCapa.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                          No CAPA records match the filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredCapa.map((row) => (
                        <tr key={row.actionId} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-3 font-semibold text-white">
                            {row.actionId}
                          </td>
                          <td className="py-3 px-3 text-cyan-300">
                            {row.incidentId}
                          </td>
                          <td className="py-3 px-3 font-sans text-slate-200">
                            {row.facilityName}
                          </td>
                          <td className="py-3 px-3 font-sans text-slate-300 font-medium">
                            {row.actionType}
                          </td>
                          <td className="py-3 px-3 text-slate-400">
                            {row.dueDate}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              row.actionStatus === 'Completed'
                                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                                : row.actionStatus === 'In Progress'
                                ? 'bg-blue-950/80 text-blue-400 border-blue-800'
                                : row.actionStatus === 'Overdue'
                                ? 'bg-rose-950/80 text-rose-400 border-rose-800'
                                : 'bg-amber-950/80 text-amber-400 border-amber-800'
                            }`}>
                              {row.actionStatus}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
