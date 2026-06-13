import React, { useRef, useEffect, memo, useMemo } from 'react';
import { useChat } from '../context/ChatContext';
import { useSettings } from '../context/SettingsContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import { Bot, User, Zap, Loader2 } from 'lucide-react';
import 'highlight.js/styles/github-dark.css';

interface MessageItemProps {
  msg: { id: string; role: string; content: string; timestamp: number };
  isStreaming: boolean;
  isLast: boolean;
  streamingContent: string;
}

const MessageItem = memo(({ msg, isStreaming, isLast, streamingContent }: MessageItemProps) => {
  const { settings } = useSettings();
  const isDark = msg.role === 'user' ? true : settings.theme === 'dark';
  const displayContent = (isLast && streamingContent) || msg.content;
  const hasContent = displayContent && displayContent.trim().length > 0;
  const showThinking = msg.role === 'assistant' && !hasContent && isStreaming && isLast;

  return (
    <div 
      className={`flex gap-4 md:gap-5 group animate-in slide-in-from-bottom-4 fade-in duration-300 py-2 ${
        msg.role === 'user' ? 'flex-row-reverse' : ''
      }`}
      role="listitem"
      aria-label={`${msg.role === 'user' ? 'You' : 'Assistant'} message`}
    >
      {/* Avatar */}
      <div 
        className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 ${
          msg.role === 'user' 
            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25' 
            : isDark
              ? 'bg-gradient-to-br from-gray-800 to-gray-900 text-indigo-400 border border-gray-700/50 shadow-lg shadow-black/20'
              : 'bg-gray-100 text-indigo-600 border border-gray-200 shadow-lg shadow-black/10'
        }`}
        aria-hidden="true"
      >
        {msg.role === 'user' ? <User className="w-5 h-5 md:w-6 md:h-6" /> : <Bot className="w-6 h-6 md:w-7 md:h-7" />}
      </div>

      <div className={`flex flex-col space-y-2 max-w-[75%] lg:max-w-[70%] ${
        msg.role === 'user' ? 'items-end' : ''
      }`}>
        {/* Thinking indicator */}
        {showThinking && (
          <div 
            className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl rounded-tl-md animate-in slide-in-from-left-4 duration-400"
            role="status"
            aria-label="AI is thinking"
          >
            <div className="flex gap-1.5" aria-hidden="true">
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
            </div>
            <span className="text-sm text-indigo-400 font-medium">
              Thinking...
            </span>
          </div>
        )}
        
        {/* Message bubble */}
        {displayContent && (
          <div 
            className={`px-5 py-4 rounded-2xl shadow-sm transition-all duration-200 ${
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-md shadow-lg shadow-indigo-500/20' 
                : isDark
                  ? 'bg-gradient-to-br from-gray-800/95 to-gray-900/95 border border-gray-700/50 text-gray-100 rounded-tl-md shadow-xl shadow-black/30'
                  : 'bg-white border border-gray-200 text-gray-900 rounded-tl-md shadow-xl shadow-black/10'
            }`}
          >
            <div className={`text-[15px] md:text-[15px] leading-[1.75] ${
              msg.role === 'user' ? '' : 'prose prose-invert dark:prose-invert max-w-none'
            }`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize, rehypeHighlight]}
                components={{
                  p: ({ children }) => (
                    <p className={`mb-4 last:mb-0 leading-relaxed ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{children}</p>
                  ),
                  h1: ({ children }) => (
                    <h1 className={`text-xl font-bold mb-3 mt-6 first:mt-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className={`text-lg font-bold mb-2 mt-5 first:mt-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className={`text-base font-semibold mb-2 mt-4 first:mt-0 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{children}</h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className={`text-sm font-semibold mb-2 mt-3 first:mt-0 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{children}</h4>
                  ),
                  ul: ({ children }) => (
                    <ul className={`list-disc list-inside mb-4 space-y-1.5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className={`list-decimal list-inside mb-4 space-y-1.5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className={isDark ? 'text-gray-300' : 'text-gray-600'}>{children}</li>
                  ),
                  code: ({ className, children }) => {
                    const isInline = !className;
                    if (isInline) {
                      return (
                        <code className={isDark ? 'bg-gray-700/60 px-1.5 py-0.5 rounded text-sm font-mono text-indigo-300' : 'bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-indigo-600'}>
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code className={className}>
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children }) => (
                    <pre className={`rounded-xl p-4 mb-4 overflow-x-auto text-sm border leading-relaxed ${
                      isDark ? 'bg-gray-900/90 border-gray-700/40' : 'bg-gray-100 border-gray-200'
                    }`}>
                      {children}
                    </pre>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className={`border-l-4 border-indigo-500/50 pl-4 py-1 italic mb-4 rounded-r-lg ${
                      isDark ? 'text-gray-400 bg-gray-800/30' : 'text-gray-600 bg-gray-50'
                    }`}>
                      {children}
                    </blockquote>
                  ),
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className={`underline underline-offset-2 ${
                      isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
                    }`}>
                      {children}
                    </a>
                  ),
                  hr: () => <hr className={`my-6 ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />,
                  table: ({ children }) => (
                    <div className={`overflow-x-auto mb-4 rounded-lg border ${
                      isDark ? 'border-gray-700/40' : 'border-gray-200'
                    }`}>
                      <table className="min-w-full">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className={isDark ? 'bg-gray-800/50' : 'bg-gray-100'}>{children}</thead>
                  ),
                  th: ({ children }) => (
                    <th className={`px-4 py-2.5 text-left text-sm font-semibold border-b ${
                      isDark ? 'text-gray-200 border-gray-700' : 'text-gray-800 border-gray-200'
                    }`}>{children}</th>
                  ),
                  td: ({ children }) => (
                    <td className={`px-4 py-2.5 text-sm border-b ${
                      isDark ? 'text-gray-300 border-gray-700/40' : 'text-gray-600 border-gray-200'
                    }`}>{children}</td>
                  ),
                  strong: ({ children }) => (
                    <strong className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className={isDark ? 'text-gray-300' : 'text-gray-600'}>{children}</em>
                  ),
                }}
              >
                {displayContent}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Timestamp */}
        <span className={`text-xs px-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} aria-live="off">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
});

// Loading skeleton for messages
const MessageSkeleton = memo(() => {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  
  return (
    <div className="flex gap-4 md:gap-5 py-2" role="status" aria-label="Loading message">
      {/* Avatar skeleton */}
      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full shrink-0 ${
        isDark ? 'bg-gray-800' : 'bg-gray-200'
      } animate-pulse`} aria-hidden="true" />
      
      <div className="flex flex-col space-y-2 max-w-[75%] lg:max-w-[70%]">
        {/* Bubble skeleton */}
        <div className={`px-5 py-4 rounded-2xl rounded-tl-md ${
          isDark ? 'bg-gray-800' : 'bg-gray-200'
        } animate-pulse`}>
          <div className="flex flex-col gap-2">
            <div className={`h-4 w-48 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />
            <div className={`h-4 w-36 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />
          </div>
        </div>
        
        {/* Timestamp skeleton */}
        <div className={`h-3 w-16 rounded ${isDark ? 'bg-gray-800' : 'bg-gray-200'} animate-pulse`} aria-hidden="true" />
      </div>
    </div>
  );
});

export const ChatWindow: React.FC = () => {
  const { chats, activeChatId, isStreaming, error, streamingMessageId, streamingContent, tokensPerSecond, sendMessage } = useChat();
  const { settings } = useSettings();
  const scrollRef = useRef<HTMLDivElement>(null);
  const emptyStateRef = useRef<HTMLDivElement>(null);
  const isDark = settings.theme === 'dark';

  const activeChat = useMemo(() => 
    chats.find(c => c.id === activeChatId),
    [chats, activeChatId]
  );

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeChat?.messages, streamingContent]);

  // Focus management for empty state
  useEffect(() => {
    if (activeChat && activeChat.messages.length === 0 && emptyStateRef.current) {
      // Focus the first suggestion button when empty state is shown
      const firstButton = emptyStateRef.current.querySelector('button');
      firstButton?.focus();
    }
  }, [activeChat]);

  const suggestions = [
    { icon: '📝', text: 'Help me write code' },
    { icon: '🔍', text: 'Explain something' },
    { icon: '💡', text: 'Brainstorm ideas' },
    { icon: '🐛', text: 'Debug my code' },
  ];

  const handleSuggestionClick = async (text: string) => {
    try {
      await sendMessage(text);
    } catch (err) {
      console.error('Failed to send suggestion:', err);
    }
  };

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-4" role="alert">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
            <Bot className="w-8 h-8 text-red-400" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-semibold text-red-400 mb-2" role="alert">Error</h3>
          <p className="text-gray-400 max-w-md">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden relative">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-6 md:py-8 lg:py-10 px-4 md:px-8 lg:px-12"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {activeChat && activeChat.messages.length === 0 ? (
          /* Empty state */
          <div 
            ref={emptyStateRef}
            className="h-full flex flex-col items-center justify-center text-center pt-12 md:pt-20 pb-8"
          >
            {/* Logo/Brand */}
            <div className="relative mb-8">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl md:rounded-4xl flex items-center justify-center shadow-2xl shadow-indigo-500/30 animate-in zoom-in duration-500" role="img" aria-label="AI Assistant logo">
                <span className="text-3xl md:text-4xl" aria-hidden="true">🎨</span>
              </div>
              <div className="absolute -inset-4 md:-inset-6 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-3xl md:rounded-4xl blur-2xl -z-10" aria-hidden="true" />
            </div>
            
            <h2 className={`text-2xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              How can I help you today?
            </h2>
            <p className={`mb-8 md:mb-10 max-w-md text-base md:text-lg ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Your conversations are saved automatically
            </p>
            
            {/* Quick suggestions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 w-full max-w-2xl" role="list" aria-label="Suggested prompts">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  className={`flex items-center gap-3 px-5 py-4 rounded-xl md:rounded-2xl text-sm md:text-base text-left transition-all duration-200 hover:-translate-y-1 ${
                    isDark
                      ? 'bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 text-gray-300 hover:text-white hover:shadow-lg hover:shadow-black/30'
                      : 'bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 hover:shadow-lg hover:shadow-black/10'
                  }`}
                  style={{ animationDelay: `${i * 100}ms` }}
                  role="listitem"
                  aria-label={`${suggestion.icon} ${suggestion.text}`}
                >
                  <span className="text-xl md:text-2xl" aria-hidden="true">{suggestion.icon}</span>
                  <span className="font-medium">{suggestion.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages list */
          <div className="max-w-4xl mx-auto" role="list" aria-label="Chat messages">
            {activeChat?.messages.map((msg, index) => {
              const isLast = index === (activeChat?.messages.length ?? 0) - 1;
              const isMessageStreaming = isStreaming && isLast && msg.id === streamingMessageId;

              return (
                <MessageItem
                  key={msg.id}
                  msg={msg}
                  isStreaming={isMessageStreaming}
                  isLast={isLast}
                  streamingContent={isMessageStreaming ? streamingContent : ''}
                />
              );
            })}
            
            {/* Show skeleton when streaming but no message content yet */}
            {isStreaming && activeChat?.messages.length === 0 && (
              <MessageSkeleton />
            )}
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {isStreaming && (
        <div 
          className={`absolute bottom-0 left-0 right-0 flex items-center justify-center py-3 gap-3 ${isDark ? 'bg-gradient-to-t from-gray-950 to-transparent' : 'bg-gradient-to-t from-white to-transparent'}`}
          role="status"
          aria-label="AI is generating response"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20">
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" aria-hidden="true" />
            <span className="text-sm text-indigo-400 font-medium">Generating response...</span>
          </div>
          {typeof tokensPerSecond === 'number' && tokensPerSecond >= 1 && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Zap className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span className="text-sm text-emerald-400 font-medium">
                {tokensPerSecond.toFixed(1)} tok/s
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};