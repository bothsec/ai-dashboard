import { memo, useState, useCallback } from 'react';
import { X, Search, HelpCircle, ChevronRight, Info } from 'lucide-react';
import { KHMER_JOB_TERMS, JOB_TERM_CATEGORIES, type KhmerJobTerm } from '../data/khmerJobTerms';

interface Props {
  onClose: () => void;
  onInsert: (text: string) => void;
}

const TermCard = memo(({ term, onInsert }: { term: KhmerJobTerm; onInsert: (t: KhmerJobTerm) => void }) => (
  <button
    onClick={() => onInsert(term)}
    className="w-full text-left p-3 rounded-lg bg-z-800/50 hover:bg-z-800 border border-z-700/50 hover:border-amber-500/40 transition-all group"
  >
    <div className="flex items-start justify-between gap-2 mb-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-amber-400 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded">
          {term.term}
        </span>
        {term.kh && (
          <span className="text-xs text-z-500 font-hanuman">{term.kh}</span>
        )}
      </div>
      <ChevronRight className="w-3 h-3 text-z-600 group-hover:text-amber-500 transition-colors shrink-0 mt-0.5" />
    </div>
    <div className="text-[10px] text-blue-400 mb-1">{term.fullForm}</div>
    <div className="text-xs text-z-300 leading-relaxed">{term.meaning}</div>
    {term.example && (
      <div className="mt-1.5 text-[10px] text-z-500 italic border-l-2 border-z-700 pl-2 leading-relaxed">
        {term.example}
      </div>
    )}
  </button>
));

export const KhmerJobTermDictionary = memo(({ onClose, onInsert }: Props) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedTerm, setSelectedTerm] = useState<KhmerJobTerm | null>(null);

  const filtered = KHMER_JOB_TERMS.filter(t => {
    const matchQuery = !query ||
      t.term.toLowerCase().includes(query.toLowerCase()) ||
      t.fullForm.toLowerCase().includes(query.toLowerCase()) ||
      t.meaning.toLowerCase().includes(query.toLowerCase()) ||
      (t.kh && t.kh.includes(query));
    const matchCat = activeCategory === 'All' || t.category === activeCategory;
    return matchQuery && matchCat;
  });

  const handleInsert = useCallback((term: KhmerJobTerm) => {
    const text = `[Khmer Job Term: "${term.term}"]
**Full form:** ${term.fullForm}
**Meaning:** ${term.meaning}${term.example ? `\n**Example:** ${term.example}` : ''}
${term.kh ? `\n**Khmer:** ${term.kh}` : ''}

Can you explain more about "${term.term}" in the context of Cambodian job applications?`;
    onInsert(text);
    onClose();
  }, [onInsert, onClose]);

  // Detail panel
  if (selectedTerm) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-z-900 border border-z-700 rounded-xl w-full max-w-sm shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b border-z-800">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-sm text-z-100">{selectedTerm.term}</span>
              {selectedTerm.kh && <span className="text-xs text-z-500 font-hanuman">{selectedTerm.kh}</span>}
            </div>
            <button onClick={onClose} className="text-z-500 hover:text-z-200 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <div className="text-[10px] text-blue-400 uppercase tracking-wider mb-1">Full Form</div>
              <div className="text-sm text-z-100 font-medium">{selectedTerm.fullForm}</div>
            </div>
            <div>
              <div className="text-[10px] text-blue-400 uppercase tracking-wider mb-1">Meaning</div>
              <div className="text-xs text-z-300 leading-relaxed">{selectedTerm.meaning}</div>
            </div>
            {selectedTerm.example && (
              <div>
                <div className="text-[10px] text-blue-400 uppercase tracking-wider mb-1">Example</div>
                <div className="text-xs text-z-400 italic leading-relaxed bg-z-800/50 rounded-lg p-2">{selectedTerm.example}</div>
              </div>
            )}
            <div>
              <div className="text-[10px] text-blue-400 uppercase tracking-wider mb-1">Category</div>
              <span className="inline-block text-[10px] bg-z-800 text-z-400 px-2 py-0.5 rounded-full">
                {selectedTerm.category}
              </span>
            </div>
          </div>
          <div className="p-3 border-t border-z-800 flex gap-2">
            <button
              onClick={() => handleInsert(selectedTerm)}
              className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors"
            >
              Ask AI to explain more
            </button>
            <button
              onClick={() => setSelectedTerm(null)}
              className="px-4 py-2 rounded-lg bg-z-800 hover:bg-z-700 text-z-300 text-xs transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-z-900 border border-z-700 rounded-xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-z-800">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-sm text-z-100">Khmer Job Term Dictionary</span>
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
              placeholder="Search a term, abbreviation, or keyword…"
              className="w-full pl-8 pr-3 py-1.5 bg-z-800 border border-z-700 rounded-lg text-xs text-z-100 placeholder:text-z-500 focus:outline-none focus:border-amber-500"
              autoFocus
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="px-3 pt-3 flex gap-1 flex-wrap">
          {JOB_TERM_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-colors whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-amber-600 text-white'
                  : 'bg-z-800 text-z-400 hover:text-z-200 border border-z-700 hover:border-z-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Stats bar */}
        <div className="px-3 pt-2 pb-0 flex items-center gap-1.5">
          <Info className="w-3 h-3 text-z-600" />
          <span className="text-[10px] text-z-600">{filtered.length} term{filtered.length !== 1 ? 's' : ''} found</span>
          <span className="text-[10px] text-z-700">·</span>
          <span className="text-[10px] text-z-600">Click to learn more, then ask AI</span>
        </div>

        {/* Term list */}
        <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
          {filtered.length === 0 ? (
            <p className="text-xs text-z-500 text-center py-8">
              No terms found for "{query}" — try a different search.
            </p>
          ) : (
            filtered.map((term, i) => (
              <div key={i} onClick={() => setSelectedTerm(term)}>
                <TermCard term={term} onInsert={() => {}} />
              </div>
            ))
          )}
        </div>

        <div className="p-2.5 border-t border-z-800 text-[10px] text-z-600 text-center">
          40+ Cambodian workplace terms · Click a term to expand · Ask AI for more detail
        </div>
      </div>
    </div>
  );
});