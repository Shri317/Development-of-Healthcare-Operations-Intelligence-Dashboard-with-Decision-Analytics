import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Clock, 
  Bed, 
  Calendar, 
  AlertTriangle, 
  TrendingUp, 
  Search, 
  CheckCircle2, 
  XCircle,
  Activity,
  ArrowRight,
  Loader2,
  Database
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { fetchPatientOpsIntelligence } from '../../services/apiService';

interface PatientOperationsProps {
  selectedFacility?: string;
  selectedTimeframe?: string;
  onExecuteAction: (actionId: string, payload?: any) => void;
}

const COLORS = ['#38bdf8', '#34d399', '#a78bfa', '#fbbf24', '#f43f5e'];

export const PatientOperations: React.FC<PatientOperationsProps> = ({ 
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

    fetchPatientOpsIntelligence(selectedFacility, selectedTimeframe)
      .then((res) => {
        if (!isMounted) return;
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to fetch patient operations intelligence:', err);
        setError(err.message || 'Failed to fetch patient operations data from API');
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
        <p className="text-sm font-medium text-slate-300">Loading patient operations analytics from Amazon Athena...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-rose-950/40 border border-rose-800/60 rounded-2xl text-rose-300 text-center min-h-[300px]">
        <AlertTriangle className="w-10 h-10 text-rose-400 mb-2" />
        <h3 className="text-base font-bold text-white mb-1">Patient Operations API Error</h3>
        <p className="text-xs text-rose-200 max-w-md">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-center min-h-[300px]">
        <Database className="w-10 h-10 text-slate-500 mb-2" />
        <h3 className="text-base font-bold text-slate-200 mb-1">No Data Available</h3>
        <p className="text-xs text-slate-400">Unable to load patient operations data for the selected scope ({selectedFacility}).</p>
      </div>
    );
  }

  const admTypeData = (data.admissionTypes || []).map((a: any, idx: number) => ({
    name: a.type,
    value: a.count,
    color: COLORS[idx % COLORS.length]
  }));

  const disStatusData = (data.dischargeStatuses || []).map((d: any) => ({
    status: d.status,
    count: d.count
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" /> Patient Operations & Flow Intelligence
          </h2>
          <p className="text-xs text-slate-400">
            Real dataset patient flow, admissions analytics, average length of stay, and discharge statistics
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Admissions</span>
          <div className="text-2xl font-bold text-white font-mono">{data.totalAdmissions.toLocaleString()}</div>
          <p className="text-[10px] text-slate-400">Scope: {selectedFacility === 'all' ? 'All Facilities' : selectedFacility}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Average Length of Stay (LOS)</span>
          <div className="text-2xl font-bold text-cyan-400 font-mono">{data.avgLengthOfStay} days</div>
          <p className="text-[10px] text-cyan-300">Across Admitted Patients</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Emergency Visits</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{data.emergencyVisits ? data.emergencyVisits.toLocaleString() : 'N/A'}</div>
          <p className="text-[10px] text-emerald-400">Recorded ED Encounters</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Average ED Wait Time</span>
          <div className="text-2xl font-bold text-amber-400 font-mono">{data.avgEDWaitTime} mins</div>
          <p className="text-[10px] text-amber-400">Triage to Physician</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Admission Types */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-1">Admission Types Breakdown</h3>
          <p className="text-xs text-slate-400 mb-4">Distribution of patient admissions by category</p>

          <div className="h-64 w-full flex items-center justify-center">
            {admTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={admTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {admTypeData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => [`${val} Patients`, 'Count']}
                    contentStyle={{ backgroundColor: '#2D2D2D', borderColor: '#4B4B4B', color: '#F9FAFB' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-500">No admission type data</p>
            )}
          </div>
        </div>

        {/* Discharge Statuses */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-1">Discharge Status Breakdown</h3>
          <p className="text-xs text-slate-400 mb-4">Patient discharge outcomes recorded in dataset</p>

          <div className="h-64 w-full">
            {disStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={disStatusData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4B4B4B" />
                  <XAxis dataKey="status" stroke="#9CA3AF" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                  <Tooltip 
                    formatter={(val: any) => [`${val} Patients`, 'Discharged']}
                    contentStyle={{ backgroundColor: '#2D2D2D', borderColor: '#4B4B4B', color: '#F9FAFB' }}
                  />
                  <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-500">No discharge data</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
