import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { Send, Loader2, Paperclip, X } from 'lucide-react';

export const ChatInput: React.FC = () => {
  const [input, setInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const { sendMessage, isStreaming } = useChat();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = (input.trim().length > 0 || selectedFiles.length > 0) && !isStreaming;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) return;

    let messageContent = input.trim();
    
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
    
    await sendMessage(messageContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (file: File) => {
    setSelectedFiles(prev => prev.filter(f => f !== file));
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  return (
    <div className="shrink-0 px-4 md:px-8 lg:px-12 py-3 md:py-4 lg:py-6">
      <div className="max-w-3xl lg:max-w-2xl mx-auto">
        {/* ChatGPT-style input container */}
        <div 
          className={`relative flex items-end gap-3 rounded-full px-4 md:px-5 py-3 md:py-4 transition-all duration-300 ${
            isFocused 
              ? 'bg-gray-800/90 shadow-2xl shadow-black/40 border border-gray-600/50' 
              : 'bg-gray-800/60 hover:bg-gray-800/70 border border-gray-700/30 hover:border-gray-600/40'
          }`}
        >
          {/* Paperclip button */}
          <label 
            htmlFor="file-input" 
            className="cursor-pointer text-gray-500 hover:text-gray-300 transition-colors duration-200 p-1 -ml-1 rounded-full hover:bg-gray-700/50"
          >
            <Paperclip className="w-5 h-5" />
          </label>
          <input
            type="file"
            id="file-input"
            ref={fileInputRef}
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          
          {/* Textarea */}
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Message AI..."
              rows={1}
              className="w-full bg-transparent border-none outline-none resize-none text-gray-100 placeholder:text-gray-500 text-base leading-relaxed py-0.5 max-h-40"
              style={{ minHeight: '24px', maxHeight: '160px' }}
            />
          </div>

          {/* File previews inline */}
          {selectedFiles.length > 0 && (
            <div className="flex items-center gap-2 mr-2">
              {selectedFiles.map((file) => (
                <div key={file.name} className="flex items-center gap-1.5 bg-gray-700/60 rounded-full px-3 py-1 text-xs">
                  <Paperclip className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-300 max-w-[100px] truncate">{file.name}</span>
                  <button
                    onClick={() => removeFile(file)}
                    className="text-gray-500 hover:text-red-400 transition-colors duration-200 ml-1"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Send button */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={`flex-shrink-0 p-2.5 rounded-full transition-all duration-300 ${
              canSubmit
                ? 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-90'
                : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isStreaming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Hint text */}
        <p className="text-center text-[11px] text-gray-600 mt-2.5">
          AI can make mistakes. Consider checking important information.
        </p>
      </div>
    </div>
  );
};