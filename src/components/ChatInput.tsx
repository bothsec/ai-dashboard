import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { Send, Loader2, Paperclip, X } from 'lucide-react';

export const ChatInput: React.FC = () => {
  const [input, setInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { sendMessage, isStreaming } = useChat();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && selectedFiles.length === 0) || isStreaming) return;

    // Prepare message content
    let messageContent = input.trim();
    
    // If there are files, append file information to the message
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
    <div className="border-t border-gray-800 bg-gray-950 p-4 md:p-6">
      <form 
        onSubmit={handleSubmit}
        className="max-w-3xl mx-auto relative group transition-all duration-500"
      >
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-1000 group-focus-within:duration-200"></div>
        <div className="flex flex-col">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <label htmlFor="file-input" className="cursor-pointer text-indigo-400 hover:text-indigo-300 transition-colors duration-200 rounded-full p-2.5 bg-gray-800/50 hover:bg-gray-800">
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
            </div>
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                rows={1}
                className="relative w-full bg-gray-900/80 backdrop-blur-xl border border-gray-800 hover:border-gray-700 rounded-2xl pl-5 pr-14 py-4 text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 focus:bg-gray-900 outline-none transition-all duration-300 resize-none shadow-2xl leading-relaxed text-[15px]"
                style={{ minHeight: '60px', maxHeight: '200px' }}
              />
            </div>
          </div>
          
          {/* File previews */}
          {selectedFiles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedFiles.map((file) => (
                <div key={file.name} className="flex items-center bg-gray-800/50 rounded-xl px-3 py-1.5 text-sm">
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button
                    onClick={() => removeFile(file)}
                    className="ml-2 text-gray-500 hover:text-gray-300 transition-colors duration-200 rounded-full p-1"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={(!input.trim() && selectedFiles.length === 0) || isStreaming}
              className={`absolute right-3 bottom-3 p-2.5 rounded-xl transition-all duration-300 group/btn ${
                (!input.trim() && selectedFiles.length === 0) || isStreaming
                  ? 'text-gray-600 bg-gray-800/30 cursor-not-allowed opacity-50'
                  : 'text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40'
              }`}
            >
              {isStreaming ? (
                <div className="relative">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-200" />
                  <div className="absolute inset-0 blur-sm bg-indigo-400/20 animate-pulse rounded-full"></div>
                </div>
              ) : (
                <Send className={`w-5 h-5 transition-transform duration-300 ${input.trim() ? 'translate-x-0.5 -translate-y-0.5 rotate-0 scale-110' : 'opacity-70'}`} />
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
