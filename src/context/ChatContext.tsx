/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Message, ChatState, Chat } from '../types/chat';
import { useSettings } from './SettingsContext';
import { ChatService } from '../services/chatService';
import type { AIService } from '../services/aiService';

interface ChatContextType extends ChatState {
  streamingMessageId: string | null;
  streamingContent: string;
  tokensPerSecond: number;
  sendMessage: (content: string) => Promise<void>;
  createNewChat: () => void;
  switchChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  clearMessages: () => void;
  cancelStream: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

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
          streamingMessageId: null,
          tokensPerSecond: 0,
          error: null,
        };
      } catch {
        // Corrupted localStorage data — start fresh silently
      }
    }
    return {
      chats: [],
      activeChatId: null,
      isStreaming: false,
      streamingMessageId: null,
      tokensPerSecond: 0,
      error: null,
    };
  });

  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [tokensPerSecond, setTokensPerSecond] = useState<number>(0);
  const streamingStartRef = useRef<number>(0);

  // Persist chats to localStorage with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('ai-dashboard-chats', JSON.stringify(state.chats));
    }, 1000);
    return () => clearTimeout(timer);
  }, [state.chats]);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Clean up any active stream on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const service = useMemo((): AIService => {
    return new ChatService();
  }, []);

  const createNewChat = useCallback(() => {
    const newChat: Chat = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      provider: 'api',
    };
    setState(prev => ({
      ...prev,
      chats: [newChat, ...prev.chats],
      activeChatId: newChat.id,
    }));
  }, []);

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
    let isNewChat = false;

    // Pre-build messages before any async work
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

    // Create chat if none exists
    if (!currentChatId) {
      const newChat: Chat = {
        id: generateId(),
        title: content.slice(0, 40) + (content.length > 40 ? '...' : ''),
        messages: [],
        createdAt: Date.now(),
        provider: 'api',
      };
      currentChatId = newChat.id;
      isNewChat = true;
      setState(prev => ({
        ...prev,
        chats: [newChat, ...prev.chats],
        activeChatId: newChat.id,
      }));
    }

    // Compute history BEFORE setState so it's never stale.
    // For a new chat: newChat.messages is [] → history = [userMessage].
    // For an existing chat: state.chats still holds the correct messages.
    const history: Message[] = isNewChat
      ? [userMessage]
      : (() => {
          const chat = state.chats.find(c => c.id === currentChatId);
          return chat ? [...chat.messages, userMessage] : [userMessage];
        })();

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

    setStreamingMessageId(assistantMessageId);
    setStreamingContent('');
    setTokensPerSecond(0);
    streamingStartRef.current = Date.now();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await service.generateStream(
        history,
        settings,
        {
          onChunk: (chunk) => {
            setStreamingContent(prev => {
              const newContent = prev + chunk;
              // Calculate tokens per second (approx: chars / 4)
              const elapsed = (Date.now() - streamingStartRef.current) / 1000;
              if (elapsed > 0.5) { // Only update after 0.5s to be stable
                const approxTokens = newContent.length / 4;
                const tps = Math.round(approxTokens / elapsed * 10) / 10;
                setTokensPerSecond(tps);
              }
              return newContent;
            });
          },
          onComplete: (fullContent) => {
            setState(prev => ({
              ...prev,
              isStreaming: false,
              chats: prev.chats.map(chat => {
                if (chat.id === currentChatId) {
                  return {
                    ...chat,
                    messages: chat.messages.map(msg =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: fullContent }
                        : msg
                    ),
                  };
                }
                return chat;
              }),
            }));
            setStreamingMessageId(null);
            setStreamingContent('');
          },
          onError: (err) => {
            setState(prev => ({ ...prev, isStreaming: false, error: err.message }));
            setStreamingMessageId(null);
          },
        },
        controller.signal
      );
    } catch (error) {
      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: error instanceof Error ? error.message : 'Failed to send message',
      }));
      setStreamingMessageId(null);
    }
  }, [state.activeChatId, state.chats, service, settings]);

  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setState(prev => ({ ...prev, isStreaming: false }));
    setStreamingMessageId(null);
    setStreamingContent('');
    setTokensPerSecond(0);
  }, []);

  const clearMessages = useCallback(() => {
    setState(prev => {
      if (!prev.activeChatId) return prev;
      return {
        ...prev,
        chats: prev.chats.map(chat =>
          chat.id === prev.activeChatId ? { ...chat, messages: [] } : chat
        ),
      };
    });
  }, []);

  const contextValue = useMemo(() => ({
      ...state,
      streamingMessageId,
      streamingContent,
      tokensPerSecond,
      sendMessage,
      createNewChat,
      switchChat,
      deleteChat,
      clearMessages,
      cancelStream
    }), [state, streamingMessageId, streamingContent, tokensPerSecond, sendMessage, createNewChat, switchChat, deleteChat, clearMessages, cancelStream]);

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};


export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};
