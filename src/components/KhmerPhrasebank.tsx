import { memo, useState, useCallback } from 'react';
import { X, Search, BookOpen } from 'lucide-react';
import { KHMER_PHRASES, CATEGORIES, type KhmerPhrase } from '../data/khmerPhrases';

interface Props {
  onClose: () => void;
  onInsert: (text: string) => void;
}

const CategoryTabs = memo(({ active, onSelect }: { active: string; onSelect: (c: string) => void }) => (
  <div className="flex gap-1 flex-wrap mb-3">
    {['All', ...CATEGORIES].map(cat => (
      <button
        key={cat}
        onClick={() => onSelect(cat)}
        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
          active === cat
            ? 'bg-blue-600 text-white'
            : 'bg-z-800 text-z-400 hover:text-z-200 border border-z-700'
        }`}
      >
        {cat}
      </button>
    ))}
  </div>
));

export const KhmerPhrasebank = memo(({ onClose, onInsert }: Props) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = KHMER_PHRASES.filter(p => {
    const matchQuery = !query ||
      p.en.toLowerCase().includes(query.toLowerCase()) ||
      p.kh.includes(query);
    const matchCat = activeCategory === 'All' || p.category === activeCategory;
    return matchQuery && matchCat;
  });

  const handleInsert = useCallback((phrase: KhmerPhrase) => {
    onInsert(`[Khmer Phrasebank] ${phrase.en}\n\nPlease help me with: ${phrase.kh}`);
    onClose();
  }, [onInsert, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-z-900 border border-z-700 rounded-xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-z-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-sm text-z-100">Khmer Phrasebank</span>
          </div>
          <button onClick={onClose} className="text-z-500 hover:text-z-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-z-800">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-z-500" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search phrases..."
              className="w-full pl-8 pr-3 py-1.5 bg-z-800 border border-z-700 rounded-lg text-xs text-z-100 placeholder:text-z-500 focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>
        </div>

        {/* Categories */}
        <div className="px-3 pt-3">
          <CategoryTabs active={activeCategory} onSelect={setActiveCategory} />
        </div>

        {/* Phrase List */}
        <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
          {filtered.length === 0 ? (
            <p className="text-xs text-z-500 text-center py-6">No phrases found</p>
          ) : (
            filtered.map((phrase, i) => (
              <button
                key={i}
                onClick={() => handleInsert(phrase)}
                className="w-full text-left p-2.5 rounded-lg bg-z-800/50 hover:bg-z-800 border border-z-700/50 hover:border-z-600 transition-all group"
              >
                <div className="text-xs text-z-100 font-medium mb-0.5">{phrase.en}</div>
                <div className="text-xs text-z-400 font-hanuman">{phrase.kh}</div>
                <div className="text-[10px] text-z-600 mt-1">{phrase.category}</div>
              </button>
            ))
          )}
        </div>

        <div className="p-2.5 border-t border-z-800 text-[10px] text-z-600 text-center">
          Click a phrase to insert into chat
        </div>
      </div>
    </div>
  );
});