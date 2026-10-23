import React, { useState, useEffect } from 'react';
import { 
  Code2, 
  AlertTriangle, 
  FileText, 
  Loader2,
  Info
} from 'lucide-react';
import { fetchMedicalCodingIntelligence, type MedicalCodingResponse } from '../../services/apiService';

interface MedicalCodingDocumentationProps {
  selectedFacility?: string;
  selectedTimeframe?: string;
  onExecuteAction?: (actionId: string, payload?: any) => void;
}

export const MedicalCodingDocumentation: React.FC<MedicalCodingDocumentationProps> = ({ 
  selectedFacility = 'all',
  selectedTimeframe = 'realtime',
  onExecuteAction 
}) => {
  const [data, setData] = useState<MedicalCodingResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchMedicalCodingIntelligence(selectedFacility, selectedTimeframe)
      .then((res) => {
        if (!isMounted) return;
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to fetch medical coding intelligence:', err);
        setError(err.message || 'Failed to fetch medical coding analytics from backend');
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
        <p className="text-sm font-medium text-slate-300">Loading medical coding analytics from Amazon Athena...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-rose-950/40 border border-rose-800/60 rounded-2xl text-rose-300 text-center min-h-[300px]">
        <AlertTriangle className="w-10 h-10 text-rose-400 mb-2" />
        <h3 className="text-base font-bold text-white mb-1">Medical Coding API Error</h3>
        <p className="text-xs text-rose-200 max-w-md">{error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Code2 className="w-5 h-5 text-cyan-400" /> Medical Coding & Documentation Intelligence
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono font-bold rounded-full">
              {data.dataSource || 'Local Fallback'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            ICD-10 / CPT billing documentation tracking, coding-related claim denials, and discharge delays
          </p>
        </div>
      </div>

      {/* Transparent Data Integrity Banner */}
      <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400 leading-relaxed">
          <strong className="text-slate-200 block mb-0.5">Core Dataset Transparency Notice:</strong>
          {data.dataIntegrityNote}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Coding & Doc Denials</span>
          <div className="text-2xl font-bold text-rose-400 font-mono">{data.codingDocumentationDenials} Claims</div>
          <p className="text-[10px] text-slate-400">Out of {data.totalClaimsEvaluated.toLocaleString()} evaluated claims</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Denied Financial Exposure</span>
          <div className="text-2xl font-bold text-amber-400 font-mono">{data.financialExposureFormatted}</div>
          <p className="text-[10px] text-amber-400 font-semibold">At-Risk Coding & Auth Revenue</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Documentation Discharge Holds</span>
          <div className="text-2xl font-bold text-orange-400 font-mono">{data.documentationDischargeHolds} Discharges</div>
          <p className="text-[10px] text-slate-400">Discharge barrier: Documentation Pending</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Mean Discharge Delay</span>
          <div className="text-2xl font-bold text-cyan-400 font-mono">{data.meanDischargeDelayHours} Hours</div>
          <p className="text-[10px] text-cyan-300">Average documentation hold delay</p>
        </div>
      </div>

      {/* Denial Reason Breakdown Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white">Coding & Documentation Denial Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {data.denialReasonsBreakdown.map((r, i) => (
            <div key={i} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
              <div className="text-xs font-semibold text-white">{r.reason}</div>
              <div className="text-lg font-mono font-bold text-rose-400">{r.count} Claims</div>
              <div className="text-[11px] font-mono text-slate-400">{r.amountFormatted}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Real Documentation & Coding Denial Audit Stream */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Real Coding Denial Audit Stream (claims.csv)</h3>
          <span className="text-[11px] text-slate-400 font-mono">Top {data.recentAuditClaims.length} Flagged Claims</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Claim ID</th>
                <th className="py-3 px-3">Patient</th>
                <th className="py-3 px-3">Facility</th>
                <th className="py-3 px-3">Payer</th>
                <th className="py-3 px-3">Claimed Amount</th>
                <th className="py-3 px-3">Denial Reason</th>
                <th className="py-3 px-3">Submission Date</th>
                <th className="py-3 px-3 text-right">Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {data.recentAuditClaims.map((row) => (
                <tr key={row.claimId} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3 font-bold text-white">{row.claimId}</td>
                  <td className="py-3 px-3 font-sans text-slate-300">{row.patientName}</td>
                  <td className="py-3 px-3 text-slate-400">{row.facilityId}</td>
                  <td className="py-3 px-3 font-sans text-cyan-400">{row.payer}</td>
                  <td className="py-3 px-3 font-bold text-amber-400">{row.claimedAmountFormatted}</td>
                  <td className="py-3 px-3 font-sans">
                    <span className="px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 rounded text-[10px] font-bold">
                      {row.denialReason}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400">{row.submissionDate}</td>
                  <td className="py-3 px-3 text-right font-sans">
                    <span className="px-2.5 py-1 bg-slate-800/80 border border-slate-700/60 text-slate-400 text-[10px] font-mono rounded">
                      Audit Logged
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Standard Medical Coding & Nomenclature Catalog */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Standard Clinical Coding & Terminology Reference</h3>
          </div>
          <span className="text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded">
            Reference Standard: ICD-10-CM / CPT / HCPCS
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Claims audit rules evaluate diagnostic specificity against ICD-10-CM codes and procedural documentation against CPT/HCPCS guidelines. Below are active benchmark classifications monitored for documentation compliance.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-white text-xs">I21.09</span>
              <span className="text-[10px] bg-slate-800 text-cyan-300 font-semibold px-2 py-0.5 rounded">ICD-10-CM</span>
            </div>
            <p className="text-xs text-slate-300 mt-1">ST elevation (STEMI) myocardial infarction involving anterior wall</p>
            <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">Category: Circulatory System</div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-white text-xs">E11.9</span>
              <span className="text-[10px] bg-slate-800 text-cyan-300 font-semibold px-2 py-0.5 rounded">ICD-10-CM</span>
            </div>
            <p className="text-xs text-slate-300 mt-1">Type 2 diabetes mellitus without complications</p>
            <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">Category: Endocrine & Metabolic</div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-white text-xs">93458</span>
              <span className="text-[10px] bg-slate-800 text-cyan-300 font-semibold px-2 py-0.5 rounded">CPT</span>
            </div>
            <p className="text-xs text-slate-300 mt-1">Left heart catheterization with coronary angiography</p>
            <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">Category: Invasive Cardiology</div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-white text-xs">99223</span>
              <span className="text-[10px] bg-slate-800 text-cyan-300 font-semibold px-2 py-0.5 rounded">CPT</span>
            </div>
            <p className="text-xs text-slate-300 mt-1">Initial hospital care, high severity decision making</p>
            <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">Category: Evaluation & Management</div>
          </div>
        </div>
      </div>
    </div>
  );
};
