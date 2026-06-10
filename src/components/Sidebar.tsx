import React, { useState, memo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useChat } from '../context/ChatContext';
import { Cpu, Menu, X, Plus, MessageSquare, Trash } from 'lucide-react';

export const Sidebar: React.FC = memo(() => {
  const { settings } = useSettings();
  const { chats, activeChatId, createNewChat, switchChat, deleteChat } = useChat();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 bg-gray-900 border border-gray-700 rounded-xl text-gray-300 hover:text-white transition-colors"
        aria-label="Toggle sidebar"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <aside className={`fixed inset-y-0 left-0 z-40 w-80 h-screen bg-gray-900 text-gray-100 flex flex-col border-r border-gray-800 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-gray-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">AI Dashboard</h1>
        </div>

        <div className="p-4">
          <button
            onClick={() => {
              createNewChat();
              setIsOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/20 font-semibold"
          >
            <Plus className="w-5 h-5" />
            <span>New Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
          <h2 className="px-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Recent Conversations</h2>
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer border ${
                activeChatId === chat.id
                  ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-400 shadow-sm'
                  : 'border-transparent hover:bg-gray-800 text-gray-400'
              }`}
              onClick={() => {
                switchChat(chat.id);
                setIsOpen(false);
              }}
            >
              <MessageSquare className={`w-4 h-4 shrink-0 ${activeChatId === chat.id ? 'text-indigo-400' : 'text-gray-600 group-hover:text-gray-400'}`} />
              <span className="flex-1 text-sm truncate font-medium">
                {chat.title || 'Untitled Chat'}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChat(chat.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all rounded-md hover:bg-red-500/10"
                aria-label="Delete chat"
              >
                <Trash className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          
          {chats.length === 0 && (
            <div className="text-center py-8">
              <p className="text-xs text-gray-600 italic">No conversations yet.</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-800 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Active Model</span>
            <span className="text-xs text-indigo-400 font-medium truncate max-w-[140px]">
              {settings.model.nvidia.split('/').pop()}
            </span>
          </div>
          <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center border border-gray-700">
             <Cpu className="w-4 h-4 text-indigo-500" />
          </div>
        </div>
      </aside>

      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
});

