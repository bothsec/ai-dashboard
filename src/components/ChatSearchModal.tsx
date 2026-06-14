import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { Search, MessageSquare, ArrowRight } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import type { Message } from '../types/chat';

interface SearchResult {
  chatId: string;
  chatTitle: string;
  message: Message;
  matchStart: number;
  matchEnd: number;
}

interface ChatSearchModalProps {
  onClose: () => void;
  onSelectMessage: (chatId: string, messageId: string) => void;
}

export const ChatSearchModal = memo(function ChatSearchModal({ onClose, onSelectMessage }: ChatSearchModalProps) {
  const { chats } = useChat();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-focus input on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Search as user types
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const q = query.toLowerCase();
    const found: SearchResult[] = [];

    for (const chat of chats) {
      for (const msg of chat.messages) {
        const idx = msg.content.toLowerCase().indexOf(q);
        if (idx !== -1) {
          found.push({
            chatId: chat.id,
            chatTitle: chat.title,
            message: msg,
            matchStart: idx,
            matchEnd: idx + q.length,
          });
          if (found.length >= 20) break;
        }
      }
      if (found.length >= 20) break;
    }

    setResults(found);
    setSelectedIndex(0);
  }, [query, chats]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        onSelectMessage(results[selectedIndex].chatId, results[selectedIndex].message.id);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [results, selectedIndex, onSelectMessage, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const item = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  function highlightMatch(text: string, result: SearchResult) {
    const before = text.slice(0, result.matchStart);
    const match = text.slice(result.matchStart, result.matchEnd);
    const after = text.slice(result.matchEnd);
    return (
      <>
        {before}
        <mark className="bg-yellow-400/30 text-yellow-200 rounded px-0.5">{match}</mark>
        {after}
      </>
    );
  }

  function getPreview(text: string, result: SearchResult, chars = 80) {
    const contextStart = Math.max(0, result.matchStart - chars);
    const contextBefore = contextStart > 0 ? '…' : '';
    const contextAfter = result.matchEnd + chars < text.length ? '…' : '';
    const preview = text.slice(contextStart, result.matchEnd + chars);
    return (
      <span>
        {contextBefore}
        {highlightMatch(preview, { ...result, matchStart: result.matchStart - contextStart, matchEnd: result.matchEnd - contextStart })}
        {contextAfter}
      </span>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search chats"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Search panel */}
      <div className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden shadow-2xl bg-gray-900/95 border border-gray-700/50">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <Search className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search all messages…"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
            aria-label="Search query"
            aria-autocomplete="list"
            aria-controls="search-results"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs font-mono rounded bg-gray-800 border border-gray-600 text-gray-400">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          id="search-results"
          role="listbox"
          aria-label="Search results"
          className="max-h-80 overflow-y-auto"
        >
          {!query.trim() ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-500">
              <Search className="w-8 h-8 mb-3 opacity-30" aria-hidden="true" />
              <p className="text-sm">Type to search all messages</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-500">
              <p className="text-sm">No messages found for "{query}"</p>
            </div>
          ) : (
            results.map((result, i) => (
              <button
                key={`${result.chatId}-${result.message.id}`}
                role="option"
                aria-selected={i === selectedIndex}
                onClick={() => onSelectMessage(result.chatId, result.message.id)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                  i === selectedIndex ? 'bg-indigo-600/20' : 'hover:bg-white/5'
                }`}
              >
                <MessageSquare className={`w-4 h-4 mt-0.5 shrink-0 ${i === selectedIndex ? 'text-indigo-400' : 'text-gray-500'}`} aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium truncate ${i === selectedIndex ? 'text-indigo-300' : 'text-gray-400'}`}>
                      {result.chatTitle}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      result.message.role === 'user'
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : 'bg-green-500/20 text-green-300'
                    }`}>
                      {result.message.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed line-clamp-2">
                    {getPreview(result.message.content, result)}
                  </p>
                </div>
                {i === selectedIndex && (
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-1" aria-hidden="true" />
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-white/5 bg-black/20">
          <span className="text-xs text-gray-500">
            <kbd className="inline-flex items-center px-1 py-0.5 text-xs font-mono rounded bg-gray-800 border border-gray-600 text-gray-400">↑↓</kbd> navigate
          </span>
          <span className="text-xs text-gray-500">
            <kbd className="inline-flex items-center px-1 py-0.5 text-xs font-mono rounded bg-gray-800 border border-gray-600 text-gray-400">↵</kbd> open
          </span>
          <span className="text-xs text-gray-500 ml-auto">
            {results.length > 0 ? `${results.length} result${results.length !== 1 ? 's' : ''}` : ''}
          </span>
        </div>
      </div>
    </div>
  );
});