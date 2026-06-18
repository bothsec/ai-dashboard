import { useState, memo, useEffect, useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useChat } from '../context/ChatContext';
import { Cpu, Menu, X, Plus, MessageSquare, Trash, Sparkles, Search, X as XIcon, Palette, Command, Pin, Pencil, BarChart2, FileText, GraduationCap, CalendarDays, Currency, Type, Shield, Lightbulb } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { ThemesModal } from './ThemesModal';
import { ChatSearchModal } from './ChatSearchModal';
import { KhmerRielFormatter } from './KhmerRielFormatter';
import { KhmerNumberWords } from './KhmerNumberWords';
import { WorkplaceTips } from './WorkplaceTips';
import { ChatStatsModal } from './ChatStatsModal';

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
  const { settings, khLang, toggleKhLang } = useSettings();
  const { chats, activeChatId, createNewChat, switchChat, deleteChat, togglePinChat, renameChat } = useChat();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showThemesModal, setShowThemesModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showWorkplaceTips, setShowWorkplaceTips] = useState(false);
  const [showRielFormatter, setShowRielFormatter] = useState(false);
  const [showNumberWords, setShowNumberWords] = useState(false);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const isDark = settings.theme === 'dark';
  const chatTheme = settings.chatTheme;

  // Per-theme accent color strings
  const themeAccent = chatTheme === 'midnight' ? 'blue' :
    chatTheme === 'ocean' ? 'cyan' :
    chatTheme === 'forest' ? 'emerald' :
    chatTheme === 'sunset' ? 'orange' :
    chatTheme === 'minimal' ? 'neutral' :
    'indigo';

  // Sidebar background — matches chat area theme
  const sidebarBgClass = (() => {
    const t = chatTheme;
    if (t === 'midnight') return isDark
      ? 'bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950'
      : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50';
    if (t === 'ocean') return isDark
      ? 'bg-gradient-to-br from-slate-950 via-cyan-950 to-teal-950'
      : 'bg-gradient-to-br from-slate-50 via-cyan-50 to-teal-50';
    if (t === 'forest') return isDark
      ? 'bg-gradient-to-br from-slate-950 via-green-950 to-emerald-950'
      : 'bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50';
    if (t === 'sunset') return isDark
      ? 'bg-gradient-to-br from-slate-950 via-rose-950 to-orange-950'
      : 'bg-gradient-to-br from-slate-50 via-rose-50 to-orange-50';
    if (t === 'minimal') return isDark
      ? 'bg-neutral-950'
      : 'bg-neutral-100';
    return isDark
      ? 'bg-gradient-to-br from-gray-950 via-slate-900 to-indigo-950'
      : 'bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50';
  })();

  const sidebarBorderClass = isDark
    ? chatTheme === 'midnight' ? 'border-blue-900/50' :
      chatTheme === 'ocean' ? 'border-cyan-900/50' :
      chatTheme === 'forest' ? 'border-green-900/50' :
      chatTheme === 'sunset' ? 'border-orange-900/50' :
      chatTheme === 'minimal' ? 'border-neutral-800/50' :
      'border-gray-800/50'
    : chatTheme === 'midnight' ? 'border-blue-200' :
      chatTheme === 'ocean' ? 'border-cyan-200' :
      chatTheme === 'forest' ? 'border-green-200' :
      chatTheme === 'sunset' ? 'border-orange-200' :
      chatTheme === 'minimal' ? 'border-neutral-300' :
      'border-gray-200';

  const sidebarHeaderBorder = isDark
    ? chatTheme === 'midnight' ? 'border-blue-900/50' :
      chatTheme === 'ocean' ? 'border-cyan-900/50' :
      chatTheme === 'forest' ? 'border-green-900/50' :
      chatTheme === 'sunset' ? 'border-orange-900/50' :
      chatTheme === 'minimal' ? 'border-neutral-800/50' :
      'border-gray-800/50'
    : chatTheme === 'midnight' ? 'border-blue-200' :
      chatTheme === 'ocean' ? 'border-cyan-200' :
      chatTheme === 'forest' ? 'border-green-200' :
      chatTheme === 'sunset' ? 'border-orange-200' :
      chatTheme === 'minimal' ? 'border-neutral-300' :
      'border-gray-200';

  // Active chat item colors per theme
  const activeChatClass = isDark
    ? chatTheme === 'midnight' ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' :
      chatTheme === 'ocean' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' :
      chatTheme === 'forest' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
      chatTheme === 'sunset' ? 'bg-orange-500/10 border-orange-500/30 text-orange-300' :
      chatTheme === 'minimal' ? 'bg-neutral-500/10 border-neutral-500/30 text-neutral-300' :
      'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
    : chatTheme === 'midnight' ? 'bg-blue-50 border-blue-200 text-blue-700' :
      chatTheme === 'ocean' ? 'bg-cyan-50 border-cyan-200 text-cyan-700' :
      chatTheme === 'forest' ? 'bg-green-50 border-green-200 text-green-700' :
      chatTheme === 'sunset' ? 'bg-orange-50 border-orange-200 text-orange-700' :
      chatTheme === 'minimal' ? 'bg-neutral-100 border-neutral-300 text-neutral-700' :
      'bg-indigo-50 border-indigo-200 text-indigo-700';

  const activeIconClass = isDark
    ? chatTheme === 'midnight' ? 'text-blue-400' :
      chatTheme === 'ocean' ? 'text-cyan-400' :
      chatTheme === 'forest' ? 'text-emerald-400' :
      chatTheme === 'sunset' ? 'text-orange-400' :
      chatTheme === 'minimal' ? 'text-neutral-400' :
      'text-indigo-500'
    : chatTheme === 'midnight' ? 'text-blue-600' :
      chatTheme === 'ocean' ? 'text-cyan-600' :
      chatTheme === 'forest' ? 'text-green-600' :
      chatTheme === 'sunset' ? 'text-orange-600' :
      chatTheme === 'minimal' ? 'text-neutral-600' :
      'text-indigo-600';

  // Footer icon button style per theme
  const footerBtnClass = isDark
    ? chatTheme === 'midnight' ? 'from-blue-900/60 to-indigo-900/60 border-blue-800/40 hover:border-blue-500/50' :
      chatTheme === 'ocean' ? 'from-cyan-900/60 to-teal-900/60 border-cyan-800/40 hover:border-cyan-500/50' :
      chatTheme === 'forest' ? 'from-green-900/60 to-emerald-900/60 border-green-800/40 hover:border-green-500/50' :
      chatTheme === 'sunset' ? 'from-orange-900/60 to-rose-900/60 border-orange-800/40 hover:border-orange-500/50' :
      chatTheme === 'minimal' ? 'from-neutral-800/60 to-neutral-900/60 border-neutral-700/40 hover:border-neutral-500/50' :
      'from-indigo-900/60 to-purple-900/60 border-indigo-800/40 hover:border-indigo-500/50'
    : chatTheme === 'midnight' ? 'bg-blue-50 border-blue-200 hover:border-blue-400' :
      chatTheme === 'ocean' ? 'bg-cyan-50 border-cyan-200 hover:border-cyan-400' :
      chatTheme === 'forest' ? 'bg-green-50 border-green-200 hover:border-green-400' :
      chatTheme === 'sunset' ? 'bg-orange-50 border-orange-200 hover:border-orange-400' :
      chatTheme === 'minimal' ? 'bg-neutral-100 border-neutral-300 hover:border-neutral-400' :
      'bg-indigo-50 border-indigo-200 hover:border-indigo-400';

  const footerIconClass = isDark
    ? chatTheme === 'midnight' ? 'text-blue-400' :
      chatTheme === 'ocean' ? 'text-cyan-400' :
      chatTheme === 'forest' ? 'text-emerald-400' :
      chatTheme === 'sunset' ? 'text-orange-400' :
      chatTheme === 'minimal' ? 'text-neutral-400' :
      'text-indigo-400'
    : chatTheme === 'midnight' ? 'text-blue-600' :
      chatTheme === 'ocean' ? 'text-cyan-600' :
      chatTheme === 'forest' ? 'text-green-600' :
      chatTheme === 'sunset' ? 'text-orange-600' :
      chatTheme === 'minimal' ? 'text-neutral-600' :
      'text-indigo-600';

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
        } ${sidebarBgClass} border-r ${sidebarBorderClass}`}
        aria-label="Chat sidebar"
      >
        {/* Header */}
        <div className={`p-4 sm:p-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pl-[calc(1rem+env(safe-area-inset-left,0px))] border-b ${sidebarHeaderBorder}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20" aria-hidden="true">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className={`text-base sm:text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Khmer AI</h1>
              <p className={`text-[10px] sm:text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-500'} truncate`}>AI Assistant</p>
            </div>
          </div>
        </div>

        {/* New Chat button */}
        <div className="p-3 sm:p-4 pl-[calc(0.75rem+env(safe-area-inset-left,0px))]">
          <button
            onClick={handleNewChat}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 sm:py-3 bg-gradient-to-r from-${themeAccent}-600 to-${themeAccent}-700 hover:from-${themeAccent}-500 hover:to-${themeAccent}-600 text-white rounded-xl transition-all duration-200 shadow-lg shadow-${themeAccent}-500/20 hover:shadow-${themeAccent}-500/30 font-medium text-sm sm:text-base active:scale-[0.98] touch-target`}
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
                ? `bg-${themeAccent}-900/20 border-${themeAccent}-800/40 focus-within:border-${themeAccent}-500/50`
                : `bg-${themeAccent}-50 border-${themeAccent}-200 focus-within:border-${themeAccent}-400`
            }`}>
              <Search className={`w-3.5 h-3.5 shrink-0 ${isDark ? `text-${themeAccent}-500/70` : `text-${themeAccent}-400`}`} aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search chats…"
                className={`flex-1 bg-transparent text-xs outline-none placeholder:text-${isDark ? themeAccent + '-400/50' : themeAccent + '-400/70'} ${isDark ? 'text-' + themeAccent + '-300' : 'text-' + themeAccent + '-700'}`}
                aria-label="Search chat history"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`p-0.5 rounded ${isDark ? `text-${themeAccent}-500/70 hover:text-${themeAccent}-400` : `text-${themeAccent}-400 hover:text-${themeAccent}-600`}`}
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
                className={`group flex items-center gap-3 px-3 py-2.5 sm:py-2.5 rounded-xl cursor-pointer border touch-target ${
                  activeChatId === chat.id
                    ? activeChatClass
                    : isDark
                      ? `border-transparent text-${themeAccent}-400/80`
                      : `border-transparent text-${themeAccent}-600`
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
                  className={`w-4 h-4 shrink-0 ${activeChatId === chat.id ? activeIconClass : isDark ? `text-${themeAccent}-600` : `text-${themeAccent}-400`}`}
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
        <div className={`p-3 sm:p-4 pl-[calc(0.75rem+env(safe-area-inset-left,0px))] border-t ${sidebarHeaderBorder}`}>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={toggleKhLang}
              className={`w-9 h-9 rounded-lg flex items-center justify-center border bg-gradient-to-br ${footerBtnClass}`}
              title={khLang ? 'Khmer mode — click for English' : 'English mode — click for Khmer'}
            >
              <span className={`text-[10px] font-bold leading-none ${footerIconClass}`}>{khLang ? 'EN' : 'ខ្មែរ'}</span>
            </button>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center border bg-gradient-to-br ${footerBtnClass}`} aria-hidden="true">
                <Cpu className={`w-4 h-4 ${footerIconClass}`} />
              </div>
            <button
                onClick={() => setShowThemesModal(true)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors bg-gradient-to-br ${footerBtnClass}`}
                title="Chat Themes"
              >
                <Palette className={`w-4 h-4 ${footerIconClass}`} />
              </button>
            <button
                onClick={() => setShowSearchModal(true)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors bg-gradient-to-br ${footerBtnClass}`}
                title="Search (Ctrl+K)"
              >
                <Command className={`w-4 h-4 ${footerIconClass}`} />
              </button>
            <button
                onClick={() => window.dispatchEvent(new CustomEvent('resume:open'))}
                className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors bg-gradient-to-br ${footerBtnClass}`}
                title="Resume Builder"
              >
                <FileText className={`w-4 h-4 ${footerIconClass}`} />
              </button>
            <button
                onClick={() => window.dispatchEvent(new CustomEvent('interview:open'))}
                className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors bg-gradient-to-br ${footerBtnClass}`}
                title="Interview Prep"
              >
                <GraduationCap className={`w-4 h-4 ${footerIconClass}`} />
              </button>
            <button
                onClick={() => setShowRielFormatter(true)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors bg-gradient-to-br ${footerBtnClass}`}
                title="Khmer Riel Formatter"
              >
                <Currency className={`w-4 h-4 ${footerIconClass}`} />
              </button>
            <button
                onClick={() => setShowNumberWords(true)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors bg-gradient-to-br ${footerBtnClass}`}
                title="Khmer Number to Words"
              >
                <Type className={`w-4 h-4 ${footerIconClass}`} />
              </button>
            <button
                onClick={() => window.dispatchEvent(new CustomEvent('khmer-calendar:open'))}
                className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors bg-gradient-to-br ${footerBtnClass}`}
                title="Khmer Calendar Converter"
              >
                <CalendarDays className={`w-4 h-4 ${footerIconClass}`} />
              </button>
            <button
                onClick={() => setShowWorkplaceTips(true)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors bg-gradient-to-br ${footerBtnClass}`}
                title="Khmer Workplace Tips"
              >
                <Lightbulb className={`w-4 h-4 ${footerIconClass}`} />
              </button>
            <button
                onClick={() => setShowStatsModal(true)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors bg-gradient-to-br ${footerBtnClass}`}
                title="Chat Statistics"
              >
                <BarChart2 className={`w-4 h-4 ${footerIconClass}`} />
              </button>
            <button
                onClick={() => window.dispatchEvent(new CustomEvent('admin:open'))}
                className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors bg-gradient-to-br ${footerBtnClass}`}
                title="Admin Dashboard"
              >
                <Shield className={`w-4 h-4 ${footerIconClass}`} />
              </button>
          </div>
        </div>
      </aside>
        {showThemesModal && <ThemesModal onClose={() => setShowThemesModal(false)} />}
        {showSearchModal && <ChatSearchModal onClose={() => setShowSearchModal(false)} onSelectMessage={handleSearchSelect} />}
        {showStatsModal && <ChatStatsModal onClose={() => setShowStatsModal(false)} />}
        {showRielFormatter && <KhmerRielFormatter onClose={() => setShowRielFormatter(false)} />}
        {showNumberWords && <KhmerNumberWords onClose={() => setShowNumberWords(false)} />}
        {showWorkplaceTips && <WorkplaceTips onClose={() => setShowWorkplaceTips(false)} />}
    </>
  );
});