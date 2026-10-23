import React, { useState, useEffect } from 'react';
import { 
  Siren, 
  Clock, 
  AlertTriangle, 
  Bed, 
  Stethoscope, 
  Users, 
  CheckCircle2, 
  ShieldAlert,
  Zap,
  Activity,
  Loader2,
  Info
} from 'lucide-react';
import { fetchEmergencyCriticalIntelligence, type EmergencyCriticalResponse } from '../../services/apiService';

interface EmergencyCriticalOperationsProps {
  selectedFacility?: string;
  selectedTimeframe?: string;
  onExecuteAction: (actionId: string, payload?: any) => void;
}

export const EmergencyCriticalOperations: React.FC<EmergencyCriticalOperationsProps> = ({ 
  selectedFacility = 'all',
  selectedTimeframe = 'realtime',
  onExecuteAction 
}) => {
  const [data, setData] = useState<EmergencyCriticalResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchEmergencyCriticalIntelligence(selectedFacility, selectedTimeframe)
      .then((res) => {
        if (!isMounted) return;
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to fetch emergency & critical intelligence:', err);
        setError(err.message || 'Failed to fetch emergency intelligence from backend');
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
        <p className="text-sm font-medium text-slate-300">Loading emergency & critical care analytics from Amazon Athena...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-rose-950/40 border border-rose-800/60 rounded-2xl text-rose-300 text-center min-h-[300px]">
        <AlertTriangle className="w-10 h-10 text-rose-400 mb-2" />
        <h3 className="text-base font-bold text-white mb-1">Emergency Operations API Error</h3>
        <p className="text-xs text-rose-200 max-w-md">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Siren className="w-5 h-5 text-rose-500 animate-pulse" /> Emergency & Critical Operations Center
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono font-bold rounded-full">
              {data.dataSource || 'Local Fallback'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real ED arrival triage, door-to-doctor waiting times, ICU stays, ventilation rates, and clinical outcomes
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-slate-400 font-medium">Surge Protocol:</span>
          <span className="text-slate-200 font-semibold">Standby (No Automated Dispatch Gateway)</span>
        </div>
      </div>

      {/* Honest Bed Inventory Disclaimer */}
      <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400 leading-relaxed">
          <strong className="text-slate-200 block mb-0.5">Physical Bed Capacity Notice:</strong>
          {data.totalPhysicalBeds} physical beds cataloged across network facilities (from beds.csv). {data.bedTelemetryNote}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total ED Visits</span>
          <div className="text-2xl font-bold text-white font-mono">{data.totalVisits.toLocaleString()}</div>
          <p className="text-[10px] text-slate-400">Scope: {selectedFacility === 'all' ? 'All Facilities' : selectedFacility}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Mean Door-to-MD</span>
          <div className="text-2xl font-bold text-cyan-400 font-mono">{data.meanWaitMinutes} Mins</div>
          <p className="text-[10px] text-cyan-300">Average Triage Wait Time</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Mean Treatment Time</span>
          <div className="text-2xl font-bold text-teal-400 font-mono">{data.meanTreatmentMinutes} Mins</div>
          <p className="text-[10px] text-teal-300">Average Active Treatment</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Hospital Admission Rate</span>
          <div className="text-2xl font-bold text-amber-400 font-mono">{data.admissionRate}%</div>
          <p className="text-[10px] text-amber-300">{data.admittedCount.toLocaleString()} Admissions from ED</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">ICU Ventilation Rate</span>
          <div className="text-2xl font-bold text-rose-400 font-mono">{data.icuStats?.ventilationRate}%</div>
          <p className="text-[10px] text-rose-300">{data.icuStats?.ventilationRequiredCount} of {data.icuStats?.totalStays} ICU Stays</p>
        </div>
      </div>

      {/* Emergency Severity Index (ESI) Triage Board */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Emergency Severity Index (ESI) Triage Board</h3>
          <span className="text-xs text-slate-400 font-mono">Total {data.totalVisits.toLocaleString()} Triage Classifications</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {data.triageBreakdown.map((esi) => {
            const colorMap: Record<number, string> = {
              1: 'border-rose-700 bg-rose-950/40 text-rose-300',
              2: 'border-orange-700 bg-orange-950/40 text-orange-300',
              3: 'border-amber-700 bg-amber-950/40 text-amber-300',
              4: 'border-cyan-700 bg-cyan-950/40 text-cyan-300',
              5: 'border-slate-700 bg-slate-950 text-slate-400'
            };
            const descMap: Record<number, string> = {
              1: 'Immediate life-saving resuscitation',
              2: 'Emergent: high risk, confused, severe pain',
              3: 'Urgent: multiple resources required',
              4: 'Less Urgent: single resource required',
              5: 'Non-Urgent: no complex resources needed'
            };

            return (
              <div key={esi.level} className={`p-4 border rounded-xl space-y-2 ${colorMap[esi.level] || 'border-slate-800'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold">{esi.label}</span>
                  <span className="text-xl font-mono font-bold">{esi.count}</span>
                </div>
                <div className="text-[11px] font-mono opacity-90">{esi.percentage}% of ED arrivals</div>
                <p className="text-[10px] opacity-75 leading-tight">{descMap[esi.level]}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Operational Breakdown: Arrival Mode & Dispositions & ICU Outcomes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Arrival Modes */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">ED Arrival Modes</h4>
          <div className="space-y-2">
            {data.arrivalModeBreakdown.map((m, idx) => (
              <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 text-xs">
                <span className="text-slate-300">{m.mode}</span>
                <span className="font-mono font-bold text-cyan-400">{m.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dispositions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">ED Dispositions</h4>
          <div className="space-y-2">
            {data.dispositionBreakdown.map((d, idx) => (
              <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 text-xs">
                <span className="text-slate-300">{d.disposition}</span>
                <span className="font-mono font-bold text-emerald-400">{d.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ICU Outcomes & Acuity */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">ICU Outcomes & Acuity</h4>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Mean Acuity Score:</span>
              <span className="font-mono font-bold text-white">{data.icuStats?.meanAcuityScore} / 10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Mean Ventilator Hours:</span>
              <span className="font-mono font-bold text-rose-400">{data.icuStats?.meanVentilatorHours} hrs</span>
            </div>
          </div>
          <div className="space-y-2 pt-1">
            {(data.icuStats?.outcomes || []).map((o, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-slate-950 rounded-xl border border-slate-800/80 text-xs">
                <span className="text-slate-300">{o.outcome}</span>
                <span className="font-mono font-bold text-amber-400">{o.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
