/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Message, ChatState, Chat } from '../types/chat';
import { useSettings } from './SettingsContext';
import { ChatService } from '../services/chatService';
import type { AIService } from '../services/aiService';

// Stable singleton — instantiated once at module load, not per-render
const globalChatService = new ChatService();

interface ChatContextType extends ChatState {
  streamingMessageId: string | null;
  streamingContent: string;
  tokensPerSecond: number;
  lastSentMessage: string | null;
  lastUserMessage: string | null;
  regenerateLastResponse: () => void;
  editLastMessage: (newContent: string) => void;
  sendMessage: (content: string) => Promise<void>;
  createNewChat: () => void;
  switchChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  clearMessages: () => void;
  cancelStream: () => void;
  dismissError: () => void;
  togglePinChat: (chatId: string) => void;
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
  const [lastSentMessage, setLastSentMessage] = useState<string | null>(null);
  // Persisted separately so regeneration works even after a successful response
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
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

  const service: AIService = globalChatService;

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

  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setState(prev => ({ ...prev, isStreaming: false }));
    setStreamingMessageId(null);
    setStreamingContent('');
    setTokensPerSecond(0);
  }, []);

  const dismissError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const togglePinChat = useCallback((chatId: string) => {
    setState(prev => ({
      ...prev,
      chats: prev.chats.map(c =>
        c.id === chatId ? { ...c, pinned: !c.pinned } : c
      ),
    }));
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

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    setLastSentMessage(content);
    setLastUserMessage(content);

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
            setLastSentMessage(null); // clear so error retry takes over if needed
          },
          onError: (err) => {
            setState(prev => ({ ...prev, isStreaming: false, error: err.message }));
            setStreamingMessageId(null);
            setStreamingContent(''); // clear stale partial content
            setTokensPerSecond(0);
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

  // Regenerate: delete last assistant response(s) and re-send the last user message
  const regenerateLastResponse = useCallback(() => {
    const msgToResend = lastUserMessage;
    if (!msgToResend) return;

    // Delete trailing assistant messages from the active chat
    setState(prev => {
      if (!prev.activeChatId) return prev;
      return {
        ...prev,
        chats: prev.chats.map(chat => {
          if (chat.id === prev.activeChatId) {
            const msgs = [...chat.messages];
            while (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant') {
              msgs.pop();
            }
            return { ...chat, messages: msgs };
          }
          return chat;
        }),
      };
    });

    // Clear streaming state
    setStreamingMessageId(null);
    setStreamingContent('');
    setTokensPerSecond(0);

    // Re-send after a micro-task to let the state update settle
    setTimeout(() => sendMessage(msgToResend), 0);
  }, [lastUserMessage, sendMessage]);

  // Edit the last user message: update its content and delete all trailing assistant messages, then resend
  const editLastMessage = useCallback((newContent: string) => {
    if (!newContent.trim()) return;
    const currentChatId = state.activeChatId;
    if (!currentChatId) return;

    // Update the last user message content and remove all trailing assistant messages
    setState(prev => {
      const chat = prev.chats.find(c => c.id === currentChatId);
      if (!chat) return prev;
      const msgs = [...chat.messages];
      // Find the last user message
      let lastUserIdx = -1;
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'user') { lastUserIdx = i; break; }
      }
      if (lastUserIdx === -1) return prev;
      // Update content and trim trailing assistants
      msgs[lastUserIdx] = { ...msgs[lastUserIdx], content: newContent };
      while (msgs.length > lastUserIdx + 1) msgs.pop();
      return {
        ...prev,
        chats: prev.chats.map(c => c.id === currentChatId ? { ...c, messages: msgs } : c),
      };
    });

    // Clear streaming state
    setStreamingMessageId(null);
    setStreamingContent('');
    setTokensPerSecond(0);
    setLastSentMessage(newContent);
    setLastUserMessage(newContent);

    // Send the edited message
    setTimeout(() => sendMessage(newContent), 0);
  }, [state.activeChatId, sendMessage]);

  const contextValue = useMemo(() => ({
      ...state,
      streamingMessageId,
      streamingContent,
      tokensPerSecond,
      lastSentMessage,
      lastUserMessage,
      regenerateLastResponse,
      editLastMessage,
      sendMessage,
      createNewChat,
      switchChat,
      deleteChat,
      clearMessages,
      cancelStream,
      dismissError,
      togglePinChat,
    }), [state, streamingMessageId, streamingContent, tokensPerSecond, lastSentMessage, lastUserMessage, regenerateLastResponse, editLastMessage, sendMessage, createNewChat, switchChat, deleteChat, clearMessages, cancelStream, dismissError, togglePinChat]);

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