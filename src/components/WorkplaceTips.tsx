import { memo, useState, useEffect } from 'react';
import { X, ChevronRight, AlertTriangle, Bookmark } from 'lucide-react';
import { WORKPLACE_TIPS, type WorkplaceTip } from '../data/workplaceTips';

interface Props {
  onClose: () => void;
  onInsert?: (text: string) => void;
}

const CATEGORIES: Array<WorkplaceTip['category'] | 'all'> = [
  'all',
  'interview',
  'email',
  'salary',
  'culture',
];

const CATEGORY_LABELS: Record<WorkplaceTip['category'] | 'all', string> = {
  all: 'All',
  interview: '🎯 Interview',
  email: '📧 Email',
  salary: '💰 Salary',
  culture: '🤝 Culture',
};

const CategoryFilter = memo(({ active, onSelect }: { active: WorkplaceTip['category'] | 'all'; onSelect: (c: WorkplaceTip['category'] | 'all') => void }) => (
  <div className="flex gap-1.5 flex-wrap mb-4">
    {CATEGORIES.map(cat => (
      <button
        key={cat}
        onClick={() => onSelect(cat)}
        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
          active === cat
            ? 'bg-amber-600 text-white'
            : 'bg-z-800 text-z-400 hover:text-z-200 border border-z-700'
        }`}
      >
        {CATEGORY_LABELS[cat]}
      </button>
    ))}
  </div>
));

const TipCard = memo(function TipCard({ tip, onAskAI }: { tip: WorkplaceTip; onAskAI?: (tip: WorkplaceTip) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-xl border transition-all ${
        expanded
          ? 'border-amber-500/40 bg-amber-500/5'
          : 'border-z-700/50 bg-z-800/30 hover:border-z-600'
      }`}
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-3 p-4 text-left"
      >
        <span className="text-lg shrink-0 mt-0.5">{tip.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-z-200 leading-snug">{tip.title}</p>
          <p className="text-xs text-amber-400/70 mt-0.5">{tip.titleKh}</p>
          {!expanded && (
            <p className="text-xs text-z-500 mt-1.5 line-clamp-2">
              {tip.body.replace(/\n.+/g, '...')}
            </p>
          )}
        </div>
        <span className={`shrink-0 mt-1 transition-transform ${expanded ? 'rotate-90' : ''}`}>
          <ChevronRight className="w-4 h-4 text-z-500" />
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0">
          <div className="border-t border-z-700/30 pt-3 space-y-3">
            <div>
              <p className="text-xs font-semibold text-z-400 mb-1.5 uppercase tracking-wide">English</p>
              <div className="text-xs text-z-300 leading-relaxed whitespace-pre-wrap">{tip.body}</div>
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-400/70 mb-1.5 uppercase tracking-wide">Khmer</p>
              <div className="text-xs text-z-400 leading-relaxed whitespace-pre-wrap font-hanuman">{tip.bodyKh}</div>
            </div>
            {tip.warning && (
              <div className="flex gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-300 mb-0.5">Warning</p>
                  <p className="text-xs text-red-300/80 leading-relaxed">{tip.warning}</p>
                  {tip.warningKh && (
                    <p className="text-xs text-red-300/60 mt-1 font-hanuman">{tip.warningKh}</p>
                  )}
                </div>
              </div>
            )}
            {onAskAI && (
              <button
                onClick={(e) => { e.stopPropagation(); onAskAI(tip); }}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 text-xs font-medium transition-colors"
              >
                <Bookmark className="w-3.5 h-3.5" />
                Use This Tip with AI
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export const WorkplaceTips = memo(function WorkplaceTips({ onClose }: Props) {
  const [activeCategory, setActiveCategory] = useState<WorkplaceTip['category'] | 'all'>('all');

  const filtered = activeCategory === 'all'
    ? WORKPLACE_TIPS
    : WORKPLACE_TIPS.filter(t => t.category === activeCategory);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Khmer Workplace Tips"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg max-h-[88vh] overflow-hidden flex flex-col rounded-t-2xl sm:rounded-2xl border border-z-700 bg-z-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-z-700/50 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-z-200">Khmer Workplace Tips</h2>
            <p className="text-xs text-amber-400/70 mt-0.5">គន្លឹះការងារ — Navigate Western workplace norms</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-z-800 text-z-500 hover:text-z-200 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category filter */}
        <div className="px-5 pt-4 shrink-0">
          <CategoryFilter active={activeCategory} onSelect={setActiveCategory} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2">
          {filtered.length === 0 ? (
            <p className="text-xs text-z-500 text-center py-8">No tips in this category yet.</p>
          ) : (
            filtered.map(tip => (
              <TipCard key={tip.id} tip={tip} />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-3 border-t border-z-700/50 bg-z-900/80">
          <p className="text-[10px] text-z-600 text-center">
            {filtered.length} tip{filtered.length !== 1 ? 's' : ''} • For Cambodian job seekers navigating international workplaces
          </p>
        </div>
      </div>
    </div>
  );
});