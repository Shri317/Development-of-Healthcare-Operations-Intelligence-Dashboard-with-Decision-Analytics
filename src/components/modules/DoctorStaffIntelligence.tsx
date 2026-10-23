import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  Users, 
  Award, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign, 
  ShieldAlert,
  CalendarCheck,
  Loader2,
  Database
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { fetchDoctorStaffIntelligence } from '../../services/apiService';

interface DoctorStaffIntelligenceProps {
  selectedFacility?: string;
  selectedTimeframe?: string;
  onExecuteAction: (actionId: string, payload?: any) => void;
}

export const DoctorStaffIntelligence: React.FC<DoctorStaffIntelligenceProps> = ({ 
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

    fetchDoctorStaffIntelligence(selectedFacility, selectedTimeframe)
      .then((res) => {
        if (!isMounted) return;
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to fetch doctor staff intelligence:', err);
        setError(err.message || 'Failed to fetch doctor staff data from API');
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
        <p className="text-sm font-medium text-slate-300">Loading physician & staffing analytics from Amazon Athena...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-rose-950/40 border border-rose-800/60 rounded-2xl text-rose-300 text-center min-h-[300px]">
        <AlertTriangle className="w-10 h-10 text-rose-400 mb-2" />
        <h3 className="text-base font-bold text-white mb-1">Doctor & Staff API Error</h3>
        <p className="text-xs text-rose-200 max-w-md">{error}</p>
      </div>
    );
  }

  if (!data || data.totalDoctors === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-center min-h-[300px]">
        <Database className="w-10 h-10 text-slate-500 mb-2" />
        <h3 className="text-base font-bold text-slate-200 mb-1">No Doctor Records Found</h3>
        <p className="text-xs text-slate-400">No doctor workload records match the selected scope ({selectedFacility}).</p>
      </div>
    );
  }

  const specData = (data.specializationUtilization || []).map((s: any) => ({
    specialization: s.specialization,
    utilization: s.avgUtilization
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-cyan-400" /> Doctor & Staff Intelligence Command
          </h2>
          <p className="text-xs text-slate-400">
            Real dataset provider productivity, utilization benchmarking, working hours, and workload analytics
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Average Utilization Rate</span>
          <div className="text-2xl font-bold text-white font-mono">{data.avgUtilization}%</div>
          <p className="text-[10px] text-emerald-400 font-semibold">Active Clinical Utilization</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Active Doctors</span>
          <div className="text-2xl font-bold text-cyan-400 font-mono">{data.totalDoctors}</div>
          <p className="text-[10px] text-slate-400">Assigned across selected scope</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Clinical Hours</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{data.totalWorkingHours ? Math.round(data.totalWorkingHours).toLocaleString() : 0} hrs</div>
          <p className="text-[10px] text-slate-400">Logged Working Time</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Overtime Logged</span>
          <div className="text-2xl font-bold text-amber-400 font-mono">{data.totalOvertimeHours ? Math.round(data.totalOvertimeHours).toLocaleString() : 0} hrs</div>
          <p className="text-[10px] text-amber-400 font-semibold">Shift Overtime Hours</p>
        </div>
      </div>

      {/* Specialization Utilization Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-1">Average Utilization by Specialty (%)</h3>
        <p className="text-xs text-slate-400 mb-4">Capacity vs clinical workload per specialization</p>

        <div className="h-64 w-full">
          {specData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={specData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4B4B4B" />
                <XAxis dataKey="specialization" stroke="#9CA3AF" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} domain={[0, 100]} />
                <Tooltip 
                  formatter={(val: any) => [`${val}%`, 'Utilization']}
                  contentStyle={{ backgroundColor: '#2D2D2D', borderColor: '#4B4B4B', color: '#F9FAFB' }}
                />
                <Bar dataKey="utilization" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-slate-500">No specialization data</div>
          )}
        </div>
      </div>

      {/* Top Doctors Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-1">Top Performing Physicians</h3>
        <p className="text-xs text-slate-400 mb-4">Physician workload, utilization %, appointments, and surgeries performed</p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
              <tr>
                <th className="p-3">Doctor Name</th>
                <th className="p-3">Specialization</th>
                <th className="p-3">Utilization %</th>
                <th className="p-3">Appointments Handled</th>
                <th className="p-3">Surgeries</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(data.topDoctors || []).map((doc: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="p-3 font-semibold text-white">{doc.name}</td>
                  <td className="p-3 text-cyan-400">{doc.specialization}</td>
                  <td className="p-3 font-mono font-bold text-emerald-400">{doc.utilization}%</td>
                  <td className="p-3 font-mono">{doc.appointments || 0}</td>
                  <td className="p-3 font-mono">{doc.surgeries || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
