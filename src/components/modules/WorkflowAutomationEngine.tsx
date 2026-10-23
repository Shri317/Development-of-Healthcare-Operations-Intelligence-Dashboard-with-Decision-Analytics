import React, { useState, useEffect, useMemo } from 'react';
import { 
  Workflow, 
  Play, 
  Pause, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Zap,
  ArrowRight,
  Database,
  RefreshCw,
  Search,
  Filter,
  ShieldAlert,
  Info,
  ExternalLink,
  Layers,
  FileCode,
  FileCheck2
} from 'lucide-react';
import { 
  fetchWorkflowAutomation, 
  type WorkflowAutomationResponse,
  type WorkflowRuleRecord 
} from '../../services/apiService';

interface WorkflowAutomationEngineProps {
  selectedFacility?: string;
  selectedTimeframe?: string;
  onExecuteAction?: (actionId: string, payload?: any) => void;
}

export const WorkflowAutomationEngine: React.FC<WorkflowAutomationEngineProps> = ({ 
  selectedFacility = 'all',
  selectedTimeframe = 'realtime',
  onExecuteAction 
}) => {
  const [data, setData] = useState<WorkflowAutomationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTriggeredOnly, setFilterTriggeredOnly] = useState<boolean>(false);
  const [evaluatingRuleId, setEvaluatingRuleId] = useState<string | null>(null);
  const [selectedRule, setSelectedRule] = useState<WorkflowRuleRecord | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchWorkflowAutomation(selectedFacility, selectedTimeframe);
      setData(res);
    } catch (err: any) {
      console.error('Failed to load workflow automation data:', err);
      setError(err.message || 'Unable to connect to workflow automation service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedFacility, selectedTimeframe]);

  const handleEvaluateTrigger = async (rule: WorkflowRuleRecord) => {
    setEvaluatingRuleId(rule.id);
    setSelectedRule(rule);
    try {
      // Re-fetch latest evaluation
      const res = await fetchWorkflowAutomation(selectedFacility, selectedTimeframe);
      setData(res);
      const updated = res.rules.find(r => r.id === rule.id);
      if (updated) setSelectedRule(updated);
      onExecuteAction?.('workflow-rule-evaluated', { 
        ruleId: rule.id, 
        triggeredCount: rule.triggeredRecordCount 
      });
    } catch (e) {
      console.error('Failed to re-evaluate rule:', e);
    } finally {
      setEvaluatingRuleId(null);
    }
  };

  const filteredRules = useMemo(() => {
    if (!data?.rules) return [];
    return data.rules.filter((rule: WorkflowRuleRecord) => {
      const matchSearch = searchQuery === '' ||
        rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.sourceDataset.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.triggerCondition.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchTrigger = !filterTriggeredOnly || rule.isTriggered;
      return matchSearch && matchTrigger;
    });
  }, [data?.rules, searchQuery, filterTriggeredOnly]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Workflow className="w-5 h-5 text-cyan-400" /> Workflow Automation Engine & Trigger Evaluation
            </h2>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] font-medium text-slate-300">
              <Database className="w-3 h-3 text-cyan-400" />
              <span>Data Source: <strong className="text-cyan-300">{loading ? 'Connecting to Amazon Athena...' : (data?.source || 'Local Fallback')}</strong></span>
            </div>
            <div className="hidden sm:inline-flex px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-[10px] font-medium text-emerald-300">
              Deterministic Rules Engine
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Condition-driven operational triggers monitored across inventory, billing disputes, emergency triage, clinical safety, and patient flow.
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
            title="Re-evaluate all workflow triggers"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Re-evaluate All</span>
          </button>
        </div>
      </div>

      {/* Architecture Separation Notice */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-300">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-white">Workflow Logic Architecture Notice</div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            This module evaluates <strong>Condition Triggers</strong> against real dataset tables. External dispatch actions (such as sending live WhatsApp/SMS reminders, transmitting EDI purchase orders to suppliers, or hospital pager alerts) require enterprise outbound gateway integrations and are currently reported in detection mode.
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loading && !data && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white">Evaluating Workflow Conditions</h3>
          <p className="text-xs text-slate-400 mt-1">Scanning inventory thresholds, claim denials, acuity SLAs, and patient movements...</p>
        </div>
      )}

      {/* Error State */}
      {error && !data && (
        <div className="bg-rose-950/40 border border-rose-800 rounded-2xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-white">Workflow Engine Service Unavailable</h3>
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
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Active Rules Count */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Active Monitored Rules</span>
                <Workflow className="w-3.5 h-3.5 text-cyan-400" />
              </span>
              <div className="text-2xl font-bold text-white font-mono">
                {data.kpis.activeRulesCount} Rules
              </div>
              <p className="text-[10px] text-emerald-400 font-semibold">
                100% Deterministic Dataset Rules
              </p>
            </div>

            {/* Total Conditions Detected */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Conditions Detected</span>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              </span>
              <div className="text-2xl font-bold text-amber-400 font-mono">
                {data.kpis.totalConditionsDetectedFormatted}
              </div>
              <p className="text-[10px] text-slate-400">
                Calculated from real operational records
              </p>
            </div>

            {/* Actions Executed */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Actions Executed</span>
                <Send className="w-3.5 h-3.5 text-slate-500" />
              </span>
              <div className="text-sm font-bold text-slate-300 font-mono pt-1 pb-0.5">
                {data.kpis.actionsExecutedFormatted}
              </div>
              <p className="text-[10px] text-slate-500">
                Outbound gateways not connected
              </p>
            </div>

            {/* Manual Labor Hours Saved */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Labor Hours Saved</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] font-mono">Schema Metric</span>
              </span>
              <div className="text-sm font-bold text-amber-400 font-mono pt-1 pb-0.5">
                {data.kpis.manualHoursSavedFormatted}
              </div>
              <p className="text-[10px] text-slate-500">
                Requires execution log database
              </p>
            </div>
          </div>

          {/* Rules Search and Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search rule ID, condition, dataset..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-64"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filterTriggeredOnly}
                  onChange={(e) => setFilterTriggeredOnly(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0"
                />
                <span>Show Triggered Only</span>
              </label>

              <span className="text-xs text-slate-500 font-mono">
                Showing {filteredRules.length} of {data.rules.length} rules
              </span>
            </div>
          </div>

          {/* Active Rules List */}
          <div className="space-y-3">
            {filteredRules.map((rule) => (
              <div 
                key={rule.id} 
                className={`p-4 bg-slate-900 border rounded-xl space-y-3 transition ${
                  rule.isTriggered ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/60 opacity-80'
                }`}
              >
                {/* Rule Header Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{rule.name}</span>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/60">
                      {rule.id}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1">
                      <FileCode className="w-3 h-3 text-slate-500" />
                      {rule.sourceDataset}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Badge */}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      rule.isTriggered 
                        ? 'bg-amber-950/80 text-amber-400 border-amber-800' 
                        : 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                    }`}>
                      {rule.status} ({rule.triggeredRecordCount.toLocaleString()})
                    </span>

                    {/* Action Status Badge */}
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800 text-[10px] font-mono">
                      {rule.actionStatus}
                    </span>

                    {/* Evaluate Trigger Button */}
                    <button
                      onClick={() => handleEvaluateTrigger(rule)}
                      disabled={evaluatingRuleId === rule.id}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-[11px] font-medium rounded transition"
                      title="Re-evaluate condition on current dataset"
                    >
                      <RefreshCw className={`w-3 h-3 ${evaluatingRuleId === rule.id ? 'animate-spin' : ''}`} />
                      <span>Evaluate Trigger</span>
                    </button>
                  </div>
                </div>

                {/* Rule Visual Flow Logic (Trigger -> Condition -> Action) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs bg-slate-950 p-3 rounded-lg border border-slate-800/80 font-mono">
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-bold text-cyan-400 font-sans flex items-center gap-1">
                      <span>1. Trigger Event</span>
                    </div>
                    <div className="text-slate-200 text-[11px]">{rule.sourceDataset}</div>
                    <div className="text-[10px] text-slate-500 font-sans">Monitored: {rule.monitoredRecordCount.toLocaleString()} rows</div>
                  </div>

                  <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-800 md:pl-3 pt-2 md:pt-0">
                    <div className="text-[10px] uppercase font-bold text-amber-400 font-sans flex items-center gap-1">
                      <span>2. Detection Condition</span>
                    </div>
                    <div className="text-amber-300 text-[11px] break-all">{rule.triggerCondition}</div>
                    <div className="text-[10px] text-slate-400 font-sans">
                      Matched: <strong className="text-white">{rule.triggeredRecordCount.toLocaleString()}</strong> records
                    </div>
                  </div>

                  <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-800 md:pl-3 pt-2 md:pt-0">
                    <div className="text-[10px] uppercase font-bold text-emerald-400 font-sans flex items-center gap-1">
                      <span>3. Operational Action</span>
                    </div>
                    <div className="text-slate-200 text-[11px] font-sans truncate">{rule.actionDescription}</div>
                    <div className="text-[10px] text-slate-500 font-sans">Channel: {rule.channel}</div>
                  </div>
                </div>

                {/* Summary bar */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-0.5">
                  <span className="text-slate-300">{rule.summary}</span>
                  <span className="font-mono text-[10px] text-slate-500">
                    Condition Ratio: {rule.monitoredRecordCount > 0 ? ((rule.triggeredRecordCount / rule.monitoredRecordCount) * 100).toFixed(1) : 0}% of monitored records
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Trigger Details Inspector Modal */}
          {selectedRule && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Workflow className="w-5 h-5 text-cyan-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">{selectedRule.name}</h3>
                      <span className="text-[10px] font-mono text-slate-400">{selectedRule.id} · {selectedRule.sourceDataset}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedRule(null)}
                    className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Trigger Condition Formula</div>
                    <div className="font-mono text-amber-400 bg-slate-900 p-2 rounded border border-slate-800">
                      {selectedRule.triggerCondition}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Monitored Records</div>
                      <div className="text-lg font-bold text-white font-mono mt-1">
                        {selectedRule.monitoredRecordCount.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Triggered Count</div>
                      <div className="text-lg font-bold text-amber-400 font-mono mt-1">
                        {selectedRule.triggeredRecordCount.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Action Execution Status</div>
                    <div className="text-xs font-semibold text-slate-200">{selectedRule.actionDescription}</div>
                    <div className="text-[11px] text-amber-400 mt-1 font-mono">
                      Status: {selectedRule.actionStatus}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Outbound action requires live integration gateway credentials. Currently in continuous passive monitoring mode.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setSelectedRule(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
                  >
                    Close Inspector
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
