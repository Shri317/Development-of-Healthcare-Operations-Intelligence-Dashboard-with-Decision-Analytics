import React, { useState } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  TrendingDown, 
  AlertTriangle, 
  UserX, 
  FileSpreadsheet, 
  Bed, 
  FileText, 
  ArrowRight, 
  CheckCircle2, 
  BarChart2 
} from 'lucide-react';
import type { AICopilotMessage } from '../../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';
import { queryAICopilot } from '../../services/apiService';

interface AICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFacility?: string;
  onExecuteAction?: (actionId: string, payload?: any) => void;
}

const samplePrompts = [
  {
    icon: TrendingDown,
    label: "What is driving claim denials?",
    query: "What is driving claim denials and what is the denial rate?"
  },
  {
    icon: AlertTriangle,
    label: "Give me an operational summary",
    query: "Give me an operational summary."
  },
  {
    icon: UserX,
    label: "How many medicines need reorder?",
    query: "How many medicines are below reorder level?"
  },
  {
    icon: FileSpreadsheet,
    label: "What is the average ED wait time?",
    query: "What is the average emergency department waiting time?"
  },
  {
    icon: Bed,
    label: "Which suppliers are high risk?",
    query: "How many high-risk suppliers are there?"
  },
  {
    icon: FileText,
    label: "What is total net revenue?",
    query: "What is the total net revenue and gross billed revenue?"
  }
];

