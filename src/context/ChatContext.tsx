import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Message, ChatState, Chat } from '../types/chat';
import { useSettings } from './SettingsContext';
import { OpenAIService } from '../services/openaiService';
import { AnthropicService } from '../services/anthropicService';
import { OllamaService } from '../services/ollamaService';
import { NvidiaService } from '../services/nvidiaService';
import type { AIService } from '../services/aiService';

interface ChatContextType extends ChatState {
  sendMessage: (content: string) => Promise<void>;
  createNewChat: () => void;
  switchChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  clearMessages: () => void;
  cancelStream: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Fallback for crypto.randomUUID() in non-secure contexts
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  
  const [state, setState] = useState<ChatState>(() => {
    const saved = localStorage.getItem('ai-dashboard-chats');
    if (saved) {
      try {
        const chats = JSON.parse(saved);
        return {
          chats,
          activeChatId: chats.length > 0 ? chats[0].id : null,
          isStreaming: false,
          error: null,
        };
      } catch (e) {
        console.error('Failed to load chats', e);
      }
    }
    return {
      chats: [],
      activeChatId: null,
      isStreaming: false,
      error: null,
    };
  });

  // Persist chats to localStorage
  useEffect(() => {
    localStorage.setItem('ai-dashboard-chats', JSON.stringify(state.chats));
  }, [state.chats]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const service = useMemo((): AIService => {
    switch (settings.activeProvider) {
      case 'openai': return new OpenAIService();
      case 'anthropic': return new AnthropicService();
      case 'ollama': return new OllamaService();
      case 'nvidia': return new NvidiaService();
      default: throw new Error(`Unsupported provider: ${settings.activeProvider}`);
    }
  }, [settings.activeProvider]);

  const createNewChat = useCallback(() => {
    const newChat: Chat = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      provider: settings.activeProvider,
    };
    setState(prev => ({
      ...prev,
      chats: [newChat, ...prev.chats],
      activeChatId: newChat.id,
    }));
  }, [settings.activeProvider]);

  const switchChat = useCallback((chatId: string) => {
    setState(prev => ({ ...prev, activeChatId: chatId }));
  }, []);

  const deleteChat = useCallback((chatId: string) => {
    setState(prev => {
      const newChats = prev.chats.filter(c => c.id !== chatId);
      let newActiveId = prev.activeChatId;
      if (prev.activeChatId === chatId) {
        newActiveId = newChats.length > 0 ? newChats[0].id : null;
      }
      return { ...prev, chats: newChats, activeChatId: newActiveId };
    });
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    let currentChatId = state.activeChatId;
    
    // Create chat if none exists
    if (!currentChatId) {
      const newChat: Chat = {
        id: generateId(),
        title: content.slice(0, 40) + (content.length > 40 ? '...' : ''),
        messages: [],
        createdAt: Date.now(),
        provider: settings.activeProvider,
      };
      currentChatId = newChat.id;
      setState(prev => ({
        ...prev,
        chats: [newChat, ...prev.chats],
        activeChatId: newChat.id,
      }));
    }

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    const assistantMessageId = generateId();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    setState(prev => ({
      ...prev,
      isStreaming: true,
      error: null,
      chats: prev.chats.map(chat => {
        if (chat.id === currentChatId) {
          const isFirstMessage = chat.messages.length === 0;
          return {
            ...chat,
            title: isFirstMessage ? content.slice(0, 40) + (content.length > 40 ? '...' : '') : chat.title,
            messages: [...chat.messages, userMessage, assistantMessage],
          };
        }
        return chat;
      }),
    }));

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const activeChat = state.chats.find(c => c.id === currentChatId);
      const history = activeChat ? activeChat.messages : [];

      await service.generateStream(
        [...history, userMessage],
        settings,
        {
          onChunk: (chunk) => {
            setState(prev => ({
              ...prev,
              chats: prev.chats.map(chat => {
                if (chat.id === currentChatId) {
                  return {
                    ...chat,
                    messages: chat.messages.map(msg =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: msg.content + chunk }
                        : msg
                    ),
                  };
                }
                return chat;
              }),
            }));
          },
          onComplete: () => setState(prev => ({ ...prev, isStreaming: false })),
          onError: (err) => setState(prev => ({ ...prev, isStreaming: false, error: err.message })),
        },
        controller.signal
      );
    } catch (error) {
      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: error instanceof Error ? error.message : 'Failed to send message',
      }));
    }
  }, [state.activeChatId, state.chats, service, settings]);

  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setState(prev => ({ ...prev, isStreaming: false }));
  }, []);

  const clearMessages = useCallback(() => {
    if (state.activeChatId) {
      setState(prev => ({
        ...prev,
        chats: prev.chats.map(chat => 
          chat.id === state.activeChatId ? { ...chat, messages: [] } : chat
        )
      }));
    }
  }, [state.activeChatId]);

  return (
    <ChatContext.Provider value={{ ...state, sendMessage, createNewChat, switchChat, deleteChat, clearMessages, cancelStream }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};
