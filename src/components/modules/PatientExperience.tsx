import React, { useState, useEffect } from 'react';
import { 
  HeartHandshake, 
  Smile, 
  Frown, 
  MessageSquare, 
  Sparkles, 
  TrendingUp, 
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Database,
  ThumbsUp,
  Clock,
  Smartphone
} from 'lucide-react';
import { fetchPatientExperienceIntelligence, type PatientExperienceResponse } from '../../services/apiService';

interface PatientExperienceProps {
  selectedFacility?: string;
  selectedTimeframe?: string;
  onExecuteAction: (actionId: string, payload?: any) => void;
}

export const PatientExperience: React.FC<PatientExperienceProps> = ({ 
  selectedFacility = 'all',
  selectedTimeframe = 'realtime',
  onExecuteAction 
}) => {
  const [data, setData] = useState<PatientExperienceResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchPatientExperienceIntelligence(selectedFacility, selectedTimeframe)
      .then((res) => {
        if (!isMounted) return;
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to fetch patient experience intelligence:', err);
        setError(err.message || 'Failed to fetch patient experience data from backend');
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
        <p className="text-sm font-medium text-slate-300">Loading patient experience analytics from Amazon Athena...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-rose-950/40 border border-rose-800/60 rounded-2xl text-rose-300 text-center min-h-[300px]">
        <AlertTriangle className="w-10 h-10 text-rose-400 mb-2" />
        <h3 className="text-base font-bold text-white mb-1">Patient Experience API Error</h3>
        <p className="text-xs text-rose-200 max-w-md">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const posSentiment = data.sentimentBreakdown.find((s) => s.sentiment === 'Positive');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-cyan-400" /> Patient Experience & NPS Analytics
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono font-bold rounded-full">
              {data.dataSource || 'Local Fallback'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real dataset feedback ratings, authentic Net Promoter Score (NPS), CSAT, and complaint resolution tracking
          </p>
        </div>
      </div>

      {/* NPS / CSAT Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Net Promoter Score (NPS)</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {data.totalFeedback === 0 || data.npsScore == null
              ? 'N/A'
              : data.npsScore > 0 ? `+${data.npsScore}` : `${data.npsScore}`}
          </div>
          <p className="text-[10px] text-slate-400">
            {data.totalFeedback === 0 ? 'No feedback in period' : 'Promoters (9-10) vs Detractors (0-6)'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">CSAT Overall Satisfaction</span>
          <div className="text-2xl font-bold text-white font-mono">
            {data.totalFeedback === 0 || data.csatScore == null ? 'N/A' : `${data.csatScore} / 5.0`}
          </div>
          <p className="text-[10px] text-cyan-300">
            {data.totalFeedback === 0 || data.overallRating == null
              ? 'No feedback in period'
              : `Mean overall rating: ${data.overallRating} / 5.0`}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Positive Sentiment</span>
          <div className="text-2xl font-bold text-cyan-400 font-mono">
            {data.totalFeedback === 0 ? 'N/A' : `${posSentiment?.percentage || 0}%`}
          </div>
          <p className="text-[10px] text-cyan-300">
            {data.totalFeedback === 0 ? 'No survey responses' : `${posSentiment?.count?.toLocaleString() || 0} Positive Ratings`}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Mean Complaint Resolution</span>
          <div className="text-2xl font-bold text-amber-400 font-mono">{data.complaints.meanResolutionHours} Hours</div>
          <p className="text-[10px] text-slate-400">{data.complaints.resolved.toLocaleString()} of {data.complaints.total.toLocaleString()} resolved</p>
        </div>
      </div>

      {/* Sentiment & Feedback Channels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sentiment Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white">Feedback Sentiment Distribution</h3>
          <div className="space-y-2">
            {data.sentimentBreakdown.length > 0 ? (
              data.sentimentBreakdown.map((s, idx) => {
                const color = s.sentiment === 'Positive' ? 'text-emerald-400' : s.sentiment === 'Neutral' ? 'text-amber-400' : 'text-rose-400';
                return (
                  <div key={idx} className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs">
                    <span className={`font-semibold ${color}`}>{s.sentiment}</span>
                    <div className="text-right">
                      <span className="font-mono font-bold text-white mr-2">{s.count.toLocaleString()}</span>
                      <span className="text-slate-500 font-mono">({s.percentage}%)</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-500">No sentiment data recorded in period</p>
            )}
          </div>
        </div>

        {/* Feedback Channels */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white">Feedback Ingestion Channels</h3>
          <div className="space-y-2">
            {data.feedbackChannelBreakdown.length > 0 ? (
              data.feedbackChannelBreakdown.map((c, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs">
                  <span className="text-slate-300 font-medium">{c.channel}</span>
                  <span className="font-mono font-bold text-cyan-400">{c.count.toLocaleString()} submissions</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">No channel submissions in period</p>
            )}
          </div>
        </div>
      </div>

      {/* Patient Complaints Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Complaint Categories & Status (patient_complaints.csv)</h3>
          <span className="text-xs text-slate-400 font-mono">
            Open: <strong className="text-rose-400">{data.complaints.open}</strong> | In Progress: <strong className="text-amber-400">{data.complaints.inProgress}</strong> | Resolved: <strong className="text-emerald-400">{data.complaints.resolved}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {data.complaints.categories.map((c, idx) => (
            <div key={idx} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1 text-center">
              <span className="text-[11px] text-slate-400 block truncate" title={c.category}>{c.category}</span>
              <span className="text-lg font-mono font-bold text-amber-400">{c.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Real Patient Feedback Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white">Recent Feedback Submissions (patient_feedback.csv)</h3>

        <div className="space-y-3">
          {data.recentFeedback.map((rev) => (
            <div key={rev.feedbackId} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-white">
                  <span>{rev.patientName}</span>
                  <span className="text-amber-400 font-mono">{'★'.repeat(rev.rating)}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  rev.sentiment === 'Positive' 
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                    : rev.sentiment === 'Neutral' 
                    ? 'bg-amber-950 text-amber-400 border border-amber-800' 
                    : 'bg-rose-950 text-rose-400 border border-rose-800'
                }`}>
                  Sentiment: {rev.sentiment}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                <span>Facility: {rev.facilityId} | Dept: {rev.departmentId} | Channel: {rev.channel}</span>
                <span className="font-mono">{rev.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
