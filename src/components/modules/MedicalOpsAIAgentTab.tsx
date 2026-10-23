import React, { useState } from 'react';
import { 
  Bot, 
  Sparkles, 
  Send, 
  Trash2, 
  Database, 
  Activity, 
  Clock, 
  TrendingDown, 
  AlertTriangle, 
  FileSpreadsheet, 
  DollarSign, 
  Package, 
  Truck, 
  ShieldAlert, 
  CheckCircle2, 
  Info,
  Layers,
  Building2,
  Cpu,
  RefreshCw
} from 'lucide-react';
import { queryAICopilot, type CopilotResponse } from '../../services/apiService';
import type { AICopilotMessage } from '../../types';

interface MedicalOpsAIAgentTabProps {
  selectedFacility?: string;
  selectedTimeframe?: string;
  onExecuteAction?: (actionId: string, payload?: any) => void;
}

const FACILITY_NAMES: Record<string, string> = {
  all: 'All Network Facilities',
  FAC001: 'Hyderabad Central Hospital (FAC001)',
  FAC002: 'Hyderabad West Clinic (FAC002)',
  FAC003: 'Secunderabad Medical Center (FAC003)',
  FAC004: 'Bengaluru Care Hospital (FAC004)',
  FAC005: 'Chennai Health Center (FAC005)'
};

const SUGGESTED_QUERIES = [
  {
    icon: Activity,
    label: "Give me today's operational summary",
    query: "Give me an operational summary."
  },
  {
    icon: TrendingDown,
    label: "What is driving claim denials?",
    query: "What is driving claim denials and what is the denial rate?"
  },
  {
    icon: Package,
    label: "How many medicines need reorder?",
    query: "How many medicines are below reorder level?"
  },
  {
    icon: Truck,
    label: "Which suppliers are high risk?",
    query: "How many high-risk suppliers are there and what is total PO value?"
  },
  {
    icon: Clock,
    label: "What is the average ED wait time?",
    query: "What is the average emergency department waiting time?"
  },
  {
    icon: DollarSign,
    label: "Summarize hospital financial performance",
    query: "What is the total net revenue, gross billed revenue, and outstanding AR?"
  },
  {
    icon: AlertTriangle,
    label: "Show me the main operational bottlenecks",
    query: "Show me the main operational bottlenecks and 7-day encounter forecast"
  },
  {
    icon: ShieldAlert,
    label: "How many quality incidents require review?",
    query: "How many quality incidents exist and how many are critical?"
  }
];

