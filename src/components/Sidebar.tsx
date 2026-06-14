import { useState, memo, useEffect, useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useChat } from '../context/ChatContext';
import { Cpu, Menu, X, Plus, MessageSquare, Trash, Sparkles, Pencil } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

// Move outside component — pure function, no deps on component scope
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
};

export const Sidebar = memo(() => {
  const { settings } = useSettings();
  const { chats, activeChatId, createNewChat, switchChat, deleteChat } = useChat();
  const [isOpen, setIsOpen] = useState(false);

  const isDark = settings.theme === 'dark';

  const toggleSidebar = useCallback(() => setIsOpen(prev => !prev), []);
  const closeSidebar = useCallback(() => setIsOpen(false), []);

  // Keyboard shortcut: Ctrl/Cmd + N for new chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        createNewChat();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createNewChat]);

  const handleDeleteChat = useCallback((e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    deleteChat(chatId);
  }, [deleteChat]);

  const handleSwitchChat = useCallback((chatId: string) => {
    switchChat(chatId);
    setIsOpen(false);
  }, [switchChat]);

  const handleNewChat = useCallback(() => {
    createNewChat();
    setIsOpen(false);
  }, [createNewChat]);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className={`fixed top-4 left-4 z-50 md:hidden p-2.5 backdrop-blur-xl border rounded-xl transition-all duration-200 ${
          isDark
            ? 'bg-gray-900/90 border-gray-700/50 text-gray-400 hover:text-white hover:border-gray-600'
            : 'bg-white/90 border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300'
        }`}
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
        aria-expanded={isOpen}
        aria-controls="sidebar"
      >
        {isOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className={`fixed inset-0 z-30 backdrop-blur-sm md:hidden ${isDark ? 'bg-black/70' : 'bg-black/40'}`}
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar"
        className={`fixed md:relative inset-y-0 left-0 z-40 w-[85vw] sm:w-80 h-screen flex flex-col backdrop-blur-xl transition-all duration-300 ease-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isDark ? 'bg-gray-900/98 border-gray-800/50' : 'bg-white/95 border-gray-200'}`}
        aria-label="Chat sidebar"
      >
        {/* Header */}
        <div className={`p-4 sm:p-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pl-[calc(1rem+env(safe-area-inset-left,0px))] border-b ${isDark ? 'border-gray-800/50' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20" aria-hidden="true">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className={`text-base sm:text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>AI Dashboard</h1>
              <p className={`text-[10px] sm:text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-500'} truncate`}>AI Assistant</p>
            </div>
          </div>
        </div>

        {/* New Chat button */}
        <div className="p-3 sm:p-4 pl-[calc(0.75rem+env(safe-area-inset-left,0px))]">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 sm:py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 font-medium text-sm sm:text-base active:scale-[0.98] touch-target"
            aria-label="Create new chat (Ctrl+N)"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Chat list */}
        <div
          className="flex-1 overflow-y-auto px-2 sm:px-3 pl-[calc(0.5rem+env(safe-area-inset-left,0px))] py-2 space-y-1 scroll-touch"
          role="navigation"
          aria-label="Chat history"
        >
          <h2 className={`px-2 sm:px-2 text-[10px] font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Recent Chats
          </h2>
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`group flex items-center gap-3 px-3 py-2.5 sm:py-2.5 rounded-xl cursor-pointer transition-all duration-200 border touch-target ${
                activeChatId === chat.id
                  ? isDark
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : isDark
                    ? 'border-transparent hover:bg-gray-800/50 text-gray-400 hover:text-gray-200'
                    : 'border-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => handleSwitchChat(chat.id)}
              role="button"
              tabIndex={0}
              aria-label={`Chat: ${chat.title || 'New Chat'}, ${chat.messages.length} messages, ${formatTime(chat.createdAt)}`}
              aria-current={activeChatId === chat.id ? 'true' : undefined}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSwitchChat(chat.id);
                }
              }}
            >
              <MessageSquare
                className={`w-4 h-4 shrink-0 ${activeChatId === chat.id ? 'text-indigo-500' : isDark ? 'text-gray-600 group-hover:text-gray-400' : 'text-gray-400 group-hover:text-gray-600'}`}
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  {chat.title || 'New Chat'}
                </p>
                <p className={`text-[10px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                  {formatTime(chat.createdAt)} • {chat.messages.length} messages
                </p>
              </div>
              <button
                onClick={(e) => handleDeleteChat(e, chat.id)}
                className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all duration-200 ${
                  isDark ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                }`}
                aria-label={`Delete chat: ${chat.title || 'New Chat'}`}
              >
                <Trash className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}

          {chats.length === 0 && (
            <div className={`text-center py-8 px-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} role="status">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${isDark ? 'bg-gray-800/50' : 'bg-gray-100'}`} aria-hidden="true">
                <MessageSquare className={`w-5 h-5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
              </div>
              <p className="text-xs italic">No conversations yet</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-3 sm:p-4 pl-[calc(0.75rem+env(safe-area-inset-left,0px))] border-t ${isDark ? 'border-gray-800/50' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('sketch:toggle'))}
                className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors ${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700/50 hover:border-indigo-500/50' : 'bg-gray-100 border-gray-200 hover:border-indigo-400'}`}
                title="Drawing Canvas"
              >
                <Pencil className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
              </button>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700/50' : 'bg-gray-100 border-gray-200'}`} aria-hidden="true">
                <Cpu className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
              </div>
            </div>
        </div>
      </aside>
    </>
  );
});