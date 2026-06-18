import { memo, useState, useEffect } from 'react';
import { X, MessageSquare, Zap, TrendingUp, DollarSign, Timer } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useSettings } from '../context/SettingsContext';

interface ChatStatsModalProps {
  onClose: () => void;
}

// NVIDIA Llama pricing rough estimate (per 1M tokens)
const COST_PER_MILLION_INPUT = 0.15;  // $0.15/M input (as of 2024)
const COST_PER_MILLION_OUTPUT = 0.60;  // $0.60/M output

export const ChatStatsModal = memo(function ChatStatsModal({ onClose }: ChatStatsModalProps) {
  const { chats, activeChatId } = useChat();
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';

  const activeChat = chats.find(c => c.id === activeChatId);

  // Live session timer (ticks every second while modal is open)
  const [sessionSeconds, setSessionSeconds] = useState(0);
  useEffect(() => {
    if (!activeChat?.createdAt) return;
    // Initialize elapsed time since chat was created
    const initial = Math.floor((Date.now() - new Date(activeChat.createdAt).getTime()) / 1000);
    setSessionSeconds(initial < 0 ? 0 : initial);
    const id = setInterval(() => {
      setSessionSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [activeChat?.id, activeChat?.createdAt]);

  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
    if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
    return `${s}s`;
  };

  // All-time stats
  const allTimeTokens = chats.reduce((sum, c) => sum + (c.totalTokens || 0), 0);
  const allTimeUserMessages = chats.reduce((sum, c) => sum + c.messages.filter(m => m.role === 'user').length, 0);
  const allTimeAssistantMessages = chats.reduce((sum, c) => sum + c.messages.filter(m => m.role === 'assistant').length, 0);

  // Active chat stats
  const chatTokens = activeChat?.totalTokens || 0;
  const chatMessages = activeChat?.messages.length || 0;
  const chatUserMessages = activeChat?.messages.filter(m => m.role === 'user').length || 0;
  const chatAssistantMessages = activeChat?.messages.filter(m => m.role === 'assistant').length || 0;

  // Rough cost: assume 40% input, 60% output split
  const estimateCost = (tokens: number) => {
    const inputTokens = Math.round(tokens * 0.4);
    const outputTokens = Math.round(tokens * 0.6);
    const cost = (inputTokens / 1_000_000) * COST_PER_MILLION_INPUT +
                 (outputTokens / 1_000_000) * COST_PER_MILLION_OUTPUT;
    return cost;
  };

  const formatTokens = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  };

  const StatCard = ({ icon: Icon, label, value, sub, accent }: {
    icon: React.ElementType;
    label: string;
    value: string;
    sub?: string;
    accent: string;
  }) => (
    <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-gray-100'}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
        <Icon className={`w-4 h-4 ${accent}`} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className={`text-[10px] font-medium uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {label}
        </p>
        <p className={`text-base font-bold mt-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {value}
          {sub && <span className={`text-xs font-normal ml-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{sub}</span>}
        </p>
      </div>
    </div>
  );

  const allTimeCost = estimateCost(allTimeTokens);
  const chatCost = estimateCost(chatTokens);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Chat Statistics"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl ${
          isDark ? 'bg-gray-900/95 border border-gray-700/50' : 'bg-white border border-gray-200'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-gray-700/50' : 'border-gray-200'}`}>
          <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Chat Statistics
          </h2>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Active chat section */}
          {activeChat && (
            <>
              <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Current Chat
              </p>
              <div className="grid grid-cols-2 gap-2">
                <StatCard
                  icon={Timer}
                  label="Session Time"
                  value={formatDuration(sessionSeconds)}
                  accent="text-pink-400"
                />
                <StatCard
                  icon={Zap}
                  label="Tokens Used"
                  value={formatTokens(chatTokens)}
                  sub="tok"
                  accent="text-indigo-400"
                />
                <StatCard
                  icon={DollarSign}
                  label="Est. Cost"
                  value={chatCost < 0.01 ? '<$0.01' : `$${chatCost.toFixed(4)}`}
                  accent="text-green-400"
                />
                <StatCard
                  icon={MessageSquare}
                  label="Messages"
                  value={`${chatMessages}`}
                  sub={`${chatUserMessages} you · ${chatAssistantMessages} AI`}
                  accent="text-amber-400"
                />
              </div>
            </>
          )}

          {/* All-time section */}
          <p className={`text-xs font-semibold uppercase tracking-widest mt-4 mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            All-Time Totals
          </p>
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              icon={Zap}
              label="Tokens Used"
              value={formatTokens(allTimeTokens)}
              sub="tok"
              accent="text-indigo-400"
            />
            <StatCard
              icon={DollarSign}
              label="Est. Cost"
              value={allTimeCost < 0.01 ? '<$0.01' : `$${allTimeCost.toFixed(4)}`}
              accent="text-green-400"
            />
            <StatCard
              icon={MessageSquare}
              label="Chats"
              value={`${chats.length}`}
              sub={`${allTimeUserMessages} you · ${allTimeAssistantMessages} AI`}
              accent="text-amber-400"
            />
            <StatCard
              icon={TrendingUp}
              label="Avg per Chat"
              value={chats.length > 0 ? formatTokens(Math.round(allTimeTokens / chats.length)) : '0'}
              sub="tok/chat"
              accent="text-cyan-400"
            />
          </div>

          {/* Pricing note */}
          <p className={`text-[10px] text-center mt-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            Cost estimates based on NVIDIA Llama pricing. Actual costs may vary.
          </p>
        </div>
      </div>
    </div>
  );
});