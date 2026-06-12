import React, { useRef, useEffect, memo, useMemo } from 'react';
import { useChat } from '../context/ChatContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize from 'rehype-sanitize';
import 'highlight.js/styles/github-dark.css';
import { User, Bot, AlertCircle } from 'lucide-react';
import type { Message } from '../types/chat';

interface MessageItemProps {
  msg: Message;
  isStreaming: boolean;
  isLast: boolean;
  streamingContent?: string;
}

const MessageItem = memo(({ msg, isStreaming, isLast, streamingContent }: MessageItemProps) => {
  const displayContent = (isLast && streamingContent) || msg.content;

  return (
    <div
      className={`flex gap-4 md:gap-6 group animate-in fade-in duration-300 ${
        msg.role === 'user' ? 'flex-row-reverse' : ''
      }`}
    >
      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
        msg.role === 'user' 
          ? 'bg-indigo-600 text-white' 
          : 'bg-gray-800 text-indigo-400 border border-gray-700'
      }`}>
        {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-6 h-6" />}
      </div>

      <div className={`flex flex-col space-y-2 max-w-[85%] md:max-w-[80%] ${
        msg.role === 'user' ? 'items-end' : ''
      }`}>
        {msg.role === 'assistant' && !displayContent && isStreaming && isLast && (
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/5 border border-indigo-500/10 rounded-xl animate-in fade-in slide-in-from-left-2 duration-500">
            <div className="flex gap-1">
              <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce"></div>
            </div>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest animate-pulse">
              Thinking...
            </span>
          </div>
        )}
        
        {displayContent && (
          <div className={`prose prose-invert prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-800 max-w-none px-5 py-3.5 rounded-2xl ${
            msg.role === 'user' 
              ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-50' 
              : 'bg-gray-900/50 border border-gray-800 text-gray-200 shadow-sm'
          }`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize, rehypeHighlight]}
            >
              {displayContent}
            </ReactMarkdown>
          </div>
        )}
        <span className="text-[10px] font-medium text-gray-600 uppercase tracking-widest px-1">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
});

export const ChatWindow: React.FC = () => {
  const { chats, activeChatId, isStreaming, error, streamingMessageId, streamingContent } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeChat = useMemo(() => 
    chats.find(c => c.id === activeChatId), 
    [chats, activeChatId]
  );

  const messages = activeChat?.messages || [];

  // Scroll to bottom on message updates OR streaming content updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-950 overflow-hidden relative">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 md:px-0 py-8 scroll-smooth"
      >
        <div className="max-w-3xl mx-auto space-y-8">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 pt-20">
              <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center border border-gray-800 shadow-xl">
                <Bot className="w-8 h-8 text-indigo-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-white">How can I help you today?</h3>
                <p className="text-gray-500 max-w-sm">Start a conversation. Your chat history is saved automatically.</p>
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

