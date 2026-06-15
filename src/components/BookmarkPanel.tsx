import { memo, useState, useEffect, useCallback } from 'react';
import { useChat } from '../context/ChatContext';
import { useSettings } from '../context/SettingsContext';
import { X, Bookmark, Trash2, Bot, User } from 'lucide-react';

export interface BookmarkedMessage {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  chatTitle: string;
}

const STORAGE_KEY = 'bookmarked_messages';

function getBookmarks(): BookmarkedMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBookmarks(bookmarks: BookmarkedMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  } catch { /* ignore */ }
}

interface BookmarkPanelProps {
  onClose: () => void;
}

export const BookmarkPanel = memo(({ onClose }: BookmarkPanelProps) => {
  const { settings } = useSettings();
  const { switchChat } = useChat();
  const isDark = settings.theme === 'dark';
  const [bookmarks, setBookmarks] = useState<BookmarkedMessage[]>(getBookmarks);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks(prev => {
      const next = prev.filter(b => b.id !== id);
      saveBookmarks(next);
      return next;
    });
  }, []);

  const handleSelect = useCallback((bookmark: BookmarkedMessage) => {
    switchChat(bookmark.chatId);
    window.dispatchEvent(new CustomEvent('chat:scroll-to-message', {
      detail: { messageId: bookmark.id },
    }));
    onClose();
  }, [switchChat, onClose]);

  const handleClearAll = useCallback(() => {
    setBookmarks([]);
    saveBookmarks([]);
  }, []);

  useEffect(() => {
    const handleUpdate = () => setBookmarks(getBookmarks());
    window.addEventListener('bookmarks:refresh', handleUpdate);
    return () => window.removeEventListener('bookmarks:refresh', handleUpdate);
  }, []);

  return (
    <div
      className={`absolute inset-y-0 right-0 w-80 flex flex-col z-50 shadow-2xl border-l animate-in slide-in-from-right duration-200 ${
        isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
      }`}
      role="dialog"
      aria-label="Bookmarked messages"
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className={`flex items-center gap-2 text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          <Bookmark className="w-4 h-4" />
          Bookmarks
          {bookmarks.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
              {bookmarks.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {bookmarks.length > 0 && (
            <button
              onClick={handleClearAll}
              className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-gray-500 hover:text-red-400 hover:bg-gray-800' : 'text-gray-400 hover:text-red-500 hover:bg-gray-100'}`}
              aria-label="Clear all bookmarks"
              title="Clear all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            aria-label="Close bookmarks"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <Bookmark className={`w-10 h-10 mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              No bookmarked messages yet.
            </p>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
              Click the bookmark icon on any message to save it here.
            </p>
          </div>
        ) : (
          <ul aria-label="Bookmarked messages">
            {bookmarks.map(bm => (
              <li key={`${bm.chatId}-${bm.id}`}>
                <button
                  onClick={() => handleSelect(bm)}
                  className={`w-full text-left px-4 py-3 border-b transition-colors ${
                    isDark
                      ? 'border-gray-800 hover:bg-gray-800/60'
                      : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  {/* Chat title + role */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={isDark ? 'text-gray-600' : 'text-gray-400'}>
                      {bm.role === 'user'
                        ? <User className="w-3 h-3" />
                        : <Bot className="w-3 h-3" />
                      }
                    </span>
                    <span className={`text-[11px] truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {bm.chatTitle || 'Untitled chat'}
                    </span>
                    <span className={`text-[10px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                      {new Date(bm.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  {/* Content preview */}
                  <p className={`text-sm line-clamp-3 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {bm.content}
                  </p>
                  {/* Remove button */}
                  <div className="mt-1.5 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeBookmark(bm.id);
                      }}
                      className={`p-1 rounded transition-colors ${isDark ? 'text-gray-600 hover:text-red-400' : 'text-gray-300 hover:text-red-500'}`}
                      aria-label="Remove bookmark"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
});