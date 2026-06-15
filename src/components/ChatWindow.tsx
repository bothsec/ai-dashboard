import { useRef, useEffect, memo, useMemo, useCallback, useState } from 'react';
import { useChat } from '../context/ChatContext';
import { useSettings } from '../context/SettingsContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import { Bot, User, Zap, Loader2, RefreshCw, X, WifiOff, Download, Volume2, VolumeX, Copy, Check, ChevronDown, RotateCw, Bookmark, Trash, ThumbsUp, ThumbsDown } from 'lucide-react';
import 'highlight.js/styles/github-dark.css';
import type { Message, ChatTheme } from '../types/chat';
import { BookmarkPanel } from './BookmarkPanel';
import type { BookmarkedMessage } from './BookmarkPanel';

// Stable — no component-state dependency
const SUGGESTIONS = [
  { icon: '📝', text: 'Help me write code' },
  { icon: '🔍', text: 'Explain something' },
  { icon: '💡', text: 'Brainstorm ideas' },
  { icon: '🐛', text: 'Debug my code' },
];

interface MessageItemProps {
  msg: Message;
  isStreaming: boolean;
  isLast: boolean;
  streamingContent: string;
  chatTheme: ChatTheme;
  activeChatId: string;
}

const MessageItem = memo(({ msg, isStreaming, isLast, streamingContent, chatTheme, activeChatId }: MessageItemProps) => {
  const { settings } = useSettings();
  const [speaking, setSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);

  const [isBookmarked, setIsBookmarked] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('bookmarked_messages');
      if (stored) {
        const bookmarks: BookmarkedMessage[] = JSON.parse(stored);
        return bookmarks.some(b => b.id === msg.id);
      }
    } catch { /* ignore */ }
    return false;
  });

  const [reaction, setReaction] = useState<'up' | 'down' | null>(() => {
    try {
      const stored = localStorage.getItem('message_reactions');
      if (stored) {
        const reactions = JSON.parse(stored) as Record<string, 'up' | 'down'>;
        return reactions[msg.id] ?? null;
      }
    } catch { /* ignore */ }
    return null;
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bookmarked_messages');
      const bookmarks: BookmarkedMessage[] = stored ? JSON.parse(stored) : [];
      const chatTitle = document.querySelector('[data-chat-title]')?.textContent ?? 'Untitled chat';
      if (isBookmarked) {
        // Avoid duplicates
        if (!bookmarks.some(b => b.id === msg.id)) {
          bookmarks.unshift({
            id: msg.id,
            chatId: activeChatId,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            chatTitle,
          });
        }
      } else {
        const filtered = bookmarks.filter(b => b.id !== msg.id);
        if (filtered.length !== bookmarks.length) {
          localStorage.setItem('bookmarked_messages', JSON.stringify(filtered));
          window.dispatchEvent(new CustomEvent('bookmarks:refresh'));
        }
        return;
      }
      localStorage.setItem('bookmarked_messages', JSON.stringify(bookmarks));
    } catch { /* ignore */ }
  }, [isBookmarked, msg.id, msg.role, msg.content, msg.timestamp, activeChatId]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('message_reactions');
      const reactions: Record<string, 'up' | 'down'> = stored ? JSON.parse(stored) : {};
      if (reaction) {
        reactions[msg.id] = reaction;
      } else {
        delete reactions[msg.id];
      }
      localStorage.setItem('message_reactions', JSON.stringify(reactions));
    } catch { /* ignore */ }
  }, [reaction, msg.id]);

  const isDark = msg.role === 'user' ? true : settings.theme === 'dark';
  const activeChatTheme = chatTheme ?? settings.chatTheme;

  // Per-theme accent colors — complete class names
  const themeAccent = activeChatTheme === 'midnight' ? 'blue' :
    activeChatTheme === 'ocean' ? 'cyan' :
    activeChatTheme === 'forest' ? 'emerald' :
    activeChatTheme === 'sunset' ? 'orange' :
    activeChatTheme === 'minimal' ? 'neutral' :
    'indigo';

  const displayContent = (isLast && streamingContent) || msg.content;
  const hasContent = displayContent && displayContent.trim().length > 0;
  const showThinking = msg.role === 'assistant' && !hasContent && isStreaming && isLast;

  // User avatar + bubble: complete class names per theme
  const userAccent = activeChatTheme === 'midnight' ? {
    avatar: 'from-blue-500 to-indigo-600 shadow-blue-500/25',
    bubble: 'from-blue-600 to-indigo-600 shadow-blue-500/20',
  } : activeChatTheme === 'ocean' ? {
    avatar: 'from-cyan-500 to-teal-600 shadow-cyan-500/25',
    bubble: 'from-cyan-600 to-teal-600 shadow-cyan-500/20',
  } : activeChatTheme === 'forest' ? {
    avatar: 'from-emerald-500 to-green-600 shadow-emerald-500/25',
    bubble: 'from-emerald-600 to-green-600 shadow-emerald-500/20',
  } : activeChatTheme === 'sunset' ? {
    avatar: 'from-orange-500 to-rose-600 shadow-orange-500/25',
    bubble: 'from-orange-600 to-rose-600 shadow-orange-500/20',
  } : activeChatTheme === 'minimal' ? {
    avatar: 'from-neutral-500 to-neutral-600 shadow-neutral-500/25',
    bubble: 'from-neutral-600 to-neutral-700 shadow-neutral-500/20',
  } : {
    avatar: 'from-indigo-500 to-purple-600 shadow-indigo-500/25',
    bubble: 'from-indigo-600 to-indigo-700 shadow-indigo-500/20',
  };

  // AI avatar accent color: complete class names per theme
  const aiAccentColor = activeChatTheme === 'midnight' ? 'text-blue-400' :
    activeChatTheme === 'ocean' ? 'text-cyan-400' :
    activeChatTheme === 'forest' ? 'text-emerald-400' :
    activeChatTheme === 'sunset' ? 'text-orange-400' :
    activeChatTheme === 'minimal' ? 'text-neutral-400' :
    'text-indigo-400';

  // AI bubble: complete class names per theme + dark/light
  const aiBubbleClass = isDark
    ? activeChatTheme === 'midnight' ? 'from-blue-950/90 to-indigo-950/90 border-blue-800/40' :
      activeChatTheme === 'ocean' ? 'from-cyan-950/90 to-teal-950/90 border-cyan-800/40' :
      activeChatTheme === 'forest' ? 'from-green-950/90 to-emerald-950/90 border-green-800/40' :
      activeChatTheme === 'sunset' ? 'from-orange-950/90 to-rose-950/90 border-orange-800/40' :
      activeChatTheme === 'minimal' ? 'from-neutral-900/95 to-neutral-950/95 border-neutral-700/40' :
      'from-gray-800/95 to-gray-900/95 border-gray-700/50'
    : 'bg-white border-gray-200 text-gray-900';

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
            ? `bg-gradient-to-br ${userAccent.avatar} text-white`
            : isDark
              ? `bg-gradient-to-br from-gray-800 to-gray-900 ${aiAccentColor} border border-gray-700/50 shadow-lg shadow-black/20`
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
        {showThinking && (() => {
          const t = themeAccent; // 'blue' | 'cyan' | 'emerald' | 'orange' | 'neutral' | 'indigo'
          const dotClass = t === 'blue' ? 'bg-blue-400' :
            t === 'cyan' ? 'bg-cyan-400' :
            t === 'emerald' ? 'bg-emerald-400' :
            t === 'orange' ? 'bg-orange-400' :
            t === 'neutral' ? 'bg-neutral-400' :
            'bg-indigo-400';
          const textClass = t === 'blue' ? 'text-blue-400' :
            t === 'cyan' ? 'text-cyan-400' :
            t === 'emerald' ? 'text-emerald-400' :
            t === 'orange' ? 'text-orange-400' :
            t === 'neutral' ? 'text-neutral-400' :
            'text-indigo-400';
          const bgClass = t === 'blue' ? 'from-blue-500/10 to-blue-600/10 border-blue-500/20' :
            t === 'cyan' ? 'from-cyan-500/10 to-cyan-600/10 border-cyan-500/20' :
            t === 'emerald' ? 'from-emerald-500/10 to-emerald-600/10 border-emerald-500/20' :
            t === 'orange' ? 'from-orange-500/10 to-orange-600/10 border-orange-500/20' :
            t === 'neutral' ? 'from-neutral-500/10 to-neutral-600/10 border-neutral-500/20' :
            'from-indigo-500/10 to-purple-500/10 border-indigo-500/20';
          return (
            <div
              className={`flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r ${bgClass} rounded-2xl rounded-tl-md animate-in slide-in-from-left-4 duration-400`}
              role="status"
              aria-label="AI is thinking"
            >
              <div className="flex gap-1.5" aria-hidden="true">
                <div className={`w-2 h-2 ${dotClass} rounded-full animate-bounce [animation-delay:-0.3s]`}></div>
                <div className={`w-2 h-2 ${dotClass} rounded-full animate-bounce [animation-delay:-0.15s]`}></div>
                <div className={`w-2 h-2 ${dotClass} rounded-full animate-bounce`}></div>
              </div>
              <span className={`text-sm ${textClass} font-medium`}>
                Thinking...
              </span>
            </div>
          );
        })()}

        {/* Message bubble */}
        {displayContent && (
          <div className="relative group/bubble">
            <div
              className={`px-5 py-4 rounded-2xl shadow-sm transition-all duration-200 ${
                msg.role === 'user'
                  ? `bg-gradient-to-br ${userAccent.bubble} text-white rounded-tr-md`
                  : aiBubbleClass + ' text-gray-100 rounded-tl-md shadow-xl shadow-black/30'
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
                    pre: ({ children }) => {
                      const codeEl = children as React.ReactElement<{ className?: string; children?: string }>;
                      const langClass = codeEl?.props?.className ?? '';
                      const langMatch = langClass.match(/language-(\w+)/);
                      const lang = langMatch ? langMatch[1] : '';
                      const codeText = codeEl?.props?.children ?? '';
                      return (
                        <pre className={`relative rounded-xl p-4 mb-4 overflow-x-auto text-sm border leading-relaxed group/pre ${isDark ? 'bg-gray-900/90 border-gray-700/40' : 'bg-gray-100 border-gray-200'}`}>
                          {lang && (
                            <span className={`absolute top-2 left-3 text-[10px] font-mono font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                              {lang}
                            </span>
                          )}
                          {children}
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(typeof codeText === 'string' ? codeText : String(codeText)).then(() => {
                                const btn = window.event?.target as HTMLElement;
                                const pre = btn?.closest('pre');
                                if (pre) pre.setAttribute('data-copied', 'true');
                                setTimeout(() => {
                                  const btn2 = window.event?.target as HTMLElement;
                                  const pre2 = btn2?.closest('pre');
                                  if (pre2) pre2.removeAttribute('data-copied');
                                }, 2000);
                              });
                            }}
                            className={`absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover/pre:opacity-100 transition-opacity ${isDark ? 'bg-gray-700/80 hover:bg-gray-600/90 text-gray-400 hover:text-gray-200' : 'bg-gray-200/90 hover:bg-gray-300/90 text-gray-500 hover:text-gray-700'}`}
                            aria-label="Copy code"
                            title="Copy code"
                          >
                            {((window.event?.target as HTMLElement)?.closest('pre')?.getAttribute('data-copied') === 'true')
                              ? <Check className="w-3.5 h-3.5" />
                              : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </pre>
                      );
                    },
                    blockquote: ({ children }) => (
                      <blockquote className={`border-l-4 border-indigo-500/50 pl-4 py-1 italic mb-4 rounded-r-lg ${
                        isDark ? 'text-gray-400 bg-gray-800/30' : 'text-gray-600 bg-gray-50'
                      }`}>
                        {children}
                      </blockquote>
                    ),
                    a: ({ href, children }) => {
                      const isSafe = href && /^(https?:|mailto:|tel:)/.test(href);
                      if (!isSafe) return null;
                      return (
                        <a href={href} target="_blank" rel="noopener noreferrer" className={`underline underline-offset-2 ${
                          isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
                        }`}>
                          {children}
                        </a>
                      );
                    },
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
            {/* Copy button — shown on hover */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(displayContent).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                });
              }}
              className={`absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover/bubble:opacity-100 transition-opacity ${
                msg.role === 'user'
                  ? 'bg-indigo-700/80 hover:bg-indigo-600/90 text-white/80 hover:text-white'
                  : isDark
                    ? 'bg-gray-700/80 hover:bg-gray-600/90 text-gray-400 hover:text-gray-200'
                    : 'bg-gray-100/90 hover:bg-gray-200/90 text-gray-500 hover:text-gray-700'
              }`}
              aria-label={copied ? 'Copied!' : 'Copy message'}
              title={copied ? 'Copied!' : 'Copy'}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {/* Reaction buttons — shown on hover for AI messages */}
            {msg.role === 'assistant' && !isStreaming && (
              <div className="absolute -bottom-8 left-0 flex items-center gap-1 opacity-0 group-hover/bubble:opacity-100 transition-opacity">
                <button
                  onClick={() => setReaction(prev => prev === 'up' ? null : 'up')}
                  className={`p-1 rounded hover:bg-gray-700/50 transition-colors ${reaction === 'up' ? 'text-green-400' : 'text-gray-500'}`}
                  aria-label={reaction === 'up' ? 'Remove thumbs up' : 'Thumbs up'}
                  title={reaction === 'up' ? 'Remove' : 'Helpful'}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${reaction === 'up' ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={() => setReaction(prev => prev === 'down' ? null : 'down')}
                  className={`p-1 rounded hover:bg-gray-700/50 transition-colors ${reaction === 'down' ? 'text-red-400' : 'text-gray-500'}`}
                  aria-label={reaction === 'down' ? 'Remove thumbs down' : 'Thumbs down'}
                  title={reaction === 'down' ? 'Remove' : 'Not helpful'}
                >
                  <ThumbsDown className={`w-3.5 h-3.5 ${reaction === 'down' ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={() => setIsBookmarked(prev => !prev)}
                  className={`p-1 rounded hover:bg-gray-700/50 transition-colors ${isBookmarked ? 'text-amber-400' : 'text-gray-500'}`}
                  aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark message'}
                  title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Timestamp + TTS for AI messages */}
        <span className={`text-xs px-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        {msg.role === 'assistant' && hasContent && !isStreaming && (
          <button
            onClick={() => {
              if (speaking) {
                speechSynthesis.cancel();
                setSpeaking(false);
              } else {
                const utterance = new SpeechSynthesisUtterance(displayContent.replace(/[#*_`~\[\]]/g, ''));
                utterance.rate = 1.1;
                utterance.pitch = 1;
                utterance.onend = () => setSpeaking(false);
                utterance.onerror = () => setSpeaking(false);
                speechSynthesis.cancel();
                speechSynthesis.speak(utterance);
                setSpeaking(true);
              }
            }}
            className={`text-xs px-1 transition-colors ${isDark ? 'text-gray-600 hover:text-indigo-400' : 'text-gray-400 hover:text-indigo-600'}`}
            aria-label={speaking ? 'Stop reading aloud' : 'Read aloud'}
            title={speaking ? 'Stop' : 'Read aloud'}
          >
            {speaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
          </button>
        )}
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
  const { chats, activeChatId, isStreaming, error, streamingMessageId, streamingContent, tokensPerSecond, sendMessage, dismissError, lastSentMessage, lastUserMessage, regenerateLastResponse, deleteChat } = useChat();
  const { settings } = useSettings();
  const scrollRef = useRef<HTMLDivElement>(null);
  const emptyStateRef = useRef<HTMLDivElement>(null);
  const [isPinned, setIsPinned] = useState(true);
  // Show regenerate button briefly after a response completes
  const [showRegenerate, setShowRegenerate] = useState(false);
  const [showBookmarksPanel, setShowBookmarksPanel] = useState(false);
  const [chatCopied, setChatCopied] = useState(false);

  // Show regenerate briefly when streaming ends with a successful response
  useEffect(() => {
    if (isStreaming) return;
    if (lastUserMessage && activeChat?.messages.some(m => m.role === 'assistant')) {
      setShowRegenerate(true);
      const t = setTimeout(() => setShowRegenerate(false), 8000);
      return () => clearTimeout(t);
    }
  }, [isStreaming]);

  // Hide regenerate when user starts typing a new message
  useEffect(() => {
    if (lastSentMessage) setShowRegenerate(false);
  }, [lastSentMessage]);

  const isDark = settings.theme === 'dark';
  const chatTheme = settings.chatTheme;
  const isMidnight = chatTheme === 'midnight';
  const isOcean = chatTheme === 'ocean';
  const isForest = chatTheme === 'forest';
  const isSunset = chatTheme === 'sunset';
  const isMinimal = chatTheme === 'minimal';

  const activeChat = useMemo(() => 
    chats.find(c => c.id === activeChatId),
    [chats, activeChatId]
  );

  // Track if user manually scrolled up (unpinned)
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // If user scrolled >100px from bottom, unpin. If scrolled back to bottom, re-pin.
    if (distFromBottom > 100) {
      setIsPinned(false);
    } else if (distFromBottom < 20) {
      setIsPinned(true);
    }
  }, []);

  // Scroll to bottom when new messages arrive (only if pinned)
  useEffect(() => {
    if (isPinned && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeChat?.messages, streamingContent, isPinned]);

  // Focus management for empty state
  useEffect(() => {
    if (activeChat && activeChat.messages.length === 0 && emptyStateRef.current) {
      // Focus the first suggestion button when empty state is shown
      const firstButton = emptyStateRef.current.querySelector('button');
      firstButton?.focus();
    }
  }, [activeChat]);

  // Handle "scroll to message" events from ChatSearchModal
  useEffect(() => {
    const handleScrollToMessage = (e: Event) => {
      const { messageId } = (e as CustomEvent).detail;
      // Wait for render, then scroll
      requestAnimationFrame(() => {
        const el = scrollRef.current?.querySelector(`[data-message-id="${messageId}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight briefly
        el?.classList.add('ring-2', 'ring-indigo-500/50');
        setTimeout(() => el?.classList.remove('ring-2', 'ring-indigo-500/50'), 1500);
      });
    };
    window.addEventListener('chat:scroll-to-message', handleScrollToMessage);
    return () => window.removeEventListener('chat:scroll-to-message', handleScrollToMessage);
  }, []);

  const suggestions = SUGGESTIONS; // stable reference, no re-creation

  const handleSuggestionClick = useCallback(async (text: string) => {
    await sendMessage(text);
  }, [sendMessage]);

  const handleExportChat = useCallback(() => {
    if (!activeChat || activeChat.messages.length === 0) return;
    const lines: string[] = [
      `# ${activeChat.title || 'Chat Export'}`,
      `*Exported on ${new Date().toLocaleString()}*\n`,
    ];
    for (const msg of activeChat.messages) {
      const ts = new Date(msg.timestamp).toLocaleString();
      lines.push(`## ${msg.role === 'user' ? 'You' : 'Assistant'} — ${ts}`);
      lines.push(msg.content || '');
      lines.push('\n---\n');
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeChat]);

  const handleCopyChat = useCallback(async () => {
    if (!activeChat || activeChat.messages.length === 0) return;
    const lines: string[] = [
      `# ${activeChat.title || 'Chat Export'}`,
      `*Exported on ${new Date().toLocaleString()}*\n`,
    ];
    for (const msg of activeChat.messages) {
      const ts = new Date(msg.timestamp).toLocaleString();
      lines.push(`## ${msg.role === 'user' ? 'You' : 'Assistant'} — ${ts}`);
      lines.push(msg.content || '');
      lines.push('\n---\n');
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setChatCopied(true);
      setTimeout(() => setChatCopied(false), 2000);
    } catch {
      // clipboard unavailable silently ignored
    }
  }, [activeChat]);

  // Handle /export slash command from ChatInput
  useEffect(() => {
    const handleTriggerExport = () => handleExportChat();
    window.addEventListener('chat:trigger-export', handleTriggerExport);
    return () => window.removeEventListener('chat:trigger-export', handleTriggerExport);
  }, [handleExportChat]);

  // Detect network vs API errors for a more specific message
  const isNetworkError = error && (
    error.toLowerCase().includes('network') ||
    error.toLowerCase().includes('fetch') ||
    error.toLowerCase().includes('offline') ||
    error.toLowerCase().includes('failed to connect')
  );

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-4" role="alert" aria-live="assertive">
        <div className="text-center max-w-sm mx-auto">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
            isNetworkError ? 'bg-amber-500/10' : 'bg-red-500/10'
          }`}>
            {isNetworkError
              ? <WifiOff className="w-8 h-8 text-amber-400" aria-hidden="true" />
              : <Bot className="w-8 h-8 text-red-400" aria-hidden="true" />
            }
          </div>
          <h3 className={`text-lg font-semibold mb-2 ${isNetworkError ? 'text-amber-400' : 'text-red-400'}`} role="alert">
            {isNetworkError ? 'You appear to be offline' : 'Something went wrong'}
          </h3>
          <p className="text-gray-400 mb-6 text-sm leading-relaxed">{error}</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {lastSentMessage && (
              <button
                onClick={() => sendMessage(lastSentMessage)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors text-sm font-medium"
                aria-label="Retry last message"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                Retry
              </button>
            )}
            <button
              onClick={dismissError}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                isDark
                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200'
              }`}
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" aria-hidden="true" />
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex-1 flex flex-col h-full min-h-0 overflow-hidden relative ${
        isMidnight ? 'bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950' :
        isOcean ? 'bg-gradient-to-br from-slate-950 via-cyan-950 to-teal-950' :
        isForest ? 'bg-gradient-to-br from-slate-950 via-green-950 to-emerald-950' :
        isSunset ? 'bg-gradient-to-br from-slate-950 via-rose-950 to-orange-950' :
        isMinimal ? 'bg-neutral-950' :
        'bg-gradient-to-br from-gray-950 via-slate-900 to-indigo-950'
      }`}
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-6 md:py-8 lg:py-10 px-4 md:px-8 lg:px-12"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {/* Export button — only shown when chat has messages */}
        {activeChat && activeChat.messages.length > 0 && (
          <div className="max-w-4xl mx-auto flex justify-end gap-2 mb-2">
            <button
              onClick={() => setShowBookmarksPanel(prev => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                showBookmarksPanel
                  ? isDark ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-amber-50 text-amber-600 border border-amber-200'
                  : isDark
                    ? 'text-gray-500 hover:text-amber-400 hover:bg-gray-800'
                    : 'text-gray-400 hover:text-amber-600 hover:bg-gray-100'
              }`}
              aria-label="Toggle bookmarks panel"
              aria-pressed={showBookmarksPanel}
              title="Bookmarks"
            >
              <Bookmark className={`w-3.5 h-3.5 ${showBookmarksPanel ? 'fill-current' : ''}`} />
              Bookmarks
            </button>
            <button
              onClick={handleExportChat}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isDark
                  ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="Export chat as Markdown"
              title="Export as Markdown"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Export
            </button>
            <button
              onClick={handleCopyChat}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                chatCopied
                  ? isDark
                    ? 'text-green-400 bg-green-500/10'
                    : 'text-green-600 bg-green-50'
                  : isDark
                    ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              aria-label={chatCopied ? 'Copied!' : 'Copy chat as Markdown'}
              title="Copy as Markdown"
            >
              {chatCopied
                ? <Check className="w-3.5 h-3.5" aria-hidden="true" />
                : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
              {chatCopied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={() => {
                if (window.confirm('Delete this chat? This cannot be undone.')) {
                  deleteChat(activeChatId ?? '');
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isDark
                  ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10'
                  : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
              }`}
              aria-label="Delete active chat"
              title="Delete chat"
            >
              <Trash className="w-3.5 h-3.5" aria-hidden="true" />
              Delete
            </button>
          </div>
        )}
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
                <div key={msg.id} data-message-id={msg.id}>
                <MessageItem
                  msg={msg}
                  isStreaming={isMessageStreaming}
                  isLast={isLast}
                  streamingContent={isMessageStreaming ? streamingContent : ''}
                  chatTheme={chatTheme}
                  activeChatId={activeChatId ?? ''}
                />
                </div>
              );
            })}
            
            {/* Show skeleton when streaming but no message content yet */}
            {isStreaming && activeChat?.messages.length === 0 && (
              <MessageSkeleton />
            )}

            {/* Floating "scroll to bottom" button — shown when unpinned */}
            {!isPinned && (
              <button
                onClick={() => {
                  setIsPinned(true);
                  if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                  }
                }}
                className={`sticky bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg transition-colors z-10 ${
                  isDark
                    ? 'bg-gray-700/90 text-gray-200 hover:bg-gray-600/90'
                    : 'bg-white/90 text-gray-700 hover:bg-gray-100 shadow-black/20'
                }`}
                aria-label="Scroll to latest messages"
              >
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                Jump to latest
              </button>
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

      {/* Regenerate button — shown briefly after a successful response */}
      {showRegenerate && !isStreaming && activeChat && activeChat.messages.length > 0 && (
        <div
          className={`absolute bottom-0 left-0 right-0 flex items-center justify-center py-3 gap-3 ${isDark ? 'bg-gradient-to-t from-gray-950 to-transparent' : 'bg-gradient-to-t from-white to-transparent'}`}
        >
          <button
            onClick={() => regenerateLastResponse()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 hover:border-indigo-500/30 transition-colors text-sm font-medium"
            aria-label="Regenerate last response"
            title="Generate a new response to your last message"
          >
            <RotateCw className="w-4 h-4" aria-hidden="true" />
            Regenerate
          </button>
          <button
            onClick={() => setShowRegenerate(false)}
            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs transition-colors ${isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Bookmarks panel */}
      {showBookmarksPanel && <BookmarkPanel onClose={() => setShowBookmarksPanel(false)} />}
    </div>
  );
};