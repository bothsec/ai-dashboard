/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/preserve-manual-memoization */
import { useRef, useEffect, memo, useMemo, useCallback, useState } from 'react';
import { useChat } from '../context/ChatContext';
import { useSettings } from '../context/SettingsContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import { Bot, Loader2, RefreshCw, X, WifiOff, Download, Volume2, VolumeX, Copy, Check, ChevronDown, RotateCw, Trash, Quote, Play, Search, Sparkles, MoreHorizontal, Edit2 } from 'lucide-react';
import 'highlight.js/styles/github-dark.css';
import type { Message, ChatTheme } from '../types/chat';

// Stable — no component-state dependency
const SUGGESTIONS = [
  { icon: '📄', text: 'Write my Khmer/English CV' },
  { icon: '💼', text: 'Prepare for a job interview' },
  { icon: '🌐', text: 'Translate Khmer to English' },
  { icon: '💰', text: 'Check if my salary offer is fair' },
];

// Khmer/Cambodia-focused home suggestions — gated by 'homeSuggestions' admin flag
const KHMER_SUGGESTIONS = [
  { icon: '📄', text: 'Write my Khmer/English CV' },
  { icon: '🎯', text: 'Prepare me for a job interview' },
  { icon: '🌐', text: 'Translate Khmer to English professionally' },
  { icon: '📜', text: 'Explain my Cambodian labor contract' },
  { icon: '✉️', text: 'Write a cover letter for a Phnom Penh job' },
  { icon: '💰', text: 'Check if my salary offer is fair' },
];

export type MessageLabel = 'important' | 'question' | 'todo' | 'idea' | 'code' | null;

export const LABEL_OPTIONS: { value: MessageLabel; label: string; color: string; bgClass: string; textClass: string }[] = [
  { value: 'important', label: 'Important', color: 'text-red-400',   bgClass: 'bg-red-500/20 border-red-500/40',   textClass: 'text-red-400'   },
  { value: 'question',  label: 'Question', color: 'text-blue-400',   bgClass: 'bg-blue-500/20 border-blue-500/40',   textClass: 'text-blue-400'   },
  { value: 'todo',      label: 'Todo',      color: 'text-green-400',  bgClass: 'bg-green-500/20 border-green-500/40', textClass: 'text-green-400'  },
  { value: 'idea',      label: 'Idea',      color: 'text-purple-400', bgClass: 'bg-purple-500/20 border-purple-500/40', textClass: 'text-purple-400' },
  { value: 'code',      label: 'Code',      color: 'text-orange-400', bgClass: 'bg-orange-500/20 border-orange-500/40', textClass: 'text-orange-400' },
];

const LABEL_STORAGE_KEY = 'message_labels';

const KHMER_SCRIPT_REGEX = /[\u1780-\u17FF]/;

function hasKhmerText(text: string): boolean {
  return KHMER_SCRIPT_REGEX.test(text);
}

