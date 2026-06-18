import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { useChat } from '../context/ChatContext';
import { useSettings } from '../context/SettingsContext';
import { Send, Loader2, Link, Sparkles, Edit2, RefreshCw, MessageSquare, X, Minimize2, Maximize2, Eye, EyeOff, FileText, MessageSquarePlus, BookOpen, Briefcase } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import PromptEngineer from './PromptEngineer';
import { StreamingHUD } from './StreamingHUD';
import { SmartReplyPopover } from './SmartReplyPopover';
import { KhmerPhrasebank } from './KhmerPhrasebank';
import { JobQuickReplies } from './JobQuickReplies';
import { detectCurrencies, type DetectedCurrency } from '../utils/currencyDetector';

// Regex to detect a standalone URL in input
const URL_REGEX = /^https?:\/\/[^\s]+$/;

const DRAFT_KEY = 'chat_draft';
const COMPACT_KEY = 'chat_input_compact';

// Strip markdown syntax for quoted text preview (safe to use in UI)
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')         // remove code blocks
    .replace(/`[^`]+`/g, (m) => m.slice(1, -1)) // inline code → text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')   // images: ![alt](url) → alt
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')    // links: [text](url) → text
    .replace(/^#{1,6}\s+/gm, '')              // headings
    .replace(/[*_~`>]/g, '')               // bold, italic, strikethrough, blockquote
    .replace(/\n{2,}/g, ' ')               // collapse blank lines
    .replace(/\s{2,}/g, ' ')               // collapse spaces
    .trim();
}

interface QuotedMessage {
  id: string;
  content: string;
  role: string;
}

