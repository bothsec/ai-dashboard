import { useState, memo, useEffect, useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useChat } from '../context/ChatContext';
import { Cpu, Menu, X, Plus, MessageSquare, Trash, Sparkles, Search, X as XIcon, Palette, Command, Pin, Pencil } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { ThemesModal } from './ThemesModal';
import { ChatSearchModal } from './ChatSearchModal';

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
  const { chats, activeChatId, createNewChat, switchChat, deleteChat, togglePinChat, renameChat } = useChat();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showThemesModal, setShowThemesModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const isDark = settings.theme === 'dark';

  // Filter chats by search query (matches title or message content), pinned first
  const filteredChats = searchQuery.trim()
    ? chats.filter(chat => {
        const q = searchQuery.toLowerCase();
        if (chat.title.toLowerCase().includes(q)) return true;
        return chat.messages.some(msg => msg.content.toLowerCase().includes(q));
      }).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
    : chats.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const toggleSidebar = useCallback(() => setIsOpen(prev => !prev), []);
  const closeSidebar = useCallback(() => setIsOpen(false), []);

  // Keyboard shortcut: Ctrl/Cmd + K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const handleTogglePin = useCallback((e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    togglePinChat(chatId);
  }, [togglePinChat]);

  const handleStartRename = useCallback((e: React.MouseEvent, chat: { id: string; title: string }) => {
    e.stopPropagation();
    setRenamingChatId(chat.id);
    setRenameValue(chat.title || 'New Chat');
  }, []);

  const handleRenameSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (renamingChatId && renameValue.trim()) {
      renameChat(renamingChatId, renameValue.trim());
    }
    setRenamingChatId(null);
    setRenameValue('');
  }, [renamingChatId, renameValue, renameChat]);

  const handleRenameCancel = useCallback(() => {
    setRenamingChatId(null);
    setRenameValue('');
  }, []);

  const handleSwitchChat = useCallback((chatId: string) => {
    switchChat(chatId);
    setIsOpen(false);
  }, [switchChat]);

  const handleNewChat = useCallback(() => {
    createNewChat();
    setIsOpen(false);
  }, [createNewChat]);

  const handleSearchSelect = useCallback((chatId: string, messageId: string) => {
    switchChat(chatId);
    setShowSearchModal(false);
    // Dispatch event so ChatWindow can scroll to the message
    window.dispatchEvent(new CustomEvent('chat:scroll-to-message', { detail: { messageId } }));
  }, [switchChat]);

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

        {/* Search bar */}
        {chats.length > 0 && (
          <div className="px-2 mb-3">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors ${
              isDark
                ? 'bg-gray-800/50 border-gray-700/50 focus-within:border-indigo-500/50'
                : 'bg-gray-100 border-gray-200 focus-within:border-indigo-400'
            }`}>
              <Search className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search chats…"
                className={`flex-1 bg-transparent text-xs outline-none placeholder:text-gray-500 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}
                aria-label="Search chat history"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`p-0.5 rounded ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                  aria-label="Clear search"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Chat list */}
        <div
          className="flex-1 overflow-y-auto px-2 sm:px-3 pl-[calc(0.5rem+env(safe-area-inset-left,0px))] py-2 space-y-1 scroll-touch"
          role="navigation"
          aria-label="Chat history"
        >
          <h2 className={`px-2 sm:px-2 text-[10px] font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {searchQuery ? `Results (${filteredChats.length})` : 'Recent Chats'}
          </h2>
          {filteredChats.length > 0 ? (
            filteredChats.map((chat) => (
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
                  {renamingChatId === chat.id ? (
                    <form onSubmit={handleRenameSubmit} onKeyDown={e => { if (e.key === 'Escape') handleRenameCancel(); }} className="flex items-center gap-1">
                      <input
                        autoFocus
                        type="text"
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onBlur={handleRenameSubmit}
                        className={`flex-1 min-w-0 px-1.5 py-0.5 rounded text-sm outline-none ${isDark ? 'bg-gray-700 text-gray-100 border border-indigo-500/50' : 'bg-white text-gray-900 border border-indigo-300'}`}
                        aria-label="New chat title"
                        onClick={e => e.stopPropagation()}
                      />
                    </form>
                  ) : (
                    <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                      {chat.title || 'New Chat'}
                    </p>
                  )}
                  <p className={`text-[10px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                    {formatTime(chat.createdAt)} • {chat.messages.length} messages{(chat.totalTokens ?? 0) > 0 && ` • ${(chat.totalTokens! / 1000).toFixed(1)}k tok`}
                  </p>
                </div>
                {renamingChatId !== chat.id && (
                  <>
                    <button
                      onClick={(e) => handleStartRename(e, chat)}
                      className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all duration-200 ${isDark ? 'text-gray-500 hover:text-blue-400 hover:bg-blue-500/10' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'}`}
                      aria-label={`Rename chat: ${chat.title || 'New Chat'}`}
                    >
                      <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={(e) => handleTogglePin(e, chat.id)}
                      className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all duration-200 ${chat.pinned ? 'opacity-100' : ''} ${isDark ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10' : 'text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50'}`}
                      aria-label={chat.pinned ? `Unpin chat: ${chat.title || 'New Chat'}` : `Pin chat: ${chat.title || 'New Chat'}`}
                    >
                      <Pin className={`w-3.5 h-3.5 ${chat.pinned ? 'fill-current' : ''}`} aria-hidden="true" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteChat(e, chat.id)}
                      className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all duration-200 ${
                        isDark ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                      }`}
                      aria-label={`Delete chat: ${chat.title || 'New Chat'}`}
                    >
                      <Trash className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>
            ))
          ) : (
            <div className={`text-center py-8 px-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} role="status">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${isDark ? 'bg-gray-800/50' : 'bg-gray-100'}`} aria-hidden="true">
                <Search className={`w-5 h-5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
              </div>
              <p className="text-xs italic">{searchQuery ? 'No chats match your search' : 'No conversations yet'}</p>
            </div>
          )}
        </div>

          {/* Footer */}
        <div className={`p-3 sm:p-4 pl-[calc(0.75rem+env(safe-area-inset-left,0px))] border-t ${isDark ? 'border-gray-800/50' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <ThemeToggle />
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700/50' : 'bg-gray-100 border-gray-200'}`} aria-hidden="true">
                <Cpu className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
              </div>
            <button
                onClick={() => setShowThemesModal(true)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors ${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700/50 hover:border-indigo-500/50' : 'bg-gray-100 border-gray-200 hover:border-indigo-400'}`}
                title="Chat Themes"
              >
                <Palette className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
              </button>
            <button
                onClick={() => setShowSearchModal(true)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors ${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700/50 hover:border-indigo-500/50' : 'bg-gray-100 border-gray-200 hover:border-indigo-400'}`}
                title="Search (Ctrl+K)"
              >
                <Command className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
              </button>
          </div>
        </div>
      </aside>
        {showThemesModal && <ThemesModal onClose={() => setShowThemesModal(false)} />}
        {showSearchModal && <ChatSearchModal onClose={() => setShowSearchModal(false)} onSelectMessage={handleSearchSelect} />}
    </>
  );
});