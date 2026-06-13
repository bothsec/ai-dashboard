import React, { useRef, useEffect, memo, useMemo } from 'react';
import { useChat } from '../context/ChatContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize from 'rehype-sanitize';
import 'highlight.js/styles/github-dark.css';
import { User, Bot, AlertCircle, Zap, Sparkles } from 'lucide-react';
import type { Message } from '../types/chat';

interface MessageItemProps {
  msg: Message;
  isStreaming: boolean;
  isLast: boolean;
  streamingContent?: string;
  tokensPerSecond?: number;
}

const MessageItem = memo(({ msg, isStreaming, isLast, streamingContent, tokensPerSecond }: MessageItemProps) => {
  const displayContent = (isLast && streamingContent) || msg.content;
  const showThinking = msg.role === 'assistant' && !displayContent && isStreaming && isLast;
  const showSpeed = isLast && isStreaming && tokensPerSecond && tokensPerSecond > 0;

  return (
    <div
      className={`flex gap-4 md:gap-5 group animate-in slide-in-from-bottom-4 fade-in duration-300 ${
        msg.role === 'user' ? 'flex-row-reverse' : ''
      }`}
    >
      {/* Avatar */}
      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 ${
        msg.role === 'user' 
          ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25' 
          : 'bg-gradient-to-br from-gray-800 to-gray-900 text-indigo-400 border border-gray-700/50 shadow-lg shadow-black/20'
      }`}>
        {msg.role === 'user' ? <User className="w-5 h-5 md:w-6 md:h-6" /> : <Bot className="w-6 h-6 md:w-7 md:h-7" />}
      </div>

      <div className={`flex flex-col space-y-2 max-w-[75%] lg:max-w-[70%] ${
        msg.role === 'user' ? 'items-end' : ''
      }`}>
        {/* Thinking indicator */}
        {showThinking && (
          <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl rounded-tl-md animate-in slide-in-from-left-4 duration-400">
            <div className="flex gap-1.5">
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
          <div className={`px-5 py-4 rounded-2xl shadow-sm transition-all duration-200 ${
            msg.role === 'user' 
              ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-md shadow-lg shadow-indigo-500/20' 
              : 'bg-gradient-to-br from-gray-800/95 to-gray-900/95 border border-gray-700/50 text-gray-100 rounded-tl-md shadow-xl shadow-black/30'
          }`}>
            <div className={`text-[15px] md:text-base leading-relaxed ${
              msg.role === 'user' ? '' : 'prose prose-invert max-w-none prose-p:my-2 prose-pre:rounded-xl'
            }`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize, rehypeHighlight]}
              >
                {displayContent}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Speed indicator */}
        {showSpeed && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg w-fit">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">
              {tokensPerSecond.toFixed(1)} tok/s
            </span>
          </div>
        )}
        
        {/* Timestamp */}
        <span className="text-xs text-gray-600 px-1">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
});

// Suggestion chips for empty state
const suggestions = [
  { icon: '📝', text: 'Help me write code' },
  { icon: '🔍', text: 'Explain something' },
  { icon: '💡', text: 'Brainstorm ideas' },
  { icon: '🐛', text: 'Debug my code' },
];

export const ChatWindow: React.FC = () => {
  const { chats, activeChatId, isStreaming, error, streamingMessageId, streamingContent, tokensPerSecond, sendMessage } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeChat = useMemo(() => 
    chats.find(c => c.id === activeChatId), 
    [chats, activeChatId]
  );

  const messages = useMemo(() => activeChat?.messages || [], [activeChat]);

  // Scroll to bottom on message updates OR streaming content updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden relative">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-6 md:py-8 lg:py-10 px-4 md:px-8 lg:px-12 scroll-smooth scroll-touch"
      >
        <div className="max-w-4xl lg:max-w-3xl mx-auto space-y-6 md:space-y-8">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center pt-12 md:pt-20 pb-8 px-4">
              {/* Logo/Brand */}
              <div className="relative mb-6 md:mb-8">
                <div className="w-20 h-20 md:w-28 md:h-28 lg:w-32 lg:h-32 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/30 animate-in zoom-in duration-500">
                  <Sparkles className="w-10 h-10 md:w-14 md:h-14 lg:w-16 lg:h-16 text-white" />
                </div>
                <div className="absolute -inset-4 md:-inset-6 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-3xl md:rounded-4xl blur-2xl -z-10"></div>
              </div>
              
              <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-3 md:mb-4">
                How can I help you today?
              </h2>
              <p className="text-gray-500 mb-8 md:mb-10 max-w-md text-base md:text-lg">
                Your conversations are saved automatically
              </p>

              {/* Quick suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 w-full max-w-2xl lg:max-w-3xl px-4 md:px-0">
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(suggestion.text)}
                    className="flex items-center gap-3 px-5 py-4 md:py-4 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 rounded-xl md:rounded-2xl text-sm md:text-base text-gray-300 hover:text-white transition-all duration-200 hover:shadow-lg hover:shadow-black/30 hover:-translate-y-1 text-left"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <span className="text-xl md:text-2xl">{suggestion.icon}</span>
                    <span>{suggestion.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, index) => {
            const isLast = index === messages.length - 1;
            const isStreamingThisMessage = isLast && msg.id === streamingMessageId;
            
            return (
              <MessageItem 
                key={msg.id} 
                msg={msg} 
                isStreaming={isStreaming} 
                isLast={isLast} 
                streamingContent={isStreamingThisMessage ? streamingContent : undefined}
                tokensPerSecond={tokensPerSecond}
              />
            );
          })}

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-950/20 border border-red-900/50 rounded-2xl text-red-400 animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};