export const ChatInput = memo(() => {
  const [input, setInput] = useState(() => {
    try { return localStorage.getItem(DRAFT_KEY) ?? ''; } catch { return ''; }
  });
  const [isFocused, setIsFocused] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [showPromptEngineer, setShowPromptEngineer] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [quotedMessage, setQuotedMessage] = useState<QuotedMessage | null>(null);
  const [isCompact, setIsCompact] = useState(() => {
    try { return localStorage.getItem(COMPACT_KEY) === 'true'; } catch { return false; }
  });
  const [showPreview, setShowPreview] = useState(false);
  const [showSmartReply, setShowSmartReply] = useState(false);
  const [showKhmerPhrasebank, setShowKhmerPhrasebank] = useState(false);
  const [showJobQuickReplies, setShowJobQuickReplies] = useState(false);
  const [detectedCurrencies, setDetectedCurrencies] = useState<DetectedCurrency[]>([]);
  const { sendMessage, isStreaming, cancelStream, createNewChat, clearMessages, editLastMessage, lastSentMessage, error, retryLastMessage } = useChat();
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);

  const canSubmit = input.trim().length > 0 && !isStreaming;

  // Persist draft to localStorage on every change (except when editing last message)
  useEffect(() => {
    if (!isEditing) {
      try { localStorage.setItem(DRAFT_KEY, input); } catch { /* ignore */ }
    }
  }, [input, isEditing]);

  // Persist compact mode preference
  useEffect(() => {
    try { localStorage.setItem(COMPACT_KEY, String(isCompact)); } catch { /* ignore */ }
  }, [isCompact]);

  // Detect currency amounts for inline conversion
  useEffect(() => {
    if (!input.trim()) { setDetectedCurrencies([]); return; }
    try {
      const detected = detectCurrencies(input);
      setDetectedCurrencies(detected);
    } catch { setDetectedCurrencies([]); }
  }, [input]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K: Focus input
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        textareaRef.current?.focus();
      }
      // Ctrl/Cmd + Shift + P: Toggle markdown preview
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setShowPreview(prev => !prev);
      }
      // Escape: Cancel streaming (handled globally in App, but kept here for local focus)
      if (e.key === 'Escape' && isStreaming) {
        e.preventDefault();
        cancelStream();
      }
    };

    // Listen for pe:close event dispatched by App.tsx Escape handler
    const handlePeClose = () => setShowPromptEngineer(false);

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('pe:close', handlePeClose);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('pe:close', handlePeClose);
    };
  }, [isStreaming, cancelStream]);

  // Listen for quote events from ChatWindow message bubbles
  useEffect(() => {
    const handleQuote = (e: Event) => {
      const { id, content, role } = (e as CustomEvent<QuotedMessage>).detail;
      setQuotedMessage({ id, content: stripMarkdown(content), role });
    };
    window.addEventListener('chat:quote', handleQuote);
    return () => window.removeEventListener('chat:quote', handleQuote);
  }, []);

  const handleClearQuote = useCallback(() => {
    setQuotedMessage(null);
  }, []);

  // --- Document Drop / Upload ---
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processDocumentFile = async (file: File) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(file.type)) {
      setDocError('Only PDF and DOCX files are supported');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setDocError('File too large (max 5MB)');
      return;
    }
    setIsProcessingDoc(true);
    setDocError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/document', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to parse document');
      const docPrompt = `Here's the content of "${file.name}":\n\n${data.text}\n\nPlease answer my questions about this document.`;
      await sendMessage(docPrompt);
    } catch (err) {
      setDocError(err instanceof Error ? err.message : 'Failed to process document');
    } finally {
      setIsProcessingDoc(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processDocumentFile(file);
  };

  // --- URL Summarizer ---
  const handleSummarize = async () => {
    const url = input.trim();
    if (!URL_REGEX.test(url)) return;
    setIsSummarizing(true);
    setSummaryError(null);
    try {
      const res = await fetch(`/api/summarize?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to summarize');
      // Prepend summary as context, original URL as reference
      const summary = `Here's a summary of "${data.title}" (${data.siteName ?? url}):\n\n${data.text}\n\n---\nSource: ${url}`;
      setInput(summary);
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : 'Failed to summarize');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();

    // Slash commands — handled before any other logic
    if (trimmed === '/new') {
      setInput('');
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      createNewChat();
      return;
    }
    if (trimmed === '/clear') {
      setInput('');
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      clearMessages();
      return;
    }
    if (trimmed === '/export') {
      setInput('');
      window.dispatchEvent(new CustomEvent('chat:trigger-export'));
      return;
    }

    if (!canSubmit) return;

    const quotedPrefix = quotedMessage
      ? `> ${quotedMessage.content.slice(0, 200)}\n\n`
      : '';
    const messageContent = quotedPrefix + trimmed;

    setInput('');
    setQuotedMessage(null);
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsEditing(false);

    if (isEditing) {
      await editLastMessage(messageContent);
    } else {
      await sendMessage(messageContent);
    }
    // Restore focus to textarea after sending
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isEditing) {
      setIsEditing(false);
      setInput('');
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea - with cleanup
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const resizeTextarea = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    };
    
    resizeTextarea();
    
    // Use ResizeObserver for more reliable height tracking
    const resizeObserver = new ResizeObserver(resizeTextarea);
    resizeObserver.observe(textarea);
    
    return () => resizeObserver.disconnect();
  }, [input]);

  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0;
  const charCount = input.length;

  return (
    <div className={`shrink-0 px-3 md:px-6 lg:px-12 ${isCompact ? 'py-1 md:py-1.5 lg:py-2' : 'py-2 md:py-3 lg:py-4'} ${isDark ? '' : 'bg-white/50'}`}>
      <div className="max-w-3xl lg:max-w-2xl mx-auto">
        {/* Prompt Engineer panel */}
        {showPromptEngineer && (
          <div className="mb-3">
            <PromptEngineer
              onUse={(prompt) => {
                setInput(prompt);
                setShowPromptEngineer(false);
                setTimeout(() => textareaRef.current?.focus(), 50);
              }}
              onClose={() => setShowPromptEngineer(false)}
              disabled={isStreaming}
            />
          </div>
        )}

        {/* Quoted message preview — shown when user clicked Quote on a message */}
        {quotedMessage && (
          <div className="mb-2 flex items-start gap-2 px-3 py-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10">
            <MessageSquare className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className={`text-[11px] font-medium mb-0.5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                {quotedMessage.role === 'user' ? 'You' : 'Assistant'}
              </p>
              <p className={`text-xs leading-relaxed line-clamp-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {quotedMessage.content}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearQuote}
              className={`shrink-0 p-1 rounded-lg transition-colors ${isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
              aria-label="Remove quoted message"
              title="Remove quote"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ChatGPT-style input container */}
        <form
          className={`relative flex items-center gap-1.5 md:gap-2 rounded-full px-2 md:px-3 py-1.5 md:py-2 transition-all duration-300 ${isCompact ? '!py-1' : ''} ${
            isDragOver
              ? isDark
                ? 'bg-indigo-900/40 border-2 border-dashed border-indigo-400'
                : 'bg-indigo-50 border-2 border-dashed border-indigo-400'
              : isFocused || isEditing
              ? isDark
                ? 'bg-gray-800/90 shadow-2xl shadow-black/40 border border-gray-600/50'
                : 'bg-white/90 shadow-lg shadow-gray-900/10 border border-gray-300'
              : isDark
                ? 'bg-gray-800/60 hover:bg-gray-800/70 border border-gray-700/30 hover:border-gray-600/40'
                : 'bg-white/60 hover:bg-white/80 border border-gray-200 hover:border-gray-300'
          } ${isEditing ? (isDark ? '!border-blue-500/50' : '!border-blue-400') : ''}`}
          onSubmit={handleSubmit}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleFileDrop}
          aria-label="Message input form"
        >
          {/* Drag-over overlay */}
          {isDragOver && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full pointer-events-none z-10">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white'
              }`}>
                <FileText className="w-4 h-4" />
                Drop PDF or DOCX to analyze
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processDocumentFile(file);
              e.target.value = '';
            }}
            aria-hidden="true"
          />
          {/* Prompt Engineer button */}
          <button
            type="button"
            onClick={() => setShowPromptEngineer(prev => !prev)}
            className={`transition-colors duration-200 p-1 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'text-violet-400 hover:text-violet-300 hover:bg-gray-700/50' : 'text-violet-600 hover:text-violet-700 hover:bg-gray-100'} ${showPromptEngineer ? (isDark ? 'bg-gray-700/60 text-violet-300' : 'bg-violet-100 text-violet-700') : ''}`}
            aria-label="Prompt Engineer"
            title="Prompt Engineer — craft better prompts"
          >
            <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          {/* Textarea / Markdown preview */}
          <div className="flex-1 min-w-0 flex items-center">
            {showPreview && input.trim() ? (
              <div
                className={`w-full overflow-y-auto max-h-48 rounded-lg px-3 py-2 prose prose-sm max-w-none ${
                  isDark ? 'text-gray-200 bg-gray-800/50' : 'text-gray-800 bg-gray-50'
                }`}
                aria-label="Markdown preview"
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSanitize]}
                  components={{
                    p: ({ children }) => <p className="mb-1 last:mb-0 leading-relaxed">{children}</p>,
                    code: ({ className, children }) => {
                      const isInline = !className;
                      if (isInline) {
                        return (
                          <code className={isDark ? 'bg-gray-700/60 px-1 py-0.5 rounded text-xs font-mono text-indigo-300' : 'bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-indigo-600'}>
                            {children}
                          </code>
                        );
                      }
                      return <code className={className}>{children}</code>;
                    },
                    pre: ({ children }) => (
                      <pre className={`text-xs overflow-x-auto rounded-lg p-2 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>{children}</pre>
                    ),
                    a: ({ href, children }) => {
                      const isSafe = href && /^(https?:|mailto:|tel:)/.test(href);
                      if (!isSafe) return <span>{children}</span>;
                      return <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline underline-offset-2">{children}</a>;
                    },
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5">{children}</ol>,
                  }}
                >
                  {input}
                </ReactMarkdown>
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={isEditing ? 'Edit your message… (Enter to resend, Esc to cancel)' : 'Message AI…'}
                rows={1}
                className={`w-full bg-transparent border-none outline-none resize-none leading-relaxed text-sm py-0.5 max-h-32 focus:outline-none focus:ring-0 ${
                  isDark ? 'text-gray-100 placeholder:text-gray-500' : 'text-gray-900 placeholder:text-gray-400'
                }`}
                style={{ minHeight: '20px', maxHeight: '128px' }}
                aria-label="Message input"
                aria-multiline="true"
              />
            )}
          </div>

          {/* Khmer currency inline converter — shown when amounts detected */}
          {detectedCurrencies.length > 0 && (
            <div className={`flex flex-wrap gap-2 mt-1.5 px-1`}>
              {detectedCurrencies.map((dc, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    const conversion = dc.type === 'usd' ? dc.displayRiel : dc.displayUSD;
                    setInput(prev => prev + ` (${conversion})`);
                    textareaRef.current?.focus();
                  }}
                  title={`Click to insert conversion`}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    isDark
                      ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300 hover:bg-emerald-900/50'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  <span className="font-medium">{dc.fullMatch.trim()}</span>
                  <span className="mx-1 opacity-50">→</span>
                  <span>{dc.type === 'usd' ? dc.displayRiel.split(' ')[0] : dc.displayUSD}</span>
                  <span className="ml-1 opacity-60 text-[10px]">{dc.type === 'usd' ? '៛' : '$'}</span>
                </button>
              ))}
            </div>
          )}

          {/* Summarize URL button — shown when input is a standalone URL */}
          {URL_REGEX.test(input.trim()) && !isStreaming && (
            <button
              type="button"
              onClick={handleSummarize}
              disabled={isSummarizing}
              className={`flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                isDark
                  ? 'bg-indigo-600/80 hover:bg-indigo-600 text-white disabled:opacity-50'
                  : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700 disabled:opacity-50'
              }`}
              aria-label="Summarize this URL"
              title="Summarize the page content before sending"
            >
              {isSummarizing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Link className="w-3.5 h-3.5" />
              )}
              <span>{isSummarizing ? 'Summarizing…' : 'Summarize URL'}</span>
            </button>
          )}

          {/* Document upload button — always visible as secondary action */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming || isProcessingDoc}
            className={`shrink-0 transition-colors duration-200 p-1 rounded-full flex items-center justify-center ${
              isProcessingDoc
                ? isDark ? 'text-indigo-400' : 'text-indigo-600'
                : isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
            }`}
            aria-label="Attach PDF or DOCX document"
            title="Attach PDF or DOCX document"
          >
            {isProcessingDoc ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
          </button>

          {/* Send button */}
          <button
            type="submit"
            ref={sendButtonRef}
            disabled={!canSubmit}
            className={`flex-shrink-0 p-2 md:p-2.5 rounded-full transition-all duration-300 flex items-center justify-center ${
              canSubmit
                ? 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-90'
                : isDark
                  ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            aria-label={isStreaming ? 'Cancel' : 'Send message'}
            aria-disabled={!canSubmit}
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />
            )}
          </button>

          {/* Edit button — shown when not streaming, not editing, and lastSentMessage exists */}
          {!isStreaming && !isEditing && lastSentMessage && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
                setInput(lastSentMessage);
                setTimeout(() => textareaRef.current?.focus(), 50);
              }}
              className={`shrink-0 transition-colors duration-200 p-1 rounded-full flex items-center justify-center ${isDark ? 'text-blue-400 hover:text-blue-300 hover:bg-gray-700/50' : 'text-blue-600 hover:text-blue-700 hover:bg-gray-100'}`}
              aria-label="Edit last message"
              title="Edit your last message"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}

          {/* Retry button — shown when a message failed and user hasn't typed new content */}
          {error && lastSentMessage && !isEditing && (
            <button
              type="button"
              onClick={retryLastMessage}
              className={`shrink-0 transition-colors duration-200 p-1 rounded-full flex items-center justify-center ${isDark ? 'text-red-400 hover:text-red-300 hover:bg-red-900/30' : 'text-red-600 hover:text-red-700 hover:bg-red-50'}`}
              aria-label="Retry failed message"
              title="Retry failed message"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {/* Compact mode toggle */}
          <button
            type="button"
            onClick={() => setIsCompact(prev => !prev)}
            className={`shrink-0 transition-colors duration-200 p-1 rounded-full flex items-center justify-center ${isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
            aria-label={isCompact ? 'Expand input area' : 'Compact input area'}
            title={isCompact ? 'Expand input area' : 'Compact input — more room for messages'}
          >
            {isCompact
              ? <Maximize2 className="w-3.5 h-3.5" />
              : <Minimize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Smart Reply button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSmartReply(prev => !prev)}
              className={`shrink-0 transition-colors duration-200 p-1 rounded-full flex items-center justify-center ${showSmartReply ? (isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600') : (isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200')}`}
              aria-label="Smart Reply"
              title="Khmer Smart Reply — bilingual quick responses"
            >
              <MessageSquarePlus className="w-4 h-4" />
            </button>
            {showSmartReply && (
              <SmartReplyPopover
                isDark={isDark}
                onClose={() => setShowSmartReply(false)}
                onInsert={(text) => {
                  setInput(prev => prev ? `${prev}\n${text}` : text);
                  setTimeout(() => textareaRef.current?.focus(), 50);
                }}
              />
            )}
          </div>

          {/* Khmer Phrasebank button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowKhmerPhrasebank(prev => !prev)}
              className={`shrink-0 transition-colors duration-200 p-1 rounded-full flex items-center justify-center ${showKhmerPhrasebank ? (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600') : (isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200')}`}
              aria-label="Khmer Phrasebank"
              title="Khmer Phrasebank — browse phrases in Khmer & English"
            >
              <BookOpen className="w-4 h-4" />
            </button>
            {showKhmerPhrasebank && (
              <KhmerPhrasebank
                onClose={() => setShowKhmerPhrasebank(false)}
                onInsert={(text) => {
                  setInput(prev => prev ? `${prev}\n${text}` : text);
                  setTimeout(() => textareaRef.current?.focus(), 50);
                }}
              />
            )}
          </div>

          {/* Khmer Job Quick Replies button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowJobQuickReplies(prev => !prev)}
              className={`shrink-0 transition-colors duration-200 p-1 rounded-full flex items-center justify-center ${showJobQuickReplies ? (isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600') : (isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200')}`}
              aria-label="Khmer Job Quick Replies"
              title="Khmer Job Quick Replies — one-tap professional phrases"
            >
              <Briefcase className="w-4 h-4" />
            </button>
            {showJobQuickReplies && (
              <JobQuickReplies
                isDark={isDark}
                onClose={() => setShowJobQuickReplies(false)}
                onInsert={(text) => {
                  setInput(prev => prev ? `${prev}\n${text}` : text);
                  setTimeout(() => textareaRef.current?.focus(), 50);
                }}
              />
            )}
          </div>

          {/* Markdown preview toggle */}
          {input.trim().length > 0 && (
            <button
              type="button"
              onClick={() => setShowPreview(prev => !prev)}
              className={`shrink-0 transition-colors duration-200 p-1 rounded-full flex items-center justify-center ${showPreview ? (isDark ? 'bg-gray-700/60 text-indigo-400' : 'bg-indigo-100 text-indigo-600') : (isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200')}`}
              aria-label={showPreview ? 'Hide markdown preview' : 'Show markdown preview'}
              title={showPreview ? 'Hide preview (Ctrl+Shift+P)' : 'Preview markdown (Ctrl+Shift+P)'}
            >
              {showPreview
                ? <EyeOff className="w-3.5 h-3.5" />
                : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Character / word count — visible when input has content */}
          {input.length > 0 && (
            <span
              className={`shrink-0 text-[10px] md:text-[11px] font-mono leading-none ${
                isDark ? 'text-gray-500' : 'text-gray-400'
              }`}
              aria-live="polite"
              aria-label={`${charCount} characters, ${wordCount} words`}
            >
              {charCount >= 9000
                ? <span className="text-amber-400 font-semibold">{charCount.toLocaleString()}</span>
                : charCount.toLocaleString()}
              {charCount > 0 && ' · '}
              {wordCount > 0 && `${wordCount}w`}
            </span>
          )}
        </form>

        {/* Streaming stats HUD — shown while AI is responding */}
        <StreamingHUD />

        {/* URL summary error */}
        {summaryError && (
          <p className="text-center text-[11px] mt-1.5 text-red-500" role="alert">
            {summaryError}
          </p>
        )}

        {/* Document processing indicator + error */}
        {isProcessingDoc && (
          <p className="text-center text-[11px] mt-1.5 text-indigo-500" role="status">
            Processing document…
          </p>
        )}
        {docError && (
          <p className="text-center text-[11px] mt-1.5 text-red-500" role="alert">
            {docError}
          </p>
        )}

        <p className={`text-center text-[10px] md:text-[11px] mt-1.5 md:mt-2 ${isDark ? 'text-gray-600' : 'text-gray-500'}`}>
          AI can make mistakes. Consider checking important information.
        </p>
      </div>
    </div>
  );
});