export const MedicalOpsAIAgentTab: React.FC<MedicalOpsAIAgentTabProps> = ({ 
  selectedFacility = 'all',
  selectedTimeframe = 'realtime',
  onExecuteAction 
}) => {
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<AICopilotMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'ai',
      text: `Welcome to the Medical Operations Intelligence AI Agent Studio. I am powered by Google Gemini and connected directly to verified healthcare operations datasets (99,485 records across 41 tables). Ask me any question regarding patient admissions, bed occupancy, claim denial rates, emergency waiting times, physician workloads, pharmacy inventory, supplier performance, or quality compliance. All answers are grounded in verified core operational data.`,
      timestamp: 'Active Session',
      data_source: 'MedOps Intelligence Core',
      domain: 'Hospital Operations Command',
      evidence: [
        { metric: 'Network Bed Occupancy', value: '94.9%', detail: 'Verified aggregate inpatient capacity' },
        { metric: 'Claim Denial Rate', value: '9.78%', detail: '562 denied claims evaluated' },
        { metric: 'Total Admissions', value: '2,912 Patients', detail: 'Cumulative inpatient admissions' }
      ],
      method: 'Live dataset catalog loaded (99,485 records)',
      bedrock_used: false,
      ai_used: true,
      ai_provider: 'Google Gemini',
      model: 'gemini-3.1-flash-lite',
      is_fallback: false,
      ai_explanation: 'Google Gemini LLM connected and active',
      ai_status: 'Google Gemini: Active (gemini-3.1-flash-lite)'
    }
  ]);

  const facilityLabel = FACILITY_NAMES[selectedFacility] || `Facility ${selectedFacility}`;

  const handleSend = async (queryToSend?: string) => {
    const q = (queryToSend || inputQuery).trim();
    if (!q || isTyping) return;

    const userMsg: AICopilotMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryToSend) setInputQuery('');
    setIsTyping(true);

    try {
      const res: CopilotResponse = await queryAICopilot(q, selectedFacility);
      const aiMsg: AICopilotMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        data_source: res.data_source,
        domain: res.domain,
        evidence: res.evidence,
        method: res.method,
        bedrock_used: res.bedrock_used,
        ai_used: res.ai_used,
        ai_provider: res.ai_provider,
        model: res.model,
        is_fallback: res.is_fallback,
        ai_explanation: res.ai_explanation,
        ai_status: res.ai_status
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('Copilot query error:', err);
      const errMsg: AICopilotMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: `Error connecting to AI Copilot API: ${err.message || 'Unknown network error'}. Please ensure the backend is running at http://127.0.0.1:8000.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        data_source: 'System Error',
        domain: 'System Connection Error',
        method: 'FastAPI Backend connection failed',
        bedrock_used: false,
        ai_explanation: 'Deterministic fallback unavailable',
        ai_status: 'Error'
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: `Conversation history cleared. Ready for your operational questions on scope: ${facilityLabel}.`,
        timestamp: 'Just now',
        data_source: 'System Assistant',
        domain: 'Executive Operations Command',
        method: 'Ready for user query',
        bedrock_used: false,
        ai_explanation: 'Deterministic analytics mode',
        ai_status: 'Amazon Bedrock: Unavailable — AWS session expired'
      }
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-cyan-400" />
                Medical Operations AI Agent Studio
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-700">
                ● Operations Copilot
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Natural-language Q&A, root-cause diagnostics, and verifiable analytics across clinical, financial, and supply chain datasets.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-mono text-slate-300">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Scope: <strong className="text-white">{facilityLabel}</strong></span>
            </div>

            <button
              onClick={handleClearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Chat
            </button>
          </div>
        </div>

        {/* Honest System Status Badges */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2 text-[11px] font-mono">
          <span className="text-slate-500 font-semibold uppercase tracking-wider mr-1">System Status:</span>
          
          <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-400">
            Deterministic Analytics: AVAILABLE
          </span>

          <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-400">
            Local Dataset: AVAILABLE (99,485 rows)
          </span>

          <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-400">
            Amazon Athena: OFFLINE / SESSION EXPIRED
          </span>

          <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-400">
            Amazon Bedrock: CONFIGURED / SESSION EXPIRED
          </span>

          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
            External Automation: NOT CONNECTED
          </span>
        </div>
      </div>

      {/* Suggested Quick Operational Queries */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5 shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Suggested Operational Queries
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Click to evaluate live against {facilityLabel}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {SUGGESTED_QUERIES.map((sq, idx) => {
            const Icon = sq.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSend(sq.query)}
                disabled={isTyping}
                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-800/80 text-left transition group disabled:opacity-50"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 group-hover:border-cyan-500/50 transition">
                  <Icon className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-slate-300 group-hover:text-white block truncate">
                    {sq.label}
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                    {sq.query}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col h-[650px] overflow-hidden">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              {/* Message Box */}
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed space-y-3 ${
                  msg.sender === 'user'
                    ? 'bg-cyan-600 text-white rounded-br-none shadow-md'
                    : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none shadow-lg'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    {msg.sender === 'ai' ? (
                      <>
                        <Bot className="w-4 h-4 text-cyan-400" />
                        <span>Medical Operations AI Copilot</span>
                      </>
                    ) : (
                      <span>Hospital Operations Executive</span>
                    )}
                  </span>

                  <div className="flex items-center gap-2">
                    {msg.sender === 'ai' && msg.domain && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                        {msg.domain}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 font-mono">{msg.timestamp}</span>
                  </div>
                </div>

                {/* Direct Answer */}
                <div className="text-xs leading-relaxed whitespace-pre-line font-sans text-slate-100">
                  {msg.text}
                </div>

                {/* Evidence Section (if available) */}
                {msg.evidence && msg.evidence.length > 0 && (
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Verified Key Evidence:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {msg.evidence.map((ev, i) => (
                        <div key={i} className="p-2 bg-slate-950 rounded-lg border border-slate-850">
                          <span className="text-[10px] text-slate-400 block">{ev.metric}</span>
                          <span className="text-xs font-bold text-white font-mono">{ev.value}</span>
                          {ev.detail && (
                            <span className="text-[10px] text-slate-500 block font-mono mt-0.5">{ev.detail}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata Footer for AI responses */}
                {msg.sender === 'ai' && (
                  <div className="pt-2 border-t border-slate-800 text-[10px] font-mono space-y-1 text-slate-400">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span>Data Source: <strong className="text-slate-200">{msg.data_source || 'Local Fallback'}</strong></span>
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        !msg.is_fallback && msg.ai_used
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : msg.bedrock_used
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : 'bg-amber-950/70 text-amber-300 border border-amber-800/60'
                      }`}>
                        {!msg.is_fallback && msg.ai_used
                          ? `${msg.ai_provider || 'Google Gemini'} (${msg.model || 'Live'})`
                          : msg.bedrock_used
                          ? 'Amazon Bedrock AI'
                          : 'Deterministic Fallback Mode'}
                      </span>
                    </div>

                    {msg.method && (
                      <div className="text-slate-500 truncate">
                        Method: {msg.method}
                      </div>
                    )}

                    {msg.ai_status && (
                      <div className="text-[9px] text-slate-500">
                        Status: {msg.ai_status}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 w-fit">
              <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
              <span>Querying verified dataset tables & evaluating operational domain...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={isTyping}
              placeholder="Ask operational questions (e.g. 'What is the claim denial rate?', 'How many medicines need reorder?')..."
              className="flex-1 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 outline-none transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isTyping}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-cyan-950/50"
            >
              <Send className="w-4 h-4" />
              <span>Ask Agent</span>
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-500 font-mono px-1">
            <span>Scope: {facilityLabel} (All answers computed from verified core datasets)</span>
            <span>Hospital Operations & Administration Only — No Clinical Advice</span>
          </div>
        </div>
      </div>
    </div>
  );
};
