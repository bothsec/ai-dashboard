import { memo, useState, useCallback } from 'react';
import { X, Search, BookOpen, FileText } from 'lucide-react';
import { KHMER_PHRASES, CATEGORIES, WRITING_TEMPLATES, type KhmerPhrase, type WritingTemplate } from '../data/khmerPhrases';

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

const TemplateCard = memo(({ t, onInsert }: { t: WritingTemplate; onInsert: (t: WritingTemplate) => void }) => (
  <button
    onClick={() => onInsert(t)}
    className="w-full text-left p-3 rounded-lg bg-z-800/50 hover:bg-z-800 border border-z-700/50 hover:border-blue-500/50 transition-all"
  >
    <div className="flex items-center gap-1.5 mb-1">
      <FileText className="w-3.5 h-3.5 text-blue-400" />
      <span className="text-xs font-semibold text-z-100">{t.enTitle}</span>
    </div>
    <div className="text-xs text-z-400 font-hanuman mb-1">{t.khTitle}</div>
    <div className="text-[10px] text-z-600 leading-relaxed">{t.whenToUse}</div>
  </button>
));

export const KhmerPhrasebank = memo(({ onClose, onInsert }: Props) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeTab, setActiveTab] = useState<'phrases' | 'templates'>('phrases');

  const filtered = KHMER_PHRASES.filter(p => {
    const matchQuery = !query ||
      p.en.toLowerCase().includes(query.toLowerCase()) ||
      p.kh.includes(query);
    const matchCat = activeCategory === 'All' || p.category === activeCategory;
    return matchQuery && matchCat;
  });

  const handleInsertPhrase = useCallback((phrase: KhmerPhrase) => {
    onInsert(`[Khmer Phrasebank] ${phrase.en}\n\nPlease help me with: ${phrase.kh}`);
    onClose();
  }, [onInsert, onClose]);

  const handleInsertTemplate = useCallback((t: WritingTemplate) => {
    const text = `[Khmer Formal Letter — ${t.enTitle}]\n\n` +
      `━━━ ENGLISH VERSION ━━━\n${t.enBody}\n\n` +
      `━━━ ភាសាខ្មែរ ━━━\n${t.khBody}\n\n` +
      `Please help me complete this ${t.enTitle} with my personal details. Fill in the [BRACKETED] placeholders.`;
    onInsert(text);
    onClose();
  }, [onInsert, onClose]);

  const filteredTemplates = WRITING_TEMPLATES.filter(t =>
    !query ||
    t.enTitle.toLowerCase().includes(query.toLowerCase()) ||
    t.khTitle.includes(query) ||
    t.whenToUse.toLowerCase().includes(query.toLowerCase())
  );

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

        {/* Tab switcher */}
        <div className="px-3 pt-3 flex gap-1">
          <button
            onClick={() => setActiveTab('phrases')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'phrases'
                ? 'bg-blue-600 text-white'
                : 'bg-z-800 text-z-400 hover:text-z-200 border border-z-700'
            }`}
          >
            Phrases
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'templates'
                ? 'bg-blue-600 text-white'
                : 'bg-z-800 text-z-400 hover:text-z-200 border border-z-700'
            }`}
          >
            <FileText className="w-3 h-3" />
            Writing Templates
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
              placeholder={activeTab === 'templates' ? 'Search templates...' : 'Search phrases...'}
              className="w-full pl-8 pr-3 py-1.5 bg-z-800 border border-z-700 rounded-lg text-xs text-z-100 placeholder:text-z-500 focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>
        </div>

        {/* Categories (phrases only) */}
        {activeTab === 'phrases' && (
          <div className="px-3 pt-3">
            <CategoryTabs active={activeCategory} onSelect={setActiveCategory} />
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
          {activeTab === 'phrases' ? (
            filtered.length === 0 ? (
              <p className="text-xs text-z-500 text-center py-6">No phrases found</p>
            ) : (
              filtered.map((phrase, i) => (
                <button
                  key={i}
                  onClick={() => handleInsertPhrase(phrase)}
                  className="w-full text-left p-2.5 rounded-lg bg-z-800/50 hover:bg-z-800 border border-z-700/50 hover:border-z-600 transition-all group"
                >
                  <div className="text-xs text-z-100 font-medium mb-0.5">{phrase.en}</div>
                  <div className="text-xs text-z-400 font-hanuman">{phrase.kh}</div>
                  <div className="text-[10px] text-z-600 mt-1">{phrase.category}</div>
                </button>
              ))
            )
          ) : (
            filteredTemplates.length === 0 ? (
              <p className="text-xs text-z-500 text-center py-6">No templates found</p>
            ) : (
              filteredTemplates.map(t => (
                <TemplateCard key={t.id} t={t} onInsert={handleInsertTemplate} />
              ))
            )
          )}
        </div>

        <div className="p-2.5 border-t border-z-800 text-[10px] text-z-600 text-center">
          {activeTab === 'phrases'
            ? 'Click a phrase to insert into chat'
            : 'Click a template — AI will help you fill in your details'}
        </div>
      </div>
    </div>
  );
});