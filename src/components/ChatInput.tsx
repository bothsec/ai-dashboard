import React, { useState, useRef, useEffect, memo } from 'react';
import { useChat } from '../context/ChatContext';
import { useSettings } from '../context/SettingsContext';
import { Send, Loader2, Paperclip, X, Link, Sparkles, Bookmark, Edit2, RefreshCw } from 'lucide-react';
import PromptEngineer from './PromptEngineer';
import { PromptLibrary } from './PromptLibrary';

// Regex to detect a standalone URL in input
const URL_REGEX = /^https?:\/\/[^\s]+$/;

export const ChatInput = memo(() => {
  const [input, setInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [showPromptEngineer, setShowPromptEngineer] = useState(false);
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { sendMessage, isStreaming, cancelStream, createNewChat, clearMessages, editLastMessage, lastSentMessage, error, retryLastMessage } = useChat();
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);

  const canSubmit = (input.trim().length > 0 || selectedFiles.length > 0) && !isStreaming;

  // Keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K: Focus input
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        textareaRef.current?.focus();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming, cancelStream]);

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
      createNewChat();
      return;
    }
    if (trimmed === '/clear') {
      setInput('');
      clearMessages();
      return;
    }
    if (trimmed === '/export') {
      setInput('');
      window.dispatchEvent(new CustomEvent('chat:trigger-export'));
      return;
    }

    if (!canSubmit) return;

    let messageContent = trimmed;
    
    if (selectedFiles.length > 0) {
      const fileNames = selectedFiles.map(file => file.name);
      const filesText = `[Attached: ${fileNames.join(', ')}]`;
      messageContent = messageContent 
        ? `${messageContent}\n\n${filesText}` 
        : filesText;
    }

    setInput('');
    setSelectedFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Guard against null target (possible with detached/cross-origin events)
    const target = e.target as HTMLInputElement | null;
    if (target?.files && target.files.length > 0) {
      setSelectedFiles(Array.from(target.files));
    }
  };

  const removeFile = (file: File) => {
    setSelectedFiles(prev => prev.filter(f => f !== file));
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
    <div className={`shrink-0 px-3 md:px-6 lg:px-12 py-2 md:py-3 lg:py-4 ${isDark ? '' : 'bg-white/50'}`}>
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

        {/* Prompt Library panel */}
        {showPromptLibrary && (
          <div className="mb-3">
            <PromptLibrary
              onUse={(prompt) => {
                setInput(prompt);
                setShowPromptLibrary(false);
                setTimeout(() => textareaRef.current?.focus(), 50);
              }}
              onClose={() => setShowPromptLibrary(false)}
            />
          </div>
        )}

        {/* ChatGPT-style input container */}
        <form
          className={`relative flex items-center gap-2 md:gap-3 rounded-full px-3 md:px-4 py-2.5 md:py-3 transition-all duration-300 ${
            isFocused || isEditing
              ? isDark
                ? 'bg-gray-800/90 shadow-2xl shadow-black/40 border border-gray-600/50'
                : 'bg-white/90 shadow-lg shadow-gray-900/10 border border-gray-300'
              : isDark
                ? 'bg-gray-800/60 hover:bg-gray-800/70 border border-gray-700/30 hover:border-gray-600/40'
                : 'bg-white/60 hover:bg-white/80 border border-gray-200 hover:border-gray-300'
          } ${isEditing ? (isDark ? '!border-blue-500/50' : '!border-blue-400') : ''}`}
          onSubmit={handleSubmit}
          aria-label="Message input form"
        >
          {/* Paperclip button */}
          <label
            htmlFor="file-input"
            className={`cursor-pointer transition-colors duration-200 p-1 rounded-full flex items-center justify-center ${isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            aria-label="Attach files"
          >
            <Paperclip className="w-4 h-4 md:w-5 md:h-5" />
          </label>
          <input
            type="file"
            id="file-input"
            ref={fileInputRef}
            multiple
            onChange={handleFileChange}
            className="hidden"
            aria-label="File input"
          />

          {/* Prompt Engineer button */}
          <button
            type="button"
            onClick={() => { setShowPromptEngineer(prev => !prev); setShowPromptLibrary(false); }}
            className={`transition-colors duration-200 p-1 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'text-violet-400 hover:text-violet-300 hover:bg-gray-700/50' : 'text-violet-600 hover:text-violet-700 hover:bg-gray-100'} ${showPromptEngineer ? (isDark ? 'bg-gray-700/60 text-violet-300' : 'bg-violet-100 text-violet-700') : ''}`}
            aria-label="Prompt Engineer"
            title="Prompt Engineer — craft better prompts"
          >
            <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          {/* Prompt Library button */}
          <button
            type="button"
            onClick={() => { setShowPromptLibrary(prev => !prev); setShowPromptEngineer(false); }}
            className={`transition-colors duration-200 p-1 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'text-amber-400 hover:text-amber-300 hover:bg-gray-700/50' : 'text-amber-600 hover:text-amber-700 hover:bg-gray-100'} ${showPromptLibrary ? (isDark ? 'bg-gray-700/60 text-amber-300' : 'bg-amber-100 text-amber-700') : ''}`}
            aria-label="Prompt Library"
            title="Prompt Library — saved prompts"
          >
            <Bookmark className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          {/* Save current input to library */}
          {input.trim().length > 0 && (
            <button
              type="button"
              onClick={() => {
                const w = window as unknown as { __savePrompt?: (text: string) => void };
                w.__savePrompt?.(input);
              }}
              className={`transition-colors duration-200 p-1 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'text-gray-500 hover:text-amber-400 hover:bg-gray-700/50' : 'text-gray-400 hover:text-amber-600 hover:bg-gray-100'}`}
              aria-label="Save to Prompt Library"
              title="Save current input to Prompt Library"
            >
              <Bookmark className="w-3.5 h-3.5 md:w-4 md:h-4 fill-current" />
            </button>
          )}

          {/* Textarea */}
          <div className="flex-1 min-w-0 flex items-center">
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
          </div>

          {/* File previews inline */}
          {selectedFiles.length > 0 && (
            <div className="flex items-center gap-2 mr-2" role="list" aria-label="Attached files">
              {selectedFiles.map((file) => (
                <div 
                  key={file.name} 
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${isDark ? 'bg-gray-700/60 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
                  role="listitem"
                >
                  <Paperclip className="w-3 h-3" aria-hidden="true" />
                  <span className="max-w-[100px] truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(file)}
                    className={`transition-colors duration-200 ml-1 ${isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
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

        {/* URL summary error */}
        {summaryError && (
          <p className="text-center text-[11px] mt-1.5 text-red-500" role="alert">
            {summaryError}
          </p>
        )}

        <p className={`text-center text-[10px] md:text-[11px] mt-1.5 md:mt-2 ${isDark ? 'text-gray-600' : 'text-gray-500'}`}>
          AI can make mistakes. Consider checking important information.
        </p>
      </div>
    </div>
  );
});