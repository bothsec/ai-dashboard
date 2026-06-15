import { memo, useMemo } from 'react';
import { useChat } from '../context/ChatContext';
import { useSettings } from '../context/SettingsContext';
import { Zap, Hash, Clock } from 'lucide-react';

export const StreamingHUD = memo(function StreamingHUD() {
  const { isStreaming, streamingContent, tokensPerSecond, chats, activeChatId } = useChat();
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';

  const activeChat = useMemo(
    () => chats.find(c => c.id === activeChatId),
    [chats, activeChatId]
  );

  if (!isStreaming) return null;

  // Approximate token counts (chars / 4 is the standard LLM approximation)
  const currentTokens = Math.round(streamingContent.length / 4);
  const totalTokens = activeChat?.totalTokens ?? 0;

  return (
    <div
      className={`flex items-center gap-3 px-2 py-1 rounded-lg text-[10px] md:text-[11px] font-mono select-none mb-1 ${
        isDark ? 'text-indigo-400 bg-indigo-500/10' : 'text-indigo-600 bg-indigo-50'
      }`}
      role="status"
      aria-label="Streaming statistics"
    >
      {/* Speed indicator */}
      <span className="flex items-center gap-1">
        <Zap className="w-3 h-3" aria-hidden="true" />
        <span>
          {tokensPerSecond > 0 ? `${tokensPerSecond.toFixed(1)} tok/s` : '…'}
        </span>
      </span>

      {/* Divider */}
      <span className={isDark ? 'text-indigo-500/50' : 'text-indigo-300'} aria-hidden="true">·</span>

      {/* Current response tokens */}
      <span className="flex items-center gap-1">
        <Hash className="w-3 h-3" aria-hidden="true" />
        <span>
          {currentTokens.toLocaleString()} tok
        </span>
      </span>

      {/* Divider */}
      <span className={isDark ? 'text-indigo-500/50' : 'text-indigo-300'} aria-hidden="true">·</span>

      {/* Total chat tokens */}
      <span className="flex items-center gap-1">
        <Clock className="w-3 h-3" aria-hidden="true" />
        <span>
          {totalTokens.toLocaleString()} total
        </span>
      </span>
    </div>
  );
});