export const AICopilotDrawer: React.FC<AICopilotDrawerProps> = ({
  isOpen,
  onClose,
  selectedFacility = 'all',
  onExecuteAction
}) => {
  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<AICopilotMessage[]>([
    {
      id: 'msg-1',
      sender: 'ai',
      text: 'Hello Executive team! I am your **Medical Operations Copilot** powered by Google Gemini and connected directly to verified core datasets (99,485 records). Ask me about real admissions, revenue realization, claim denials, ER waiting times, or pharmacy inventory.',
      timestamp: 'Just now',
      data_source: 'MedOps Intelligence Core',
      domain: 'Executive Operations Command',
      bedrock_used: false,
      ai_used: true,
      ai_provider: 'Google Gemini',
      model: 'gemini-3.1-flash-lite',
      is_fallback: false,
      ai_status: 'Google Gemini: Active (gemini-3.1-flash-lite)'
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim()) return;

    // Add User Message
    const userMsg: AICopilotMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputQuery('');
    setIsTyping(true);

    try {
      const copilotRes = await queryAICopilot(query, selectedFacility);
      const aiResponse: AICopilotMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: copilotRes.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        data_source: copilotRes.data_source,
        domain: copilotRes.domain,
        evidence: copilotRes.evidence,
        method: copilotRes.method,
        bedrock_used: copilotRes.bedrock_used,
        ai_used: copilotRes.ai_used,
        ai_provider: copilotRes.ai_provider,
        model: copilotRes.model,
        is_fallback: copilotRes.is_fallback,
        ai_explanation: copilotRes.ai_explanation,
        ai_status: copilotRes.ai_status
      };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (err: any) {
      console.error('Copilot Query Error:', err);
      const errResponse: AICopilotMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: `Error connecting to AI Copilot backend: ${err.message || 'Server error'}. Please ensure the backend is running.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="medops-drawer-card fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-[#2D2D2D] border-l border-[#4B4B4B] shadow-2xl flex flex-col transition-all text-[#F9FAFB]">
      {/* Header */}
      <div className="p-4 border-b border-[#4B4B4B] bg-[#1E1E1E] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#22D3EE]/15 border border-[#22D3EE]/30 flex items-center justify-center text-[#22D3EE]">
            <Bot className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#F9FAFB] flex items-center gap-2">
              Medical Ops AI Copilot
              <span className="px-2 py-0.5 text-[10px] bg-[#22D3EE]/15 text-[#22D3EE] border border-[#22D3EE]/30 rounded font-mono font-bold">
                Google Gemini AI
              </span>
            </h2>
            <p className="text-[11px] text-[#9CA3AF]">Verified Hospital Analytics & Data Reasoning</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#9CA3AF] hover:bg-[#383838] hover:text-[#F9FAFB] transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Suggested Quick Prompts Grid */}
      <div className="p-3 border-b border-[#4B4B4B] bg-[#252525]">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-[#9CA3AF] block mb-2">
          Recommended Management Queries
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {samplePrompts.map((sp, idx) => {
            const Icon = sp.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSend(sp.query)}
                className="flex items-start gap-2 p-2 rounded-lg bg-[#333333] hover:bg-[#383838] border border-[#4B4B4B] hover:border-[#22D3EE]/50 text-[11px] text-[#D1D5DB] hover:text-[#F9FAFB] text-left transition group"
              >
                <Icon className="w-3.5 h-3.5 text-[#22D3EE] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <span className="line-clamp-2">{sp.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#252525]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[90%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-[#22D3EE] text-[#1E1E1E] font-medium rounded-br-none shadow-md'
                  : 'bg-[#333333] text-[#D1D5DB] border border-[#4B4B4B] rounded-bl-none shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5 border-b border-white/10 pb-1">
                <span className="font-semibold text-[11px] flex items-center gap-1">
                  {msg.sender === 'ai' ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-[#22D3EE]" /> Medical AI Agent
                    </>
                  ) : (
                    'Executive Manager'
                  )}
                </span>
                <span className={`text-[10px] ${msg.sender === 'user' ? 'text-[#1E1E1E]/80' : 'text-[#9CA3AF]'}`}>{msg.timestamp}</span>
              </div>

              {/* Message Markdown rendering simulation */}
              <div className="whitespace-pre-line font-sans">
                {msg.text}
              </div>

              {/* Evidence Section */}
              {msg.evidence && msg.evidence.length > 0 && (
                <div className="mt-2.5 p-2 bg-[#2D2D2D] border border-[#4B4B4B] rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold text-[#F9FAFB] uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[#34D399]" /> Key Evidence
                  </span>
                  <div className="grid grid-cols-1 gap-1">
                    {msg.evidence.slice(0, 3).map((ev, i) => (
                      <div key={i} className="flex justify-between text-[10px]">
                        <span className="text-[#9CA3AF]">{ev.metric}:</span>
                        <span className="font-bold text-[#F9FAFB] font-mono">{ev.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Footer */}
              {msg.sender === 'ai' && (msg.data_source || msg.domain) && (
                <div className="mt-2 pt-1.5 border-t border-[#4B4B4B] flex items-center justify-between text-[9px] font-mono text-[#9CA3AF]">
                  <span>Source: <strong className="text-[#F9FAFB]">{msg.data_source || 'Local Fallback'}</strong></span>
                  <span className={!msg.is_fallback && msg.ai_used ? "text-[#22D3EE] font-bold" : "text-[#FBBF24] font-semibold"}>
                    {!msg.is_fallback && msg.ai_used
                      ? `${msg.ai_provider || 'Google Gemini'} (${msg.model || 'Live'})`
                      : msg.bedrock_used
                      ? 'Amazon Bedrock AI'
                      : 'Deterministic Mode'}
                  </span>
                </div>
              )}

              {/* Embedded Interactive Chart Response */}
              {msg.chartData && (
                <div className="mt-3 p-2 bg-[#2D2D2D] rounded-xl border border-[#4B4B4B]">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-[10px] font-semibold text-[#22D3EE] flex items-center gap-1">
                      <BarChart2 className="w-3 h-3" /> Data Breakdown
                    </span>
                  </div>
                  <div className="h-36 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {msg.chartType === 'line' ? (
                        <LineChart data={msg.chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#4B4B4B" />
                          <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} />
                          <YAxis stroke="#9CA3AF" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: '#2D2D2D', borderColor: '#4B4B4B', color: '#F9FAFB', fontSize: '11px' }} />
                          <Line type="monotone" dataKey={msg.chartData[0]?.wait ? 'wait' : 'beds'} stroke="#22D3EE" strokeWidth={2} />
                        </LineChart>
                      ) : (
                        <BarChart data={msg.chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#4B4B4B" />
                          <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} />
                          <YAxis stroke="#9CA3AF" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: '#2D2D2D', borderColor: '#4B4B4B', color: '#F9FAFB', fontSize: '11px' }} />
                          <Bar dataKey="actual" fill="#22D3EE" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Recommended Execution Action Buttons */}
              {msg.recommendedActions && (
                <div className="mt-3 pt-2 border-t border-[#4B4B4B] space-y-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#22D3EE] block">
                    Recommended Automated Actions:
                  </span>
                  {msg.recommendedActions.map((act, i) => (
                    <button
                      key={i}
                      onClick={() => onExecuteAction && onExecuteAction(act.actionId, { label: act.label })}
                      className="w-full flex items-center justify-between p-2 rounded-lg bg-[#22D3EE]/15 hover:bg-[#22D3EE]/25 text-[#22D3EE] border border-[#22D3EE]/40 text-[11px] transition font-medium"
                    >
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#22D3EE]" />
                        {act.label}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#22D3EE]" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 p-3 bg-[#333333] border border-[#4B4B4B] shadow-sm rounded-xl text-xs text-[#D1D5DB] w-fit">
            <Sparkles className="w-4 h-4 text-[#22D3EE] animate-spin" />
            Analyzing enterprise data models & predicting root cause...
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-[#4B4B4B] bg-[#1E1E1E]">
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
            placeholder="Ask AI Copilot (e.g., 'What caused revenue to drop?')..."
            className="flex-1 bg-[#2D2D2D] border border-[#4B4B4B] focus:border-[#22D3EE] rounded-xl px-3.5 py-2 text-xs text-[#F9FAFB] placeholder-[#9CA3AF] outline-none transition"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim()}
            className="p-2 rounded-xl bg-[#22D3EE] hover:bg-[#06B6D4] disabled:opacity-50 text-[#1E1E1E] font-semibold transition shadow-sm cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
