import React, { useState, memo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useChat } from '../context/ChatContext';
import { Cpu, Menu, X, Plus, MessageSquare, Trash, Sparkles } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export const Sidebar: React.FC = memo(() => {
  const { settings } = useSettings();
  const { chats, activeChatId, createNewChat, switchChat, deleteChat } = useChat();
  const [isOpen, setIsOpen] = useState(false);

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

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2.5 bg-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-xl text-gray-400 hover:text-white hover:border-gray-600 transition-all duration-200"
        aria-label="Toggle sidebar"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:relative inset-y-0 left-0 z-40 w-[85vw] sm:w-80 h-screen flex flex-col bg-gray-900/98 backdrop-blur-xl border-r border-gray-800/50 transition-all duration-300 ease-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Header */}
        <div className="p-4 sm:p-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pl-[calc(1rem+env(safe-area-inset-left,0px))] border-b border-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">AI Dashboard</h1>
              <p className="text-[10px] sm:text-[11px] text-gray-500 truncate">AI Assistant</p>
            </div>
          </div>
        </div>

        {/* New Chat button */}
        <div className="p-3 sm:p-4 pl-[calc(0.75rem+env(safe-area-inset-left,0px))]">
          <button
            onClick={() => {
              createNewChat();
              setIsOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 sm:py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 font-medium text-sm sm:text-base active:scale-[0.98] touch-target"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-3 pl-[calc(0.5rem+env(safe-area-inset-left,0px))] py-2 space-y-1 scroll-touch">
          <h2 className="px-2 sm:px-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Recent Chats</h2>
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`group flex items-center gap-3 px-3 py-2.5 sm:py-2.5 rounded-xl cursor-pointer transition-all duration-200 border touch-target ${
                activeChatId === chat.id
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                  : 'border-transparent hover:bg-gray-800/50 text-gray-400 hover:text-gray-200'
              }`}
              onClick={() => {
                switchChat(chat.id);
                setIsOpen(false);
              }}
            >
              <MessageSquare className={`w-4 h-4 shrink-0 ${
                activeChatId === chat.id ? 'text-indigo-400' : 'text-gray-600 group-hover:text-gray-400'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {chat.title || 'New Chat'}
                </p>
                <p className="text-[10px] text-gray-600">
                  {formatTime(chat.createdAt)} • {chat.messages.length} messages
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChat(chat.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                aria-label="Delete chat"
              >
                <Trash className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          
          {chats.length === 0 && (
            <div className="text-center py-8 px-4">
              <div className="w-12 h-12 bg-gray-800/50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-5 h-5 text-gray-600" />
              </div>
              <p className="text-xs text-gray-600 italic">No conversations yet</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 pl-[calc(0.75rem+env(safe-area-inset-left,0px))] border-t border-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Model</span>
              <span className="text-xs text-indigo-400 font-medium truncate">
                {settings.model.nvidia.split('/').pop()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <div className="w-9 h-9 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center border border-gray-700/50">
                <Cpu className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
});