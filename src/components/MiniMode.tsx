import { memo, useState, useRef, useCallback, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { useSettings } from '../context/SettingsContext';
import { ChatInput } from './ChatInput';
import { MessageSquare, X, Minimize2, Bot, User } from 'lucide-react';

const MINI_MODE_KEY = 'mini_mode_state';

interface MiniModeState {
  collapsed: boolean;
  unread: number;
}

export const MiniMode = memo(function MiniMode({ onExit }: { onExit: () => void }) {
  const { chats, activeChatId } = useChat();
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';

  const [state, setState] = useState<MiniModeState>(() => {
    try {
      const s = localStorage.getItem(MINI_MODE_KEY);
      return s ? JSON.parse(s) : { collapsed: false, unread: 0 };
    } catch { return { collapsed: false, unread: 0 }; }
  });

  const containerRef = useRef<HTMLDivElement>(null);

  const activeChat = chats.find(c => c.id === activeChatId);

  // Persist state
  useEffect(() => {
    try { localStorage.setItem(MINI_MODE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  // Reset unread when expanded
  const handleExpand = useCallback(() => {
    setState(prev => ({ ...prev, collapsed: false, unread: 0 }));
  }, []);

  if (state.collapsed) {
    return (
      <div
        ref={containerRef}
        className={`fixed z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl cursor-pointer select-none transition-transform hover:scale-105 ${
          isDark
            ? 'bg-gray-800/95 border border-gray-700/50 text-white'
            : 'bg-white/95 border border-gray-200 shadow-gray-900/20 text-gray-900'
        }`}
        style={{ bottom: 24, right: 24 }}
        onClick={handleExpand}
        role="button"
        aria-label="Expand chat"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && handleExpand()}
      >
        <MessageSquare className="w-5 h-5 text-indigo-400" aria-hidden="true" />
        <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
          {activeChat?.title || 'New chat'}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onExit(); }}
          className={`ml-1 p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          aria-label="Exit mini mode"
          title="Exit mini mode (Ctrl+M)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`fixed z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden ${
        isDark
          ? 'bg-gray-900/95 border border-gray-700/50'
          : 'bg-white/95 border border-gray-200 shadow-gray-900/20'
      }`}
      style={{ bottom: 24, right: 24, width: 340, maxHeight: 500 }}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${isDark ? 'border-gray-700/50' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-4 h-4 text-indigo-400 shrink-0" aria-hidden="true" />
          <span className={`text-sm font-semibold truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            {activeChat?.title || 'Chat'}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setState(prev => ({ ...prev, collapsed: true }))}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
            aria-label="Collapse to bubble"
            title="Collapse to bubble (Ctrl+M)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onExit}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
            aria-label="Exit mini mode"
            title="Exit mini mode (Ctrl+M)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto p-3 space-y-3 min-h-0 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {activeChat?.messages.slice(-6).map(msg => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user'
                ? 'bg-indigo-600 text-white'
                : isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
            }`}>
              {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
              msg.role === 'user'
                ? 'bg-indigo-600 text-white rounded-tr-sm'
                : isDark
                  ? 'bg-gray-800 text-gray-200 rounded-tl-sm'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm shadow-sm'
            }`}>
              {msg.content.length > 120 ? msg.content.slice(0, 120) + '…' : msg.content || '(thinking…)'}
            </div>
          </div>
        ))}
        {(!activeChat || activeChat.messages.length === 0) && (
          <div className={`text-center py-6 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            No messages yet
          </div>
        )}
      </div>

      {/* Input */}
      <div className={`shrink-0 ${isDark ? 'bg-gray-900 border-t border-gray-700/50' : 'bg-white border-t border-gray-200'}`}>
        <ChatInput />
      </div>
    </div>
  );
});