// Detect if a message likely got cut off mid-sentence
function looksTruncated(content: string): boolean {
  if (!content || content.trim().length < 30) return false;
  const trimmed = content.trim();
  // Ends with no terminal punctuation (., !, ?, —, |) or ellipsis
    if (!/[.!?—|]$/.test(trimmed)) return true;
    // Trailing incomplete indicator
    if (/[[({]$/.test(trimmed)) return true;
  return false;
}


// In-chat search: find messages whose content contains the query
function getChatSearchResults(messages: Message[], query: string): Message[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return messages.filter(m => m.content.toLowerCase().includes(q));
}
interface MessageItemProps {
  msg: Message;
  isStreaming: boolean;
  isLast: boolean;
  streamingContent: string;
  chatTheme: ChatTheme;
}

const MessageItem = memo(({ msg, isStreaming, isLast, streamingContent, chatTheme }: MessageItemProps) => {
  const { settings } = useSettings();
  const { editMessage } = useChat();
  const [speaking, setSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);

  const [messageLabel, setMessageLabel] = useState<MessageLabel>(() => {
    try {
      const stored = localStorage.getItem(LABEL_STORAGE_KEY);
      if (stored) {
        const labels = JSON.parse(stored) as Record<string, MessageLabel>;
        return labels[msg.id] ?? null;
      }
    } catch { /* ignore */ }
    return null;
  });

  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Persist message label to localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LABEL_STORAGE_KEY);
      const labels: Record<string, MessageLabel> = stored ? JSON.parse(stored) : {};
      if (messageLabel) {
        labels[msg.id] = messageLabel;
      } else {
        delete labels[msg.id];
      }
      localStorage.setItem(LABEL_STORAGE_KEY, JSON.stringify(labels));
    } catch { /* ignore */ }
  }, [messageLabel, msg.id]);

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
  const useKhmerFont = hasKhmerText(displayContent);
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

  // Assistant responses are intentionally flat: no border, no shadow, no bubble chrome.
  const assistantResponseClass = isDark ? 'text-gray-100 rounded-none' : 'text-gray-900 rounded-none';

  return (
    <div 
      className={`flex gap-0 group animate-in slide-in-from-bottom-4 fade-in duration-300 py-2 ${
        msg.role === 'user' ? 'flex-row-reverse' : ''
      }`}
      role="listitem"
      aria-label={`${msg.role === 'user' ? 'You' : 'Assistant'} message`}
    >
      <div className={`flex flex-col space-y-2 ${
        msg.role === 'assistant' ? 'w-full max-w-full' : 'w-fit max-w-[92%] sm:max-w-[85%] md:max-w-[75%] lg:max-w-[70%]'
      } ${
        msg.role === 'user' ? 'items-end' : ''
      }`}>

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
          <div className={`relative group/bubble ${msg.role === 'assistant' ? 'w-full' : 'w-fit self-end'}`}>
            {/* Label badge */}
            {messageLabel && (() => {
              const opt = LABEL_OPTIONS.find(o => o.value === messageLabel);
              if (!opt) return null;
              return (
                <div className={`absolute -top-2 right-2 z-10 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border shadow-sm ${opt.bgClass} ${opt.textClass}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${opt.color.replace('text-', 'bg-')}`} aria-hidden="true" />
                  {opt.label}
                </div>
              );
            })()}
            <div
              className={`px-5 py-4 duration-200 ${
                msg.role === 'user'
                  ? `bg-gradient-to-br ${userAccent.bubble} text-white rounded-2xl rounded-tr-md`
                  : assistantResponseClass
              }`}
            >
              <div className={`text-[15px] md:text-[15px] leading-[1.75] ${
                msg.role === 'user' ? '' : 'prose prose-invert dark:prose-invert max-w-none'
              } ${useKhmerFont ? 'font-khmer' : ''}`}>
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
                            <span className={`absolute top-2 left-3 text-[10px] font-mono font-semibold uppercase tracking-wider text-gray-500`}>
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

          </div>
        )}

        {/* Timestamp + TTS + assistant actions */}
        <div className="relative flex items-center gap-1 px-1">
          <span className="text-xs text-gray-500">
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {msg.role === 'user' && hasContent && !isStreaming && (
            <button
              onClick={() => {
                const next = window.prompt('Edit message and regenerate response:', msg.content);
                if (next !== null && next.trim() && next !== msg.content) {
                  editMessage(msg.id, next);
                }
              }}
              className="text-xs px-1 transition-colors text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400"
              aria-label="Edit message and regenerate response"
              title="Edit and regenerate"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {msg.role === 'assistant' && hasContent && !isStreaming && (
            <>
              <button
                onClick={() => {
                  if (speaking) {
                    speechSynthesis.cancel();
                    setSpeaking(false);
                  } else {
                    const utterance = new SpeechSynthesisUtterance(displayContent.replace(/[#*_`~[\]]/g, ''));
                    utterance.rate = 1.1;
                    utterance.pitch = 1;
                    utterance.onend = () => setSpeaking(false);
                    utterance.onerror = () => setSpeaking(false);
                    speechSynthesis.cancel();
                    speechSynthesis.speak(utterance);
                    setSpeaking(true);
                  }
                }}
                className="text-xs px-1 transition-colors text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                aria-label={speaking ? 'Stop reading aloud' : 'Read aloud'}
                title={speaking ? 'Stop' : 'Read aloud'}
              >
                {speaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              </button>
              <button
                onClick={() => setShowActionsMenu(prev => !prev)}
                className="text-xs px-1 transition-colors text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                aria-label="More message actions"
                title="More"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
              {showActionsMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowActionsMenu(false)}
                    aria-hidden="true"
                  />
                  <div className={`absolute bottom-full left-12 mb-1 z-50 rounded-lg border shadow-xl py-1 min-w-[150px] ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className={`px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Label</div>
                    <button
                      onClick={() => { setMessageLabel(null); setShowActionsMenu(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${isDark ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                    >
                      No label
                    </button>
                    {LABEL_OPTIONS.map(opt => (
                      <button
                        key={opt.value!}
                        onClick={() => { setMessageLabel(opt.value); setShowActionsMenu(false); }}
                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${messageLabel === opt.value ? opt.textClass : isDark ? 'text-gray-300' : 'text-gray-700'}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${opt.color.replace('text-', 'bg-')}`} aria-hidden="true" />
                        {opt.label}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('chat:quote', {
                          detail: { id: msg.id, content: msg.content, role: msg.role },
                        }));
                        setShowActionsMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                      <Quote className="w-3.5 h-3.5" />
                      Quote
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});

// Loading skeleton for messages
const MessageSkeleton = memo(() => {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  
  return (
    <div className="flex gap-0 py-2" role="status" aria-label="Loading message">
      <div className="flex flex-col space-y-2 w-full max-w-full">
        {/* Bubble skeleton */}
        <div className={`w-full px-4 md:px-5 py-4 rounded-none ${
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
  const { chats, activeChatId, isStreaming, error, streamingMessageId, streamingContent, sendMessage, dismissError, lastSentMessage, lastUserMessage, regenerateLastResponse, deleteChat, continueResponse } = useChat();
  const { settings, isFeatureEnabled } = useSettings();
  const scrollRef = useRef<HTMLDivElement>(null);
  const emptyStateRef = useRef<HTMLDivElement>(null);
  const [isPinned, setIsPinned] = useState(true);
  // Show regenerate button briefly after a response completes
  const [showRegenerate, setShowRegenerate] = useState(false);
  const [chatCopied, setChatCopied] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState<string>('');
  const [chatSearchIndex, setChatSearchIndex] = useState(0);
  const chatSearchInputRef = useRef<HTMLInputElement>(null);

  const isDark = settings.theme === 'dark';
  const chatTheme = settings.chatTheme;

  const activeChat = useMemo(() =>
    chats.find(c => c.id === activeChatId),
    [chats, activeChatId]
  );

  // Show regenerate briefly when streaming ends with a successful response
  useEffect(() => {
    if (isStreaming) return;
    if (lastUserMessage && activeChat?.messages.some(m => m.role === 'assistant')) {
      setShowRegenerate(true);
      const t = setTimeout(() => setShowRegenerate(false), 8000);
      return () => clearTimeout(t);
    }
  }, [isStreaming, lastUserMessage, activeChat?.messages]);

  // Hide regenerate when user starts typing a new message
  useEffect(() => {
    if (lastSentMessage) setShowRegenerate(false);
  }, [lastSentMessage]);

  // Check if the last assistant message looks truncated (ends mid-sentence)
  const lastAssistantLooksTruncated = useMemo(() => {
    if (!activeChat || activeChat.messages.length === 0) return false;
    const msgs = activeChat.messages;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'assistant' && msgs[i].content) {
        return looksTruncated(msgs[i].content);
      }
    }
    return false;
  }, [activeChat]);

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

  // Compute search results (stable, derived from state)
  const chatSearchResults = getChatSearchResults(
    activeChat?.messages ?? [],
    (chatSearchQuery as string) === '__open__' ? '' : chatSearchQuery
  );

  const openChatSearch = useCallback(() => {
    setChatSearchQuery('__open__');
    requestAnimationFrame(() => chatSearchInputRef.current?.focus());
  }, []);

  const closeChatSearch = useCallback(() => {
    setChatSearchQuery('');
    setChatSearchIndex(0);
  }, []);

  const navigateChatSearch = useCallback((direction: 'next' | 'prev') => {
    if (chatSearchResults.length === 0) return;
    const next = direction === 'next'
      ? (chatSearchIndex + 1) % chatSearchResults.length
      : (chatSearchIndex - 1 + chatSearchResults.length) % chatSearchResults.length;
    setChatSearchIndex(next);
    const msgId = chatSearchResults[next].id;
    requestAnimationFrame(() => {
      const el = scrollRef.current?.querySelector(`[data-message-id="${msgId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.classList.add('ring-2', 'ring-amber-500/60');
      setTimeout(() => el?.classList.remove('ring-2', 'ring-amber-500/60'), 1500);
    });
  }, [chatSearchResults, chatSearchIndex]);

  // Ctrl+F / F3 / Escape keyboard handler for in-chat search
  useEffect(() => {
    const handleSearchKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        openChatSearch();
      }
      if (e.key === 'F3' && chatSearchQuery && chatSearchQuery !== '__open__') {
        e.preventDefault();
        navigateChatSearch(e.shiftKey ? 'prev' : 'next');
      }
      if (e.key === 'Escape' && chatSearchQuery) {
        closeChatSearch();
      }
    };
    window.addEventListener('keydown', handleSearchKeyDown);
    return () => window.removeEventListener('keydown', handleSearchKeyDown);
  }, [chatSearchQuery, chatSearchIndex, openChatSearch, closeChatSearch, navigateChatSearch]);

  const suggestions = isFeatureEnabled('homeSuggestions') ? KHMER_SUGGESTIONS : SUGGESTIONS;

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
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} mb-6 text-sm leading-relaxed`}>
            {isNetworkError
              ? 'Check your internet connection and try again.'
              : 'The AI failed to respond. Please try again or rephrase your message.'}
          </p>
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

  // Theme-aware background — dark mode: rich dark gradients; light mode: clean white/gray
  const chatBgClass = (() => {
    const t = chatTheme;
    const d = isDark;
    if (t === 'midnight') return d
      ? 'bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950'
      : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50';
    if (t === 'ocean') return d
      ? 'bg-gradient-to-br from-slate-950 via-cyan-950 to-teal-950'
      : 'bg-gradient-to-br from-slate-50 via-cyan-50 to-teal-50';
    if (t === 'forest') return d
      ? 'bg-gradient-to-br from-slate-950 via-green-950 to-emerald-950'
      : 'bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50';
    if (t === 'sunset') return d
      ? 'bg-gradient-to-br from-slate-950 via-rose-950 to-orange-950'
      : 'bg-gradient-to-br from-slate-50 via-rose-50 to-orange-50';
    if (t === 'minimal') return d
      ? 'bg-neutral-950'
      : 'bg-neutral-100';
    return d
      ? 'bg-gradient-to-br from-gray-950 via-slate-900 to-indigo-950'
      : 'bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50';
  })();

  return (
    <div
      className={`flex-1 flex flex-col h-full min-h-0 overflow-hidden relative ${chatBgClass}`}
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-4 sm:py-6 md:py-8 lg:py-10 px-3 sm:px-5 md:px-8 lg:px-12 scroll-touch"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {/* Export button — only shown when chat has messages */}
        {activeChat && activeChat.messages.length > 0 && (
          <div className="max-w-5xl mx-auto flex justify-end gap-2 mb-3 overflow-x-auto pb-1">
            <button
              onClick={handleExportChat}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isDark
                  ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                  : 'text-gray-500 hover:text-gray-600 hover:bg-gray-100'
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
                    : 'text-gray-500 hover:text-gray-600 hover:bg-gray-100'
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
                  : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
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
            className="min-h-full flex flex-col items-center justify-center text-center pt-20 md:pt-20 pb-8"
          >
            {/* Logo/Brand */}
            <div className="relative mb-6 md:mb-8">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/30 animate-in zoom-in duration-500" role="img" aria-label="Khmer Career Assistant logo">
                <span className="text-2xl md:text-3xl" aria-hidden="true">🇰🇭</span>
              </div>
              <div className="absolute -inset-4 md:-inset-6 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-3xl md:rounded-4xl blur-2xl -z-10" aria-hidden="true" />
            </div>
            
            <h2 className={`text-2xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-3 md:mb-4 ${isDark ? 'text-white' : 'text-gray-950'}`}>
              Your Khmer Career Assistant
            </h2>
            <p className={`mb-8 md:mb-10 max-w-md text-base md:text-lg ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {isFeatureEnabled('homeSuggestions')
                ? 'Career guidance, writing help & productivity tools for Cambodian professionals'
                : 'CV writing, interview prep, translations & salary advice'}
            </p>
            
            {/* Quick suggestions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3 w-full max-w-3xl" role="list" aria-label="Suggested prompts">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  className={`flex items-center gap-3 px-4 md:px-5 py-4 rounded-2xl text-sm md:text-base text-left transition-all duration-200 active:scale-[0.99] md:hover:-translate-y-0.5 ${
                    isDark
                      ? 'bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-white/15 text-gray-300 hover:text-white shadow-sm shadow-black/20'
                      : 'bg-white/80 hover:bg-white border border-gray-200/80 hover:border-gray-300 text-gray-700 hover:text-gray-950 shadow-sm shadow-gray-900/5'
                  }`}
                  style={{ animationDelay: `${i * 100}ms` }}
                  role="listitem"
                  aria-label={`${suggestion.icon} ${suggestion.text}`}
                >
                  <span className="text-xl md:text-2xl" aria-hidden="true">{suggestion.icon}</span>
                  <span className="font-semibold">{suggestion.text}</span>
                </button>
              ))}
            </div>

            {/* Open Tools button — gated by toolsHome feature flag */}
            {isFeatureEnabled('toolsHome') && (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('tools:open'))}
                className={`mt-6 md:mt-8 inline-flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 rounded-full text-sm md:text-base font-medium transition-all duration-200 hover:-translate-y-0.5 ${
                  isDark
                    ? 'bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 hover:border-indigo-400 text-indigo-300 hover:text-indigo-200'
                    : 'bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-300 text-indigo-700 hover:text-indigo-800'
                }`}
                aria-label="Open Khmer productivity tools"
              >
                <Sparkles className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />
                Browse Khmer tools
              </button>
            )}
          </div>
        ) : (
          <>
            {/* In-chat search bar — shown when Ctrl+F has been pressed */}
            {(chatSearchQuery !== '' || (chatSearchQuery as string) === '__open__') && activeChat && activeChat.messages.length > 0 && (
              <div className="max-w-5xl mx-auto mb-3 flex items-center gap-2 px-3 py-2 rounded-2xl border shadow-lg z-10"
                style={{
                  backgroundColor: isDark ? 'rgba(17,24,39,0.95)' : 'rgba(255,255,255,0.95)',
                  borderColor: isDark ? 'rgba(75,85,99,0.6)' : 'rgba(209,213,219,0.8)',
                }}
                role="search"
                aria-label="Search within chat"
              >
                <Search className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} aria-hidden="true" />
                <input
                  ref={chatSearchInputRef}
                  type="text"
                  value={(chatSearchQuery as string) === '__open__' ? '' : chatSearchQuery}
                  onChange={(e) => {
                    setChatSearchQuery(e.target.value);
                    setChatSearchIndex(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (e.shiftKey) navigateChatSearch('prev');
                      else navigateChatSearch('next');
                    }
                    if (e.key === 'Escape') closeChatSearch();
                  }}
                  placeholder="Search messages…"
                  className={`flex-1 bg-transparent text-sm outline-none ${isDark ? 'text-gray-100 placeholder:text-gray-500' : 'text-gray-900 placeholder:text-gray-400'}`}
                  aria-label="Search query"
                  autoFocus={(chatSearchQuery as string) === '__open__'}
                />
                {chatSearchResults.length > 0 ? (
                  <>
                    <span className={`text-xs font-medium shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} aria-live="polite">
                      {chatSearchIndex + 1} / {chatSearchResults.length}
                    </span>
                    <button
                      onClick={() => navigateChatSearch('prev')}
                      className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                      aria-label="Previous match"
                      title="Previous (Shift+F3)"
                    >
                      <ChevronDown className="w-3.5 h-3.5 rotate-180" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => navigateChatSearch('next')}
                      className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                      aria-label="Next match"
                      title="Next (F3)"
                    >
                      <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </>
                ) : chatSearchQuery && chatSearchQuery !== '__open__' ? (
                  <span className={`text-xs text-gray-500`}>No matches</span>
                ) : null}
                <button
                  onClick={closeChatSearch}
                  className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                  aria-label="Close search"
                  title="Close (Esc)"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            )}

            {/* Messages list */}
            <div className="max-w-5xl mx-auto" role="list" aria-label="Chat messages">
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
          </>
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
        </div>
      )}

      {/* Regenerate / Continue Reading bar — shown briefly after a successful response */}
      {((showRegenerate && !isStreaming) || (lastAssistantLooksTruncated && !isStreaming)) && activeChat && activeChat.messages.length > 0 && (
        <div
          className={`absolute bottom-0 left-0 right-0 flex items-center justify-center py-3 gap-3 ${isDark ? 'bg-gradient-to-t from-gray-950 to-transparent' : 'bg-gradient-to-t from-white to-transparent'}`}
        >
          {lastAssistantLooksTruncated && (
            <button
              onClick={() => continueResponse()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/30 transition-colors text-sm font-medium"
              aria-label="Continue reading"
              title="Continue the response from where it was cut off"
            >
              <Play className="w-4 h-4" aria-hidden="true" />
              Continue reading
            </button>
          )}
          {showRegenerate && (
            <>
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
                className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs transition-colors text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};