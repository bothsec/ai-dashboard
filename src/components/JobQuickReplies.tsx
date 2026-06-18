import { memo, useState } from 'react';
import { X } from 'lucide-react';
import { QUICK_REPLIES, SCENARIOS } from '../data/jobQuickReplies';

interface Props {
  onClose: () => void;
  onInsert: (text: string) => void;
  isDark?: boolean;
}

const SCENARIO_LABELS: Record<string, string> = {
  greeting: '👋 Greeting',
  application: '📝 Apply',
  followup: '📞 Follow Up',
  salary: '💰 Salary',
  accept: '✅ Accept',
  decline: '❌ Decline',
  thanks: '🙏 Thanks',
};

export const JobQuickReplies = memo(function JobQuickReplies({ onClose, onInsert, isDark }: Props) {
  const [activeScenario, setActiveScenario] = useState<string>('greeting');

  const filtered = QUICK_REPLIES.filter(r => r.scenario === activeScenario);

  return (
    <div
      className={`absolute bottom-full mb-2 right-0 w-80 z-50 rounded-xl border shadow-2xl overflow-hidden ${
        isDark ? 'bg-z-900 border-z-700' : 'bg-white border-gray-200'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${isDark ? 'border-z-700 bg-z-800' : 'border-gray-100 bg-gray-50'}`}>
        <span className={`text-xs font-semibold ${isDark ? 'text-z-200' : 'text-gray-700'}`}>
          Khmer Job Quick Replies
        </span>
        <button
          onClick={onClose}
          className={`p-0.5 rounded ${isDark ? 'hover:bg-z-700 text-z-400' : 'hover:bg-gray-200 text-gray-500'}`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scenario tabs */}
      <div className={`flex gap-1 px-2 py-1.5 overflow-x-auto text-[10px] ${isDark ? 'bg-z-800/50' : 'bg-gray-50'}`}>
        {SCENARIOS.map(s => (
          <button
            key={s}
            onClick={() => setActiveScenario(s)}
            className={`px-1.5 py-0.5 rounded whitespace-nowrap transition-colors ${
              activeScenario === s
                ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                : isDark ? 'text-z-400 hover:text-z-200 hover:bg-z-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
            }`}
          >
            {SCENARIO_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Reply buttons */}
      <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
        {filtered.map(reply => (
          <button
            key={reply.id}
            onClick={() => { onInsert(reply.kh); onClose(); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all hover:scale-[1.01] active:scale-[0.99] ${
              isDark
                ? 'bg-z-800 hover:bg-z-700 border border-z-700 hover:border-blue-500/50 text-z-200'
                : 'bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-300 text-gray-700'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className={`font-medium text-[11px] shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                {reply.label}
              </span>
              <span className={`font-hanuman text-right leading-relaxed ${isDark ? 'text-z-300' : 'text-gray-600'}`}>
                {reply.kh}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Footer tip */}
      <div className={`px-3 py-1.5 text-[10px] ${isDark ? 'text-z-600 bg-z-800/50 border-t border-z-700' : 'text-gray-400 bg-gray-50 border-t border-gray-100'}`}>
        Tap to insert — edit before sending
      </div>
    </div>
  );
});