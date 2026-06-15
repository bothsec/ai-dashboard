import { useState, memo, useCallback, useEffect } from 'react';
import { X, Bookmark, Trash2, Search } from 'lucide-react';

interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: number;
}

interface PromptLibraryProps {
  onUse: (prompt: string) => void;
  onClose: () => void;
}

const STORAGE_KEY = 'prompt-library';
const CATEGORIES = ['All', 'General', 'Code', 'Creative', 'Analysis', 'Custom'];

function loadPrompts(): SavedPrompt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePrompts(prompts: SavedPrompt[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
  } catch {
    // quota exceeded or unavailable — fail silently
  }
}

function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export const PromptLibrary = memo(function PromptLibrary({ onUse, onClose }: PromptLibraryProps) {
  const [prompts, setPrompts] = useState<SavedPrompt[]>(() => loadPrompts());
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filtered = prompts.filter(p => {
    const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchSearch = !searchQuery.trim() ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleDelete = useCallback((id: string) => {
    setPrompts(prev => {
      const next = prev.filter(p => p.id !== id);
      savePrompts(next);
      return next;
    });
  }, []);

  const handleSaveFromInput = useCallback((inputText: string) => {
    if (!inputText.trim()) return;
    const newPrompt: SavedPrompt = {
      id: generateId(),
      title: inputText.slice(0, 50) + (inputText.length > 50 ? '…' : ''),
      content: inputText,
      category: 'Custom',
      createdAt: Date.now(),
    };
    setPrompts(prev => {
      const next = [newPrompt, ...prev];
      savePrompts(next);
      return next;
    });
  }, []);

  const handleStartEdit = (prompt: SavedPrompt) => {
    setEditingId(prompt.id);
    setEditTitle(prompt.title);
  };

  const handleSaveEdit = useCallback(() => {
    if (!editingId || !editTitle.trim()) return;
    setPrompts(prev => {
      const next = prev.map(p => p.id === editingId ? { ...p, title: editTitle.trim() } : p);
      savePrompts(next);
      return next;
    });
    setEditingId(null);
    setEditTitle('');
  }, [editingId, editTitle]);

  // Expose save function globally so ChatInput can call it
  useEffect(() => {
    (window as unknown as { __savePrompt?: (text: string) => void }).__savePrompt = handleSaveFromInput;
    return () => {
      delete (window as unknown as { __savePrompt?: (text: string) => void }).__savePrompt;
    };
  }, [handleSaveFromInput]);

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-900/98 border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[70vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 shrink-0">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-gray-200">Prompt Library</span>
          <span className="text-xs text-gray-500">{prompts.length} saved</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
          aria-label="Close prompt library"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search + Categories */}
      <div className="px-3 py-2 border-b border-gray-700/50 space-y-2 shrink-0">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
          'bg-gray-800/50 border-gray-700/50 focus-within:border-indigo-500/50'
        }`}>
          <Search className="w-3.5 h-3.5 text-gray-500 shrink-0" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search prompts…"
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-gray-500 text-gray-200"
            aria-label="Search saved prompts"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-thin">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs shrink-0 transition-colors ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt list */}
      <div className="flex-1 overflow-y-auto py-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">
              {searchQuery ? 'No prompts match your search' : 'No saved prompts yet'}
            </p>
            <p className="text-xs mt-1 opacity-60">
              Type in chat and click the bookmark icon to save
            </p>
          </div>
        ) : (
          filtered.map(prompt => (
            <div
              key={prompt.id}
              className="group mx-2 mb-1 rounded-xl border border-gray-800/50 hover:border-gray-700/50 transition-colors overflow-hidden"
            >
              <div
                className="flex items-start gap-2 px-3 py-2.5 cursor-pointer"
                onClick={() => { onUse(prompt.content); onClose(); }}
              >
                <div className="flex-1 min-w-0">
                  {editingId === prompt.id ? (
                    <input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                      onBlur={handleSaveEdit}
                      onClick={e => e.stopPropagation()}
                      autoFocus
                      className="w-full bg-gray-800 border border-indigo-500/50 rounded px-2 py-0.5 text-xs text-gray-200 outline-none"
                      aria-label="Edit prompt title"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-gray-200 truncate">{prompt.title}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                        prompt.category === 'Code' ? 'bg-blue-500/20 text-blue-400' :
                        prompt.category === 'Creative' ? 'bg-pink-500/20 text-pink-400' :
                        prompt.category === 'Analysis' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-gray-700/50 text-gray-400'
                      }`}>
                        {prompt.category}
                      </span>
                    </div>
                  )}
                  <p className="text-[11px] text-gray-500 mt-0.5 truncate">{prompt.content}</p>
                </div>
              </div>
              {/* Actions row */}
              <div className="flex items-center gap-1 px-2 pb-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); handleStartEdit(prompt); }}
                  className="text-[10px] text-gray-500 hover:text-gray-300 px-1.5 py-0.5 rounded hover:bg-gray-800 transition-colors"
                >
                  Rename
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onUse(prompt.content); onClose(); }}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 px-1.5 py-0.5 rounded hover:bg-indigo-500/10 transition-colors"
                >
                  Use
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(prompt.id); }}
                  className="ml-auto text-gray-600 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors"
                  aria-label="Delete prompt"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

export { CATEGORIES };